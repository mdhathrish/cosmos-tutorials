-- Create Teacher Batches mapping table
CREATE TABLE IF NOT EXISTS public.teacher_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(teacher_id, batch_id)
);

-- Enable RLS
ALTER TABLE public.teacher_batches ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can do everything on teacher_batches" ON public.teacher_batches
    FOR ALL USING (
        (SELECT role FROM public.users WHERE auth_id = auth.uid()) = 'admin'
    );

-- Teachers can read their own batch assignments
CREATE POLICY "Teachers can read own batches" ON public.teacher_batches
    FOR SELECT USING (
        teacher_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    );

--------------------------------------------------------------------------------
-- UPDATE RLS POLICIES FOR STUDENT DATA TO RESTRICT TEACHERS
--------------------------------------------------------------------------------

-- 1. Students Access
DROP POLICY IF EXISTS "Everyone can read students" ON public.students;
CREATE POLICY "Admin and Teachers can read students" ON public.students
    FOR SELECT USING (
        (SELECT role FROM public.users WHERE auth_id = auth.uid()) = 'admin'
        OR 
        batch_id IN (
            SELECT batch_id FROM public.teacher_batches 
            WHERE teacher_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        )
    );

-- 2. Attendance Logs Access
DROP POLICY IF EXISTS "Everyone can read attendance_logs" ON public.attendance_logs;
CREATE POLICY "Admin and Teachers can read attendance_logs" ON public.attendance_logs
    FOR SELECT USING (
        (SELECT role FROM public.users WHERE auth_id = auth.uid()) = 'admin'
        OR 
        student_id IN (
            SELECT id FROM public.students WHERE batch_id IN (
                SELECT batch_id FROM public.teacher_batches 
                WHERE teacher_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
            )
        )
    );

-- Teachers can insert logs for their students
CREATE POLICY "Teachers can insert attendance" ON public.attendance_logs
    FOR INSERT WITH CHECK (
        student_id IN (
            SELECT id FROM public.students WHERE batch_id IN (
                SELECT batch_id FROM public.teacher_batches 
                WHERE teacher_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
            )
        )
    );
