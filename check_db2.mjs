import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  console.log('All Users:', users.users.map(u => ({ email: u.email, id: u.id })));

  const { data: orgs } = await supabase.from('organizations').select('*');
  console.log('All Organizations:', orgs.map(o => ({ id: o.id, name: o.name })));
}

main().catch(console.error);
