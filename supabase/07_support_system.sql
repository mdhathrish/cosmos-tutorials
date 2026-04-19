-- =========================================================================================
-- MIGRATION 7: SUPPORT SYSTEM
-- This script creates a table for support requests from institute admins to super admin.
-- =========================================================================================

CREATE TABLE IF NOT EXISTS public.support_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID REFERENCES public.institutes(id),
    user_id UUID REFERENCES public.users(auth_id),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Institute Admins can create and view their own support requests
CREATE POLICY "support_requests_institute_isolation" ON public.support_requests
  FOR ALL USING (
    institute_id = get_my_institute_id() AND get_my_role() IN ('admin', 'teacher')
  );

-- Super Admin can see ALL support requests
CREATE POLICY "support_requests_super_admin_access" ON public.support_requests
  FOR ALL USING (
    get_my_role() = 'super_admin'
  );

-- Attach trigger for auto institute_id
DROP TRIGGER IF EXISTS set_support_requests_institute_id ON public.support_requests;
CREATE TRIGGER set_support_requests_institute_id BEFORE INSERT ON public.support_requests FOR EACH ROW EXECUTE PROCEDURE set_institute_id_on_insert();
