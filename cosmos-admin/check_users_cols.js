import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
  const { data, error } = await supabase.from('users').select('*').limit(1)
  if (error) console.error(error)
  else console.log("Users keys:", Object.keys(data[0] || {}))
  
  const { data: cols } = await supabase.rpc('get_table_columns', { table_name: 'users' })
  // If rpc doesn't exist, we can use Information Schema via SQL editor but script is fine.
}
check()
