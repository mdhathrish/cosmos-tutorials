-- =========================================================================================
-- MIGRATION 2: MULTI-TENANCY AUTO-DEFAULTS & SECURE RLS
-- Run this in your Supabase SQL Editor.
-- =========================================================================================

-- 1. Create a Trigger Function to automatically set `institute_id` on new records
CREATE OR REPLACE FUNCTION public.set_institute_id_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  my_institute_id UUID;
BEGIN
  -- If institute_id is already provided, keep it
  IF NEW.institute_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Fetch the current user's institute_id safely
  SELECT institute_id INTO my_institute_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
  
  IF my_institute_id IS NOT NULL THEN
    NEW.institute_id := my_institute_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach Trigger to all standard tables
DROP TRIGGER IF EXISTS set_users_institute_id ON public.users;
CREATE TRIGGER set_users_institute_id BEFORE INSERT ON public.users FOR EACH ROW EXECUTE PROCEDURE set_institute_id_on_insert();

DROP TRIGGER IF EXISTS set_batches_institute_id ON public.batches;
CREATE TRIGGER set_batches_institute_id BEFORE INSERT ON public.batches FOR EACH ROW EXECUTE PROCEDURE set_institute_id_on_insert();

DROP TRIGGER IF EXISTS set_students_institute_id ON public.students;
CREATE TRIGGER set_students_institute_id BEFORE INSERT ON public.students FOR EACH ROW EXECUTE PROCEDURE set_institute_id_on_insert();

DROP TRIGGER IF EXISTS set_tests_institute_id ON public.tests;
CREATE TRIGGER set_tests_institute_id BEFORE INSERT ON public.tests FOR EACH ROW EXECUTE PROCEDURE set_institute_id_on_insert();

DROP TRIGGER IF EXISTS set_homework_institute_id ON public.homework;
CREATE TRIGGER set_homework_institute_id BEFORE INSERT ON public.homework FOR EACH ROW EXECUTE PROCEDURE set_institute_id_on_insert();

DROP TRIGGER IF EXISTS set_notices_institute_id ON public.notices;
CREATE TRIGGER set_notices_institute_id BEFORE INSERT ON public.notices FOR EACH ROW EXECUTE PROCEDURE set_institute_id_on_insert();

-- 3. Fix RLS to strictly isolate data and grant Create/Update/Delete access within the same Institute
-- Role Helper
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- USERS (Admins can insert/update users in their institute)
CREATE POLICY "admins_write_users_institute" ON public.users
  FOR ALL USING (
    get_my_role() IN ('super_admin', 'admin') AND institute_id = get_my_institute_id()
  );

-- BATCHES
DROP POLICY IF EXISTS "batches_read_all" ON public.batches;
DROP POLICY IF EXISTS "batches_admin_write" ON public.batches;

CREATE POLICY "batches_institute_access" ON public.batches
  FOR ALL USING (
    institute_id = get_my_institute_id() AND get_my_role() IN ('super_admin', 'admin', 'teacher')
  );

-- STUDENTS
DROP POLICY IF EXISTS "students_admin_write" ON public.students;

CREATE POLICY "students_admin_write_institute" ON public.students
  FOR ALL USING (
    institute_id = get_my_institute_id() AND get_my_role() IN ('super_admin', 'admin', 'teacher')
  );

-- TESTS
DROP POLICY IF EXISTS "tests_read_all" ON public.tests;
DROP POLICY IF EXISTS "tests_admin_write" ON public.tests;

CREATE POLICY "tests_institute_access" ON public.tests
  FOR ALL USING (
    institute_id = get_my_institute_id() AND get_my_role() IN ('super_admin', 'admin', 'teacher')
  );

-- HOMEWORK
DROP POLICY IF EXISTS "homework_read_authenticated" ON public.homework;
DROP POLICY IF EXISTS "homework_admin_write" ON public.homework;

CREATE POLICY "homework_institute_access" ON public.homework
  FOR ALL USING (
    institute_id = get_my_institute_id() AND get_my_role() IN ('super_admin', 'admin', 'teacher')
  );

-- NOTICES
DROP POLICY IF EXISTS "Admins can insert notices" ON public.notices;
DROP POLICY IF EXISTS "Admins can delete notices" ON public.notices;

CREATE POLICY "notices_institute_write" ON public.notices
  FOR ALL USING (
    institute_id = get_my_institute_id() AND get_my_role() IN ('super_admin', 'admin', 'teacher')
  );
