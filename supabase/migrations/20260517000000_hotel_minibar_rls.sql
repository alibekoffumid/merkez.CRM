-- Create hotel_room_minibar_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.hotel_room_minibar_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    room_id UUID NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    price_override NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price_override >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(room_id, product_id)
);

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
