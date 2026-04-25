-- ============================================
-- DENTAL MODULE — Full Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Dental Appointments
CREATE TABLE IF NOT EXISTS dental_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL,
  doctor_specialty TEXT,
  doctor_color TEXT DEFAULT 'bg-blue-500',
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  procedure_type TEXT,
  status TEXT DEFAULT 'SCHEDULED',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tooth Chart History
CREATE TABLE IF NOT EXISTS dental_tooth_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  tooth_number INTEGER NOT NULL CHECK (tooth_number BETWEEN 1 AND 32),
  condition TEXT NOT NULL,
  notes TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Dental Inventory (separate from restaurant inventory)
CREATE TABLE IF NOT EXISTS dental_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  min_quantity NUMERIC(10,3) DEFAULT 10,
  cost_per_unit NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Dental Inventory Transactions
CREATE TABLE IF NOT EXISTS dental_inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES dental_inventory(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'in', 'out', 'adjust'
  quantity NUMERIC(10,3) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE dental_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_tooth_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dental_appointments_all" ON dental_appointments FOR ALL USING (true);
CREATE POLICY "dental_tooth_history_all" ON dental_tooth_history FOR ALL USING (true);
CREATE POLICY "dental_inventory_all" ON dental_inventory FOR ALL USING (true);
CREATE POLICY "dental_inventory_transactions_all" ON dental_inventory_transactions FOR ALL USING (true);

-- ============================================
-- SEED DATA
-- ============================================

-- Seed appointments
INSERT INTO dental_appointments (patient_id, doctor_name, doctor_specialty, doctor_color, appointment_date, start_time, duration_minutes, procedure_type, status)
SELECT 
  c.id,
  'Dr. Sarah Wilson',
  'Orthodontist',
  'bg-blue-500',
  CURRENT_DATE,
  '09:00',
  60,
  'Consultation',
  'CONFIRMED'
FROM customers c WHERE c.name = 'Aleksandr Ivanov' LIMIT 1;

INSERT INTO dental_appointments (patient_id, doctor_name, doctor_specialty, doctor_color, appointment_date, start_time, duration_minutes, procedure_type, status)
SELECT 
  c.id,
  'Dr. Sarah Wilson',
  'Orthodontist',
  'bg-blue-500',
  CURRENT_DATE,
  '11:00',
  90,
  'Braces Adjustment',
  'IN_PROGRESS'
FROM customers c WHERE c.name = 'Maria Garcia' LIMIT 1;

INSERT INTO dental_appointments (patient_id, doctor_name, doctor_specialty, doctor_color, appointment_date, start_time, duration_minutes, procedure_type, status)
SELECT 
  c.id,
  'Dr. James Chen',
  'General Dentist',
  'bg-emerald-500',
  CURRENT_DATE,
  '10:00',
  45,
  'Cleaning',
  'SCHEDULED'
FROM customers c WHERE c.name = 'David Smith' LIMIT 1;

INSERT INTO dental_appointments (patient_id, doctor_name, doctor_specialty, doctor_color, appointment_date, start_time, duration_minutes, procedure_type, status)
SELECT 
  c.id,
  'Dr. Elena Rossi',
  'Oral Surgeon',
  'bg-purple-500',
  CURRENT_DATE,
  '14:00',
  120,
  'Implant Surgery',
  'SCHEDULED'
FROM customers c WHERE c.name = 'Elena Rostova' LIMIT 1;

-- Seed inventory
INSERT INTO dental_inventory (name, category, quantity, unit, min_quantity, cost_per_unit) VALUES
('Dental Composite (A2)', 'Restorative', 42, 'pcs', 10, 12.50),
('Anesthetic Cartridges', 'General', 120, 'pcs', 50, 2.80),
('Diamond Burs (Fine)', 'Instruments', 8, 'pcs', 15, 45.00),
('Disposable Syringes', 'General', 300, 'pcs', 100, 0.35),
('Impression Material', 'Prosthetic', 3, 'kg', 5, 85.00),
('Latex Gloves (M)', 'General', 500, 'pcs', 200, 0.12),
('Dental Floss Rolls', 'Hygiene', 60, 'pcs', 20, 3.50),
('Ceramic Crowns', 'Prosthetic', 12, 'pcs', 5, 180.00),
('Orthodontic Wires', 'Orthodontic', 25, 'pcs', 10, 8.00),
('Temporary Cement', 'Restorative', 15, 'pcs', 8, 22.00);

-- Seed tooth data for first patient
INSERT INTO dental_tooth_history (patient_id, tooth_number, condition, updated_by, notes)
SELECT c.id, 5, 'FILLING', 'Dr. Sarah Wilson', 'Composite filling applied'
FROM customers c WHERE c.name = 'Aleksandr Ivanov' LIMIT 1;

INSERT INTO dental_tooth_history (patient_id, tooth_number, condition, updated_by, notes)
SELECT c.id, 14, 'CARIES', 'Dr. James Chen', 'Early stage caries detected'
FROM customers c WHERE c.name = 'Aleksandr Ivanov' LIMIT 1;

INSERT INTO dental_tooth_history (patient_id, tooth_number, condition, updated_by, notes)
SELECT c.id, 30, 'CROWN', 'Dr. Elena Rossi', 'Ceramic crown placed'
FROM customers c WHERE c.name = 'Aleksandr Ivanov' LIMIT 1;
