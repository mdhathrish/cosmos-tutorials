-- 11_add_database_indexes.sql
-- Indexes for performance on frequently queried columns

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_institute_id ON users(institute_id);
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_batch_id ON students(batch_id);
CREATE INDEX IF NOT EXISTS idx_students_institute_id ON students(institute_id);
CREATE INDEX IF NOT EXISTS idx_student_scores_student_id ON student_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_student_id_log_date ON attendance_logs(student_id, log_date);
CREATE INDEX IF NOT EXISTS idx_institutes_institute_code ON institutes(institute_code);
