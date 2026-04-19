-- ============================================================================
-- 0001_calendar_storage.sql
-- Calendar sync and cloud storage tables for NEOGESYS-SPORT
-- ============================================================================

-- ============================================================================
-- calendar_sync – tracks sync state between local entities and external calendars
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  provider VARCHAR(30) NOT NULL,             -- google_calendar | microsoft_calendar
  external_calendar_id VARCHAR(255) NOT NULL,
  calendar_name VARCHAR(200) NOT NULL,

  sync_direction VARCHAR(20) NOT NULL,       -- push | pull | bidirectional
  sync_enabled BOOLEAN NOT NULL DEFAULT true,

  last_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR(20),              -- success | error | partial
  last_sync_message TEXT,

  webhook_channel_id VARCHAR(255),
  webhook_expiry TIMESTAMPTZ,

  configurazione JSONB,                      -- sync filters, color mappings, etc.

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT calendar_sync_tenant_external_unique
    UNIQUE (tenant_id, provider, external_calendar_id)
);

CREATE INDEX IF NOT EXISTS calendar_sync_tenant_idx
  ON calendar_sync (tenant_id);

CREATE INDEX IF NOT EXISTS calendar_sync_tenant_provider_idx
  ON calendar_sync (tenant_id, provider);

CREATE INDEX IF NOT EXISTS calendar_sync_webhook_channel_idx
  ON calendar_sync (webhook_channel_id);

-- ============================================================================
-- calendar_sync_items – tracks individual synced items (events)
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_sync_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  calendar_sync_id UUID NOT NULL REFERENCES calendar_sync(id) ON DELETE CASCADE,

  entity_type VARCHAR(30) NOT NULL,          -- corso | lezione | evento
  entity_id UUID NOT NULL,

  external_event_id VARCHAR(255) NOT NULL,

  last_synced_at TIMESTAMPTZ NOT NULL,
  sync_hash VARCHAR(64) NOT NULL,            -- hash of synced data to detect changes

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT calendar_sync_items_sync_entity_unique
    UNIQUE (calendar_sync_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS calendar_sync_items_tenant_idx
  ON calendar_sync_items (tenant_id);

CREATE INDEX IF NOT EXISTS calendar_sync_items_tenant_sync_idx
  ON calendar_sync_items (tenant_id, calendar_sync_id);

CREATE INDEX IF NOT EXISTS calendar_sync_items_tenant_entity_idx
  ON calendar_sync_items (tenant_id, entity_type, entity_id);

-- ============================================================================
-- cloud_storage_links – tracks files stored in Google Drive / OneDrive
-- ============================================================================

CREATE TABLE IF NOT EXISTS cloud_storage_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  provider VARCHAR(30) NOT NULL,             -- google_drive | microsoft_onedrive
  entity_type VARCHAR(30) NOT NULL,          -- socio | certificato | documento | evento | comunicazione
  entity_id UUID NOT NULL,

  external_file_id VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER,

  external_url TEXT,                         -- web view URL
  external_folder_id VARCHAR(255),

  uploaded_by UUID REFERENCES utenti(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cloud_storage_links_tenant_idx
  ON cloud_storage_links (tenant_id);

CREATE INDEX IF NOT EXISTS cloud_storage_links_tenant_entity_idx
  ON cloud_storage_links (tenant_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS cloud_storage_links_tenant_provider_idx
  ON cloud_storage_links (tenant_id, provider);

CREATE INDEX IF NOT EXISTS cloud_storage_links_external_file_idx
  ON cloud_storage_links (external_file_id);

-- ============================================================================
-- Enable RLS on new tables
-- ============================================================================

ALTER TABLE calendar_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_storage_links ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Tenant isolation policies
-- ============================================================================

CREATE POLICY tenant_isolation ON calendar_sync
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation ON calendar_sync_items
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation ON cloud_storage_links
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);
