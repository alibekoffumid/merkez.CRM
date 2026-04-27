-- Add cost to tooth history and create prices table
ALTER TABLE dental_tooth_history ADD COLUMN IF NOT EXISTS cost NUMERIC DEFAULT 0;

CREATE TABLE IF NOT EXISTS dental_prices (
  condition TEXT PRIMARY KEY,
  price NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE dental_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dental_prices_all" ON dental_prices FOR ALL USING (true);
