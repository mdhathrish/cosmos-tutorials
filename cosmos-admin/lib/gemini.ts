// lib/gemini.ts
// Lightweight Google Gemini API client for AI-powered weekly reports
// Uses Gemini 2.0 Flash — FREE tier: 15 RPM, 1M tokens/day
// Get your API key: https://aistudio.google.com/apikey

interface GeminiResponse {
  success: boolean
  text?: string
  error?: string
}

/**
 * Generate text using Gemini 2.0 Flash
 */
export async function generateWithGemini(prompt: string): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { success: false, error: 'GEMINI_API_KEY not configured' }
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
            topP: 0.9
          }
        })
      }
    )

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return { success: false, error: errData?.error?.message || `HTTP ${res.status}` }
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      return { success: false, error: 'Empty response from Gemini' }
    }

    return { success: true, text: text.trim() }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' }
  }
}

/**
 * Build the AI prompt for a student's weekly report
 */
export function buildWeeklyReportPrompt(data: {
  studentName: string
  instituteName: string
  weekStart: string
  weekEnd: string
  attendance: { present: number; absent: number; late: number; total: number; absentDays: string[] }
  tests: Array<{ testName: string; date: string; obtained: number; total: number; percentage: number }>
  strongConcepts: Array<{ concept: string; subject: string; score: number }>
  weakConcepts: Array<{ concept: string; subject: string; score: number }>
  previousWeekScore: number | null
  currentWeekScore: number
}): string {
  const { studentName, instituteName, weekStart, weekEnd, attendance, tests, strongConcepts, weakConcepts, previousWeekScore, currentWeekScore } = data

  const trend = previousWeekScore !== null
    ? currentWeekScore > previousWeekScore
      ? `improved from ${previousWeekScore}% to ${currentWeekScore}% (↑${currentWeekScore - previousWeekScore}%)`
      : currentWeekScore < previousWeekScore
        ? `decreased from ${previousWeekScore}% to ${currentWeekScore}% (↓${previousWeekScore - currentWeekScore}%)`
        : `remained steady at ${currentWeekScore}%`
    : `this is the first week, scored ${currentWeekScore}%`

  return `You are an experienced education counselor writing a weekly progress report for a parent about their child's performance at a coaching institute.

STUDENT: ${studentName}
INSTITUTE: ${instituteName}
WEEK: ${weekStart} to ${weekEnd}

ATTENDANCE DATA:
- Present: ${attendance.present} out of ${attendance.total} scheduled days (${attendance.total > 0 ? Math.round(attendance.present / attendance.total * 100) : 0}%)
- Absent: ${attendance.absent} day(s)${attendance.absentDays.length > 0 ? ` (${attendance.absentDays.join(', ')})` : ''}
- Late: ${attendance.late} day(s)

TESTS TAKEN THIS WEEK:
${tests.length > 0 ? tests.map(t => `- ${t.testName} (${t.date}): ${t.obtained}/${t.total} = ${t.percentage}%`).join('\n') : '- No tests this week'}

STRONG CONCEPTS (scored well):
${strongConcepts.length > 0 ? strongConcepts.map(c => `- ${c.concept} (${c.subject}): ${c.score}%`).join('\n') : '- Not enough data yet'}

WEAK CONCEPTS (needs improvement):
${weakConcepts.length > 0 ? weakConcepts.map(c => `- ${c.concept} (${c.subject}): ${c.score}%`).join('\n') : '- No weak areas identified'}

WEEKLY TREND: ${trend}

Write a warm, encouraging, professional weekly report for the parent. The report should:
1. Start with a brief attendance summary
2. Highlight test performance
3. Celebrate strengths and improvements
4. Gently flag areas that need more practice (never harsh)
5. End with a recommended focus area for next week
6. Be concise (150-250 words), use simple English
7. Use emojis sparingly (📊 💪 📚 📈 🎯) for readability
8. Be positive and motivating — parents should feel confident their child is progressing
9. Do NOT include any greeting or sign-off — just the report content
10. Do NOT use markdown headers — use emoji labels instead`
}
