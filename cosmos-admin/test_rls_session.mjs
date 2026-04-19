import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cmhyruatuakuokxspdsf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtaHlydWF0dWFrdW9reHNwZHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODE3MTYsImV4cCI6MjA4OTE1NzcxNn0._3dYOCKhpixgQ3S_o6jfI-ZCqDpbNqEkruMJa7nNflg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRLS() {
    console.log('Logging in as admin_test...');
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'admin_test@cosmos.in',
        password: 'Password123!'
    });

    if (authErr) {
        console.error('Login Failed:', authErr.message);
        return;
    }

    console.log('Logged in. Trying to create a batch...');
    
    // Attempt insert. Trigger should set institute_id.
    const { data: batch, error: batchErr } = await supabase
        .from('batches')
        .insert({ 
            batch_name: 'RLS Test Batch', 
            grade: 8,
            subject: 'Mathematics',
            timing_start: '16:00',
            timing_end: '17:30',
            days_of_week: ['Mon', 'Wed']
        })
        .select();

    if (batchErr) {
        console.error('Batch Insert Failed:', batchErr.message, batchErr.details, batchErr.hint);
    } else {
        console.log('Batch Insert Succeeded:', batch);
    }
}

testRLS();
