-- Drop tables if exist
DROP TABLE IF EXISTS credit_banks;
DROP TABLE IF EXISTS bank_credit_tariffs;

-- Create bank_credit_tariffs table
CREATE TABLE IF NOT EXISTS bank_credit_tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name VARCHAR(50) NOT NULL,
  months INTEGER NOT NULL,
  bank_percent NUMERIC NOT NULL DEFAULT 0,
  tax_percent NUMERIC NOT NULL DEFAULT 4.0,
  store_percent NUMERIC NOT NULL DEFAULT 1.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(bank_name, months)
);

-- Enable RLS
ALTER TABLE bank_credit_tariffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON bank_credit_tariffs;
CREATE POLICY "Enable all for authenticated users" ON bank_credit_tariffs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default rates for exactly 9 original plans
INSERT INTO bank_credit_tariffs (bank_name, months, bank_percent, tax_percent, store_percent) VALUES
-- 1. ABB Kredit (default_tax = 4.0, default_shop = 1.5)
('ABB Kredit', 1, 0.0, 4.0, 1.5),
('ABB Kredit', 2, 2.0, 4.0, 1.5),
('ABB Kredit', 3, 3.0, 4.0, 1.5),
('ABB Kredit', 6, 5.5, 4.0, 1.5),
('ABB Kredit', 9, 8.0, 4.0, 1.5),
('ABB Kredit', 12, 10.0, 4.0, 1.5),
('ABB Kredit', 18, 17.0, 4.0, 1.5),
('ABB Kredit', 24, 23.0, 4.0, 1.5),

-- 2. Birkart (Kapital Bank) (default_tax = 4.0, default_shop = 1.5)
('Birkart (Kapital Bank)', 2, 3.2, 4.0, 1.5),
('Birkart (Kapital Bank)', 3, 4.3, 4.0, 1.5),
('Birkart (Kapital Bank)', 6, 7.4, 4.0, 1.5),
('Birkart (Kapital Bank)', 9, 10.0, 4.0, 1.5),
('Birkart (Kapital Bank)', 12, 13.0, 4.0, 1.5),
('Birkart (Kapital Bank)', 18, 17.0, 4.0, 1.5),

-- 3. Tamkart (ABB) (default_tax = 4.0, default_shop = 1.5)
('Tamkart (ABB)', 2, 3.0, 4.0, 1.5),
('Tamkart (ABB)', 3, 4.1, 4.0, 1.5),
('Tamkart (ABB)', 6, 7.2, 4.0, 1.5),
('Tamkart (ABB)', 9, 9.8, 4.0, 1.5),
('Tamkart (ABB)', 12, 12.8, 4.0, 1.5),
('Tamkart (ABB)', 18, 17.1, 4.0, 1.5),
('Tamkart (ABB)', 24, 17.8, 4.0, 1.5),

-- 4. Kapital Kredit 35 (default_tax = 4.0, default_shop = 1.5)
('Kapital Kredit 35', 2, 4.0, 4.0, 1.5),
('Kapital Kredit 35', 3, 5.5, 4.0, 1.5),
('Kapital Kredit 35', 6, 8.5, 4.0, 1.5),
('Kapital Kredit 35', 12, 15.5, 4.0, 1.5),
('Kapital Kredit 35', 18, 24.0, 4.0, 1.5),
('Kapital Kredit 35', 24, 30.0, 4.0, 1.5),
('Kapital Kredit 35', 35, 46.0, 4.0, 1.5),

-- 5. Ferrum Standart (default_tax = 4.0, default_shop = 1.65)
('Ferrum Standart', 3, 10.0, 4.0, 1.65),
('Ferrum Standart', 6, 15.0, 4.0, 1.65),
('Ferrum Standart', 9, 19.0, 4.0, 1.65),
('Ferrum Standart', 12, 24.0, 4.0, 1.65),

-- 6. Ferrum Fast (default_tax = 4.0, default_shop = 1.65)
('Ferrum Fast', 3, 18.0, 4.0, 1.65),
('Ferrum Fast', 6, 22.0, 4.0, 1.65),

-- 7. Ferrum DTI (default_tax = 4.0, default_shop = 1.65)
('Ferrum DTI', 3, 8.0, 4.0, 1.65),
('Ferrum DTI', 6, 12.0, 4.0, 1.65),
('Ferrum DTI', 9, 16.0, 4.0, 1.65),
('Ferrum DTI', 12, 19.0, 4.0, 1.65)
ON CONFLICT (bank_name, months) DO UPDATE SET
  bank_percent = EXCLUDED.bank_percent,
  tax_percent = EXCLUDED.tax_percent,
  store_percent = EXCLUDED.store_percent;
