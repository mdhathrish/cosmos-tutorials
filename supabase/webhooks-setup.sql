-- ============================================================
-- SUPABASE WEBHOOKS — Run in SQL Editor AFTER deploying the edge function
-- ============================================================

-- First, add push_token column to users (if not already added)
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Create a webhook trigger on attendance_logs
-- This fires the edge function every time a row is inserted or updated

-- In Supabase Dashboard: Database → Webhooks → Create webhook
-- OR use the SQL below (requires pg_net extension)

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Webhook on INSERT (check-in)
SELECT net.http_post(
  url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/attendance-notify',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
  body := '{}'::jsonb
) AS request_id;

-- ⚠️  RECOMMENDED: Use Supabase Dashboard to set up webhooks visually:
-- 1. Go to Database → Webhooks
-- 2. Click "Create a new hook"
-- 3. Name: attendance_notification
-- 4. Table: attendance_logs
-- 5. Events: INSERT, UPDATE
-- 6. Webhook URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/attendance-notify
-- 7. HTTP Headers: Authorization: Bearer <service_role_key>

-- ============================================================
-- ALSO: Add this index for performance on the heatmap query
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_student_scores_student ON student_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_student_scores_question ON student_scores(question_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance_logs(student_id, log_date);
CREATE INDEX IF NOT EXISTS idx_test_questions_test ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch_id);
