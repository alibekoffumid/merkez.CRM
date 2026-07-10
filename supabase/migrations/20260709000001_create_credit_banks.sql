-- Drop old table if exists
DROP TABLE IF EXISTS bank_credit_settings;

-- Create credit_banks table
CREATE TABLE IF NOT EXISTS credit_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name VARCHAR(50) NOT NULL,
  months INTEGER NOT NULL,
  bank_percent NUMERIC NOT NULL DEFAULT 0,
  tax_percent NUMERIC NOT NULL DEFAULT 0,
  store_percent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(bank_name, months)
);

-- Enable RLS
ALTER TABLE credit_banks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON credit_banks;
CREATE POLICY "Enable all for authenticated users" ON credit_banks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default rates for exactly 9 original tables/sheets
INSERT INTO credit_banks (bank_name, months, bank_percent, tax_percent, store_percent) VALUES
-- 1. ABB Kredit
('ABB Kredit', 3, 3.0, 1.0, 0.5),
('ABB Kredit', 6, 6.5, 2.0, 1.0),
('ABB Kredit', 12, 10.5, 3.0, 0.5),
('ABB Kredit', 18, 15.0, 4.0, 1.5),
('ABB Kredit', 24, 18.0, 4.5, 1.5),
('ABB Kredit', 30, 21.0, 5.0, 2.0),
('ABB Kredit', 36, 24.0, 6.0, 2.0),

-- 2. Birkart (Kapital Bank)
('Birkart (Kapital Bank)', 3, 4.0, 1.0, 0.5),
('Birkart (Kapital Bank)', 6, 8.0, 2.0, 1.0),
('Birkart (Kapital Bank)', 12, 12.0, 3.0, 0.5),
('Birkart (Kapital Bank)', 18, 17.0, 4.0, 1.5),
('Birkart (Kapital Bank)', 24, 20.0, 4.5, 1.5),
('Birkart (Kapital Bank)', 30, 23.0, 5.0, 2.0),
('Birkart (Kapital Bank)', 36, 26.0, 6.0, 2.0),

-- 3. Tamkart (ABB)
('Tamkart (ABB)', 3, 3.5, 1.0, 0.5),
('Tamkart (ABB)', 6, 7.5, 2.0, 1.0),
('Tamkart (ABB)', 12, 11.5, 3.0, 0.5),
('Tamkart (ABB)', 18, 16.0, 4.0, 1.5),
('Tamkart (ABB)', 24, 17.8, 4.0, 1.5), -- User's exact value!
('Tamkart (ABB)', 30, 21.0, 5.0, 2.0),
('Tamkart (ABB)', 36, 24.0, 6.0, 2.0),

-- 4. Kapital Kredit 35
('Kapital Kredit 35', 3, 3.5, 1.0, 0.5),
('Kapital Kredit 35', 6, 7.0, 2.0, 1.0),
('Kapital Kredit 35', 12, 11.0, 3.0, 0.5),
('Kapital Kredit 35', 18, 16.0, 4.0, 1.5),
('Kapital Kredit 35', 24, 19.0, 4.5, 1.5),
('Kapital Kredit 35', 30, 22.0, 5.0, 2.0),
('Kapital Kredit 35', 36, 25.0, 6.0, 2.0),

-- 5. Ferrum (Standart)
('Ferrum (Standart)', 3, 4.0, 1.0, 0.5),
('Ferrum (Standart)', 6, 8.0, 2.0, 1.0),
('Ferrum (Standart)', 12, 12.0, 3.0, 0.5),
('Ferrum (Standart)', 18, 17.0, 4.0, 1.5),
('Ferrum (Standart)', 24, 20.0, 4.5, 1.5),
('Ferrum (Standart)', 30, 23.0, 5.0, 2.0),
('Ferrum (Standart)', 36, 26.0, 6.0, 2.0),

-- 6. Ferrum (Fast)
('Ferrum (Fast)', 3, 4.5, 1.0, 0.5),
('Ferrum (Fast)', 6, 9.0, 2.0, 1.0),
('Ferrum (Fast)', 12, 13.5, 3.0, 0.5),
('Ferrum (Fast)', 18, 18.5, 4.0, 1.5),
('Ferrum (Fast)', 24, 21.5, 4.5, 1.5),
('Ferrum (Fast)', 30, 24.5, 5.0, 2.0),
('Ferrum (Fast)', 36, 27.5, 6.0, 2.0),

-- 7. Ferrum (DTI)
('Ferrum (DTI)', 3, 3.5, 1.0, 0.5),
('Ferrum (DTI)', 6, 7.0, 2.0, 1.0),
('Ferrum (DTI)', 12, 11.0, 3.0, 0.5),
('Ferrum (DTI)', 18, 15.5, 4.0, 1.5),
('Ferrum (DTI)', 24, 18.5, 4.5, 1.5),
('Ferrum (DTI)', 30, 21.5, 5.0, 2.0),
('Ferrum (DTI)', 36, 24.5, 6.0, 2.0),

-- 8. Birmarket (Alətlər)
('Birmarket (Alətlər)', 3, 4.0, 1.0, 0.5),
('Birmarket (Alətlər)', 6, 8.0, 2.0, 1.0),
('Birmarket (Alətlər)', 12, 12.0, 3.0, 0.5),
('Birmarket (Alətlər)', 18, 17.0, 4.0, 1.5),
('Birmarket (Alətlər)', 24, 20.0, 4.5, 1.5),
('Birmarket (Alətlər)', 30, 23.0, 5.0, 2.0),
('Birmarket (Alətlər)', 36, 26.0, 6.0, 2.0),

-- 9. Birmarket (Aksesuarlar)
('Birmarket (Aksesuarlar)', 3, 5.0, 1.0, 0.5),
('Birmarket (Aksesuarlar)', 6, 9.5, 2.0, 1.0),
('Birmarket (Aksesuarlar)', 12, 14.5, 3.0, 0.5),
('Birmarket (Aksesuarlar)', 18, 19.5, 4.0, 1.5),
('Birmarket (Aksesuarlar)', 24, 22.5, 4.5, 1.5),
('Birmarket (Aksesuarlar)', 30, 25.5, 5.0, 2.0),
('Birmarket (Aksesuarlar)', 36, 28.5, 6.0, 2.0)
ON CONFLICT (bank_name, months) DO UPDATE SET
  bank_percent = EXCLUDED.bank_percent,
  tax_percent = EXCLUDED.tax_percent,
  store_percent = EXCLUDED.store_percent;
