-- 20_ai_weekly_reports.sql
-- Store AI-generated weekly student reports

CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}',   -- structured data fed to AI
  ai_summary TEXT NOT NULL DEFAULT '',       -- AI-generated narrative
  overall_score NUMERIC(5,2),               -- aggregated % for the week
  previous_score NUMERIC(5,2),              -- last week's % for trend
  attendance_summary JSONB DEFAULT '{}',    -- {present: 5, absent: 1, total: 6}
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, week_start)
);

CREATE INDEX idx_weekly_reports_student ON weekly_reports(student_id);
CREATE INDEX idx_weekly_reports_institute ON weekly_reports(institute_id);
CREATE INDEX idx_weekly_reports_week ON weekly_reports(week_start DESC);

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- Parents can read their child's reports
CREATE POLICY "weekly_reports_parent_read" ON weekly_reports
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM students WHERE parent_id = (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Admins can read/write all reports for their institute  
CREATE POLICY "weekly_reports_admin_all" ON weekly_reports
  FOR ALL USING (
    institute_id = get_my_institute_id()
    AND get_my_role() IN ('admin', 'super_admin')
  );

-- Super admins can see everything
CREATE POLICY "weekly_reports_super_admin" ON weekly_reports
  FOR ALL USING (get_my_role() = 'super_admin');
