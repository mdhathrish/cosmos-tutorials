// app/api/send-notice/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin } from '@/lib/apiAuth'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
    try {
        const { user, role, instituteId, error: authError, supabaseAdmin } = await getAuthenticatedAdmin()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!rateLimit(user.id, 5, 60000)) {
            return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
        }

        const { title, content, institute_id } = await req.json()

        if (role === 'admin' && institute_id !== instituteId) {
            return NextResponse.json({ error: 'Cannot send notices to other institutes' }, { status: 403 })
        }

        if (!title || !content || !institute_id) {
            return NextResponse.json({ error: 'Title, Content, and Institute ID are required' }, { status: 400 })
        }

        // 1. Insert Notice row
        const { data: notice, error: insertError } = await supabaseAdmin
            .from('notices')
            .insert({ title, content, institute_id })
            .select('*')
            .single()

        if (insertError) throw insertError

        // 2. Fetch parents ONLY from this institute with push tokens
        const { data: users, error: userError } = await supabaseAdmin
            .from('users')
            .select('push_token')
            .eq('role', 'parent')
            .eq('institute_id', institute_id)

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
