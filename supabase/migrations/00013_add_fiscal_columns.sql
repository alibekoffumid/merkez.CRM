-- Migration: Add fiscalization columns to orders table
-- Description: Adds columns required by etaxesService for fiscalizing restaurant orders.

ALTER TABLE IF EXISTS public.orders
ADD COLUMN IF NOT EXISTS fiscal_id TEXT,
ADD COLUMN IF NOT EXISTS fiscal_status TEXT,
ADD COLUMN IF NOT EXISTS payment_type TEXT,
ADD COLUMN IF NOT EXISTS fiscal_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.orders.fiscal_id IS 'Unique identifier from the fiscal provider (E-Taxes)';
COMMENT ON COLUMN public.orders.fiscal_status IS 'Status of the fiscal transaction (e.g., success, refunded)';
COMMENT ON COLUMN public.orders.payment_type IS 'Payment method used (cash, card)';
COMMENT ON COLUMN public.orders.fiscal_at IS 'Timestamp when the order was fiscalized';
