import { encryptToken, exchangeCodeForTokens, getAdminClient, getHubSpotIdentity, getHubSpotScopes } from '../_shared/hubspot.ts';

/** Build the callback URI that was used during the authorize step. */
function buildCallbackUri(origin: string) {
  return new URL('/api/auth/callback/hubspot', origin).toString();
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const appOrigin = Deno.env.get('APP_ORIGIN') ?? Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

  try {
    if (!code || !state) throw new Error('Missing HubSpot OAuth code or state.');

    const supabase = getAdminClient();
    const { data: oauthState, error: stateError } = await supabase
      .from('crm_oauth_states')
      .select('*')
      .eq('state', state)
      .eq('provider', 'hubspot')
      .single();

    if (stateError || !oauthState) throw new Error('Invalid OAuth state.');
    if (new Date(oauthState.expires_at).getTime() < Date.now()) throw new Error('Expired OAuth state.');

    // Recover the origin that started the flow to build the matching redirect_uri
    const callerOrigin = oauthState.redirect_to ?? appOrigin;
    const callbackUri = buildCallbackUri(callerOrigin);
    const tokenData = await exchangeCodeForTokens(code, callbackUri);
    const identity = await getHubSpotIdentity(tokenData.access_token);
    const expiresAt = new Date(Date.now() + Number(tokenData.expires_in ?? 1800) * 1000).toISOString();

    const { data: connection, error: connectionError } = await supabase
      .from('crm_connections')
      .upsert({
        organization_id: oauthState.organization_id,
        user_id: oauthState.user_id,
        provider: 'hubspot',
        portal_id: String(identity.hub_id ?? identity.hubId ?? ''),
        account_name: identity.hub_domain ?? identity.user ?? 'HubSpot',
        status: 'active',
        scopes: getHubSpotScopes(),
        connected_at: new Date().toISOString(),
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,provider' })
      .select('*')
      .single();

    if (connectionError) throw connectionError;

    const encryptedAccessToken = await encryptToken(tokenData.access_token);
    const encryptedRefreshToken = await encryptToken(tokenData.refresh_token);

    const { error: tokenError } = await supabase
      .from('crm_connection_tokens')
      .upsert({
        connection_id: connection.id,
        provider: 'hubspot',
        access_token_ciphertext: encryptedAccessToken.ciphertext,
        access_token_iv: encryptedAccessToken.iv,
        refresh_token_ciphertext: encryptedRefreshToken.ciphertext,
        refresh_token_iv: encryptedRefreshToken.iv,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'connection_id' });

    if (tokenError) throw tokenError;

    await supabase.from('crm_oauth_states').delete().eq('state', state);

    return Response.redirect(`${oauthState.redirect_to ?? appOrigin}?hubspot=connected`, 302);
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : 'HubSpot OAuth failed.');
    return Response.redirect(`${appOrigin}?hubspot=error&message=${message}`, 302);
  }
});
