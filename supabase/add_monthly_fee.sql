-- Set default fee for legacy or newly added students who don't have overrides
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC DEFAULT 2000;
