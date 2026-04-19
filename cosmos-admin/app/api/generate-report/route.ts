import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

export async function POST(req: NextRequest) {
    if (!genAI) {
        return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 })
    }

    try {
        // Auth check
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return cookieStore.getAll(); } } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json()
        const { studentName, overallScore, attendance, strongConcepts, weakConcepts } = body

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        const prompt = `
            You are a professional academic counselor at a premium tutoring center.
            Write a 3-4 sentence comprehensive weekly report summary to be sent to the parent of "${studentName}".
            
            Student Stats:
            - Overall Score: ${overallScore}%
            - Attendance: ${attendance.percentage}% (${attendance.present} present, ${attendance.absent} absent)
            - Strongest Areas: ${strongConcepts.map((c:any) => c.concept_name).join(', ')}
            - Needs Focus On: ${weakConcepts.map((c:any) => c.concept_name).join(', ')}
            
            Tone: Professional, encouraging, and direct. 
            Do NOT include a greeting or sign-off, just the core message body.
        `

        const result = await model.generateContent(prompt)
        const response = result.response.text()

        return NextResponse.json({ summary: response.trim() })
        
    } catch (err: any) {
        console.error('AI Report Error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
