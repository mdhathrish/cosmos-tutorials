-- 19_timetable_enhancements.sql
-- Allow multiple time slots per batch for flexible scheduling

CREATE TABLE IF NOT EXISTS batch_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batch_slots_batch ON batch_slots(batch_id);

ALTER TABLE batch_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batch_slots_read_all" ON batch_slots
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "batch_slots_admin_write" ON batch_slots
  FOR ALL USING (get_my_role() IN ('admin', 'super_admin'));
