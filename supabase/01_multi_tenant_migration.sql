-- =========================================================================================
-- MIGRATION: NEXT.JS B2B MULTI-TENANT ARCHITECTURE & SOFT DELETES
-- Instructions: Run this in the Supabase SQL Editor to prepare the database.
-- =========================================================================================

-- 1. Create the `institutes` table (The core of multi-tenancy)
CREATE TABLE IF NOT EXISTS public.institutes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    contact_phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for institutes
ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;

-- 2. Modify Roles and Add `institute_id` to central tables

-- We need to drop the old role check constraint to add new roles
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'teacher', 'parent'));

-- Add institute_id and is_deleted to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES public.institutes(id) ON DELETE RESTRICT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add institute_id and is_deleted to batches
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add institute_id and is_deleted to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add institute_id to tests
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE;

-- Add institute_id to homework
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE;

-- Add institute_id to notices
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE;

-- 3. Insert a Default Institute and Map existing data to it (Crucial for not breaking live data)
DO $$
DECLARE
    default_institute_id UUID;
BEGIN
    SELECT id INTO default_institute_id FROM public.institutes WHERE name = 'Default Cosmos Institute' LIMIT 1;
    
    IF default_institute_id IS NULL THEN
        INSERT INTO public.institutes (name, address, contact_phone) 
        VALUES ('Default Cosmos Institute', 'Hyderabad', '+910000000000') 
        RETURNING id INTO default_institute_id;
    END IF;

    -- Update existing records to belong to the default institute so the app doesn't crash
    UPDATE public.users SET institute_id = default_institute_id WHERE institute_id IS NULL;
    UPDATE public.batches SET institute_id = default_institute_id WHERE institute_id IS NULL;
    UPDATE public.students SET institute_id = default_institute_id WHERE institute_id IS NULL;
    UPDATE public.tests SET institute_id = default_institute_id WHERE institute_id IS NULL;
    UPDATE public.homework SET institute_id = default_institute_id WHERE institute_id IS NULL;
    UPDATE public.notices SET institute_id = default_institute_id WHERE institute_id IS NULL;

END $$;

-- Enforce NOT NULL on institute_id now that everything has one
ALTER TABLE public.users ALTER COLUMN institute_id SET NOT NULL;
ALTER TABLE public.batches ALTER COLUMN institute_id SET NOT NULL;
ALTER TABLE public.students ALTER COLUMN institute_id SET NOT NULL;

-- 4. Update core RLS Policies for Multi-Tenancy (Basic starting policies)
-- Super Admins can see everything. Admins/Teachers/Parents see only their institute.
CREATE OR REPLACE FUNCTION get_my_institute_id()
RETURNS UUID AS $$
  SELECT institute_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Users table RLS
DROP POLICY IF EXISTS "users_self_read" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;

CREATE POLICY "super_admins_all_users" ON public.users
  FOR ALL USING ((SELECT role FROM public.users WHERE auth_id = auth.uid()) = 'super_admin');

CREATE POLICY "users_read_own_institute" ON public.users
  FOR SELECT USING (
    institute_id = get_my_institute_id() OR auth_id = auth.uid()
  );

-- =========================================================================================
-- Note: Further granular RLS changes (like linking tests, batches specifically to institute_id)
-- will be applied in a follow-up script if needed, but the primary multi-tenancy state is set!
-- =========================================================================================
