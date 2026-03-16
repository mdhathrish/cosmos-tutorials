-- Run this in your Supabase SQL Editor
-- 1. Link any existing parents who already tried logging in
UPDATE public.users u
SET auth_id = a.id
FROM auth.users a
WHERE u.phone = a.phone AND u.auth_id IS NULL;

-- 2. Create the function to automatically link future parents
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- If admin already created this parent, link the auth_id
  IF EXISTS (SELECT 1 FROM public.users WHERE phone = NEW.phone) THEN
    UPDATE public.users
    SET auth_id = NEW.id
    WHERE phone = NEW.phone;
  ELSE
    -- If they login before being added, create a placeholder parent
    INSERT INTO public.users (auth_id, role, full_name, phone)
    VALUES (NEW.id, 'parent', 'Parent (' || NEW.phone || ')', NEW.phone);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach the trigger to Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
