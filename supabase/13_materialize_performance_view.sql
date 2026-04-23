-- 13_materialize_performance_view.sql
-- Materialize the student_concept_performance view for better performance

DROP VIEW IF EXISTS student_concept_performance CASCADE;

CREATE MATERIALIZED VIEW student_concept_performance AS
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
JOIN (SELECT id as student_id FROM students) s ON s.student_id = st.id
GROUP BY s.student_id, st.full_name, mt.id, mt.subject, mt.chapter, mt.concept_name, mt.full_path;

CREATE UNIQUE INDEX idx_student_concept_perf_unique ON student_concept_performance (student_id, micro_tag_id);
CREATE INDEX idx_student_concept_perf_student_id ON student_concept_performance (student_id);

CREATE OR REPLACE FUNCTION refresh_student_concept_performance()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY student_concept_performance;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_performance_view
AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
ON student_scores
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_student_concept_performance();
