// supabase/functions/attendance-notify/index.ts
// Deploy: supabase functions deploy attendance-notify
// This function fires when a row is inserted/updated in attendance_logs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record // attendance_logs row

    if (!record) return new Response('No record', { status: 400 })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get student and parent
    const { data: student } = await supabase
      .from('students')
      .select('full_name, parent_id')
      .eq('id', record.student_id)
      .single()

    if (!student) return new Response('Student not found', { status: 404 })

    const { data: parent } = await supabase
      .from('users')
      .select('push_token, full_name')
      .eq('id', student.parent_id)
      .single()

    if (!parent?.push_token) return new Response('No push token', { status: 200 })

    // Build notification
    let title = ''
    let body = ''
    const timeStr = record.check_in_time
      ? new Date(record.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : new Date(record.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

    if (record.status === 'present' && record.check_in_time && !record.check_out_time) {
      title = `✅ ${student.full_name} has arrived`
      body = `Checked in at Cosmos Tutorials at ${timeStr}`
    } else if (record.check_out_time) {
      title = `🏠 ${student.full_name} has left`
      body = `Checked out from Cosmos Tutorials at ${timeStr}`
    } else if (record.status === 'absent') {
      title = `❌ ${student.full_name} is absent today`
      body = `Marked absent for today's session at Cosmos Tutorials`
    } else {
      return new Response('No notification needed', { status: 200 })
    }

    // Send via Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: parent.push_token,
        title,
        body,
        sound: 'default',
        data: {
          type: 'attendance',
          studentId: record.student_id,
          logId: record.id,
        },
        channelId: 'attendance',
      }),
    })

    const result = await response.json()
    console.log('Push sent:', result)

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Notification error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
