CREATE TABLE IF NOT EXISTS dental_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  doctor_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  procedure_type TEXT,
  status TEXT DEFAULT 'SCHEDULED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE dental_appointments ENABLE ROW LEVEL SECURITY;

-- Simple policy: everyone can see and edit for now (you can restrict this later)
CREATE POLICY "Enable all for authenticated users" ON dental_appointments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
