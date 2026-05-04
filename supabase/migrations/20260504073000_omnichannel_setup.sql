-- schema.sql
-- Integrations Module (Omnichannel)

-- 1. Integration Channels (Connectors)
CREATE TABLE IF NOT EXISTS integration_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('whatsapp', 'instagram', 'telephony')),
  name TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'error', 'maintenance')),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Integration Contacts (Omnichannel profiles linked to CRM)
CREATE TABLE IF NOT EXISTS integration_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  crm_contact_id UUID,
  external_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('whatsapp', 'instagram', 'phone')),
  name TEXT,
  avatar_url TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, external_id, source)
);

-- 3. Unified Messages Table
CREATE TABLE IF NOT EXISTS integration_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  channel_id UUID REFERENCES integration_channels(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES integration_contacts(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'audio', 'file', 'call')),
  content TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'missed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON integration_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact ON integration_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_external ON integration_contacts(external_id);

-- Seed WhatsApp Business API credentials for testing
INSERT INTO integration_channels (tenant_id, provider, name, settings, is_verified)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'whatsapp',
  'WhatsApp Business API',
  '{
    "phone_number_id": "1032518393286602",
    "business_account_id": "1761947511459915"
  }',
  true
) ON CONFLICT DO NOTHING;
