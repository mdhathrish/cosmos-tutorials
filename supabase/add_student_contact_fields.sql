-- Run this in your Supabase SQL Editor to add the new fields

ALTER TABLE students
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS parent_number TEXT,
ADD COLUMN IF NOT EXISTS student_number TEXT,
ADD COLUMN IF NOT EXISTS school_name TEXT,
ADD COLUMN IF NOT EXISTS school_board TEXT;
