// app/api/send-whatsapp/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { rateLimit } from '@/lib/rateLimit'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'

export async function POST(request: Request) {
    try {
        // Auth check
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                },
            }
        )
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Rate limit: 30 per minute
        if (!rateLimit(user.id, 30, 60000)) {
            return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
        }

        const body = await request.json()
        const { phone, template, params = [], student_id, institute_id } = body

        if (!phone || !template) {
            return NextResponse.json({ error: 'Missing phone or template' }, { status: 400 })
        }

        const result = await sendWhatsAppTemplate({
            phone,
            templateName: template,
            bodyParams: params
        })

        // Log the notification
        if (institute_id) {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!,
                { auth: { autoRefreshToken: false, persistSession: false } }
            )
            await supabaseAdmin.from('notification_logs').insert({
                institute_id,
                student_id: student_id || null,
                channel: 'whatsapp',
                template_name: template,
                recipient_phone: phone,
                message_preview: params.join(' | '),
                status: result.success ? 'sent' : 'failed',
                error_message: result.error || null
            })
        }

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 502 })
        }

        return NextResponse.json({ success: true, messageId: result.messageId })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
