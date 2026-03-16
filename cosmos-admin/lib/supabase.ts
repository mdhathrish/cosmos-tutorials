// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Types matching our schema
export type UserRole = 'admin' | 'parent'

export interface Batch {
  id: string
  grade: number
  subject: string
  batch_name: string
  timing_start: string
  timing_end: string
  days_of_week: string[]
  capacity: number
  is_active: boolean
}

export interface Student {
  id: string
  full_name: string
  parent_id: string
  batch_id: string
  grade: number
  enrollment_date?: string
  is_active: boolean
}

export interface MicroTag {
  id: string
  subject: string
  chapter: string
  concept_name: string
  full_path: string
}

export interface Test {
  id: string
  batch_id: string
  test_name: string
  test_date: string
  total_marks: number
}

export interface TestQuestion {
  id: string
  test_id: string
  question_number: number
  max_marks: number
  micro_tag_id: string
  micro_tags?: MicroTag
}

export interface StudentScore {
  id: string
  student_id: string
  question_id: string
  marks_obtained: number
}

export interface AttendanceLog {
  id: string
  student_id: string
  log_date: string
  check_in_time: string | null
  check_out_time: string | null
  status: 'present' | 'absent' | 'late'
}
