-- Migration: Add attributes JSONB column to products table
-- Allows storing arbitrary key-value specifications and characteristics (e.g. Size, Color, Material, etc.)

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '[]'::jsonb;

-- Index for fast JSON querying and search
CREATE INDEX IF NOT EXISTS idx_products_attributes ON public.products USING GIN (attributes);

COMMENT ON COLUMN public.products.attributes IS 'Structured product specifications and characteristics, e.g. [{"name": "Ölçü", "value": "XL"}]';
