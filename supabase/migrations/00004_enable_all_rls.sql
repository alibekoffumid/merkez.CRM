-- Enable full CRUD for public (for development/demo purposes)
-- In production, these should be restricted to authenticated users.

-- Categories
DROP POLICY IF EXISTS "Allow public read categories" ON categories;
CREATE POLICY "Allow public all categories" ON categories FOR ALL USING (true) WITH CHECK (true);

-- Products
DROP POLICY IF EXISTS "Allow public read products" ON products;
CREATE POLICY "Allow public all products" ON products FOR ALL USING (true) WITH CHECK (true);

-- Tables
DROP POLICY IF EXISTS "Allow public read tables" ON restaurant_tables;
CREATE POLICY "Allow public all tables" ON restaurant_tables FOR ALL USING (true) WITH CHECK (true);

-- Customers
DROP POLICY IF EXISTS "Allow public read customers" ON customers;
CREATE POLICY "Allow public all customers" ON customers FOR ALL USING (true) WITH CHECK (true);
