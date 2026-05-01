-- Migration 00013: Financial Reporting & Expenses
-- 1. Update Staff table to include salary info
ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary_type TEXT DEFAULT 'monthly'; -- 'monthly' or 'hourly'

-- 2. Create Staff Payouts table
CREATE TABLE IF NOT EXISTS staff_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create General Expenses table
CREATE TABLE IF NOT EXISTS business_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'Rent', 'Utilities', 'Marketing', 'Supplies', 'Other'
  description TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE staff_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_expenses ENABLE ROW LEVEL SECURITY;

-- 5. Policies (Multi-Tenancy)
CREATE POLICY "Users can manage their own staff_payments" ON staff_payments 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own business_expenses" ON business_expenses 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Seed examples (optional, better for dev only)
-- COMMENTED OUT: Leave for user to input actual data
-- INSERT INTO business_expenses (category, description, amount) VALUES ('Rent', 'Monthly rent payment', 2500);
