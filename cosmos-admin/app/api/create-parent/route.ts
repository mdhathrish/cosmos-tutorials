// app/api/create-parent/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { email, password, full_name } = body

        console.log('Creating parent:', { email, full_name })

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password: password,
            email_confirm: true,
            user_metadata: { full_name: full_name || 'Parent' },
        })

        if (error) {
            console.error('Auth error:', error.message)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        console.log('Success:', data.user?.id, data.user?.email)

        return NextResponse.json({
            success: true,
            user_id: data.user?.id,
            email: data.user?.email,
        })
    } catch (err: any) {
        console.error('Route error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}