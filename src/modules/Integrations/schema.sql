-- schema.sql
-- Integrations Module (Omnichannel)
-- Run this in your Supabase SQL Editor

-- 1. Integration Channels (Connectors)
CREATE TABLE IF NOT EXISTS integration_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('whatsapp', 'instagram', 'telephony')),
  name TEXT NOT NULL, -- e.g., "Main WhatsApp", "Direct Support"
  settings JSONB NOT NULL DEFAULT '{}', -- Store API Keys, tokens, numbers
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'error', 'maintenance')),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Integration Contacts (Omnichannel profiles linked to CRM)
CREATE TABLE IF NOT EXISTS integration_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  crm_contact_id UUID, -- Optional link to main CRM contacts table
  external_id TEXT NOT NULL, -- WhatsApp ID, Insta handle, Phone number
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
  metadata JSONB DEFAULT '{}', -- Store message IDs from providers, media URLs, etc.
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'missed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON integration_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact ON integration_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_external ON integration_contacts(external_id);

-- Enable RLS
ALTER TABLE integration_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_messages ENABLE ROW LEVEL SECURITY;

-- Example Policies
-- CREATE POLICY "Tenant Isolation Channels" ON integration_channels USING (tenant_id = auth.uid());
-- CREATE POLICY "Tenant Isolation Contacts" ON integration_contacts USING (tenant_id = auth.uid());
-- CREATE POLICY "Tenant Isolation Messages" ON integration_messages USING (tenant_id = auth.uid());
