import { getActiveConnection, getAuthenticatedUser, jsonResponse, optionsResponse } from '../_shared/hubspot.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const organizationId = body.organizationId;
    if (!organizationId) throw new Error('Missing organizationId');

    const { supabase, user } = await getAuthenticatedUser(req);

    const { data: member } = await supabase.from('organization_members').select('id').eq('organization_id', organizationId).eq('user_id', user.id).maybeSingle();
    if (!member) throw new Error('Unauthorized for this organization.');

    const connection = await getActiveConnection(organizationId);

    await supabase.from('crm_connection_tokens').delete().eq('connection_id', connection.id);
    await supabase
      .from('crm_connections')
      .update({ status: 'disconnected', updated_at: new Date().toISOString() })
      .eq('id', connection.id)
      .eq('organization_id', organizationId);

    return jsonResponse({ disconnected: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'HubSpot disconnect failed.' }, 400);
  }
});
