-- ============================================================
-- NEOGESYS SPORT - Schema iniziale completo
-- Eseguito automaticamente da PostgreSQL al primo avvio
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── TENANTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  ragione_sociale VARCHAR(200) NOT NULL,
  tipo_ente VARCHAR(20) NOT NULL,
  partita_iva VARCHAR(20),
  codice_fiscale VARCHAR(20),
  pec VARCHAR(200),
  codice_sdi VARCHAR(10),
  sede_legale JSONB,
  logo TEXT,
  logo_dark TEXT,
  favicon TEXT,
  nome_visualizzato VARCHAR(100),
  palette_default VARCHAR(30) DEFAULT 'default',
  palette_custom JSONB,
  custom_domain VARCHAR(100) UNIQUE,
  custom_domain_verified BOOLEAN NOT NULL DEFAULT FALSE,
  piano VARCHAR(20) NOT NULL DEFAULT 'trial',
  max_soci VARCHAR(10) NOT NULL DEFAULT '50',
  max_utenti VARCHAR(10) NOT NULL DEFAULT '5',
  max_storage_mb VARCHAR(10) NOT NULL DEFAULT '500',
  stato VARCHAR(20) NOT NULL DEFAULT 'trial',
  trial_end TIMESTAMPTZ,
  sospensione_motivo TEXT,
  sospensione_data TIMESTAMPTZ,
  chiusura_data TIMESTAMPTZ,
  stripe_customer_id VARCHAR(100),
  stripe_subscription_id VARCHAR(100),
  abbonamento_inizio TIMESTAMPTZ,
  abbonamento_fine TIMESTAMPTZ,
  prossima_fatturazione TIMESTAMPTZ,
  metodo_fatturazione VARCHAR(20),
  federazioni JSONB,
  discipline JSONB,
  impostazioni JSONB,
  creato_da UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── UTENTI ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS utenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash TEXT,
  nome VARCHAR(100),
  cognome VARCHAR(100),
  telefono VARCHAR(20),
  two_factor_secret TEXT,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ultimo_accesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS utente_tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utente_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ruolo VARCHAR(30) NOT NULL,
  permessi JSONB,
  socio_id UUID,
  attivo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(utente_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utente_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  tema VARCHAR(10) DEFAULT 'system',
  palette VARCHAR(30) DEFAULT 'default',
  sidebar_collassata BOOLEAN DEFAULT FALSE,
  lingua_preferita VARCHAR(10) DEFAULT 'it',
  timezone VARCHAR(50) DEFAULT 'Europe/Rome',
  notifiche JSONB,
  dashboard_layout JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  utente_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SOCI ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS soci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tessera VARCHAR(50),
  nome VARCHAR(100) NOT NULL,
  cognome VARCHAR(100) NOT NULL,
  data_nascita DATE,
  codice_fiscale VARCHAR(20),
  email VARCHAR(200),
  telefono VARCHAR(20),
  indirizzo JSONB,
  disciplina VARCHAR(100),
  stato VARCHAR(20) NOT NULL DEFAULT 'attivo',
  note TEXT,
  foto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CERTIFICATI MEDICI ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificati_medici (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  socio_id UUID NOT NULL REFERENCES soci(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'agonistico',
  data_rilascio DATE NOT NULL,
  data_scadenza DATE NOT NULL,
  medico VARCHAR(200),
  documento_url TEXT,
  stato VARCHAR(20) NOT NULL DEFAULT 'valido',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CORSI ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS corsi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  disciplina VARCHAR(100),
  descrizione TEXT,
  orari JSONB,
  max_iscritti INTEGER,
  luogo VARCHAR(200),
  stato VARCHAR(20) NOT NULL DEFAULT 'attivo',
  colore VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corsi_istruttori (
  corso_id UUID NOT NULL REFERENCES corsi(id) ON DELETE CASCADE,
  utente_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  PRIMARY KEY (corso_id, utente_id)
);

CREATE TABLE IF NOT EXISTS iscrizioni_corso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  corso_id UUID NOT NULL REFERENCES corsi(id) ON DELETE CASCADE,
  socio_id UUID NOT NULL REFERENCES soci(id) ON DELETE CASCADE,
  data_iscrizione DATE NOT NULL DEFAULT CURRENT_DATE,
  stato VARCHAR(20) NOT NULL DEFAULT 'attiva',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presenze (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  corso_id UUID NOT NULL REFERENCES corsi(id) ON DELETE CASCADE,
  socio_id UUID NOT NULL REFERENCES soci(id) ON DELETE CASCADE,
  data_lezione DATE NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ANNI SPORTIVI & QUOTE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS anni_sportivi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome VARCHAR(50) NOT NULL,
  data_inizio DATE NOT NULL,
  data_fine DATE NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tipi_quota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  importo DECIMAL(10,2) NOT NULL,
  periodicita VARCHAR(20) NOT NULL DEFAULT 'annuale',
  descrizione TEXT,
  attivo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  socio_id UUID NOT NULL REFERENCES soci(id) ON DELETE CASCADE,
  tipo_quota_id UUID REFERENCES tipi_quota(id),
  anno_sportivo_id UUID REFERENCES anni_sportivi(id),
  importo DECIMAL(10,2) NOT NULL,
  stato VARCHAR(20) NOT NULL DEFAULT 'da_pagare',
  data_scadenza DATE,
  data_pagamento DATE,
  metodo_pagamento VARCHAR(50),
  note TEXT,
  ricevuta_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EVENTI ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eventi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  descrizione TEXT,
  data_inizio TIMESTAMPTZ NOT NULL,
  data_fine TIMESTAMPTZ,
  luogo VARCHAR(200),
  tipo VARCHAR(50) DEFAULT 'evento',
  max_iscritti INTEGER,
  costo DECIMAL(10,2),
  stato VARCHAR(20) NOT NULL DEFAULT 'programmato',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iscrizioni_evento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES eventi(id) ON DELETE CASCADE,
  socio_id UUID NOT NULL REFERENCES soci(id) ON DELETE CASCADE,
  stato VARCHAR(20) NOT NULL DEFAULT 'iscritta',
  pagato BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CONTABILITÀ ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prima_nota_movimenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data_movimento DATE NOT NULL,
  descrizione TEXT NOT NULL,
  categoria VARCHAR(100),
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrata','uscita')),
  importo DECIMAL(10,2) NOT NULL,
  conto VARCHAR(100),
  riferimento TEXT,
  documento_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DOCUMENTI ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome VARCHAR(300) NOT NULL,
  tipo_file VARCHAR(50),
  dimensione_kb INTEGER,
  categoria VARCHAR(100),
  storage_provider VARCHAR(30) DEFAULT 'local',
  storage_path TEXT,
  storage_url TEXT,
  socio_id UUID REFERENCES soci(id),
  tags JSONB,
  ocr_testo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consensi_gdpr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  socio_id UUID NOT NULL REFERENCES soci(id) ON DELETE CASCADE,
  tipo_consenso VARCHAR(100) NOT NULL,
  consenso BOOLEAN NOT NULL DEFAULT FALSE,
  data_consenso TIMESTAMPTZ,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── COMUNICAZIONI ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comunicazioni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  oggetto VARCHAR(300) NOT NULL,
  corpo TEXT,
  canale VARCHAR(20) NOT NULL DEFAULT 'email',
  stato VARCHAR(20) NOT NULL DEFAULT 'bozza',
  schedulata_per TIMESTAMPTZ,
  inviata_at TIMESTAMPTZ,
  template_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comunicazioni_destinatari (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  comunicazione_id UUID NOT NULL REFERENCES comunicazioni(id) ON DELETE CASCADE,
  socio_id UUID REFERENCES soci(id),
  email VARCHAR(200),
  stato VARCHAR(20) DEFAULT 'in_attesa',
  letto_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AUDIT LOG ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  utente_id UUID REFERENCES utenti(id),
  azione VARCHAR(100) NOT NULL,
  risorsa VARCHAR(50),
  risorsa_id UUID,
  dettagli JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CALENDAR SYNC ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  calendar_id TEXT NOT NULL,
  calendar_name TEXT,
  sync_token TEXT,
  last_synced_at TIMESTAMPTZ,
  attivo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_sync_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_sync_id UUID NOT NULL REFERENCES calendar_sync(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  evento_id UUID REFERENCES eventi(id),
  etag TEXT,
  last_modified TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CLOUD STORAGE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cloud_storage_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  documento_id UUID NOT NULL REFERENCES documenti(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  external_id TEXT NOT NULL,
  external_url TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BILLING ─────────────────────────────────────────────────
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  UNIQUE(tenant_id, periodo)
);

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

-- Embeddings per AI
CREATE TABLE IF NOT EXISTS soci_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  socio_id UUID NOT NULL REFERENCES soci(id) ON DELETE CASCADE,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tenant integrations (vault credenziali cifrate)
CREATE TABLE IF NOT EXISTS tenant_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  encrypted_credentials TEXT,
  attivo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, provider)
);

-- ─── INDICI ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS soci_tenant_idx ON soci(tenant_id);
CREATE INDEX IF NOT EXISTS soci_cognome_idx ON soci(tenant_id, cognome);
CREATE INDEX IF NOT EXISTS soci_stato_idx ON soci(tenant_id, stato);
CREATE INDEX IF NOT EXISTS corsi_tenant_idx ON corsi(tenant_id);
CREATE INDEX IF NOT EXISTS quote_tenant_idx ON quote(tenant_id);
CREATE INDEX IF NOT EXISTS quote_stato_idx ON quote(tenant_id, stato);
CREATE INDEX IF NOT EXISTS eventi_tenant_idx ON eventi(tenant_id);
CREATE INDEX IF NOT EXISTS audit_log_tenant_idx ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS utente_tenant_idx ON utente_tenant(tenant_id);
