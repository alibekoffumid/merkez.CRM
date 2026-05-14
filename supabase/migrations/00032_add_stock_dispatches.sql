
-- Migration 00032: Add Stock Dispatches
-- This migration adds support for tracking outbound stock issues (sales, waste, etc.)

CREATE TABLE IF NOT EXISTS stock_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity NUMERIC(10, 3) NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT, -- e.g., 'sale', 'damaged', 'internal_use', 'transfer'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE stock_dispatches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own stock dispatches" ON stock_dispatches;
CREATE POLICY "Users can manage their own stock dispatches" ON stock_dispatches
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
