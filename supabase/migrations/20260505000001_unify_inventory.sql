-- Migration: Unify Inventory System
-- Description: Merges retail_products into products and adds multi-tenancy support.

-- 1. Update Categories for multi-tenancy
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Update Products with Retail and Multi-tenancy fields
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC(10, 3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS critical_stock NUMERIC(10, 3) DEFAULT 5,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'finished_good'; -- 'finished_good', 'ingredient', 'service', 'supply'

-- 3. Update Ingredients for multi-tenancy
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 4. Update Warehouse Transactions for multi-tenancy
ALTER TABLE public.warehouse_transactions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE CASCADE;

-- 5. Strict RLS Policies (Cleanup public ones)
DROP POLICY IF EXISTS "Allow public all categories" ON categories;
DROP POLICY IF EXISTS "Allow public all products" ON products;
DROP POLICY IF EXISTS "Allow public all ingredients" ON ingredients;
DROP POLICY IF EXISTS "Allow public all warehouse_transactions" ON warehouse_transactions;
DROP POLICY IF EXISTS "Allow public read categories" ON categories;
DROP POLICY IF EXISTS "Allow public read products" ON products;
DROP POLICY IF EXISTS "Allow public read ingredients" ON ingredients;
DROP POLICY IF EXISTS "Allow public read warehouse_transactions" ON warehouse_transactions;

-- New Secure Policies
DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;
CREATE POLICY "Users can manage their own categories" ON categories 
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own products" ON products;
CREATE POLICY "Users can manage their own products" ON products 
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own ingredients" ON ingredients;
CREATE POLICY "Users can manage their own ingredients" ON ingredients 
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own transactions" ON warehouse_transactions;
CREATE POLICY "Users can manage their own transactions" ON warehouse_transactions 
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 6. Update process_retail_sale to use products instead of retail_products
CREATE OR REPLACE FUNCTION process_retail_sale(
    p_user_id UUID,
    p_total_amount NUMERIC,
    p_tax_amount NUMERIC,
    p_payment_method TEXT,
    p_items JSONB -- Array of {product_id, quantity, price_at_sale, excise_stamp}
)
RETURNS UUID AS $$
DECLARE
    v_sale_id UUID;
    v_item RECORD;
BEGIN
    -- 1. Create Sale record
    INSERT INTO retail_sales (user_id, total_amount, tax_amount, payment_method)
    VALUES (p_user_id, p_total_amount, p_tax_amount, p_payment_method)
    RETURNING id INTO v_sale_id;

    -- 2. Process items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity NUMERIC, price_at_sale NUMERIC, excise_stamp TEXT)
    LOOP
        -- Insert sale item
        INSERT INTO retail_sale_items (sale_id, product_id, quantity, price_at_sale, excise_stamp, total)
        VALUES (v_sale_id, v_item.product_id, v_item.quantity, v_item.price_at_sale, v_item.excise_stamp, v_item.quantity * v_item.price_at_sale);

        -- Deduct stock from the UNIFIED products table
        UPDATE products
        SET stock_quantity = stock_quantity - v_item.quantity
        WHERE id = v_item.product_id AND user_id = p_user_id;
        
        -- Log transaction
        INSERT INTO warehouse_transactions (user_id, product_id, type, quantity, notes)
        VALUES (p_user_id, v_item.product_id, 'out', v_item.quantity, 'Retail Sale: ' || v_sale_id);
    END LOOP;

    RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
