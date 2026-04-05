-- Support for Loyalty System and Move Table operations

-- 1. Update orders table to link with customers and track discounts
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_earned NUMERIC(10, 2) DEFAULT 0;

-- 2. Update customers table to store loyalty details
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bonus_balance NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_spent NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS discount_rate NUMERIC(10, 2) DEFAULT 0; -- Fixed discount % if any

-- 3. Comments for clarity
COMMENT ON COLUMN orders.customer_id IS 'Link to the CRM customer for loyalty tracking.';
COMMENT ON COLUMN customers.bonus_balance IS 'Available cashback/points for the customer.';
COMMENT ON COLUMN customers.birthday IS 'Used for automatic birthday discounts.';
