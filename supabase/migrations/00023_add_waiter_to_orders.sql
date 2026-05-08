-- Migration: Add waiter_name to orders for analytics
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS waiter_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.orders.waiter_name IS 'Name of the waiter who handled the order (for analytics)';
