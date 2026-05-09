-- Migration 00029: Strict RLS for all tables
-- This ensures users ONLY see their own data and not seed/public data.

DROP POLICY IF EXISTS "Users can manage products" ON products;
CREATE POLICY "Users can manage products" ON products 
FOR ALL USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage categories" ON categories;
CREATE POLICY "Users can manage categories" ON categories 
FOR ALL USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage ingredients" ON ingredients;
CREATE POLICY "Users can manage ingredients" ON ingredients 
FOR ALL USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
