-- Migration: Multi-Warehouse Support
-- 1. Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    name TEXT NOT NULL,
    address TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own warehouses" ON warehouses 
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Add warehouse_id to inventory tables
DO $$ 
BEGIN
    -- Products
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='warehouse_id') THEN
        ALTER TABLE products ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);
    END IF;

    -- Ingredients
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingredients' AND column_name='warehouse_id') THEN
        ALTER TABLE ingredients ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);
    END IF;

    -- Warehouse Transactions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='warehouse_transactions' AND column_name='warehouse_id') THEN
        ALTER TABLE warehouse_transactions ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);
    END IF;

    -- Stock Receipts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_receipts' AND column_name='warehouse_id') THEN
        ALTER TABLE stock_receipts ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);
    END IF;

    -- Stock Dispatches
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_dispatches' AND column_name='warehouse_id') THEN
        ALTER TABLE stock_dispatches ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);
    END IF;
END $$;

-- 4. Create a default warehouse for existing users (optional but helpful)
-- Note: This is complex in a migration without knowing user IDs, 
-- but we can handle the creation of the first warehouse via the UI logic.
