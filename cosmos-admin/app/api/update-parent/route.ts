// app/api/update-parent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin } from '@/lib/apiAuth'

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
        const { auth_id, email, password, full_name } = body

        if (!auth_id) {
            return NextResponse.json({ error: 'Auth ID is required' }, { status: 400 })
        }

        const updates: any = {}
        if (email) updates.email = email.trim().toLowerCase()
        if (password) updates.password = password
        if (full_name) updates.user_metadata = { full_name }

        if (Object.keys(updates).length > 0) {
            // Check if user exists since we also allow updating metadata which doesn't strictly throw if user doesn't exist?
            // updateUserById does throw if not found
            const { data, error } = await supabaseAdmin.auth.admin.updateUserById(auth_id, updates)
            
            if (error) {
                console.error('Auth update error:', error.message)
                return NextResponse.json({ error: error.message }, { status: 400 })
            }
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Route error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
