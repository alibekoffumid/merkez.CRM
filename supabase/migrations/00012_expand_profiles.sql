-- Migration 00012: Expand Profiles with Business Info

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS operating_hours TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update categories and other tables if needed? (No, isolation was already done in 00011)

-- Add a check constraint for business_type if desired, but flexible text is better for now.
