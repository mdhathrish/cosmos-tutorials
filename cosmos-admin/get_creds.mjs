import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cmhyruatuakuokxspdsf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtaHlydWF0dWFrdW9reHNwZHNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU4MTcxNiwiZXhwIjoyMDg5MTU3NzE2fQ.KzX6HUkZzUGTswlkC_iLcDABQ0EiYus-AyV5WRmY1n0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) console.error(error);
    
    users?.slice(0, 10).forEach(u => {
        console.log(`Email: ${u.email}, Phone: ${u.phone}, Role: ${u.user_metadata?.role}`);
    });
}

main();
