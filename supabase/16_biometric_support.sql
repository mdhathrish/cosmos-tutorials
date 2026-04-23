-- 16_biometric_support.sql
-- API keys for biometric devices, scoped per institute
-- Student code column for biometric ID mapping

CREATE TABLE IF NOT EXISTS biometric_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  device_name TEXT DEFAULT 'Primary Device',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_biometric_api_keys_key ON biometric_api_keys(api_key);
CREATE INDEX idx_biometric_api_keys_institute ON biometric_api_keys(institute_id);

-- Add student_code column for biometric ID mapping (e.g., enrollment number on the device)
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_code TEXT;
CREATE INDEX idx_students_student_code ON students(student_code);

-- RLS
ALTER TABLE biometric_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biometric_keys_admin" ON biometric_api_keys
  FOR ALL USING (get_my_role() IN ('admin', 'super_admin'));
