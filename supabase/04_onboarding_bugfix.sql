-- =========================================================================================
-- MIGRATION 4: ONBOARDING BUGFIX
-- This script fixes the constraint issues when creating new center admins via email.
-- =========================================================================================

-- 1. Relax constraints on `public.users` to allow placeholder creation by triggers
ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN institute_id DROP NOT NULL;

-- 2. Update the Auth Trigger to handle email-only/phone-only/both
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 1. Attempt to link by phone if phone exists
  IF NEW.phone IS NOT NULL AND EXISTS (SELECT 1 FROM public.users WHERE phone = NEW.phone) THEN
    UPDATE public.users SET auth_id = NEW.id WHERE phone = NEW.phone;
    RETURN NEW;
  END IF;

  -- 2. If it's a completely new user (like our Center Admin being created via API),
  -- creation of the placeholder row happens here.
  -- We don't have institute_id yet, but we allow NULL for a split second.
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_id = NEW.id) THEN
    INSERT INTO public.users (auth_id, role, full_name, phone)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'role', 'parent'), 
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), 
      NEW.phone
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-attach trigger (already exists but just in case)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
