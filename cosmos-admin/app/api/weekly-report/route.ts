// app/api/weekly-report/route.ts
// API to fetch weekly reports for a student (used by parent app and admin dashboard)

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin } from '@/lib/apiAuth'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
    try {
        const studentId = req.nextUrl.searchParams.get('student_id')
        const limit = parseInt(req.nextUrl.searchParams.get('limit') || '4')

        if (!studentId) {
            return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const { data: reports, error } = await supabaseAdmin
            .from('weekly_reports')
            .select('id, week_start, week_end, ai_summary, overall_score, previous_score, attendance_summary, generated_at')
            .eq('student_id', studentId)
            .order('week_start', { ascending: false })
            .limit(limit)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ reports: reports || [] })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
