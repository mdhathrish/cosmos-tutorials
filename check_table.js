const { createClient } = require('@supabase/supabase-js');

const url = 'https://cmhyruatuakuokxspdsf.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtaHlydWF0dWFrdW9reHNwZHNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU4MTcxNiwiZXhwIjoyMDg5MTU3NzE2fQ.KzX6HUkZzUGTswlkC_iLcDABQ0EiYus-AyV5WRmY1n0'; // Service Role

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('key', 'upi_id')
    .single();

  if (error) {
    console.error('Query Failed:', error.message, error.code);
  } else {
    console.log('Query Succeeded! Data:', data);
  }
}

check();
