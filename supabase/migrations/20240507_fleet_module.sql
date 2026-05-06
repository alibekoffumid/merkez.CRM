-- 1. Таблица автомобилей
CREATE TABLE IF NOT EXISTS fleet_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL, -- Изоляция данных
    plate_number TEXT NOT NULL,
    brand_model TEXT NOT NULL,
    year INTEGER,
    vin TEXT UNIQUE,
    status TEXT DEFAULT 'available' CHECK (status IN ('active', 'repair', 'available')),
    current_mileage NUMERIC DEFAULT 0,
    last_oil_change NUMERIC DEFAULT 0,
    insurance_expiry DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Таблица водителей
CREATE TABLE IF NOT EXISTS fleet_drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    license_number TEXT,
    whatsapp_number TEXT,
    balance NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Таблица аренды и смен (логи)
CREATE TABLE IF NOT EXISTS fleet_rent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    vehicle_id UUID REFERENCES fleet_vehicles(id),
    driver_id UUID REFERENCES fleet_drivers(id),
    daily_plan NUMERIC DEFAULT 0,
    actual_revenue NUMERIC DEFAULT 0,
    commission NUMERIC DEFAULT 0,
    shift_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
    shift_end TIMESTAMP WITH TIME ZONE,
    start_mileage NUMERIC,
    end_mileage NUMERIC,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

-- 4. Включаем RLS (Row Level Security)
ALTER TABLE fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_rent_logs ENABLE ROW LEVEL SECURITY;

-- 5. Политики доступа: пользователи видят данные только своего тенанта (бизнеса)
CREATE POLICY "Fleet Vehicles isolation" ON fleet_vehicles
    FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Fleet Drivers isolation" ON fleet_drivers
    FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Fleet Rent Logs isolation" ON fleet_rent_logs
    FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- 6. Индексы для скорости
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_tenant ON fleet_vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fleet_drivers_tenant ON fleet_drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fleet_rent_logs_tenant ON fleet_rent_logs(tenant_id);
