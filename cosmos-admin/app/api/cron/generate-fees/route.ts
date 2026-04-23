// app/api/cron/generate-fees/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization')
        if (!process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
        }
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 1. Get all active students
        const { data: students, error: studentError } = await supabaseAdmin
            .from('students')
            .select('id, grade, monthly_fee')
            .eq('is_active', true)

        if (studentError) throw studentError

        // 2. Determine Current Month 'YYYY-MM'
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        // 3. Insert fee records for each student
        const entries = students.map(s => ({
            student_id: s.id,
            fee_month: currentMonth,
            amount: s.monthly_fee !== null && s.monthly_fee !== undefined ? s.monthly_fee : 2000, 
            status: 'pending'
        }))

        // Upsert to ignore duplicates if run multiple times
        const { error: upsertError } = await supabaseAdmin
            .from('fee_records')
            .upsert(entries, { onConflict: 'student_id,fee_month' })

        if (upsertError) throw upsertError

        return NextResponse.json({ success: true, count: entries.length })
    } catch (err: any) {
        console.error('Fees generation cron error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
