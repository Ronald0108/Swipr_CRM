import { getAuthenticatedUser, getHubSpotRedirectUri, getHubSpotScopes, jsonResponse, optionsResponse, requireEnv } from '../_shared/hubspot.ts';

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
      provider: 'hubspot',
      redirect_to: body.redirectTo ?? null,
      expires_at: expiresAt,
    });
    if (error) throw error;

    const clientId = requireEnv('HUBSPOT_CLIENT_ID').trim();
    const redirectUri = getHubSpotRedirectUri().trim();
    if (!clientId) throw new Error('Missing HUBSPOT_CLIENT_ID.');
    if (!redirectUri) throw new Error('Missing HUBSPOT_REDIRECT_URI.');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: getHubSpotScopes().join(' '),
      state,
    });

    return jsonResponse({ authUrl: `https://app.hubspot.com/oauth/authorize?${params.toString()}` });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Failed to start HubSpot OAuth.' }, 400);
  }
});
