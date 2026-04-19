import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { email, password, full_name, role, institute_id } = body

        if (!email || !password || !role) {
            return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 1. Create the Auth User with metadata so the trigger can pick it up
        const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password: password,
            email_confirm: true,
            user_metadata: { full_name: full_name || 'Staff', role: role },
        })

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        const authUserId = data.user?.id

        // 2. Link to public.users using UPSERT
        // This ensures if the trigger already created a placeholder, we update it.
        // If not, we create it with full details.
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .upsert({ 
                auth_id: authUserId,
                role: role,
                institute_id: institute_id,
                full_name: full_name
            }, { onConflict: 'auth_id' })

        if (dbError) {
            console.error('Database upsert error:', dbError.message)
        }

        return NextResponse.json({
            success: true,
            user_id: authUserId,
            email: data.user?.email,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
