-- Migration: Retail Discounts and Item Snapshots
-- Description: Adds fields to store discounts and product names at the time of sale.

-- 1. Update retail_sales table
ALTER TABLE public.retail_sales 
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percent';

-- 2. Update retail_sale_items table
ALTER TABLE public.retail_sale_items 
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percent',
ADD COLUMN IF NOT EXISTS base_price NUMERIC(10, 2); -- Price before discount

-- 3. Update process_retail_sale function to handle new fields
CREATE OR REPLACE FUNCTION process_retail_sale(
    p_user_id UUID,
    p_total_amount NUMERIC,
    p_tax_amount NUMERIC,
    p_payment_method TEXT,
    p_discount_amount NUMERIC,
    p_discount_type TEXT,
    p_items JSONB -- Array of {product_id, product_name, quantity, price_at_sale, base_price, discount_amount, discount_type, excise_stamp}
)
RETURNS UUID AS $$
DECLARE
    v_sale_id UUID;
    v_item RECORD;
BEGIN
    -- 1. Create Sale record with global discount
    INSERT INTO retail_sales (user_id, total_amount, tax_amount, payment_method, discount_amount, discount_type)
    VALUES (p_user_id, p_total_amount, p_tax_amount, p_payment_method, p_discount_amount, p_discount_type)
    RETURNING id INTO v_sale_id;

    -- 2. Process items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id UUID, 
        product_name TEXT, 
        quantity NUMERIC, 
        price_at_sale NUMERIC, 
        base_price NUMERIC,
        discount_amount NUMERIC,
        discount_type TEXT,
        excise_stamp TEXT
    )
    LOOP
        -- Insert sale item with snapshot of name and discount
        INSERT INTO retail_sale_items (
            sale_id, 
            product_id, 
            product_name, 
            quantity, 
            price_at_sale, 
            base_price,
            discount_amount, 
            discount_type, 
            excise_stamp, 
            total
        )
        VALUES (
            v_sale_id, 
            v_item.product_id, 
            v_item.product_name, 
            v_item.quantity, 
            v_item.price_at_sale, 
            v_item.base_price,
            v_item.discount_amount, 
            v_item.discount_type, 
            v_item.excise_stamp, 
            v_item.quantity * v_item.price_at_sale
        );

        -- Deduct stock from the products table (only for real products, not quick items with fake IDs)
        -- Quick items like packets have IDs starting with '00000000'
        IF v_item.product_id::text NOT LIKE '00000000%' THEN
            UPDATE products
            SET stock_quantity = stock_quantity - v_item.quantity
            WHERE id = v_item.product_id AND user_id = p_user_id;
            
            -- Log transaction
            INSERT INTO warehouse_transactions (user_id, product_id, type, quantity, notes)
            VALUES (p_user_id, v_item.product_id, 'out', v_item.quantity, 'Retail Sale: ' || v_sale_id);
        END IF;
    END LOOP;

    RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
