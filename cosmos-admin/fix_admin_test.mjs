import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cmhyruatuakuokxspdsf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtaHlydWF0dWFrdW9reHNwZHNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU4MTcxNiwiZXhwIjoyMDg5MTU3NzE2fQ.KzX6HUkZzUGTswlkC_iLcDABQ0EiYus-AyV5WRmY1n0';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixData() {
    const { data: inst } = await supabaseAdmin
        .from('institutes')
        .select('id')
        .eq('name', 'Test Institute for QA')
        .single();
    
    if (inst) {
        console.log('Found Institute:', inst.id);
        const { error } = await supabaseAdmin
            .from('users')
            .update({ institute_id: inst.id })
            .eq('email', 'admin_test@cosmos.in');
        
        if (error) console.error('Fix Error:', error.message);
        else console.log('Fixed admin_test institute_id');
    } else {
        console.log('Institute not found, creating it...');
        const { data: newInst } = await supabaseAdmin.from('institutes').insert({
            name: 'Test Institute for QA',
            is_active: true
        }).select().single();
        
        if (newInst) {
             await supabaseAdmin
                .from('users')
                .update({ institute_id: newInst.id })
                .eq('email', 'admin_test@cosmos.in');
             console.log('Created and linked institute');
        }
    }
}

fixData();
