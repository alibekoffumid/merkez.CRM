-- Create a dedicated table for dental staff (doctors)
-- This avoids RLS issues with the system 'profiles' table 
-- and doesn't require creating auth users for every doctor.

CREATE TABLE IF NOT EXISTS dental_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT DEFAULT 'Dentist',
  color TEXT DEFAULT 'bg-blue-500',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE dental_staff ENABLE ROW LEVEL SECURITY;

-- Allow all actions for now (admin-only logic should be in frontend or complex RLS)
CREATE POLICY "dental_staff_all" ON dental_staff FOR ALL USING (true);

-- Seed with some initial dental staff if needed
INSERT INTO dental_staff (name, specialty, color) VALUES 
('Dr. Sarah Wilson', 'Orthodontist', 'bg-blue-500'),
('Dr. James Chen', 'General Dentist', 'bg-emerald-500'),
('Dr. Elena Rossi', 'Oral Surgeon', 'bg-purple-500');
