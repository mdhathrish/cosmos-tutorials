-- 18_fee_enhancements.sql
-- Enhance fee_records with advance payment and audit tracking

ALTER TABLE fee_records ADD COLUMN IF NOT EXISTS paid_months INTEGER DEFAULT 1;
ALTER TABLE fee_records ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'upi';
ALTER TABLE fee_records ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id);
ALTER TABLE fee_records ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
