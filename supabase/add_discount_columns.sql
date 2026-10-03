-- Add discount columns to stock_dispatches and retail_sales
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE public.stock_dispatches
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2);

ALTER TABLE public.retail_sales 
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percent';

ALTER TABLE public.retail_sale_items 
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percent',
ADD COLUMN IF NOT EXISTS base_price NUMERIC(10, 2);
