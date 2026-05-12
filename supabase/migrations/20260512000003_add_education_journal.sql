-- Add Education Journal Tables: Attendance and Grades

CREATE TABLE IF NOT EXISTS education_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    student_id UUID REFERENCES education_students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES education_courses(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS education_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    student_id UUID REFERENCES education_students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES education_courses(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('lesson', 'exam', 'homework')),
    score NUMERIC NOT NULL,
    max_score NUMERIC NOT NULL DEFAULT 10,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE education_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_grades ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all for tenant users attendance" ON education_attendance FOR ALL USING (true);
CREATE POLICY "Enable all for tenant users grades" ON education_grades FOR ALL USING (true);
