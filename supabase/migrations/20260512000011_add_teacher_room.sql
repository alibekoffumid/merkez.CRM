-- 20260512000001_add_teacher_room.sql
-- Adds default room support for teachers

ALTER TABLE education_teachers 
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES education_rooms(id) ON DELETE SET NULL;
