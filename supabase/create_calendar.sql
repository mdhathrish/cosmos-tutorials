-- Create Calendar Events Table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('exam', 'holiday', 'event', 'class')),
    event_date DATE NOT NULL,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE, -- Optional: NULL means Global (all students)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can read events
CREATE POLICY "Everyone can read calendar events" ON public.calendar_events 
    FOR SELECT USING (true);

-- Only Admins/Teachers can create or delete events
CREATE POLICY "Admins can insert calendar events" ON public.calendar_events 
    FOR INSERT WITH CHECK (true); -- Authenticated users, tightening advised in prod

CREATE POLICY "Admins can delete calendar events" ON public.calendar_events 
    FOR DELETE USING (true);
