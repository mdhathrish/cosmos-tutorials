-- Create App Settings Table for dynamic configurations
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to Read settings
CREATE POLICY "Public read app_settings" ON public.app_settings FOR SELECT USING (true);

-- Allow admins to Update settings (Using same role check logic as trigger setup)
CREATE POLICY "Admins update app_settings" ON public.app_settings FOR ALL 
USING (
    (SELECT role FROM public.users WHERE auth_id = auth.uid()) = 'admin'
)
WITH CHECK (
    (SELECT role FROM public.users WHERE auth_id = auth.uid()) = 'admin'
);

-- Insert default UPI values
INSERT INTO public.app_settings (key, value) 
VALUES ('upi_id', 'cosmos@oksbi')
ON CONFLICT (key) DO NOTHING;
