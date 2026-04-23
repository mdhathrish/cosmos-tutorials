import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin } from '@/lib/apiAuth'

export async function POST(req: NextRequest) {
    try {
        const { user, role: adminRole, error: authError, supabaseAdmin } = await getAuthenticatedAdmin()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (adminRole !== 'admin' && adminRole !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await req.json()
        const { auth_id, email, password, full_name, role } = body

        if (!auth_id) {
            return NextResponse.json({ error: 'auth_id is required' }, { status: 400 })
        }

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

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            auth_id,
            updateData
        )

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 })
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
