import { getCrmAdapter } from '../_shared/crm-adapter.ts';
import { getAuthenticatedUser, getSalesforceRedirectUri, jsonResponse, optionsResponse } from '../_shared/salesforce.ts';
import '../_shared/salesforce.ts'; // Ensure adapter is registered

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();

  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const state = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await supabase.from('crm_oauth_states').insert({
      state,
      user_id: user.id,
      organization_id: body.organizationId,
      provider: 'salesforce',
      redirect_to: body.redirectTo ?? null,
      expires_at: expiresAt,
    });
    if (error) throw error;

    const adapter = getCrmAdapter('salesforce');
    const authUrl = adapter.getAuthUrl(state, getSalesforceRedirectUri());

    return jsonResponse({ authUrl });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Failed to start Salesforce OAuth.' }, 400);
  }
});
