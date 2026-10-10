-- Add quantity column to warehouse_repairs table
ALTER TABLE public.warehouse_repairs
ADD COLUMN IF NOT EXISTS quantity DECIMAL(15, 2) DEFAULT 1;
