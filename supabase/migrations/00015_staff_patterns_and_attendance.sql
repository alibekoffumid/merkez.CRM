-- Migration 00014: Staff Patterns and Attendance Tracking

-- 1. Add pattern and shift columns to staff
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS pin_pattern TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS shift_start_time TIME DEFAULT '09:00:00';

-- 2. Create Attendance Logs table
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    clock_in_time TIMESTAMPTZ DEFAULT now(),
    is_late BOOLEAN DEFAULT false,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS on attendance_logs
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policies for attendance_logs
DROP POLICY IF EXISTS "Users can manage their own attendance logs" ON public.attendance_logs;
CREATE POLICY "Users can manage their own attendance logs" 
    ON public.attendance_logs FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- 5. Add index for performance (monthly reporting)
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_attendance_staff ON public.attendance_logs(staff_id);
