import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin } from '@/lib/apiAuth'

export async function POST(req: NextRequest) {
  try {
    const { user, role: adminRole, instituteId, error: authError, supabaseAdmin: supabase } = await getAuthenticatedAdmin()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (adminRole !== 'admin' && adminRole !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { full_name, email, password, institute_id } = await req.json()

    if (adminRole === 'admin' && institute_id && instituteId !== institute_id) {
        return NextResponse.json({ error: 'Cannot create users for other institutes' }, { status: 403 })
    }

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Create Auth User
    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true // Auto confirm
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // 2. Update the row that the trigger automatically creates
    const { error: dbError } = await supabase
      .from('users')
      .update({
        full_name: full_name.trim(),
        email: email.trim(),
        role: 'teacher'
      })
      .eq('auth_id', authUser.user.id)

    if (dbError) {
      // Cleanup auth user if insert fails
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: authUser.user.id })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
