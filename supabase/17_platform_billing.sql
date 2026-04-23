-- 17_platform_billing.sql
-- Platform-level billing with per-student pricing + free tier

CREATE TABLE IF NOT EXISTS platform_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  per_student_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_students INTEGER NOT NULL DEFAULT 10,
  max_batches INTEGER NOT NULL DEFAULT 1,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE
);

-- Seed the four tiers (Free + 3 paid)
INSERT INTO platform_plans (id, name, per_student_rate, min_monthly, max_students, max_batches, features) VALUES
  ('free',     'Free',     0,    0,     10,  1,   '{"whatsapp": false, "biometric": false, "data_import": false, "report_cards": true,  "trial_days": 90}'),
  ('starter',  'Starter',  25,   499,   50,  5,   '{"whatsapp": false, "biometric": false, "data_import": true,  "report_cards": true}'),
  ('growth',   'Growth',   35,   1499,  200, 20,  '{"whatsapp": true,  "biometric": false, "data_import": true,  "report_cards": true}'),
  ('scale',    'Scale',    30,   4999,  999, 100, '{"whatsapp": true,  "biometric": true,  "data_import": true,  "report_cards": true}')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS platform_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES platform_plans(id) DEFAULT 'free',
  billing_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  trial_end_date DATE,  -- When Growth trial expires for free users
  onboarding_fee_paid BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institute_id)
);

CREATE TABLE IF NOT EXISTS platform_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  months_covered INTEGER NOT NULL DEFAULT 1,
  covers_from TEXT NOT NULL,   -- e.g. '2026-05'
  covers_to TEXT NOT NULL,     -- e.g. '2026-07'
  payment_method TEXT DEFAULT 'bank_transfer',
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_payments_institute ON platform_payments(institute_id);
CREATE INDEX idx_platform_payments_date ON platform_payments(payment_date DESC);
