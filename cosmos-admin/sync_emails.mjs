import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cmhyruatuakuokxspdsf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtaHlydWF0dWFrdW9reHNwZHNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU4MTcxNiwiZXhwIjoyMDg5MTU3NzE2fQ.KzX6HUkZzUGTswlkC_iLcDABQ0EiYus-AyV5WRmY1n0';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncEmails() {
    console.log('Fetching auth users...');
    const { data: { users }, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
    if (authErr) {
        console.error(authErr);
        return;
    }

    console.log(`Found ${users.length} auth users. Updating public.users...`);

    for (const u of users) {
        if (u.email) {
            const { error: dbErr } = await supabaseAdmin
                .from('users')
                .update({ email: u.email })
                .eq('auth_id', u.id)
                .is('email', null); // Only update if it's currently null
            
            if (dbErr) console.error(`Failed to update ${u.id}:`, dbErr.message);
        }
    }
    
    console.log("Done sync!");
}

syncEmails();
