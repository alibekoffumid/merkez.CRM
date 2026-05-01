-- Extension for Personnel and Tables
-- 1. Add Deposit fields to restaurant_tables
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Table';
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS has_deposit BOOLEAN DEFAULT false;
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2) DEFAULT 0;

-- 2. Create Staff table
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  shift TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
CREATE POLICY "Allow public read staff" ON staff FOR SELECT USING (true);
CREATE POLICY "Allow public insert staff" ON staff FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update staff" ON staff FOR UPDATE USING (true);
CREATE POLICY "Allow public delete staff" ON staff FOR DELETE USING (true);

-- Also ensure tables have full CRUD policies (if not already set)
CREATE POLICY "Allow public insert tables" ON restaurant_tables FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update tables" ON restaurant_tables FOR UPDATE USING (true);
CREATE POLICY "Allow public delete tables" ON restaurant_tables FOR DELETE USING (true);

-- 5. Seed Staff Data
INSERT INTO staff (name, role, shift, status) VALUES 
('Alice Walker', 'Head Waiter', 'Morning', 'Active'),
('Bob Harris', 'Waiter', 'Morning', 'Active'),
('Charlie Dean', 'Chef', 'Evening', 'Active'),
('Diana King', 'Waiter', 'Evening', 'On Leave'),
('Evan Cole', 'Bartender', 'Morning', 'Active');
