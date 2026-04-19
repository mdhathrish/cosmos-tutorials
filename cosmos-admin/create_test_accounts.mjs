import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cmhyruatuakuokxspdsf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtaHlydWF0dWFrdW9reHNwZHNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU4MTcxNiwiZXhwIjoyMDg5MTU3NzE2fQ.KzX6HUkZzUGTswlkC_iLcDABQ0EiYus-AyV5WRmY1n0';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createTestAccounts() {
    // Super Admin
    const { data: sa, error: saErr } = await supabaseAdmin.auth.admin.createUser({
        email: 'superadmin_test@cosmos.in',
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { role: 'super_admin', full_name: 'Super Admin Test' }
    });
    if (saErr) console.error("SA Error:", saErr.message);
    else {
        console.log("Created Super Admin:", sa.user.id);
        await supabaseAdmin.from('users').insert({
            auth_id: sa.user.id,
            role: 'super_admin',
            email: 'superadmin_test@cosmos.in',
            full_name: 'Super Admin Test'
        });
    }

    // First create a test institute
    const { data: inst } = await supabaseAdmin.from('institutes').insert({
        name: 'Test Institute for QA',
        is_active: true
    }).select().single();

    // Admin
    const { data: a, error: aErr } = await supabaseAdmin.auth.admin.createUser({
        email: 'admin_test@cosmos.in',
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { role: 'admin', full_name: 'Admin Test' }
    });
    if (aErr) console.error("Admin Error:", aErr.message);
    else {
        console.log("Created Admin:", a.user.id);
        await supabaseAdmin.from('users').insert({
            auth_id: a.user.id,
            institute_id: inst?.id,
            role: 'admin',
            email: 'admin_test@cosmos.in',
            full_name: 'Admin Test'
        });
    }
    
    console.log("Done");
}

createTestAccounts();
