-- Migration: Add expiry_date to products
-- Description: Tracking product expiration dates

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS expiry_date DATE;
