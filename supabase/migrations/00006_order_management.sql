-- Order Management Schema
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, preparing, ready, served, paid
  total_amount NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,
  notes TEXT,
  status TEXT DEFAULT 'new', -- new, preparing, ready, served
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policies for public access (demo)
CREATE POLICY "Allow public all orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
