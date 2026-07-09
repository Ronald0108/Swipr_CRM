import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) throw userError;
  
  const user = users.users.find(u => u.email === 'test@example.com') || users.users[0];
  console.log('User:', user.email, user.id);

  const { data: orgMembers, error: orgError } = await supabase
    .from('organization_members')
    .select('*, organizations(*)')
    .eq('user_id', user.id);
  
  if (orgError) throw orgError;
  console.log('Organizations:', JSON.stringify(orgMembers, null, 2));

  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, organization_id, name');
  
  if (leadsError) throw leadsError;
  console.log('Leads count by org:');
  const counts = {};
  leads.forEach(l => {
    counts[l.organization_id] = (counts[l.organization_id] || 0) + 1;
  });
  console.log(counts);
}

main().catch(console.error);
