import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin } from '@/lib/apiAuth'

export async function POST(req: NextRequest) {
    try {
        const { user, role: adminRole, error: authError, supabaseAdmin } = await getAuthenticatedAdmin()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (adminRole !== 'super_admin') {
            return NextResponse.json({ error: 'Only super admins can create institutes' }, { status: 403 })
        }

        const body = await req.json()
        const { name, institute_code, address, contact_phone, logo_url, theme_id, tagline, upi_id } = body

        if (!name || !institute_code) {
            return NextResponse.json({ error: 'Name and institute code are required' }, { status: 400 })
        }

        // Create institute using service role (bypasses RLS)
        const { data: inst, error: instError } = await supabaseAdmin!
            .from('institutes')
            .insert({
                name,
                institute_code: institute_code.toUpperCase(),
                address,
                contact_phone,
                logo_url,
                theme_id,
                tagline,
                upi_id,
                is_active: true
            })
            .select()
            .single()

        if (instError) {
            return NextResponse.json({ error: instError.message }, { status: 400 })
        }

        return NextResponse.json({ success: true, institute: inst })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
