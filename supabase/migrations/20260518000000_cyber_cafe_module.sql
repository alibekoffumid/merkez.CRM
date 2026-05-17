-- 1. Таблица Игровых Мест (Компьютеры / Приставки)
CREATE TABLE IF NOT EXISTS public.cafe_desks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL,
    zone VARCHAR(50) NOT NULL CHECK (zone IN ('Standard', 'VIP', 'Bootcamp', 'PS5')),
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, name)
);

-- 2. Таблица Тарифов
CREATE TABLE IF NOT EXISTS public.cafe_tariffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    zone VARCHAR(50) NOT NULL CHECK (zone IN ('Standard', 'VIP', 'Bootcamp', 'PS5')),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_package BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Таблица Игровых Сессий
CREATE TABLE IF NOT EXISTS public.cafe_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    desk_id UUID NOT NULL REFERENCES public.cafe_desks(id) ON DELETE CASCADE,
    user_id UUID,
    tariff_id UUID NOT NULL REFERENCES public.cafe_tariffs(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'canceled')),
    total_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_paid >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_session_dates CHECK (ends_at > started_at)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_cafe_desks_org_zone ON public.cafe_desks(organization_id, zone);
CREATE INDEX IF NOT EXISTS idx_cafe_sessions_active ON public.cafe_sessions(desk_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_cafe_tariffs_org ON public.cafe_tariffs(organization_id);

-- RLS
ALTER TABLE public.cafe_desks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_sessions ENABLE ROW LEVEL SECURITY;

-- Политика изоляции
CREATE POLICY "Tenant isolation for cafe_desks" ON public.cafe_desks
    FOR ALL USING (organization_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for cafe_tariffs" ON public.cafe_tariffs
    FOR ALL USING (organization_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for cafe_sessions" ON public.cafe_sessions
    FOR ALL USING (organization_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Триггерная функция для автоматического управления статусами ПК
CREATE OR REPLACE FUNCTION public.handle_cafe_session_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') AND NEW.status = 'active' THEN
        UPDATE public.cafe_desks
        SET status = 'occupied', updated_at = timezone('utc'::text, now())
        WHERE id = NEW.desk_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF NEW.status IN ('completed', 'canceled') AND OLD.status = 'active' THEN
            UPDATE public.cafe_desks
            SET status = 'available', updated_at = timezone('utc'::text, now())
            WHERE id = NEW.desk_id;
        ELSIF NEW.status = 'active' AND OLD.status != 'active' THEN
            UPDATE public.cafe_desks
            SET status = 'occupied', updated_at = timezone('utc'::text, now())
            WHERE id = NEW.desk_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создание триггера
DROP TRIGGER IF EXISTS trg_cafe_session_status ON public.cafe_sessions;
CREATE TRIGGER trg_cafe_session_status
    AFTER INSERT OR UPDATE ON public.cafe_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_cafe_session_status_change();
