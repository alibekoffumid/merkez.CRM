-- 20260512000000_teacher_salary_and_hours.sql
-- Updates education module to support teacher salaries and working hours

-- Add salary and working hours columns to education_teachers
ALTER TABLE education_teachers 
ADD COLUMN IF NOT EXISTS salary_type TEXT DEFAULT 'hourly' CHECK (salary_type IN ('fixed', 'hourly', 'percentage')),
ADD COLUMN IF NOT EXISTS salary_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{"mon": {"active": true, "start": "09:00", "end": "18:00"}, "tue": {"active": true, "start": "09:00", "end": "18:00"}, "wed": {"active": true, "start": "09:00", "end": "18:00"}, "thu": {"active": true, "start": "09:00", "end": "18:00"}, "fri": {"active": true, "start": "09:00", "end": "18:00"}, "sat": {"active": false, "start": "09:00", "end": "18:00"}, "sun": {"active": false, "start": "09:00", "end": "18:00"}}';

-- Link lessons to teacher IDs for better tracking
ALTER TABLE education_lessons
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES education_teachers(id) ON DELETE SET NULL;

-- Attempt to migrate existing teacher names to teacher IDs if possible
-- This is a heuristic and might not be 100% accurate if names are duplicate
UPDATE education_lessons l
SET teacher_id = t.id
FROM education_teachers t
WHERE l.teacher_name = (t.first_name || ' ' || t.last_name)
AND l.tenant_id = t.tenant_id
AND l.teacher_id IS NULL;
