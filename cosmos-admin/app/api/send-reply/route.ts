// app/api/send-reply/route.ts
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        // Auth check
        const cookieStore = await cookies();
        const supabaseAuth = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return cookieStore.getAll(); } } }
        );
        const { data: { user } } = await supabaseAuth.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!rateLimit(user.id, 60, 60000)) {
            return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
        }

        const { conversation_id, content } = body

        if (!conversation_id || !content) {
            return NextResponse.json({ error: 'Missing absolute fields' }, { status: 400 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 1. Insert message into messages table
        const { data: messageData, error: insertError } = await supabaseAdmin
            .from('messages')
            .insert({
                conversation_id,
                sender_role: 'admin',
                content: content.trim()
            })
            .select()
            .single()

        if (insertError) {
            console.error('Insert Error:', insertError.message)
            return NextResponse.json({ error: insertError.message }, { status: 400 })
        }

        // 2. Fetch the student and parent user token
        // messages tables connects to conversations table on conversation_id
        const { data: convData, error: convError } = await supabaseAdmin
            .from('conversations')
            .select(`
                student_id,
                students (
                    parent_id
                )
            `)
            .eq('id', conversation_id)
            .single()

        if (convError || !convData) {
             console.error('Conversation fetch error', convError)
             return NextResponse.json({ success: true, warning: 'Failed to fetch parent for push' })
        }

        const parentId = (convData.students as any)?.parent_id;

        if (parentId) {
            // Fetch the push_token from users table
            const { data: parentData, error: parentError } = await supabaseAdmin
                .from('users')
                .select('push_token')
                .eq('id', parentId)
                .single()

            if (!parentError && parentData?.push_token) {
                // 3. Trigger Expo Push Send API
                try {
                    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Accept-Encoding': 'gzip, deflate',
                        },
                        body: JSON.stringify({
                            to: parentData.push_token,
                            sound: 'default',
                            title: 'New Message from Teacher',
                            body: content.trim(),
                            data: { conversationId: conversation_id }
                        })
                    })
                    const expoResult = await expoResponse.json()
                    console.log('Expo Push result:', expoResult)
                } catch (pushErr) {
                    console.error('Push send failed:', pushErr)
                }
            }
        }

        // Update conversation updated_at
        await supabaseAdmin
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversation_id)

        return NextResponse.json({ success: true, message: messageData })
    } catch (err: any) {
        console.error('Route error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
