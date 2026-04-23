-- 10_enforce_institute_rls.sql

-- Helper to get the current user's institute_id
CREATE OR REPLACE FUNCTION get_my_institute_id()
RETURNS UUID AS $$
  SELECT institute_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Update RLS for students
DROP POLICY IF EXISTS "students_admin_write" ON students;
CREATE POLICY "students_admin_write" ON students
  FOR ALL USING (get_my_role() IN ('admin', 'super_admin') AND (institute_id = get_my_institute_id() OR get_my_role() = 'super_admin'));

DROP POLICY IF EXISTS "students_parent_read" ON students;
CREATE POLICY "students_parent_read" ON students
  FOR SELECT USING (
    parent_id = get_my_user_id() 
    OR (get_my_role() IN ('admin', 'teacher') AND institute_id = get_my_institute_id())
    OR get_my_role() = 'super_admin'
  );

-- Update RLS for batches
DROP POLICY IF EXISTS "batches_read_all" ON batches;
CREATE POLICY "batches_read_all" ON batches
  FOR SELECT USING (
    institute_id = get_my_institute_id() 
    OR get_my_role() = 'super_admin'
  );

DROP POLICY IF EXISTS "batches_admin_write" ON batches;
CREATE POLICY "batches_admin_write" ON batches
  FOR ALL USING (
    (get_my_role() = 'admin' AND institute_id = get_my_institute_id())
    OR get_my_role() = 'super_admin'
  );

-- Add similar policies for tests, homework, attendance_logs, etc.
-- This ensures strict tenant isolation at the database level.
