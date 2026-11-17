-- Print Jobs: Queue for warehouse orders, assembly sheets, and thermal printing jobs
-- Run this script in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  warehouse_id UUID,
  title TEXT NOT NULL DEFAULT 'Sklada sifariş',
  job_type TEXT NOT NULL DEFAULT 'assembly_sheet',
  content TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'printed', 'cancelled', 'failed')),
  error_message TEXT,
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

-- Policies for Authenticated users
DROP POLICY IF EXISTS "Authenticated users can read print_jobs" ON print_jobs;
CREATE POLICY "Authenticated users can read print_jobs"
  ON print_jobs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert print_jobs" ON print_jobs;
CREATE POLICY "Authenticated users can insert print_jobs"
  ON print_jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update print_jobs" ON print_jobs;
CREATE POLICY "Authenticated users can update print_jobs"
  ON print_jobs FOR UPDATE
  TO authenticated
  USING (true);

-- Policies for Anon / API client polling from warehouse PC
DROP POLICY IF EXISTS "Anon users can read print_jobs" ON print_jobs;
CREATE POLICY "Anon users can read print_jobs"
  ON print_jobs FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Anon users can update print_jobs" ON print_jobs;
CREATE POLICY "Anon users can update print_jobs"
  ON print_jobs FOR UPDATE
  TO anon
  USING (true);

-- Indexes for polling
CREATE INDEX IF NOT EXISTS idx_print_jobs_status_created ON print_jobs(status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_print_jobs_warehouse ON print_jobs(warehouse_id);

-- Enable Supabase Realtime for instant event delivery
ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs;
