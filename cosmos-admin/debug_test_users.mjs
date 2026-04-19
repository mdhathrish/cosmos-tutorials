import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cmhyruatuakuokxspdsf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtaHlydWF0dWFrdW9reHNwZHNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU4MTcxNiwiZXhwIjoyMDg5MTU3NzE2fQ.KzX6HUkZzUGTswlkC_iLcDABQ0EiYus-AyV5WRmY1n0';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkData() {
    const { data: users, error: uErr } = await supabaseAdmin
        .from('users')
        .select('*')
        .in('email', ['superadmin_test@cosmos.in', 'admin_test@cosmos.in']);
    
    console.log('Test Users in DB:', users);

    if (users?.[1]) {
        const { data: inst, error: iErr } = await supabaseAdmin
            .from('institutes')
            .select('*')
            .eq('id', users[1].institute_id);
        console.log('Institute of Admin:', inst);
    }
}

checkData();
