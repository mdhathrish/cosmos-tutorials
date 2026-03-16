-- ============================================================
-- COSMOS TUTORIALS — SUPABASE POSTGRESQL SCHEMA
-- Run this entire file in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'parent')),
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. BATCHES
-- ============================================================
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 12),
  subject TEXT NOT NULL,
  batch_name TEXT NOT NULL,
  timing_start TIME NOT NULL,
  timing_end TIME NOT NULL,
  days_of_week TEXT[] NOT NULL DEFAULT '{}', -- e.g. ['Mon','Wed','Fri']
  capacity INTEGER NOT NULL DEFAULT 10 CHECK (capacity <= 10),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. STUDENTS
-- ============================================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 12),
  enrollment_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce max 10 students per batch via trigger
CREATE OR REPLACE FUNCTION check_batch_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_capacity INTEGER;
BEGIN
  SELECT COUNT(*), b.capacity
  INTO current_count, max_capacity
  FROM students s
  JOIN batches b ON b.id = NEW.batch_id
  WHERE s.batch_id = NEW.batch_id AND s.is_active = TRUE
  GROUP BY b.capacity;

  IF current_count >= max_capacity THEN
    RAISE EXCEPTION 'Batch is at full capacity (max %)!', max_capacity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_batch_capacity
  BEFORE INSERT ON students
  FOR EACH ROW EXECUTE FUNCTION check_batch_capacity();

-- ============================================================
-- 4. MICRO TAGS (Concept Tree)
-- ============================================================
CREATE TABLE micro_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  concept_name TEXT NOT NULL,       -- e.g. "Linear Equations"
  full_path TEXT GENERATED ALWAYS AS (subject || ' → ' || chapter || ' → ' || concept_name) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject, chapter, concept_name)
);

-- ============================================================
-- 5. TESTS
-- ============================================================
CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  test_name TEXT NOT NULL,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_marks INTEGER NOT NULL CHECK (total_marks > 0),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. TEST QUESTIONS (Crucial — every question maps to a concept)
-- ============================================================
CREATE TABLE test_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  max_marks INTEGER NOT NULL CHECK (max_marks > 0),
  micro_tag_id UUID NOT NULL REFERENCES micro_tags(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(test_id, question_number)
);

-- ============================================================
-- 7. STUDENT SCORES
-- ============================================================
CREATE TABLE student_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
  marks_obtained NUMERIC(5,2) NOT NULL CHECK (marks_obtained >= 0),
  entered_by UUID REFERENCES users(id),
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, question_id),
  -- Ensure marks_obtained <= max_marks (via trigger)
  CONSTRAINT non_negative_marks CHECK (marks_obtained >= 0)
);

-- Validate marks don't exceed max
CREATE OR REPLACE FUNCTION validate_marks()
RETURNS TRIGGER AS $$
DECLARE
  max_m INTEGER;
BEGIN
  SELECT max_marks INTO max_m FROM test_questions WHERE id = NEW.question_id;
  IF NEW.marks_obtained > max_m THEN
    RAISE EXCEPTION 'Marks obtained (%) cannot exceed max marks (%)!', NEW.marks_obtained, max_m;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_marks_limit
  BEFORE INSERT OR UPDATE ON student_scores
  FOR EACH ROW EXECUTE FUNCTION validate_marks();

-- ============================================================
-- 8. ATTENDANCE LOGS
-- ============================================================
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, log_date)
);

-- ============================================================
-- 9. HOMEWORK
-- ============================================================
CREATE TABLE homework (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  assigned_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE homework_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  homework_id UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
  submitted_at TIMESTAMPTZ,
  grade TEXT,
  UNIQUE(homework_id, student_id)
);

-- ============================================================
-- 10. USEFUL VIEWS (for heatmap aggregation)
-- ============================================================

-- Aggregated concept performance per student
CREATE OR REPLACE VIEW student_concept_performance AS
SELECT
  s.student_id,
  st.full_name AS student_name,
  mt.id AS micro_tag_id,
  mt.subject,
  mt.chapter,
  mt.concept_name,
  mt.full_path,
  COUNT(ss.id) AS questions_attempted,
  SUM(ss.marks_obtained) AS total_obtained,
  SUM(tq.max_marks) AS total_possible,
  ROUND(
    (SUM(ss.marks_obtained)::NUMERIC / NULLIF(SUM(tq.max_marks), 0)) * 100, 2
  ) AS percentage_score
FROM student_scores ss
JOIN test_questions tq ON tq.id = ss.question_id
JOIN micro_tags mt ON mt.id = tq.micro_tag_id
JOIN students st ON st.id = ss.student_id
-- Alias to avoid ambiguity
JOIN (SELECT id as student_id FROM students) s ON s.student_id = st.id
GROUP BY s.student_id, st.full_name, mt.id, mt.subject, mt.chapter, mt.concept_name, mt.full_path;

-- Recent test performance per batch
CREATE OR REPLACE VIEW batch_test_summary AS
SELECT
  t.id AS test_id,
  t.test_name,
  t.test_date,
  b.batch_name,
  b.grade,
  b.subject,
  COUNT(DISTINCT ss.student_id) AS students_attempted,
  ROUND(AVG(
    (SELECT SUM(ss2.marks_obtained) FROM student_scores ss2 
     JOIN test_questions tq2 ON tq2.id = ss2.question_id 
     WHERE tq2.test_id = t.id AND ss2.student_id = ss.student_id)
  ), 2) AS avg_total_score
FROM tests t
JOIN batches b ON b.id = t.batch_id
LEFT JOIN student_scores ss ON ss.question_id IN (
  SELECT id FROM test_questions WHERE test_id = t.id
)
GROUP BY t.id, t.test_name, t.test_date, b.batch_name, b.grade, b.subject;

-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper: get current user's DB id
CREATE OR REPLACE FUNCTION get_my_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- USERS: users can see themselves; admins see all
CREATE POLICY "users_self_read" ON users
  FOR SELECT USING (auth_id = auth.uid() OR get_my_role() = 'admin');

CREATE POLICY "users_admin_all" ON users
  FOR ALL USING (get_my_role() = 'admin');

-- STUDENTS: parents see only their own children; admins see all
CREATE POLICY "students_parent_read" ON students
  FOR SELECT USING (
    parent_id = get_my_user_id() OR get_my_role() = 'admin'
  );

CREATE POLICY "students_admin_write" ON students
  FOR ALL USING (get_my_role() = 'admin');

-- STUDENT SCORES: parents see only their child's scores
CREATE POLICY "scores_parent_read" ON student_scores
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM students WHERE parent_id = get_my_user_id()
    ) OR get_my_role() = 'admin'
  );

CREATE POLICY "scores_admin_write" ON student_scores
  FOR ALL USING (get_my_role() = 'admin');

-- ATTENDANCE: parents see only their child's attendance
CREATE POLICY "attendance_parent_read" ON attendance_logs
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM students WHERE parent_id = get_my_user_id()
    ) OR get_my_role() = 'admin'
  );

CREATE POLICY "attendance_admin_write" ON attendance_logs
  FOR ALL USING (get_my_role() = 'admin');

-- TESTS & QUESTIONS: readable by all authenticated; writable by admin
CREATE POLICY "tests_read_all" ON tests
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "tests_admin_write" ON tests
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "test_questions_read_all" ON test_questions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "test_questions_admin_write" ON test_questions
  FOR ALL USING (get_my_role() = 'admin');

-- BATCHES & MICRO TAGS: readable by all authenticated
CREATE POLICY "batches_read_all" ON batches
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "batches_admin_write" ON batches
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "micro_tags_read_all" ON micro_tags
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "micro_tags_admin_write" ON micro_tags
  FOR ALL USING (get_my_role() = 'admin');

-- HOMEWORK: parents read; admins write
CREATE POLICY "homework_read_authenticated" ON homework
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "homework_admin_write" ON homework
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "hw_submissions_parent_read" ON homework_submissions
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM students WHERE parent_id = get_my_user_id()
    ) OR get_my_role() = 'admin'
  );

CREATE POLICY "hw_submissions_admin_write" ON homework_submissions
  FOR ALL USING (get_my_role() = 'admin');

-- ============================================================
-- 12. SEED DATA — Starter micro tags (IIT Foundation)
-- ============================================================
INSERT INTO micro_tags (subject, chapter, concept_name) VALUES
  ('Mathematics', 'Algebra', 'Linear Equations in One Variable'),
  ('Mathematics', 'Algebra', 'Linear Equations in Two Variables'),
  ('Mathematics', 'Algebra', 'Quadratic Equations'),
  ('Mathematics', 'Algebra', 'Polynomials'),
  ('Mathematics', 'Geometry', 'Triangles - Congruence'),
  ('Mathematics', 'Geometry', 'Triangles - Similarity'),
  ('Mathematics', 'Geometry', 'Circles - Theorems'),
  ('Mathematics', 'Geometry', 'Coordinate Geometry'),
  ('Mathematics', 'Arithmetic', 'Ratio and Proportion'),
  ('Mathematics', 'Arithmetic', 'Percentages'),
  ('Mathematics', 'Arithmetic', 'Number Systems'),
  ('Mathematics', 'Mensuration', 'Area and Perimeter'),
  ('Mathematics', 'Mensuration', 'Surface Area and Volume'),
  ('Physics', 'Mechanics', 'Motion - Distance and Displacement'),
  ('Physics', 'Mechanics', 'Newton''s Laws of Motion'),
  ('Physics', 'Mechanics', 'Work, Energy and Power'),
  ('Physics', 'Light', 'Reflection of Light'),
  ('Physics', 'Light', 'Refraction of Light'),
  ('Physics', 'Electricity', 'Electric Current and Circuits'),
  ('Physics', 'Electricity', 'Ohm''s Law'),
  ('Chemistry', 'Matter', 'States of Matter'),
  ('Chemistry', 'Matter', 'Atoms and Molecules'),
  ('Chemistry', 'Reactions', 'Chemical Reactions and Equations'),
  ('Chemistry', 'Reactions', 'Acids, Bases and Salts'),
  ('Chemistry', 'Periodic Table', 'Classification of Elements'),
  ('Biology', 'Cell Biology', 'Cell Structure and Function'),
  ('Biology', 'Life Processes', 'Nutrition in Plants and Animals'),
  ('Biology', 'Life Processes', 'Respiration'),
  ('Biology', 'Life Processes', 'Reproduction');

-- ============================================================
-- DONE. Schema is ready.
-- ============================================================
