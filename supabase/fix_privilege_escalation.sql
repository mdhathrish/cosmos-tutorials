-- 1. Create a function to block unauthorized role tampering
CREATE OR REPLACE FUNCTION public.protect_user_role()
RETURNS trigger AS $$
BEGIN
  -- If trying to change the role
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Check if the CURRENT authenticated user is an admin
    IF (SELECT role FROM public.users WHERE auth_id = auth.uid()) != 'admin' THEN
      RAISE EXCEPTION 'Access Denied: You are not authorized to modify user roles.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach BEFORE UPDATE trigger to the users table
DROP TRIGGER IF EXISTS tr_protect_user_role ON public.users;
CREATE TRIGGER tr_protect_user_role
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.protect_user_role();
