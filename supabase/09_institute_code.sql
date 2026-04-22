-- Migration: Add institute_code for pre-login branding
-- This short alphanumeric code is what parents/admins enter before logging in
-- Uses a PostgreSQL SEQUENCE to guarantee codes NEVER repeat, even after deletion

ALTER TABLE institutes ADD COLUMN IF NOT EXISTS institute_code VARCHAR(20) UNIQUE;

-- Create a monotonic sequence — never resets, never repeats
CREATE SEQUENCE IF NOT EXISTS institute_code_seq START WITH 1001 INCREMENT BY 1;

-- Auto-generate codes for existing institutes using the sequence
-- Format: first 3 letters of name (uppercase) + sequence number
-- e.g., "Sri Chaitanya" → "SRI1001", next → "SRI1002" etc.
DO $$
DECLARE
    r RECORD;
    prefix TEXT;
    new_code TEXT;
BEGIN
    FOR r IN SELECT id, name FROM institutes WHERE institute_code IS NULL ORDER BY created_at
    LOOP
        prefix := UPPER(LEFT(REGEXP_REPLACE(r.name, '[^A-Za-z]', '', 'g'), 3));
        IF LENGTH(prefix) < 3 THEN
            prefix := RPAD(prefix, 3, 'X');
        END IF;
        new_code := prefix || nextval('institute_code_seq')::TEXT;
        UPDATE institutes SET institute_code = new_code WHERE id = r.id;
    END LOOP;
END $$;

-- Make it NOT NULL after backfill
ALTER TABLE institutes ALTER COLUMN institute_code SET NOT NULL;

-- Index for fast lookup on login page
CREATE INDEX IF NOT EXISTS idx_institutes_code ON institutes(institute_code);

-- Trigger: Auto-generate institute_code on INSERT if not provided
-- This ensures even API-created institutes get a unique code
CREATE OR REPLACE FUNCTION generate_institute_code()
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT;
BEGIN
    IF NEW.institute_code IS NULL OR NEW.institute_code = '' THEN
        prefix := UPPER(LEFT(REGEXP_REPLACE(NEW.name, '[^A-Za-z]', '', 'g'), 3));
        IF LENGTH(prefix) < 3 THEN
            prefix := RPAD(prefix, 3, 'X');
        END IF;
        NEW.institute_code := prefix || nextval('institute_code_seq')::TEXT;
    END IF;
    -- Always force uppercase
    NEW.institute_code := UPPER(NEW.institute_code);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_institute_code
    BEFORE INSERT ON institutes
    FOR EACH ROW
    EXECUTE FUNCTION generate_institute_code();

-- RPC function so the admin frontend can fetch the next sequence number
-- Called via: supabase.rpc('nextval_text', { seq_name: 'institute_code_seq' })
CREATE OR REPLACE FUNCTION nextval_text(seq_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN nextval(seq_name)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
