-- 20260512000001_add_teacher_color.sql
ALTER TABLE education_teachers ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';
