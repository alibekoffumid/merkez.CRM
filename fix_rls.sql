ALTER TABLE education_lessons DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all" ON education_lessons;
CREATE POLICY "Allow public all" ON education_lessons FOR ALL USING (true) WITH CHECK (true);
