const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cmhyruatuakuokxspdsf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtaHlydWF0dWFrdW9reHNwZHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODE3MTYsImV4cCI6MjA4OTE1NzcxNn0._3dYOCKhpixgQ3S_o6jfI-ZCqDpbNqEkruMJa7nNflg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role, push_token');
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

check();
