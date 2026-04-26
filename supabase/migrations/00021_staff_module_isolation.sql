-- Add module isolation to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'general';

-- Update existing staff to 'restaurant' if they look like restaurant workers
UPDATE staff SET module = 'restaurant' WHERE role IN ('Waiter', 'Chef', 'Bartender', 'Head Waiter') AND module = 'general';

-- Update RLS to ensure module-based filtering can be done easily
DROP POLICY IF EXISTS "Users can manage their own staff" ON staff;
CREATE POLICY "Users can manage their own staff" ON staff FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
