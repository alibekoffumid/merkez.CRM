-- 20260504000000_add_education_rooms_and_lessons.sql

-- Rooms Table
CREATE TABLE IF NOT EXISTS education_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  name TEXT NOT NULL,
  capacity INT DEFAULT 20,
  type TEXT DEFAULT 'General',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lessons Table (if not exists)
CREATE TABLE IF NOT EXISTS education_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  course_id UUID REFERENCES education_courses(id) ON DELETE CASCADE,
  room_id UUID REFERENCES education_rooms(id) ON DELETE SET NULL,
  teacher_name TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Optional, can be adjusted later)
ALTER TABLE education_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_lessons ENABLE ROW LEVEL SECURITY;

-- Allow all for now (matching current dev state)
CREATE POLICY "Public Access" ON education_rooms FOR ALL USING (true);
CREATE POLICY "Public Access" ON education_lessons FOR ALL USING (true);
