-- Tenant Modules: tracks which modules each tenant has activated
CREATE TABLE IF NOT EXISTS tenant_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  module_id TEXT NOT NULL,           -- 'dental', 'education', 'crm', etc.
  is_active BOOLEAN DEFAULT true,
  plan TEXT DEFAULT 'trial',         -- 'trial', 'monthly', 'yearly'
  price_monthly DECIMAL(10, 2),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, module_id)
);

-- Allow public access for now (will be restricted later with proper RLS)
ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to tenant_modules" ON tenant_modules FOR ALL USING (true) WITH CHECK (true);
