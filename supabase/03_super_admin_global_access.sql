-- =========================================================================================
-- MIGRATION 3: SUPER ADMIN GLOBAL ACCESS (STRICT PRIVACY)
-- This script updates RLS policies so `super_admin` can manage institutes and center admins,
-- but CANNOT access students, parents, or other PII directly.
-- =========================================================================================

-- 1. Institutes Table (Only Super Admin can manage all, others can read basic info)
DROP POLICY IF EXISTS "institutes_read_all" ON public.institutes;
DROP POLICY IF EXISTS "institutes_super_admin_all" ON public.institutes;
DROP POLICY IF EXISTS "institutes_read_authenticated" ON public.institutes;

CREATE POLICY "institutes_super_admin_all" ON public.institutes
  FOR ALL TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "institutes_read_authenticated" ON public.institutes
  FOR SELECT TO authenticated
  USING (true);

-- 2. Update Batches (No Super Admin Row-Level Access)
DROP POLICY IF EXISTS "batches_institute_access" ON public.batches;
DROP POLICY IF EXISTS "batches_multi_tenant_access" ON public.batches;

CREATE POLICY "batches_multi_tenant_access" ON public.batches
  FOR ALL USING (
    (institute_id = get_my_institute_id() AND get_my_role() IN ('admin', 'teacher'))
  );

-- 3. Update Students (No Super Admin Row-Level Access - STRICT PRIVACY)
DROP POLICY IF EXISTS "students_admin_write_institute" ON public.students;
DROP POLICY IF EXISTS "students_multi_tenant_access" ON public.students;

CREATE POLICY "students_multi_tenant_access" ON public.students
  FOR ALL USING (
    (institute_id = get_my_institute_id() AND get_my_role() IN ('admin', 'teacher'))
  );

-- 4. Update Tests (No Super Admin Row-Level Access)
DROP POLICY IF EXISTS "tests_institute_access" ON public.tests;
DROP POLICY IF EXISTS "tests_multi_tenant_access" ON public.tests;

CREATE POLICY "tests_multi_tenant_access" ON public.tests
  FOR ALL USING (
    (institute_id = get_my_institute_id() AND get_my_role() IN ('admin', 'teacher'))
  );

-- 5. Update Homework (No Super Admin Row-Level Access)
DROP POLICY IF EXISTS "homework_institute_access" ON public.homework;
DROP POLICY IF EXISTS "homework_multi_tenant_access" ON public.homework;

CREATE POLICY "homework_multi_tenant_access" ON public.homework
  FOR ALL USING (
    (institute_id = get_my_institute_id() AND get_my_role() IN ('admin', 'teacher'))
  );

-- 6. Update Notices (No Super Admin Row-Level Access)
DROP POLICY IF EXISTS "notices_institute_write" ON public.notices;
DROP POLICY IF EXISTS "notices_multi_tenant_access" ON public.notices;

CREATE POLICY "notices_multi_tenant_access" ON public.notices
  FOR ALL USING (
    (institute_id = get_my_institute_id() AND get_my_role() IN ('admin', 'teacher'))
  );

-- 7. Update Users table (Super Admin can ONLY see 'admin' users, protecting parents & staff)
DROP POLICY IF EXISTS "super_admins_all_users" ON public.users;
DROP POLICY IF EXISTS "users_read_own_institute" ON public.users;
DROP POLICY IF EXISTS "admins_write_users_institute" ON public.users;
DROP POLICY IF EXISTS "users_multi_tenant_access" ON public.users;

CREATE POLICY "users_multi_tenant_access" ON public.users
  FOR ALL USING (
    (get_my_role() = 'super_admin' AND role = 'admin') OR 
    (institute_id = get_my_institute_id() AND get_my_role() = 'admin') OR
    auth_id = auth.uid()
  );
