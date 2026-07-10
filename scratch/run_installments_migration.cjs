const { Client } = require('../node_modules/pg');

const query = `
-- Create customer_credits and customer_credit_installments tables
CREATE TABLE IF NOT EXISTS customer_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  total_amount NUMERIC NOT NULL,
  months INTEGER NOT NULL,
  monthly_payment NUMERIC NOT NULL,
  remaining_months INTEGER NOT NULL,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_credit_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id UUID REFERENCES customer_credits(id) ON DELETE CASCADE,
  month_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE,
  paid_amount NUMERIC DEFAULT 0,
  paid_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'unpaid'
);

-- Enable RLS
ALTER TABLE customer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credit_installments ENABLE ROW LEVEL SECURITY;

-- Create policies (or simple select/insert/update/delete policies)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON customer_credits;
CREATE POLICY "Enable all for authenticated users" ON customer_credits
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON customer_credit_installments;
CREATE POLICY "Enable all for authenticated users" ON customer_credit_installments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
`;

async function run() {
  const connectionString = 'postgresql://postgres:postgres@localhost:54322/postgres';
  const client = new Client({ connectionString });
  
  console.log("Connecting to local emulator database (localhost:54322)...");
  try {
    await client.connect();
    console.log("Connected successfully! Running installments migration...");
    await client.query(query);
    console.log("Migration executed successfully on local database!");
  } catch (err) {
    console.log("Local database migration warning/failure:", err.message);
  } finally {
    await client.end();
  }
}

run();
