-- =========================================================================================
-- MIGRATION 6: ENFORCE STRICT MULTI-TENANT ISOLATION
-- This script plugs data leaks across all tables by ensuring institute_id is present
-- and RLS policies strictly filter by the session user's institute_id.
-- =========================================================================================

-- 1. Ensure `institute_id` column exists on all relevant tables
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES public.institutes(id);
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES public.institutes(id);
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES public.institutes(id);
ALTER TABLE public.fee_records ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES public.institutes(id);
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES public.institutes(id);
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_key_institute_unique;
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_key_institute_unique UNIQUE (key, institute_id);
ALTER TABLE public.teacher_batches ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES public.institutes(id);

-- 2. Backfill missing institute_id values where possible
-- (Linking conversations to their students' institutes)
UPDATE public.conversations c
SET institute_id = s.institute_id
FROM public.students s
WHERE c.student_id = s.id AND c.institute_id IS NULL;

-- (Linking messages to their conversations' institutes)
UPDATE public.messages m
SET institute_id = c.institute_id
FROM public.conversations c
WHERE m.conversation_id = c.id AND m.institute_id IS NULL;

-- (Linking fee_records to their students' institutes)
UPDATE public.fee_records f
SET institute_id = s.institute_id
FROM public.students s
WHERE f.student_id = s.id AND f.institute_id IS NULL;

-- (Linking calendar_events to their batches' institutes)
UPDATE public.calendar_events e
SET institute_id = b.institute_id
FROM public.batches b
WHERE e.batch_id = b.id AND e.institute_id IS NULL;

-- 3. Drop all insecure "for all" or "using true" policies
DROP POLICY IF EXISTS "Everyone can read calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Admins can insert calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Admins can delete calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Conversations enable read/write for all" ON public.conversations;
DROP POLICY IF EXISTS "Messages enable read/write for all" ON public.messages;
DROP POLICY IF EXISTS "Fee records read for all" ON public.fee_records;
DROP POLICY IF EXISTS "Fee records insert for all" ON public.fee_records;
DROP POLICY IF EXISTS "Fee records update for all" ON public.fee_records;
DROP POLICY IF EXISTS "Admins can see all settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.app_settings;

-- 4. Apply the set_institute_id_on_insert trigger to new tables
DROP TRIGGER IF EXISTS set_calendar_events_institute_id ON public.calendar_events;
CREATE TRIGGER set_calendar_events_institute_id BEFORE INSERT ON public.calendar_events FOR EACH ROW EXECUTE PROCEDURE set_institute_id_on_insert();

DROP TRIGGER IF EXISTS set_conversations_institute_id ON public.conversations;
CREATE TRIGGER set_conversations_institute_id BEFORE INSERT ON public.conversations FOR EACH ROW EXECUTE PROCEDURE set_institute_id_on_insert();

DROP TRIGGER IF EXISTS set_messages_institute_id ON public.messages;
CREATE TRIGGER set_messages_institute_id BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE PROCEDURE set_institute_id_on_insert();

DROP TRIGGER IF EXISTS set_fee_records_institute_id ON public.fee_records;
CREATE TRIGGER set_fee_records_institute_id BEFORE INSERT ON public.fee_records FOR EACH ROW EXECUTE PROCEDURE set_institute_id_on_insert();

-- 5. Create new STRICT RLS policies
-- CALENDAR EVENTS
CREATE POLICY "calendar_events_isolation" ON public.calendar_events
  FOR ALL USING (
    institute_id = get_my_institute_id() AND get_my_role() IN ('super_admin', 'admin', 'teacher', 'parent')
  );

-- CONVERSATIONS
CREATE POLICY "conversations_isolation" ON public.conversations
  FOR ALL USING (
    institute_id = get_my_institute_id() AND get_my_role() IN ('super_admin', 'admin', 'teacher', 'parent')
  );

-- MESSAGES
CREATE POLICY "messages_isolation" ON public.messages
  FOR ALL USING (
    institute_id = get_my_institute_id() AND get_my_role() IN ('super_admin', 'admin', 'teacher', 'parent')
  );

-- FEE RECORDS
CREATE POLICY "fee_records_isolation" ON public.fee_records
  FOR ALL USING (
    institute_id = get_my_institute_id() AND get_my_role() IN ('super_admin', 'admin', 'teacher', 'parent')
  );

-- APP SETTINGS
CREATE POLICY "app_settings_isolation" ON public.app_settings
  FOR ALL USING (
    institute_id = get_my_institute_id() AND get_my_role() IN ('super_admin', 'admin')
  );
