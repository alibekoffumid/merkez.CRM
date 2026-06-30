-- Migration 00033: Add Stock Transfers
-- This migration adds support for transferring stock between warehouses.

CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  from_warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  to_warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC(10, 3) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage their own stock transfers" ON stock_transfers;
CREATE POLICY "Users can manage their own stock transfers" ON stock_transfers
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own stock transfer items" ON stock_transfer_items;
CREATE POLICY "Users can manage their own stock transfer items" ON stock_transfer_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM stock_transfers
    WHERE stock_transfers.id = stock_transfer_items.transfer_id
    AND stock_transfers.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stock_transfers
    WHERE stock_transfers.id = stock_transfer_items.transfer_id
    AND stock_transfers.user_id = auth.uid()
  )
);
