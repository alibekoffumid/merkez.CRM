-- Inventory & Food Cost: New Tables

-- 1. Ingredients (Raw materials)
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg', -- kg, liter, pcs, etc.
  quantity NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
  min_quantity NUMERIC(10, 3) NOT NULL DEFAULT 10.000,
  cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Product Recipes (Bridge table for Dishes -> Ingredients)
CREATE TABLE IF NOT EXISTS product_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC(10, 3) NOT NULL, -- e.g. 0.200 kg for a pizza
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, ingredient_id)
);

-- 3. Warehouse Transactions (Audit log for stock movements)
CREATE TABLE IF NOT EXISTS warehouse_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'in', 'out', 'adjust'
  quantity NUMERIC(10, 3) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read ingredients" ON ingredients FOR SELECT USING (true);
CREATE POLICY "Allow public all ingredients" ON ingredients FOR ALL USING (true);

CREATE POLICY "Allow public read product_recipes" ON product_recipes FOR SELECT USING (true);
CREATE POLICY "Allow public all product_recipes" ON product_recipes FOR ALL USING (true);

CREATE POLICY "Allow public read warehouse_transactions" ON warehouse_transactions FOR SELECT USING (true);
CREATE POLICY "Allow public all warehouse_transactions" ON warehouse_transactions FOR ALL USING (true);

-- Seed some ingredients
INSERT INTO ingredients (name, unit, quantity, cost_price, min_quantity) VALUES 
('Flour', 'kg', 50.000, 1.20, 10.000),
('Mozzarella', 'kg', 20.000, 8.50, 5.000),
('Tomato Sauce', 'liter', 30.000, 2.00, 5.000),
('Pepperoni', 'kg', 10.000, 12.00, 2.000),
('Beef Patty', 'pcs', 100.000, 1.50, 20.000),
('Burger Bun', 'pcs', 120.000, 0.50, 20.000),
('Lettuce', 'kg', 5.000, 3.00, 1.000);
