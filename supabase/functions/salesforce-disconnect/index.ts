import { getActiveConnection, getAuthenticatedUser, jsonResponse, optionsResponse } from '../_shared/salesforce.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();

  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const connection = await getActiveConnection(user.id);

    await supabase.from('crm_connection_tokens').delete().eq('connection_id', connection.id);
    await supabase
      .from('crm_connections')
      .update({ status: 'disconnected', updated_at: new Date().toISOString() })
      .eq('id', connection.id)
      .eq('user_id', user.id);

    return jsonResponse({ disconnected: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Salesforce disconnect failed.' }, 400);
  }
});
