// app/api/send-notice/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const { title, content } = await req.json()

        if (!title || !content) {
            return NextResponse.json({ error: 'Title and Content are required' }, { status: 400 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 1. Insert Notice row
        const { data: notice, error: insertError } = await supabaseAdmin
            .from('notices')
            .insert({ title, content })
            .select('*')
            .single()

        if (insertError) throw insertError

        // 2. Fetch all parents with push tokens
        const { data: users, error: userError } = await supabaseAdmin
            .from('users')
            .select('push_token')
            .eq('role', 'parent')

        if (userError) throw userError

        const pushTokens = users.map(u => u.push_token).filter(Boolean)

        // 3. Send Bulk Push via Expo
        if (pushTokens.length > 0) {
            // Expo supports chunks of up to 100
            const messages = pushTokens.map(token => ({
                to: token,
                sound: 'default',
                title: `📢 Announcement: ${title}`,
                body: content.length > 100 ? content.slice(0, 100) + '...' : content,
                data: { screen: 'Dashboard', notice_id: notice.id }
            }))

            await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
                body: JSON.stringify(messages)
            })
        }

        return NextResponse.json({ success: true, notice })
    } catch (err: any) {
        console.error('Send notice error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
