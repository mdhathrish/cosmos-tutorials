import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin } from '@/lib/apiAuth'

export async function POST(req: NextRequest) {
    try {
        const { user, role: adminRole, instituteId, error: authError, supabaseAdmin } = await getAuthenticatedAdmin()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (adminRole !== 'admin' && adminRole !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await req.json()
        const { email, password, full_name, role, institute_id } = body

        if (adminRole === 'admin' && instituteId !== institute_id) {
            return NextResponse.json({ error: 'Cannot create users for other institutes' }, { status: 403 })
        }

        if (!email || !password || !role) {
            return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 })
        }

        // 1. Create the Auth User with metadata so the trigger can pick it up
        const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password: password,
            email_confirm: true,
            user_metadata: { full_name: full_name || 'Staff', role: role },
        })

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 400 })
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
