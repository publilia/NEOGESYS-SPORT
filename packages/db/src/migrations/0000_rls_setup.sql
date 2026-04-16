-- ============================================================================
-- 0000_rls_setup.sql
-- Multi-tenant Row Level Security (RLS) setup for NEOGESYS-SPORT
-- ============================================================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- Enable RLS on all business tables
-- ============================================================================

ALTER TABLE soci ENABLE ROW LEVEL SECURITY;
ALTER TABLE corsi ENABLE ROW LEVEL SECURITY;
ALTER TABLE iscrizioni_corso ENABLE ROW LEVEL SECURITY;
ALTER TABLE presenze ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventi ENABLE ROW LEVEL SECURITY;
ALTER TABLE iscrizioni_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE prima_nota_movimenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE documenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE consensi_gdpr ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicazioni_destinatari ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificati_medici ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE anni_sportivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipi_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE corsi_istruttori ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE soci_embeddings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Tenant isolation policies
-- Each policy restricts rows to the current tenant set via:
--   SET app.current_tenant = '<tenant-uuid>';
-- ============================================================================

CREATE POLICY tenant_isolation ON soci
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation ON corsi
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation ON iscrizioni_corso
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation ON presenze
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation ON quote
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation ON eventi
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation ON iscrizioni_evento
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation ON prima_nota_movimenti
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation ON documenti
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation ON consensi_gdpr
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation ON comunicazioni
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- comunicazioni_destinatari uses comunicazione_id FK; join-based isolation
-- We still add a direct policy for defense-in-depth via a subquery
CREATE POLICY tenant_isolation ON comunicazioni_destinatari
  USING (comunicazione_id IN (
    SELECT id FROM comunicazioni
    WHERE tenant_id = current_setting('app.current_tenant', true)::UUID
  ));

CREATE POLICY tenant_isolation ON certificati_medici
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation ON tenant_integrations
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation ON anni_sportivi
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation ON tipi_quota
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- corsi_istruttori: isolation via join to corsi
CREATE POLICY tenant_isolation ON corsi_istruttori
  USING (corso_id IN (
    SELECT id FROM corsi
    WHERE tenant_id = current_setting('app.current_tenant', true)::UUID
  ));

CREATE POLICY tenant_isolation ON audit_log
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID
    OR tenant_id IS NULL); -- allow super-admin actions with NULL tenant_id

CREATE POLICY tenant_isolation ON soci_embeddings
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ============================================================================
-- Super Admin role: bypasses all RLS policies
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'super_admin') THEN
    CREATE ROLE super_admin;
  END IF;
END
$$;

ALTER ROLE super_admin BYPASSRLS;

-- ============================================================================
-- pgvector column for embeddings (added via raw SQL since Drizzle ORM does
-- not natively support the vector type)
-- ============================================================================

-- ALTER TABLE soci_embeddings ADD COLUMN IF NOT EXISTS embedding vector(1536);
-- CREATE INDEX IF NOT EXISTS soci_embeddings_embedding_idx
--   ON soci_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
--
-- NOTE: Uncomment the above lines after the table is created by Drizzle migrations.
-- The vector extension must be installed first (done above).
