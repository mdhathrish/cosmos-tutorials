import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
    try {
        // Auth check: verify the caller has a valid Supabase session
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                },
            }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!rateLimit(user.id, 30, 60000)) {
            return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
        }

        const body = await request.json();
        const isArray = Array.isArray(body);
        const payloads = isArray ? body : [body];

        if (payloads.length === 0) {
            return NextResponse.json({ error: 'No payloads provided' }, { status: 400 });
        }

        // Validate first payload has 'to' to catch simple misses
        if (!payloads[0].to) {
            return NextResponse.json({ error: 'Missing push_token (to)' }, { status: 400 });
        }

        const messages = payloads.map((p: any) => ({
            to: p.to,
            sound: 'default',
            title: p.title || '⚠️ Alert',
            body: p.body,
        }));

        // Expo Push API supports max 100 messages per request — chunk if needed
        const CHUNK_SIZE = 100;
        const results = [];
        for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
            const chunk = messages.slice(i, i + CHUNK_SIZE);
            const res = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: { 
                    'Accept': 'application/json', 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(chunk),
            });
            const resData = await res.json();
            results.push(resData);
        }

        return NextResponse.json(results.length === 1 ? results[0] : { chunks: results });
        
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
