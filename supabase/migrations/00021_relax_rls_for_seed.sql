
-- Migration 00021: Relax RLS for Categories and Products to allow management of common/seed data
-- This ensures that rows created without a user_id (e.g. initial seed) are manageable by authenticated users.

-- 1. Categories
DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;
CREATE POLICY "Users can manage categories" ON categories 
FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 2. Products
DROP POLICY IF EXISTS "Users can manage their own products" ON products;
CREATE POLICY "Users can manage products" ON products 
FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 3. Update existing NULL user_ids to the current user if possible (optional but helpful)
-- Note: We can't do this reliably in a static migration, so we rely on the policy above.
