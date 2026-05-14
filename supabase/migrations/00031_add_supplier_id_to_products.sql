
-- Migration 00031: Add supplier_id to products table
-- This migration adds a reference to the supplier for each product.

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
