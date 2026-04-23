// app/api/import-students/route.ts
// Bulk import students from parsed Excel/CSV data
// Creates parent accounts automatically if phone not already registered

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

interface ImportRow {
  full_name: string
  grade: number
  batch_id: string
  parent_name?: string
  parent_phone: string
  parent_email?: string
  monthly_fee?: number
  school_name?: string
  student_code?: string
  address?: string
}

export async function POST(request: Request) {
  try {
    // Auth: admin or super_admin only
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: dbUser } = await supabase
      .from('users')
      .select('role, institute_id')
      .eq('auth_id', user.id)
      .single()

    if (!dbUser || !['admin', 'super_admin'].includes(dbUser.role)) {
      return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 })
    }

    const body = await request.json()
    const { rows, institute_id } = body as { rows: ImportRow[]; institute_id: string }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No data to import' }, { status: 400 })
    }

    if (!institute_id) {
      return NextResponse.json({ error: 'institute_id required' }, { status: 400 })
    }

    // Use service role for account creation
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1

      try {
        // Validate required fields
        if (!row.full_name?.trim()) {
          results.errors.push(`Row ${rowNum}: Missing student name`)
          results.skipped++
          continue
        }
        if (!row.parent_phone?.trim()) {
          results.errors.push(`Row ${rowNum}: Missing parent phone`)
          results.skipped++
          continue
        }
        if (!row.batch_id) {
          results.errors.push(`Row ${rowNum}: Missing batch`)
          results.skipped++
          continue
        }

        // Clean phone number
        let phone = row.parent_phone.replace(/[\s\-\(\)]/g, '')
        if (!phone.startsWith('+')) phone = '+91' + phone.replace(/^0/, '')

        // Check if parent exists by phone
        const { data: existingParent } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('phone', phone)
          .single()

        let parentId: string

        if (existingParent) {
          parentId = existingParent.id
        } else {
          // Create parent auth user
          const email = row.parent_email || `parent_${phone.replace(/\+/g, '')}@cosmos.app`
          const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: 'Welcome@123',
            email_confirm: true,
            user_metadata: { full_name: row.parent_name || `Parent of ${row.full_name}` }
          })

          if (authErr) {
            results.errors.push(`Row ${rowNum}: Auth error - ${authErr.message}`)
            results.skipped++
            continue
          }

          // Create users record
          const { data: newUser, error: userErr } = await supabaseAdmin
            .from('users')
            .insert({
              auth_id: authUser.user.id,
              role: 'parent',
              full_name: row.parent_name || `Parent of ${row.full_name}`,
              phone,
              institute_id
            })
            .select('id')
            .single()

          if (userErr) {
            results.errors.push(`Row ${rowNum}: User creation error - ${userErr.message}`)
            results.skipped++
            continue
          }

          parentId = newUser.id
        }

        // Create student
        const { error: studentErr } = await supabaseAdmin
          .from('students')
          .insert({
            full_name: row.full_name.trim(),
            grade: row.grade || 8,
            batch_id: row.batch_id,
            parent_id: parentId,
            institute_id,
            monthly_fee: row.monthly_fee || null,
            school_name: row.school_name || null,
            student_code: row.student_code || null,
            address: row.address || null,
            is_active: true
          })

        if (studentErr) {
          results.errors.push(`Row ${rowNum}: Student creation error - ${studentErr.message}`)
          results.skipped++
          continue
        }

        results.imported++
      } catch (err: any) {
        results.errors.push(`Row ${rowNum}: ${err.message}`)
        results.skipped++
      }
    }

    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
