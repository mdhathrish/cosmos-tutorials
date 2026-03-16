BEGIN;

-- 1. Merge any exact duplicates where one has +91 and the other doesn't
DO $$
DECLARE
  dup_record RECORD;
BEGIN
  FOR dup_record IN 
    SELECT 
      u_plus.id AS keep_id, 
      u_no_plus.id AS delete_id
    FROM public.users u_plus
    JOIN public.users u_no_plus ON u_plus.phone = '+91' || u_no_plus.phone
  LOOP
    -- Step 1. Move students over to the +91 account
    UPDATE public.students
    SET parent_id = dup_record.keep_id
    WHERE parent_id = dup_record.delete_id;

    -- Step 2. Delete the account that misses +91
    DELETE FROM public.users WHERE id = dup_record.delete_id;
  END LOOP;
END $$;

-- 2. Format any remaining 10-digit numbers (now that duplicates are gone, this won't fail)
UPDATE public.users 
SET phone = '+91' || phone 
WHERE length(phone) = 10 AND phone NOT LIKE '+%';

-- 3. Final safety step: Relink any remaining orphaned records
UPDATE public.users u
SET auth_id = a.id
FROM auth.users a
WHERE u.phone = a.phone AND u.auth_id IS NULL;

COMMIT;
