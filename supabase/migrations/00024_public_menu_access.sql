-- Migration: Allow public read access to categories and products for QR Menu
-- This allows anyone to view the menu if they have the business ID (user_id)

-- 1. Categories
DROP POLICY IF EXISTS "Allow public read categories for menu" ON public.categories;
CREATE POLICY "Allow public read categories for menu" 
    ON public.categories FOR SELECT 
    USING (true); -- We allow viewing all categories, filtered by user_id in the app

-- 2. Products
DROP POLICY IF EXISTS "Allow public read products for menu" ON public.products;
CREATE POLICY "Allow public read products for menu" 
    ON public.products FOR SELECT 
    USING (true); -- We allow viewing all products, filtered by user_id in the app

-- Note: We already have RLS enabled, so we just add these permissive SELECT policies.
-- The application code (PublicMenu.jsx) correctly filters by user_id.
