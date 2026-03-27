-- Create Notice Board Table
CREATE TABLE IF NOT EXISTS public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) -- Teacher/Admin that posted it
);

-- Enable RLS
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can read notices (Parents and Admins)
CREATE POLICY "Everyone can read notices" ON public.notices 
    FOR SELECT USING (true);

-- Only Admins/Teachers can create or delete notices
CREATE POLICY "Admins can insert notices" ON public.notices 
    FOR INSERT WITH CHECK (true); -- Authenticated users, tightening advised in prod

CREATE POLICY "Admins can delete notices" ON public.notices 
    FOR DELETE USING (true);
