-- Drop previous policies to avoid conflicts
DROP POLICY IF EXISTS "dental_appointments_all" ON dental_appointments;
DROP POLICY IF EXISTS "dental_tooth_history_all" ON dental_tooth_history;
DROP POLICY IF EXISTS "dental_inventory_all" ON dental_inventory;
DROP POLICY IF EXISTS "dental_inventory_transactions_all" ON dental_inventory_transactions;

-- Re-create policies with explicit WITH CHECK (true) to ensure INSERT works
CREATE POLICY "dental_appointments_all" ON dental_appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dental_tooth_history_all" ON dental_tooth_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dental_inventory_all" ON dental_inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dental_inventory_transactions_all" ON dental_inventory_transactions FOR ALL USING (true) WITH CHECK (true);
