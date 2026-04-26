-- Update existing staff table with dental fields
-- This is safer as the staff table is already in the schema cache
ALTER TABLE staff ADD COLUMN IF NOT EXISTS specialty TEXT DEFAULT 'Dentist';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'bg-blue-500';

-- Ensure RLS is permissive for staff management in this module
-- (In production, you'd want to restrict this to admins)
DROP POLICY IF EXISTS "Allow public insert staff" ON staff;
CREATE POLICY "Allow public insert staff" ON staff FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update staff" ON staff;
CREATE POLICY "Allow public update staff" ON staff FOR UPDATE USING (true);
