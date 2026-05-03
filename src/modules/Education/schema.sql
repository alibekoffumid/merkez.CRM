-- schema.sql
-- Run this in your Supabase SQL Editor to set up the Education module database

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Students Table
CREATE TABLE IF NOT EXISTS education_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL, -- For multi-tenancy (branch/school)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses/Programs Table
CREATE TABLE IF NOT EXISTS education_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- e.g., 'Music', 'Languages', 'Sports'
  price DECIMAL(10, 2) NOT NULL,
  capacity INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollments Table
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  student_id UUID REFERENCES education_students(id) ON DELETE CASCADE,
  course_id UUID REFERENCES education_courses(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('active', 'completed', 'dropped', 'pending')) DEFAULT 'pending',
  progress_level TEXT, -- e.g., 'Grade 1', 'B2', etc.
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused')) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teachers Table
CREATE TABLE IF NOT EXISTS education_teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  specialization TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms Table
CREATE TABLE IF NOT EXISTS education_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  capacity INT,
  type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lessons Table
CREATE TABLE IF NOT EXISTS education_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  course_id UUID REFERENCES education_courses(id) ON DELETE CASCADE,
  teacher_name TEXT,
  room TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Row Level Security (RLS) policies based on tenant_id for multi-tenancy support
-- Example:
-- ALTER TABLE education_students ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can only access their own tenant data" ON education_students
--   USING (tenant_id = auth.uid()); -- Replace auth.uid() with appropriate tenant context if using a separate table
