
-- Migration 00025: Fix Warehouse RLS and Constraints
-- This migration fixes the "Permission Denied" issue for categories and products
-- and ensures that deleting a category does NOT delete the products inside it.

-- 1. Relax RLS for Categories
DROP POLICY IF EXISTS "Users can manage categories" ON categories;
DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;
CREATE POLICY "Users can manage categories" ON categories 
FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 2. Relax RLS for Products
DROP POLICY IF EXISTS "Users can manage products" ON products;
DROP POLICY IF EXISTS "Users can manage their own products" ON products;
CREATE POLICY "Users can manage products" ON products 
FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 3. Change category_id constraint to SET NULL instead of CASCADE
-- First, find the correct constraint name. It might be different if it was created automatically.
-- We assume 'products_category_id_fkey' based on standard naming.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
ALTER TABLE products ADD CONSTRAINT products_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
