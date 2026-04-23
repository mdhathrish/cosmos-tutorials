import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin } from '@/lib/apiAuth'
import { UserSchema } from '@/lib/validators'

export async function POST(req: NextRequest) {
    try {
        const { user, role, error: authError, supabaseAdmin } = await getAuthenticatedAdmin()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (role !== 'admin' && role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await req.json()
        const parseResult = UserSchema.safeParse(body)
        if (!parseResult.success) {
            return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 })
        }
        const { email, password, full_name } = parseResult.data

        console.log('Creating parent:', { email, full_name })

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