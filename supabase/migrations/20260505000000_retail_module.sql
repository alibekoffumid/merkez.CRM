-- Migration for Retail POS Module

-- 1. Retail Products Table
CREATE TABLE IF NOT EXISTS retail_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    barcode TEXT, -- EAN-13
    name TEXT NOT NULL,
    category TEXT, -- alcohol, tobacco, grocery, etc.
    purchase_price NUMERIC(10, 2) DEFAULT 0,
    sale_price NUMERIC(10, 2) DEFAULT 0,
    stock_quantity NUMERIC(10, 3) DEFAULT 0,
    critical_stock NUMERIC(10, 3) DEFAULT 5,
    excise_stamp_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Retail Sales Table
CREATE TABLE IF NOT EXISTS retail_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    total_amount NUMERIC(10, 2) DEFAULT 0,
    tax_amount NUMERIC(10, 2) DEFAULT 0,
    payment_method TEXT DEFAULT 'cash', -- cash, card, transfer
    cashier_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    fiscal_receipt_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Retail Sale Items Table
CREATE TABLE IF NOT EXISTS retail_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES retail_sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES retail_products(id),
    quantity NUMERIC(10, 3) DEFAULT 1,
    price_at_sale NUMERIC(10, 2) DEFAULT 0,
    excise_stamp TEXT,
    total NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE retail_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_sale_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Users can manage their own retail products" ON retail_products
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own retail sales" ON retail_sales
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own retail sale items" ON retail_sale_items
    FOR ALL USING (EXISTS (SELECT 1 FROM retail_sales WHERE retail_sales.id = retail_sale_items.sale_id AND retail_sales.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM retail_sales WHERE retail_sales.id = retail_sale_items.sale_id AND retail_sales.user_id = auth.uid()));

-- 6. Atomic Transaction Function (RPC)
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

        -- Deduct stock
        UPDATE retail_products
        SET stock_quantity = stock_quantity - v_item.quantity,
            updated_at = now()
        WHERE id = v_item.product_id AND user_id = p_user_id;
    END LOOP;

    RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
