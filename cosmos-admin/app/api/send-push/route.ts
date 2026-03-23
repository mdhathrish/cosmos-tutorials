import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
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

        const res = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 
                'Accept': 'application/json', 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(payloads.map((p: any) => ({
                to: p.to,
                sound: 'default',
                title: p.title || '⚠️ Alert',
                body: p.body,
            }))),
        });

        const resData = await res.json();
        return NextResponse.json(resData);
        
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
