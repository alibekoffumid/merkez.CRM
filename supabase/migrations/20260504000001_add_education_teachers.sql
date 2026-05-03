-- 20260504000001_add_education_teachers.sql

-- Teachers Table
CREATE TABLE IF NOT EXISTS education_teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  specialization TEXT, -- e.g., 'Piano', 'Vocal', 'Fine Arts'
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE education_teachers ENABLE ROW LEVEL SECURITY;

-- Allow all for now
CREATE POLICY "Public Access" ON education_teachers FOR ALL USING (true);
