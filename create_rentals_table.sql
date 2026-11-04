-- Таблица для аренды товаров (İcarə / Rentals)
CREATE TABLE IF NOT EXISTS public.warehouse_rentals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rental_code VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    warehouse_id UUID REFERENCES public.warehouses(id),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    product_barcode VARCHAR(100),
    quantity DECIMAL(15, 2) DEFAULT 1,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(100) NOT NULL,
    client_id_serial VARCHAR(100),
    client_fin VARCHAR(50),
    client_id_photo_front TEXT,
    client_id_photo_back TEXT,
    instrument_photo_before TEXT,
    instrument_condition_notes TEXT,
    deposit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    rental_fee DECIMAL(15, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'Nağd',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    return_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RETURNED', 'OVERDUE', 'CANCELLED')),
    returned_by_staff VARCHAR(255),
    return_condition_notes TEXT,
    instrument_photo_after TEXT,
    returned_deposit_amount DECIMAL(15, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.warehouse_rentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own rentals" ON public.warehouse_rentals 
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_rentals_user ON public.warehouse_rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_rentals_warehouse ON public.warehouse_rentals(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_rentals_status ON public.warehouse_rentals(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_rentals_due_date ON public.warehouse_rentals(due_date);

