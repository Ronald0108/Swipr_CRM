import {
  CrmAdapter,
  CrmProvider,
  TokenSet,
  CrmIdentity,
  CrmContact,
  LeadPayload,
  SyncResult,
  registerCrmAdapter,
} from './crm-adapter.ts';

export const SALESFORCE_SCOPES = ['api', 'refresh_token', 'offline_access'];

export function getSalesforceRedirectUri() {
  const projectRef = Deno.env.get('SUPABASE_PROJECT_REF');
  if (projectRef) {
    return `https://${projectRef}.supabase.co/functions/v1/salesforce-oauth-callback`;
  }
  return 'http://localhost:54321/functions/v1/salesforce-oauth-callback';
}

class SalesforceAdapter implements CrmAdapter {
  readonly provider: CrmProvider = 'salesforce';

  getAuthUrl(state: string, redirectUri: string): string {
    const clientId = Deno.env.get('SALESFORCE_CLIENT_ID');
    if (!clientId) throw new Error('Missing SALESFORCE_CLIENT_ID');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: SALESFORCE_SCOPES.join(' '),
      state,
    });

    return `https://login.salesforce.com/services/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenSet> {
    const clientId = Deno.env.get('SALESFORCE_CLIENT_ID');
    const clientSecret = Deno.env.get('SALESFORCE_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new Error('Missing Salesforce OAuth credentials');

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });

    const res = await fetch('https://login.salesforce.com/services/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to exchange code: ${res.status} ${text}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: 7200,
      scope: data.scope,
    };
  }

  async getAccessToken(connectionId: string): Promise<string> {
    // In a real implementation, you would check the database for the connection's tokens,
    // refresh if expired, and return the valid access token.
    // For this prototype, we'll just throw an error if not implemented.
    throw new Error('getAccessToken not implemented for Salesforce adapter.');
  }

  async getIdentity(accessToken: string): Promise<CrmIdentity> {
    const res = await fetch('https://login.salesforce.com/services/oauth2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) throw new Error(`Failed to fetch Salesforce identity: ${res.status}`);

    const data = await res.json();
    return {
      portalId: data.organization_id || data.user_id,
      accountName: data.name || 'Salesforce Org',
      email: data.email,
    };
  }

  async fetchContacts(accessToken: string): Promise<CrmContact[]> {
    // Note: requires instance_url from token exchange usually. 
    // This is a placeholder for the SOQL query.
    return [];
  }

  async pushContacts(accessToken: string, leads: LeadPayload[], userId: string): Promise<SyncResult> {
    return { created: 0, updated: 0, skipped: leads.length, failed: 0, errors: [] };
  }
}

// Register the adapter
registerCrmAdapter('salesforce', () => new SalesforceAdapter());
