-- Create a function that runs when Admin adds a new Parent to public.users
CREATE OR REPLACE FUNCTION public.sync_auth_id_on_insert()
RETURNS trigger AS $$
BEGIN
  -- Look for an existing auth user with the same phone number
  -- If found, automatically link their auth_id so they don't have to log out and log back in
  SELECT id INTO NEW.auth_id
  FROM auth.users
  WHERE phone = NEW.phone;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach it to the public.users table
DROP TRIGGER IF EXISTS link_existing_auth_user ON public.users;
CREATE TRIGGER link_existing_auth_user
  BEFORE INSERT ON public.users
  FOR EACH ROW
  WHEN (NEW.auth_id IS NULL)
  EXECUTE PROCEDURE public.sync_auth_id_on_insert();

-- Run manual sync one last time to fix the test student you just made!
UPDATE public.users u
SET auth_id = a.id
FROM auth.users a
WHERE u.phone = a.phone AND u.auth_id IS NULL;

-- Enable real-time for attendance logs while we are here!
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_logs;
