-- =========================================================================================
-- MIGRATION 8: WHITE-LABELING & DYNAMIC THEMING
-- This script adds support for custom logos and predefined color themes for each institute.
-- =========================================================================================

-- 1. Add branding columns to institutes table
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS theme_id TEXT DEFAULT 'cosmos-classic';

-- 2. Create a storage bucket for institute logos (Manual setup required in dashboard, or via API)
-- Note: Usually done via Supabase Dashboard, but documenting for reference:
-- Bucket Name: institute_logos
-- Public: True

-- 3. Update existing records with default theme
UPDATE public.institutes SET theme_id = 'cosmos-classic' WHERE theme_id IS NULL;

-- 4. Ensure Super Admins can manage all branding
-- (Existing policies for institutes "FOR ALL" for super_admin already covers this)
