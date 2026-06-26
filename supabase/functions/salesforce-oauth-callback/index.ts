import { getCrmAdapter } from '../_shared/crm-adapter.ts';
import {
  encryptToken,
  getAdminClient,
  getSalesforceRedirectUri,
} from '../_shared/salesforce.ts';
import '../_shared/salesforce.ts'; // Ensure adapter is registered

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const appOrigin = Deno.env.get('APP_ORIGIN') ?? Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

  try {
    if (!code || !state) throw new Error('Missing Salesforce OAuth code or state.');

    const supabase = getAdminClient();
    const { data: oauthState, error: stateError } = await supabase
      .from('crm_oauth_states')
      .select('*')
      .eq('state', state)
      .eq('provider', 'salesforce')
      .single();

    if (stateError || !oauthState) throw new Error('Invalid OAuth state.');
    if (new Date(oauthState.expires_at).getTime() < Date.now()) throw new Error('Expired OAuth state.');

    const adapter = getCrmAdapter('salesforce');
    const tokenData = await adapter.exchangeCodeForTokens(code, getSalesforceRedirectUri());
    const identity = await adapter.getIdentity(tokenData.accessToken);
    
    const expiresAt = new Date(Date.now() + Number(tokenData.expiresIn ?? 7200) * 1000).toISOString();

    const { data: connection, error: connectionError } = await supabase
      .from('crm_connections')
      .upsert({
        user_id: oauthState.user_id,
        organization_id: oauthState.organization_id,
        provider: 'salesforce',
        portal_id: identity.portalId,
        account_name: identity.accountName,
        status: 'active',
        scopes: tokenData.scope ? tokenData.scope.split(' ') : ['api', 'refresh_token', 'offline_access'],
        connected_at: new Date().toISOString(),
        expires_at: expiresAt,
        instance_url: tokenData.instanceUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,provider' })
      .select('*')
      .single();

    if (connectionError) throw connectionError;

    const encryptedAccessToken = await encryptToken(tokenData.accessToken);
    const encryptedRefreshToken = await encryptToken(tokenData.refreshToken);

    const { error: tokenError } = await supabase
      .from('crm_connection_tokens')
      .upsert({
        connection_id: connection.id,
        provider: 'salesforce',
        access_token_ciphertext: encryptedAccessToken.ciphertext,
        access_token_iv: encryptedAccessToken.iv,
        refresh_token_ciphertext: encryptedRefreshToken.ciphertext,
        refresh_token_iv: encryptedRefreshToken.iv,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'connection_id' });

    if (tokenError) throw tokenError;

    await supabase.from('crm_oauth_states').delete().eq('state', state);

    return Response.redirect(`${oauthState.redirect_to ?? appOrigin}?salesforce=connected`, 302);
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : 'Salesforce OAuth failed.');
    return Response.redirect(`${appOrigin}?salesforce=error&message=${message}`, 302);
  }
});
