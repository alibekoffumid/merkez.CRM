-- Migration: Add passport_info and relatives_info columns to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS passport_info TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS relatives_info TEXT;

-- Reload schema cache in PostgREST
NOTIFY pgrst, 'reload schema';
