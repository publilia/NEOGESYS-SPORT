-- ============================================================
-- Row Level Security policies
-- ============================================================

-- Enable RLS
ALTER TABLE soci ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificati_medici ENABLE ROW LEVEL SECURITY;
ALTER TABLE corsi ENABLE ROW LEVEL SECURITY;
ALTER TABLE corsi_istruttori ENABLE ROW LEVEL SECURITY;
ALTER TABLE iscrizioni_corso ENABLE ROW LEVEL SECURITY;
ALTER TABLE presenze ENABLE ROW LEVEL SECURITY;
ALTER TABLE anni_sportivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipi_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventi ENABLE ROW LEVEL SECURITY;
ALTER TABLE iscrizioni_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE prima_nota_movimenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE documenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE consensi_gdpr ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicazioni_destinatari ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_storage_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatture_piattaforma ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE soci_embeddings ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
  SELECT current_setting('app.current_tenant', true)::UUID;
$$ LANGUAGE sql STABLE;

-- RLS Policies (tenant_id match)
DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'soci','certificati_medici','corsi','iscrizioni_corso','presenze',
    'anni_sportivi','tipi_quota','quote','eventi','iscrizioni_evento',
    'prima_nota_movimenti','documenti','consensi_gdpr','comunicazioni',
    'audit_log','tenant_integrations','calendar_sync','cloud_storage_links',
    'fatture_piattaforma','tenant_usage','soci_embeddings'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (tenant_id = current_tenant_id())',
      t || '_tenant_isolation', t
    );
  END LOOP;
END $$;

CREATE POLICY comunicazioni_destinatari_tenant_isolation ON comunicazioni_destinatari
  USING (tenant_id = current_tenant_id());

-- super_admin role bypasses RLS for metadata queries
-- (enforced at app layer: super_admin never queries member tables)
CREATE ROLE app_super_admin BYPASSRLS LOGIN PASSWORD 'super_admin_dev_only';
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_super_admin;

CREATE ROLE app_tenant LOGIN PASSWORD 'tenant_dev_password';
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_tenant;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_tenant;
