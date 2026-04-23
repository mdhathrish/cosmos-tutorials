-- 12_add_upi_id_to_institutes.sql
ALTER TABLE institutes ADD COLUMN IF NOT EXISTS upi_id TEXT;
