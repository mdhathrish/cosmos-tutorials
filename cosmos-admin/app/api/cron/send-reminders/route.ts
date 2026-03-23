// app/api/cron/send-reminders/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization')
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 1. Get all pending fee records for the current month
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        const { data: pendings, error: pendingError } = await supabaseAdmin
            .from('fee_records')
            .select(`
                student_id,
                students (
                    parent_id
                )
            `)
            .eq('fee_month', currentMonth)
            .eq('status', 'pending')

        if (pendingError) throw pendingError

        // 2. Fetch push tokens for those parents
        const parentIds = pendings.map(p => (p.students as any)?.parent_id).filter(Boolean)
        
        if (parentIds.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: 'No pending fees' })
        }

        const { data: parents, error: parentError } = await supabaseAdmin
            .from('users')
            .select('id, push_token')
            .in('id', parentIds)

        if (parentError) throw parentError

        // 3. Send Push Notifications via Expo
        let pushedCount = 0
        for (const p of parents) {
            if (p.push_token) {
                try {
                    await fetch('https://exp.host/--/api/v2/push/send', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Accept-Encoding': 'gzip, deflate',
                        },
                        body: JSON.stringify({
                            to: p.push_token,
                            sound: 'default',
                            title: 'Fee Reminder',
                            body: `Your fee for ${currentMonth} is pending. Please make the payment via UPI in the app!`,
                            data: { screen: 'Fees' }
                        })
                    })
                    pushedCount++
                } catch (err) {
                    console.error('Push failed for parent', p.id, err)
                }
            }
        }

        return NextResponse.json({ success: true, count: pushedCount })
    } catch (err: any) {
        console.error('Send reminders cron error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
