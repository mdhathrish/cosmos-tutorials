// app/api/biometric-webhook/route.ts
// Vendor-agnostic webhook endpoint for biometric attendance devices
// Devices POST here with an API key to record check-in/check-out events
// Push-first strategy: sends FREE push notifications for check-in/out
// WhatsApp reserved for absent alerts only (done via admin panel)

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Helper: send free push notification via Expo
async function sendPush(pushToken: string, title: string, body: string) {
    try {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: pushToken, sound: 'default', title, body })
        })
    } catch (e) { /* silent */ }
}

export async function POST(req: NextRequest) {
    try {
        // Authenticate via API key header
        const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '')
        if (!apiKey) {
            return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Validate API key and resolve institute
        const { data: keyRecord } = await supabaseAdmin
            .from('biometric_api_keys')
            .select('institute_id, device_name, is_active')
            .eq('api_key', apiKey)
            .single()

        if (!keyRecord || !keyRecord.is_active) {
            return NextResponse.json({ error: 'Invalid or disabled API key' }, { status: 403 })
        }

        const instituteId = keyRecord.institute_id

        // Parse body — support multiple payload formats for different vendors
        const body = await req.json()

        // Normalize payload
        const studentCode = body.studentCode || body.student_code || body.enrollmentId || body.userId || body.pin
        const punchTime = body.punchTime || body.punch_time || body.timestamp || new Date().toISOString()
        const punchType = (body.punchType || body.punch_type || body.type || 'in').toLowerCase()

        if (!studentCode) {
            return NextResponse.json({ error: 'Missing studentCode in payload' }, { status: 400 })
        }

        // Lookup student by student_code within this institute
        const { data: student } = await supabaseAdmin
            .from('students')
            .select('id, full_name, parent_id, institute_id')
            .eq('institute_id', instituteId)
            .eq('student_code', String(studentCode))
            .eq('is_active', true)
            .single()

        if (!student) {
            return NextResponse.json({ error: `No active student found with code: ${studentCode}` }, { status: 404 })
        }

        const logDate = new Date(punchTime).toISOString().split('T')[0]
        const isCheckIn = punchType.includes('in') || punchType === '0' || punchType === 'checkin'

        if (isCheckIn) {
            // Check-in: upsert attendance log
            const { error } = await supabaseAdmin
                .from('attendance_logs')
                .upsert({
                    student_id: student.id,
                    log_date: logDate,
                    check_in_time: punchTime,
                    status: 'present'
                }, { onConflict: 'student_id,log_date' })

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 })
            }

            // FREE push notification for check-in (not WhatsApp — saves ~₹0.50/msg)
            const { data: parent } = await supabaseAdmin
                .from('users')
                .select('push_token')
                .eq('id', student.parent_id)
                .single()

            const time = new Date(punchTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

            if (parent?.push_token) {
                await sendPush(parent.push_token, '✅ Biometric Check-In', `${student.full_name} arrived at ${time}`)
            }

            // Log for audit (channel: push, not whatsapp)
            await supabaseAdmin.from('notification_logs').insert({
                institute_id: instituteId,
                student_id: student.id,
                channel: 'push',
                template_name: 'biometric_checkin',
                recipient_phone: null,
                message_preview: `${student.full_name} checked in at ${time}`,
                status: 'sent'
            })

            return NextResponse.json({ success: true, action: 'check_in', student: student.full_name })
        } else {
            // Check-out: update existing attendance log
            const { data: existingLog } = await supabaseAdmin
                .from('attendance_logs')
                .select('id')
                .eq('student_id', student.id)
                .eq('log_date', logDate)
                .single()

            if (existingLog) {
                await supabaseAdmin
                    .from('attendance_logs')
                    .update({ check_out_time: punchTime })
                    .eq('id', existingLog.id)
            } else {
                // If no check-in exists, create a new log with just check-out
                await supabaseAdmin
                    .from('attendance_logs')
                    .upsert({
                        student_id: student.id,
                        log_date: logDate,
                        check_out_time: punchTime,
                        status: 'present'
                    }, { onConflict: 'student_id,log_date' })
            }

            // FREE push notification for check-out
            const { data: parent } = await supabaseAdmin
                .from('users')
                .select('push_token')
                .eq('id', student.parent_id)
                .single()

            const time = new Date(punchTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

            if (parent?.push_token) {
                await sendPush(parent.push_token, '👋 Biometric Check-Out', `${student.full_name} left at ${time}`)
            }

            await supabaseAdmin.from('notification_logs').insert({
                institute_id: instituteId,
                student_id: student.id,
                channel: 'push',
                template_name: 'biometric_checkout',
                recipient_phone: null,
                message_preview: `${student.full_name} checked out at ${time}`,
                status: 'sent'
            })

            return NextResponse.json({ success: true, action: 'check_out', student: student.full_name })
        }
    } catch (err: any) {
        console.error('Biometric webhook error:', err)
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
    }
}
