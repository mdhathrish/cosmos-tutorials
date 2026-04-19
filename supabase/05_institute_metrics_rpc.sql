-- =========================================================================================
-- MIGRATION 5: INSTITUTE METRICS RPC (SECURE)
-- This function allows Super Admins (and Center Admins) to get aggregate counts
-- without needing direct row-level access to sensitive tables like students.
-- =========================================================================================

CREATE OR REPLACE FUNCTION public.get_institute_metrics()
RETURNS TABLE (
    institute_id UUID,
    student_count BIGINT,
    batch_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS so it can count rows even if caller lacks SELECT permission
SET search_path = public
AS $$
BEGIN
    -- Only allow super_admin or admin to execute this logic
    IF (SELECT role FROM public.users WHERE auth_id = auth.uid() LIMIT 1) NOT IN ('super_admin', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT 
        i.id AS institute_id,
        (SELECT COUNT(*) FROM public.students s WHERE s.institute_id = i.id AND s.is_active = true) AS student_count,
        (SELECT COUNT(*) FROM public.batches b WHERE b.institute_id = i.id AND b.is_active = true) AS batch_count
    FROM public.institutes i
    WHERE i.is_deleted = false;
END;
$$;
