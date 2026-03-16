// lib/supabase.ts
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// ─── Types ───────────────────────────────────────────────
export interface Student {
  id: string
  full_name: string
  grade: number
  batch_id: string
  batches?: { batch_name: string; subject: string; timing_start: string; timing_end: string }
}

export interface AttendanceLog {
  id: string
  student_id: string
  log_date: string
  check_in_time: string | null
  check_out_time: string | null
  status: 'present' | 'absent' | 'late'
}

export interface ConceptPerformance {
  micro_tag_id: string
  subject: string
  chapter: string
  concept_name: string
  full_path: string
  questions_attempted: number
  total_obtained: number
  total_possible: number
  percentage_score: number
}

export interface HomeworkSubmission {
  id: string
  homework_id: string
  student_id: string
  status: 'pending' | 'submitted' | 'graded'
  submitted_at: string | null
  homework?: {
    title: string
    description: string
    due_date: string
  }
}
