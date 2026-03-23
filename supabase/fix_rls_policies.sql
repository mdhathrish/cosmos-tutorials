-- ==========================================
-- COSMOS TUTORIALS — FIX RLS POLICIES
-- Run this script in your Supabase SQL Editor
-- ==========================================

-- 1. Allow parents/users to update their own profile (e.g., push_token)
CREATE POLICY "users_self_update" ON users
  FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- 2. Allow parents to update homework submissions for their children (e.g., submit homework)
CREATE POLICY "hw_submissions_parent_update" ON homework_submissions
  FOR UPDATE
  USING (
    student_id IN (
      SELECT id FROM students WHERE parent_id = get_my_user_id()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE parent_id = get_my_user_id()
    )
  );
