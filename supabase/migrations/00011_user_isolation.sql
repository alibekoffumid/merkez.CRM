-- Migration 00011: User Isolation & Multi-Tenancy

-- 1. Update Profiles table to include Business Name
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name TEXT;

-- 2. Update handle_new_user function to include business_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, business_name, preferred_language)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'business_name',
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'ru')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add user_id to core tables
DO $$ 
BEGIN
    -- Categories
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='user_id') THEN
        ALTER TABLE categories ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;

    -- Products
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='user_id') THEN
        ALTER TABLE products ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;

    -- Restaurant Tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_tables' AND column_name='user_id') THEN
        ALTER TABLE restaurant_tables ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;

    -- Customers
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='user_id') THEN
        ALTER TABLE customers ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;

    -- Orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='user_id') THEN
        ALTER TABLE orders ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;

    -- Staff
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='user_id') THEN
        ALTER TABLE staff ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;

    -- Ingredients
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingredients' AND column_name='user_id') THEN
        ALTER TABLE ingredients ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;

    -- Warehouse Transactions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='warehouse_transactions' AND column_name='user_id') THEN
        ALTER TABLE warehouse_transactions ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;

    -- Product Recipes (if needed, but usually linked through products)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_recipes' AND column_name='user_id') THEN
        ALTER TABLE product_recipes ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
END $$;

-- 4. Enable RLS and setup strict ownership policies
-- Drop old permissive policies first
DROP POLICY IF EXISTS "Allow public all categories" ON categories;
DROP POLICY IF EXISTS "Allow public read categories" ON categories;
CREATE POLICY "Users can manage their own categories" ON categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public all products" ON products;
DROP POLICY IF EXISTS "Allow public read products" ON products;
CREATE POLICY "Users can manage their own products" ON products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public all tables" ON restaurant_tables;
DROP POLICY IF EXISTS "Allow public read tables" ON restaurant_tables;
DROP POLICY IF EXISTS "Allow public insert tables" ON restaurant_tables;
DROP POLICY IF EXISTS "Allow public update tables" ON restaurant_tables;
DROP POLICY IF EXISTS "Allow public delete tables" ON restaurant_tables;
CREATE POLICY "Users can manage their own tables" ON restaurant_tables FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public all customers" ON customers;
DROP POLICY IF EXISTS "Allow public read customers" ON customers;
CREATE POLICY "Users can manage their own customers" ON customers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public all orders" ON orders;
CREATE POLICY "Users can manage their own orders" ON orders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public all order_items" ON order_items;
-- Order items are protected via their relationship with orders
-- But for extra security we could add user_id here too, or use a complex policy
-- For now, let's just make sure they are only accessible if the parent order is accessible
CREATE POLICY "Users can manage their own order_items" ON order_items FOR ALL 
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

DROP POLICY IF EXISTS "Allow public all staff" ON staff;
DROP POLICY IF EXISTS "Allow public read staff" ON staff;
DROP POLICY IF EXISTS "Allow public insert staff" ON staff;
DROP POLICY IF EXISTS "Allow public update staff" ON staff;
DROP POLICY IF EXISTS "Allow public delete staff" ON staff;
CREATE POLICY "Users can manage their own staff" ON staff FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public all ingredients" ON ingredients;
DROP POLICY IF EXISTS "Allow public read ingredients" ON ingredients;
CREATE POLICY "Users can manage their own ingredients" ON ingredients FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public all warehouse_transactions" ON warehouse_transactions;
DROP POLICY IF EXISTS "Allow public read warehouse_transactions" ON warehouse_transactions;
CREATE POLICY "Users can manage their own warehouse_trans" ON warehouse_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public all product_recipes" ON product_recipes;
DROP POLICY IF EXISTS "Allow public read product_recipes" ON product_recipes;
CREATE POLICY "Users can manage their own recipes" ON product_recipes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
