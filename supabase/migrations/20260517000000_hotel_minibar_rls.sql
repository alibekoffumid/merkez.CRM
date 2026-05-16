-- Add warehouse_id to hotel_rooms table if it doesn't exist (multi-warehouse support for minibars)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hotel_rooms' AND column_name='warehouse_id') THEN
        ALTER TABLE public.hotel_rooms ADD COLUMN warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create hotel_room_minibar_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.hotel_room_minibar_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    room_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    price_override NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price_override >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(room_id, product_id)
);

-- Force add foreign key constraints to ensure relationships exist (in case the table already existed)
ALTER TABLE public.hotel_room_minibar_items 
  DROP CONSTRAINT IF EXISTS fk_minibar_product,
  DROP CONSTRAINT IF EXISTS hotel_room_minibar_items_product_id_fkey;

ALTER TABLE public.hotel_room_minibar_items
  ADD CONSTRAINT fk_minibar_product 
  FOREIGN KEY (product_id) 
  REFERENCES public.products(id) 
  ON DELETE CASCADE;

ALTER TABLE public.hotel_room_minibar_items 
  DROP CONSTRAINT IF EXISTS fk_minibar_room,
  DROP CONSTRAINT IF EXISTS hotel_room_minibar_items_room_id_fkey;

ALTER TABLE public.hotel_room_minibar_items
  ADD CONSTRAINT fk_minibar_room 
  FOREIGN KEY (room_id) 
  REFERENCES public.hotel_rooms(id) 
  ON DELETE CASCADE;

-- Enable RLS (Row Level Security)
ALTER TABLE public.hotel_room_minibar_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all access to hotel_room_minibar_items" ON public.hotel_room_minibar_items;
DROP POLICY IF EXISTS "Tenant isolation for minibar items" ON public.hotel_room_minibar_items;

-- Create correct tenant-based RLS policy
CREATE POLICY "Tenant isolation for minibar items" ON public.hotel_room_minibar_items
    FOR ALL 
    USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_minibar_items_tenant ON public.hotel_room_minibar_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_minibar_items_room ON public.hotel_room_minibar_items(room_id);

-- Notify PostgREST to reload the schema cache immediately
NOTIFY pgrst, 'reload schema';
