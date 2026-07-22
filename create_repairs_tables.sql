-- Создание таблицы мастеров
CREATE TABLE IF NOT EXISTS public.warehouse_masters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    warehouse_id UUID REFERENCES public.warehouses(id),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    balance DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Установка RLS для warehouse_masters
ALTER TABLE public.warehouse_masters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own masters" ON public.warehouse_masters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own masters" ON public.warehouse_masters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own masters" ON public.warehouse_masters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own masters" ON public.warehouse_masters FOR DELETE USING (auth.uid() = user_id);

-- Создание таблицы ремонтов
CREATE TABLE IF NOT EXISTS public.warehouse_repairs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    warehouse_id UUID REFERENCES public.warehouses(id),
    repair_code VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('INTERNAL_STOCK', 'CLIENT_ITEM')),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(100),
    master_id UUID REFERENCES public.warehouse_masters(id) ON DELETE SET NULL,
    issue_description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'SENT_TO_MASTER' CHECK (status IN ('SENT_TO_MASTER', 'READY', 'RETURNED_TO_STOCK')),
    master_fee DECIMAL(15, 2) DEFAULT 0,
    parts_cost DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Установка RLS для warehouse_repairs
ALTER TABLE public.warehouse_repairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own repairs" ON public.warehouse_repairs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own repairs" ON public.warehouse_repairs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own repairs" ON public.warehouse_repairs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own repairs" ON public.warehouse_repairs FOR DELETE USING (auth.uid() = user_id);

-- Создание таблицы запчастей для ремонта
CREATE TABLE IF NOT EXISTS public.warehouse_repair_parts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    repair_id UUID REFERENCES public.warehouse_repairs(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity DECIMAL(15, 3) NOT NULL,
    cost_price DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Установка RLS для warehouse_repair_parts
ALTER TABLE public.warehouse_repair_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own repair parts" ON public.warehouse_repair_parts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own repair parts" ON public.warehouse_repair_parts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own repair parts" ON public.warehouse_repair_parts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own repair parts" ON public.warehouse_repair_parts FOR DELETE USING (auth.uid() = user_id);
