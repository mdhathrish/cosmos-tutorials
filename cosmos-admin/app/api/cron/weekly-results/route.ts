// app/api/cron/weekly-results/route.ts
// AI-Powered Weekly Report Generator
// Runs every Sunday via Vercel Cron (or triggered manually)
// For each student: gathers attendance + scores + concepts → Gemini AI → personalized report
// Sends push notification + WhatsApp to parent

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'
import { generateWithGemini, buildWeeklyReportPrompt } from '@/lib/gemini'

export const maxDuration = 300 // 5 min max for Vercel Pro

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization')
        if (!process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
        }
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Calculate the week range (Monday to Sunday)
        const now = new Date()
        const dayOfWeek = now.getDay() // 0=Sun
        const weekEnd = new Date(now)
        weekEnd.setDate(now.getDate() - (dayOfWeek === 0 ? 0 : dayOfWeek)) // Last Sunday or today
        const weekStart = new Date(weekEnd)
        weekStart.setDate(weekEnd.getDate() - 6) // Monday

        const weekStartStr = weekStart.toISOString().split('T')[0]
        const weekEndStr = weekEnd.toISOString().split('T')[0]

        // Get all active institutes
        const { data: institutes } = await supabaseAdmin
            .from('institutes')
            .select('id, name, whatsapp_enabled, auto_weekly_results')
            .eq('is_active', true)

        if (!institutes || institutes.length === 0) {
            return NextResponse.json({ success: true, message: 'No active institutes', sent: 0 })
        }

        let reportsGenerated = 0
        let whatsappSent = 0
        let pushReminders = 0
        const errors: string[] = []

        for (const inst of institutes) {
            // If auto cron is disabled, send push reminder to admin
            if (!(inst as any).auto_weekly_results) {
                const { data: admins } = await supabaseAdmin
                    .from('users')
                    .select('push_token')
                    .eq('institute_id', inst.id)
                    .eq('role', 'admin')
                    .not('push_token', 'is', null)

                if (admins) {
                    for (const admin of admins) {
                        if (admin.push_token) {
                            await fetch('https://exp.host/--/api/v2/push/send', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    to: admin.push_token,
                                    sound: 'default',
                                    title: '📊 Weekly Results Ready',
                                    body: `Good morning! AI reports for ${inst.name} are ready. Review them on the dashboard.`
                                })
                            }).catch(() => {})
                            pushReminders++
                        }
                    }
                }
                continue
            }

            // Get all active students for this institute
            const { data: students } = await supabaseAdmin
                .from('students')
                .select('id, full_name, parent_id, batch_id')
                .eq('institute_id', inst.id)
                .eq('is_active', true)

            if (!students || students.length === 0) continue

            for (const student of students) {
                try {
                    // 1. ATTENDANCE DATA
                    const { data: attendanceLogs } = await supabaseAdmin
                        .from('attendance_logs')
                        .select('log_date, status, check_in_time, check_out_time')
                        .eq('student_id', student.id)
                        .gte('log_date', weekStartStr)
                        .lte('log_date', weekEndStr)

                    const present = (attendanceLogs || []).filter(a => a.status === 'present').length
                    const absent = (attendanceLogs || []).filter(a => a.status === 'absent').length
                    const late = (attendanceLogs || []).filter(a => a.status === 'late').length
                    const absentDays = (attendanceLogs || [])
                        .filter(a => a.status === 'absent')
                        .map(a => new Date(a.log_date).toLocaleDateString('en-IN', { weekday: 'long' }))

                    // Estimate total scheduled days (use batch_slots if available, else 6)
                    const { count: slotCount } = await supabaseAdmin
                        .from('batch_slots')
                        .select('*', { count: 'exact', head: true })
                        .eq('batch_id', student.batch_id || '')

                    const totalDays = slotCount && slotCount > 0 ? Math.min(slotCount, 7) : 6

                    // 2. TEST SCORES FOR THIS WEEK
                    const { data: scores } = await supabaseAdmin
                        .from('student_scores')
                        .select(`
                            marks_obtained,
                            question_id,
                            test_questions!inner(
                                test_id,
                                max_marks,
                                micro_tag_id,
                                micro_tags(subject, chapter, concept_name),
                                tests!inner(test_name, test_date)
                            )
                        `)
                        .eq('student_id', student.id)

                    // Filter to this week's tests only
                    const weeklyScores = (scores || []).filter(s => {
                        const testDate = (s as any).test_questions?.tests?.test_date
                        return testDate && testDate >= weekStartStr && testDate <= weekEndStr
                    })

                    // Aggregate by test
                    const testMap = new Map<string, { testName: string; date: string; obtained: number; total: number }>()
                    for (const s of weeklyScores) {
                        const tq = (s as any).test_questions
                        const testId = tq?.test_id
                        if (!testId) continue
                        const existing = testMap.get(testId) || { testName: tq.tests.test_name, date: tq.tests.test_date, obtained: 0, total: 0 }
                        existing.obtained += Number(s.marks_obtained)
                        existing.total += Number(tq.max_marks)
                        testMap.set(testId, existing)
                    }

                    const tests = Array.from(testMap.values()).map(t => ({
                        ...t,
                        percentage: t.total > 0 ? Math.round(t.obtained / t.total * 100) : 0
                    }))

                    // 3. CONCEPT ANALYSIS (from micro_tags)
                    const conceptScores = new Map<string, { concept: string; subject: string; obtained: number; total: number }>()
                    for (const s of weeklyScores) {
                        const tq = (s as any).test_questions
                        const mt = tq?.micro_tags
                        if (!mt) continue
                        const key = `${mt.subject}::${mt.concept_name}`
                        const existing = conceptScores.get(key) || { concept: mt.concept_name, subject: mt.subject, obtained: 0, total: 0 }
                        existing.obtained += Number(s.marks_obtained)
                        existing.total += Number(tq.max_marks)
                        conceptScores.set(key, existing)
                    }

                    const concepts = Array.from(conceptScores.values())
                        .map(c => ({ ...c, score: c.total > 0 ? Math.round(c.obtained / c.total * 100) : 0 }))

                    const strongConcepts = concepts.filter(c => c.score >= 70).sort((a, b) => b.score - a.score).slice(0, 5)
                    const weakConcepts = concepts.filter(c => c.score < 60).sort((a, b) => a.score - b.score).slice(0, 5)

                    // 4. PREVIOUS WEEK SCORE (for trend)
                    const prevWeekStart = new Date(weekStart)
                    prevWeekStart.setDate(prevWeekStart.getDate() - 7)
                    const { data: prevReport } = await supabaseAdmin
                        .from('weekly_reports')
                        .select('overall_score')
                        .eq('student_id', student.id)
                        .eq('week_start', prevWeekStart.toISOString().split('T')[0])
                        .single()

                    const currentWeekScore = tests.length > 0
                        ? Math.round(tests.reduce((sum, t) => sum + t.percentage, 0) / tests.length)
                        : 0

                    // 5. GENERATE AI REPORT
                    const promptData = {
                        studentName: student.full_name,
                        instituteName: inst.name,
                        weekStart: weekStartStr,
                        weekEnd: weekEndStr,
                        attendance: { present, absent, late, total: totalDays, absentDays },
                        tests,
                        strongConcepts,
                        weakConcepts,
                        previousWeekScore: prevReport?.overall_score ?? null,
                        currentWeekScore
                    }

                    const prompt = buildWeeklyReportPrompt(promptData)
                    const aiResult = await generateWithGemini(prompt)

                    const aiSummary = aiResult.success && aiResult.text
                        ? aiResult.text
                        : buildFallbackReport(promptData) // Fallback if AI fails

                    // 6. STORE REPORT
                    await supabaseAdmin.from('weekly_reports').upsert({
                        student_id: student.id,
                        institute_id: inst.id,
                        week_start: weekStartStr,
                        week_end: weekEndStr,
                        report_data: promptData,
                        ai_summary: aiSummary,
                        overall_score: currentWeekScore,
                        previous_score: prevReport?.overall_score ?? null,
                        attendance_summary: { present, absent, late, total: totalDays }
                    }, { onConflict: 'student_id,week_start' })

                    reportsGenerated++

                    // 7. NOTIFY PARENT (Push + WhatsApp)
                    const { data: parent } = await supabaseAdmin
                        .from('users')
                        .select('push_token, phone')
                        .eq('id', student.parent_id)
                        .single()

                    if (parent?.push_token) {
                        const trendEmoji = (prevReport?.overall_score ?? 0) < currentWeekScore ? '📈' : '📊'
                        await fetch('https://exp.host/--/api/v2/push/send', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                to: parent.push_token,
                                sound: 'default',
                                title: `${trendEmoji} Weekly Report: ${student.full_name}`,
                                body: `${present}/${totalDays} days present · ${tests.length} test(s) · Avg: ${currentWeekScore}%. Tap to view full AI report.`,
                                data: { screen: 'WeeklyReport', studentId: student.id }
                            })
                        }).catch(() => {})
                    }

                    // WhatsApp (if enabled and parent has phone)
                    if (inst.whatsapp_enabled && parent?.phone) {
                        const result = await sendWhatsAppTemplate({
                            phone: parent.phone,
                            templateName: 'weekly_report',
                            languageCode: 'en',
                            bodyParams: [
                                student.full_name,
                                tests.length.toString(),
                                `${currentWeekScore}%`,
                                inst.name
                            ]
                        })

                        await supabaseAdmin.from('notification_logs').insert({
                            institute_id: inst.id,
                            student_id: student.id,
                            channel: 'whatsapp',
                            template_name: 'weekly_report',
                            recipient_phone: parent.phone,
                            message_preview: `AI Report: ${student.full_name} - ${currentWeekScore}%`,
                            status: result.success ? 'sent' : 'failed',
                            error_message: result.error || null
                        })

                        if (result.success) whatsappSent++
                    }

                    // Rate limit: 200ms between students (respects Gemini 15 RPM)
                    await new Promise(r => setTimeout(r, 200))
                } catch (studentErr: any) {
                    errors.push(`${student.full_name}: ${studentErr.message}`)
                }
            }
        }

        return NextResponse.json({
            success: true,
            reports_generated: reportsGenerated,
            whatsapp_sent: whatsappSent,
            push_reminders: pushReminders,
            week: `${weekStartStr} to ${weekEndStr}`,
            errors: errors.length > 0 ? errors.slice(0, 20) : undefined
        })
    } catch (err: any) {
        console.error('Weekly results cron error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

/**
 * Fallback report if Gemini API is unavailable
 */
function buildFallbackReport(data: any): string {
    const { studentName, attendance, tests, strongConcepts, weakConcepts, currentWeekScore, previousWeekScore } = data
    
    let report = `📊 Weekly Report for ${studentName}\n\n`
    
    report += `✅ Attendance: ${attendance.present}/${attendance.total} days present (${attendance.total > 0 ? Math.round(attendance.present / attendance.total * 100) : 0}%)`
    if (attendance.absent > 0) report += `. Missed ${attendance.absent} day(s).`
    report += '\n\n'
    
    if (tests.length > 0) {
        report += `📝 Tests: ${tests.length} test(s) this week\n`
        tests.forEach((t: any) => { report += `  • ${t.testName}: ${t.obtained}/${t.total} (${t.percentage}%)\n` })
        report += '\n'
    } else {
        report += '📝 No tests this week.\n\n'
    }
    
    if (strongConcepts.length > 0) {
        report += '💪 Strong Areas:\n'
        strongConcepts.forEach((c: any) => { report += `  • ${c.concept} (${c.subject}): ${c.score}%\n` })
        report += '\n'
    }
    
    if (weakConcepts.length > 0) {
        report += '📚 Needs Practice:\n'
        weakConcepts.forEach((c: any) => { report += `  • ${c.concept} (${c.subject}): ${c.score}%\n` })
        report += '\n'
    }
    
    if (previousWeekScore !== null) {
        const diff = currentWeekScore - previousWeekScore
        report += diff >= 0 
            ? `📈 Trend: Improved from ${previousWeekScore}% to ${currentWeekScore}% (+${diff}%)\n`
            : `📉 Trend: Decreased from ${previousWeekScore}% to ${currentWeekScore}% (${diff}%)\n`
    }
    
    return report.trim()
}
