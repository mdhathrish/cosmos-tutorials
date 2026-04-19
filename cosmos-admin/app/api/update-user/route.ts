import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { auth_id, email, password, full_name, role } = body

        if (!auth_id) {
            return NextResponse.json({ error: 'auth_id is required' }, { status: 400 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 1. Update Auth User (Email/Password)
        const updateData: any = {}
        if (email) updateData.email = email.trim().toLowerCase()
        if (password) updateData.password = password
        if (full_name || role) {
            updateData.user_metadata = { 
                ...updateData.user_metadata,
                ...(full_name && { full_name }),
                ...(role && { role })
            }
        }

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            auth_id,
            updateData
        )

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        // 2. Sync to public.users table if name or role changed
        if (full_name || role) {
            const { error: dbError } = await supabaseAdmin
                .from('users')
                .update({ 
                    ...(full_name && { full_name }),
                    ...(role && { role })
                })
                .eq('auth_id', auth_id)

            if (dbError) {
                console.error('Database sync error:', dbError.message)
            }
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
