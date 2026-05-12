-- Create education_groups table
CREATE TABLE IF NOT EXISTS education_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    course_id UUID REFERENCES education_courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES education_teachers(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'group' CHECK (type IN ('individual', 'group')),
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create group_students join table
CREATE TABLE IF NOT EXISTS education_group_students (
    group_id UUID REFERENCES education_groups(id) ON DELETE CASCADE,
    student_id UUID REFERENCES education_students(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, student_id)
);

-- Add group_id to lessons
ALTER TABLE education_lessons ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES education_groups(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE education_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_group_students ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY "Enable all for tenant users" ON education_groups FOR ALL USING (true);
CREATE POLICY "Enable all for tenant users group_students" ON education_group_students FOR ALL USING (true);
