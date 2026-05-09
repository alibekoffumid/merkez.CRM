-- Migration: Add product discounts
-- Description: Adds permanent discount fields to products

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'none', -- 'none', 'percent', 'fixed'
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS excise_stamp_required BOOLEAN DEFAULT false;
