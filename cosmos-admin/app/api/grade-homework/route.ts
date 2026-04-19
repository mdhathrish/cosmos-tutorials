import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Initialize Gemini
// Ensure NEXT_PUBLIC_GEMINI_API_KEY or GEMINI_API_KEY is in env
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
        const { imageBase64, mimeType, homeworkTitle, homeworkDescription } = body

        if (!imageBase64) {
            return NextResponse.json({ error: 'Image data missing' }, { status: 400 })
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        const prompt = `
            You are an expert tutor. Grade the following student's handwritten homework. 
            Homework Title: ${homeworkTitle}
            Homework Description/Instructions: ${homeworkDescription}
            
            Based strictly on the image provided, analyze the student's work.
            Grade it on this scale: 'A+', 'A', 'B', or 'Not Done'.
            If the work is completely irrelevant or mostly blank, suggest 'Not Done'.
            
            Return a JSON object EXACTLY in this format, with no markdown wrappers or other text:
            {
              "suggestedGrade": "A+",
              "feedback": "A short, 2-sentence encouraging feedback for the student mentioning specific things they did right or wrong."
            }
        `

        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: mimeType
            }
        }

        const result = await model.generateContent([prompt, imagePart])
        const response = result.response.text()

        // Clean JSON formatting if Gemini adds markdown block
        const cleanedText = response.replace(/```json/g, '').replace(/```/g, '').trim()
        
        try {
            const parsed = JSON.parse(cleanedText)
            return NextResponse.json(parsed)
        } catch (parseError) {
            console.error("AI Output Parse Error:", cleanedText)
            return NextResponse.json({ error: 'Failed to process AI response format.' }, { status: 500 })
        }
        
    } catch (err: any) {
        console.error('AI Grading Error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
