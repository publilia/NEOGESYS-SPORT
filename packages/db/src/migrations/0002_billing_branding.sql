-- Migration 0002: Billing, branding, super_admin separation
-- Adds: piani_abbonamento, fatture_piattaforma, tenant_usage, super_admin_audit_log
-- Extends: tenants (branding, custom_domain, subscription fields)
-- Strengthens: RLS to prevent super_admin from reading tenant member data

BEGIN;

/* ============================================================
 * EXTEND tenants with branding + custom domain + subscription
 * ============================================================ */

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS logo_dark TEXT,
  ADD COLUMN IF NOT EXISTS favicon TEXT,
  ADD COLUMN IF NOT EXISTS nome_visualizzato VARCHAR(100),
  ADD COLUMN IF NOT EXISTS palette_default VARCHAR(30) DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS palette_custom JSONB,
  ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS max_utenti VARCHAR(10) NOT NULL DEFAULT '5',
  ADD COLUMN IF NOT EXISTS max_storage_mb VARCHAR(10) NOT NULL DEFAULT '500',
  ADD COLUMN IF NOT EXISTS sospensione_motivo TEXT,
  ADD COLUMN IF NOT EXISTS sospensione_data TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS chiusura_data TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS abbonamento_inizio TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS abbonamento_fine TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prossima_fatturazione TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metodo_fatturazione VARCHAR(20),
  ADD COLUMN IF NOT EXISTS creato_da UUID;

CREATE INDEX IF NOT EXISTS tenants_slug_idx ON tenants(slug);
CREATE INDEX IF NOT EXISTS tenants_stato_idx ON tenants(stato);
CREATE INDEX IF NOT EXISTS tenants_piano_idx ON tenants(piano);
CREATE INDEX IF NOT EXISTS tenants_custom_domain_idx ON tenants(custom_domain);

/* ============================================================
 * piani_abbonamento
 * ============================================================ */

CREATE TABLE IF NOT EXISTS piani_abbonamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codice VARCHAR(30) UNIQUE NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descrizione TEXT,

  prezzo_mensile DECIMAL(10,2) NOT NULL,
  prezzo_annuale DECIMAL(10,2) NOT NULL,
  valuta VARCHAR(3) NOT NULL DEFAULT 'EUR',

  max_soci INTEGER NOT NULL,
  max_utenti INTEGER NOT NULL,
  max_storage_mb INTEGER NOT NULL,
  max_corsi INTEGER,
  max_eventi INTEGER,

  ai_abilitato BOOLEAN NOT NULL DEFAULT FALSE,
  integrazioni_google BOOLEAN NOT NULL DEFAULT FALSE,
  integrazioni_microsoft BOOLEAN NOT NULL DEFAULT FALSE,
  custom_domain BOOLEAN NOT NULL DEFAULT FALSE,
  custom_palette BOOLEAN NOT NULL DEFAULT FALSE,
  fatturazione_sdi BOOLEAN NOT NULL DEFAULT FALSE,
  export_avanzato BOOLEAN NOT NULL DEFAULT FALSE,
  supporto_prioritario BOOLEAN NOT NULL DEFAULT FALSE,
  white_label BOOLEAN NOT NULL DEFAULT FALSE,

  ordine INTEGER NOT NULL DEFAULT 0,
  colore VARCHAR(20),
  highlighted BOOLEAN NOT NULL DEFAULT FALSE,
  attivo BOOLEAN NOT NULL DEFAULT TRUE,

  stripe_price_id_mensile VARCHAR(100),
  stripe_price_id_annuale VARCHAR(100),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS piani_codice_idx ON piani_abbonamento(codice);
CREATE INDEX IF NOT EXISTS piani_attivo_idx ON piani_abbonamento(attivo);

/* ============================================================
 * fatture_piattaforma (tenant vede solo le proprie via RLS)
 * ============================================================ */

CREATE TABLE IF NOT EXISTS fatture_piattaforma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  numero VARCHAR(50) NOT NULL,
  anno_fattura INTEGER NOT NULL,

  data_emissione TIMESTAMPTZ NOT NULL,
  data_scadenza TIMESTAMPTZ NOT NULL,
  data_pagamento TIMESTAMPTZ,

  descrizione TEXT NOT NULL,
  piano_codice VARCHAR(30) NOT NULL,
  periodo VARCHAR(20) NOT NULL,

  imponibile DECIMAL(10,2) NOT NULL,
  iva DECIMAL(10,2) NOT NULL,
  totale DECIMAL(10,2) NOT NULL,
  valuta VARCHAR(3) NOT NULL DEFAULT 'EUR',

  stato VARCHAR(20) NOT NULL DEFAULT 'emessa',

  stripe_invoice_id VARCHAR(100),
  pdf_url TEXT,
  xml_sdi TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fatture_tenant_idx ON fatture_piattaforma(tenant_id);
CREATE INDEX IF NOT EXISTS fatture_stato_idx ON fatture_piattaforma(stato);
CREATE INDEX IF NOT EXISTS fatture_anno_idx ON fatture_piattaforma(anno_fattura);

ALTER TABLE fatture_piattaforma ENABLE ROW LEVEL SECURITY;

CREATE POLICY fatture_tenant_isolation ON fatture_piattaforma
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

/* ============================================================
 * tenant_usage (aggregato, visibile a super_admin + admin)
 * ============================================================ */

CREATE TABLE IF NOT EXISTS tenant_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  periodo VARCHAR(7) NOT NULL,

  num_soci INTEGER NOT NULL DEFAULT 0,
  num_utenti INTEGER NOT NULL DEFAULT 0,
  num_corsi INTEGER NOT NULL DEFAULT 0,
  num_eventi INTEGER NOT NULL DEFAULT 0,
  num_comunicazioni INTEGER NOT NULL DEFAULT 0,
  num_documenti INTEGER NOT NULL DEFAULT 0,
  storage_used_mb INTEGER NOT NULL DEFAULT 0,
  num_ai_call INTEGER NOT NULL DEFAULT 0,
  num_api_call INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, periodo)
);

CREATE INDEX IF NOT EXISTS usage_tenant_periodo_idx ON tenant_usage(tenant_id, periodo);

ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_tenant_isolation ON tenant_usage
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

/* ============================================================
 * super_admin_audit_log (no tenant_id = platform-level)
 * Visible only to super_admin via BYPASSRLS.
 * ============================================================ */

CREATE TABLE IF NOT EXISTS super_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID NOT NULL,
  super_admin_email VARCHAR(200) NOT NULL,

  azione VARCHAR(100) NOT NULL,
  target VARCHAR(50),
  target_id UUID,

  dettagli JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sa_audit_action_idx ON super_admin_audit_log(azione);
CREATE INDEX IF NOT EXISTS sa_audit_target_idx ON super_admin_audit_log(target, target_id);
CREATE INDEX IF NOT EXISTS sa_audit_created_idx ON super_admin_audit_log(created_at);

/* ============================================================
 * SEED: default plans
 * ============================================================ */

INSERT INTO piani_abbonamento (
  codice, nome, descrizione, prezzo_mensile, prezzo_annuale,
  max_soci, max_utenti, max_storage_mb, max_corsi, max_eventi,
  ai_abilitato, integrazioni_google, integrazioni_microsoft,
  custom_domain, custom_palette, fatturazione_sdi,
  export_avanzato, supporto_prioritario, white_label,
  ordine, colore, highlighted, attivo
) VALUES
  ('free', 'Free', 'Gratuito - Ideale per piccole ASD in avvio',
   0, 0, 25, 2, 100, 3, 2,
   FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
   1, 'gray', FALSE, TRUE),

  ('base', 'Base', 'Per ASD/SSD con fino a 100 soci',
   29, 290, 100, 5, 500, 10, 10,
   FALSE, TRUE, FALSE, FALSE, FALSE, TRUE, TRUE, FALSE, FALSE,
   2, 'blue', FALSE, TRUE),

  ('pro', 'Pro', 'Per club strutturati con AI e integrazioni complete',
   79, 790, 500, 20, 5000, 50, 30,
   TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE,
   3, 'purple', TRUE, TRUE),

  ('enterprise', 'Enterprise', 'Per federazioni e grandi organizzazioni - white label',
   199, 1990, 10000, 100, 50000, 500, 200,
   TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
   4, 'amber', FALSE, TRUE)
ON CONFLICT (codice) DO NOTHING;

COMMIT;
