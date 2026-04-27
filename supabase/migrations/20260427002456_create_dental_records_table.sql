CREATE TABLE IF NOT EXISTS public.dental_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_name TEXT NOT NULL,
  procedure_type TEXT,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  doctor_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'SCHEDULED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  business_id UUID
);

-- Enable RLS
ALTER TABLE public.dental_records ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write for now to avoid RLS issues during testing
CREATE POLICY "Allow all access to authenticated users" ON public.dental_records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
