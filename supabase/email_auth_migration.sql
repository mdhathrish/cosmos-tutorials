-- ============================================================
-- MIGRATION: Switch from Phone OTP to Email/Password auth
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add email column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 2. Create unique index on email (allow nulls for old phone-only records)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email) WHERE email IS NOT NULL;

-- 3. Update the handle_new_user trigger to work with email auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Check if a parent record exists with this email
  IF NEW.email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.users WHERE email = NEW.email
  ) THEN
    UPDATE public.users
    SET auth_id = NEW.id
    WHERE email = NEW.email AND auth_id IS NULL;

  -- Check by phone (for backwards compatibility)
  ELSIF NEW.phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.users WHERE phone = NEW.phone
  ) THEN
    UPDATE public.users
    SET auth_id = NEW.id
    WHERE phone = NEW.phone AND auth_id IS NULL;

  ELSE
    -- New parent — create placeholder record
    INSERT INTO public.users (auth_id, role, full_name, email, phone)
    VALUES (
      NEW.id,
      'parent',
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Parent (' || COALESCE(NEW.email, NEW.phone) || ')'),
      NEW.email,
      NEW.phone
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reattach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Sync any existing auth users that don't have auth_id set
-- (matches by email first, then phone)
UPDATE public.users u
SET auth_id = a.id
FROM auth.users a
WHERE (
  (u.email IS NOT NULL AND u.email = a.email) OR
  (u.phone IS NOT NULL AND u.phone = a.phone)
)
AND u.auth_id IS NULL;

-- 5. Enable realtime on attendance_logs (if not already done)
-- (Removed because it was already enabled and causing an error)

-- ============================================================
-- IMPORTANT: After running this SQL, go to:
-- Supabase Dashboard → Authentication → Settings → 
--   "Email confirmations" → TURN OFF
-- This allows parents to log in immediately without confirming email.
-- ============================================================

SELECT 'Migration complete! Now disable email confirmations in Auth settings.' AS status;
