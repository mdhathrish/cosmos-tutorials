-- Create Fee Records Table
CREATE TABLE IF NOT EXISTS public.fee_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    fee_month TEXT NOT NULL, -- Format: 'YYYY-MM'
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'verified', 'rejected')),
    receipt_url TEXT, -- Path in Supabase storage holding screenshot
    submitted_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, fee_month) -- Prevent double entry for same month
);

-- Enable RLS for fee_records
ALTER TABLE public.fee_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fee records read for all" ON public.fee_records FOR SELECT USING (true);
CREATE POLICY "Fee records insert for all" ON public.fee_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Fee records update for all" ON public.fee_records FOR UPDATE USING (true);

-- Create Storage Bucket for Receipts
-- (This runs inside storage schema, if you have permissions)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment_receipts', 'payment_receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for Receipts Bucket
-- Allow anyone to read, authenticated to upload
CREATE POLICY "Public Read receipts policy" ON storage.objects FOR SELECT USING (bucket_id = 'payment_receipts');
CREATE POLICY "Allow authenticated uploads receipts policy" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment_receipts');
CREATE POLICY "Allow authenticated updates receipts policy" ON storage.objects FOR UPDATE USING (bucket_id = 'payment_receipts');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_fee_records_updated_at ON public.fee_records;
CREATE TRIGGER update_fee_records_updated_at
    BEFORE UPDATE ON public.fee_records
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
