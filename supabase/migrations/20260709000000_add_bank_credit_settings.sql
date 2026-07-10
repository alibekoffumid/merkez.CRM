-- Create bank_credit_settings table
CREATE TABLE IF NOT EXISTS bank_credit_settings (
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
ALTER TABLE bank_credit_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON bank_credit_settings;
CREATE POLICY "Enable all for authenticated users" ON bank_credit_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default rates for 6 banks
INSERT INTO bank_credit_settings (bank_name, months, bank_percent, tax_percent, store_percent) VALUES
-- Birkart (Kapital Bank)
('Birkart', 3, 4.0, 1.0, 0.5),
('Birkart', 6, 8.0, 2.0, 1.0),
('Birkart', 12, 12.0, 3.0, 0.5),
('Birkart', 18, 17.0, 4.0, 1.5),
('Birkart', 24, 20.0, 4.5, 1.5),
('Birkart', 30, 23.0, 5.0, 2.0),
('Birkart', 36, 26.0, 6.0, 2.0),

-- Tamkart (ABB)
('Tamkart', 3, 3.5, 1.0, 0.5),
('Tamkart', 6, 7.5, 2.0, 1.0),
('Tamkart', 12, 11.5, 3.0, 0.5),
('Tamkart', 18, 16.0, 4.0, 1.5),
('Tamkart', 24, 17.8, 4.0, 1.5), -- User's exact value!
('Tamkart', 30, 21.0, 5.0, 2.0),
('Tamkart', 36, 24.0, 6.0, 2.0),

-- Bolkart (Bank of Baku)
('Bolkart', 3, 4.5, 1.0, 0.5),
('Bolkart', 6, 8.5, 2.0, 1.0),
('Bolkart', 12, 12.5, 3.0, 0.5),
('Bolkart', 18, 17.5, 4.0, 1.5),
('Bolkart', 24, 20.5, 4.5, 1.5),
('Bolkart', 30, 23.5, 5.0, 2.0),
('Bolkart', 36, 26.5, 6.0, 2.0),

-- Leo (Unibank)
('Leocard', 3, 3.0, 1.0, 0.5),
('Leocard', 6, 7.0, 2.0, 1.0),
('Leocard', 12, 11.0, 3.0, 0.5),
('Leocard', 18, 15.5, 4.0, 1.5),
('Leocard', 24, 18.5, 4.5, 1.5),
('Leocard', 30, 21.5, 5.0, 2.0),
('Leocard', 36, 24.5, 6.0, 2.0),

-- Ucard (Bank Respublika)
('Ucard', 3, 3.2, 1.0, 0.5),
('Ucard', 6, 7.2, 2.0, 1.0),
('Ucard', 12, 11.2, 3.0, 0.5),
('Ucard', 18, 15.8, 4.0, 1.5),
('Ucard', 24, 18.8, 4.5, 1.5),
('Ucard', 30, 21.8, 5.0, 2.0),
('Ucard', 36, 24.8, 6.0, 2.0),

-- Worldcard (Yapı Kredi)
('Worldcard', 3, 3.8, 1.0, 0.5),
('Worldcard', 6, 7.8, 2.0, 1.0),
('Worldcard', 12, 11.8, 3.0, 0.5),
('Worldcard', 18, 16.2, 4.0, 1.5),
('Worldcard', 24, 19.2, 4.5, 1.5),
('Worldcard', 30, 22.2, 5.0, 2.0),
('Worldcard', 36, 25.2, 6.0, 2.0)
ON CONFLICT (bank_name, months) DO UPDATE SET
  bank_percent = EXCLUDED.bank_percent,
  tax_percent = EXCLUDED.tax_percent,
  store_percent = EXCLUDED.store_percent;
