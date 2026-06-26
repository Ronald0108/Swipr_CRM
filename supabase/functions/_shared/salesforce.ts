import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.2';
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

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function optionsResponse() {
  return new Response('ok', { headers: corsHeaders });
}

export function getAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase function environment.');
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function getAuthenticatedUser(req: Request) {
  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Missing authorization token.');

  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid authorization token.');

  return { supabase, user: data.user, authorization };
}

export function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function getTokenEncryptionKey() {
  const secret = Deno.env.get('SALESFORCE_TOKEN_ENCRYPTION_KEY') || Deno.env.get('HUBSPOT_TOKEN_ENCRYPTION_KEY');
  if (!secret) throw new Error('Missing token encryption key (SALESFORCE_TOKEN_ENCRYPTION_KEY or HUBSPOT_TOKEN_ENCRYPTION_KEY).');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return await crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptToken(token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getTokenEncryptionKey();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(token),
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptToken(ciphertext: string, iv: string) {
  const key = await getTokenEncryptionKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  );

  return new TextDecoder().decode(plaintext);
}

export function getSalesforceAuthDomain() {
  return Deno.env.get('SALESFORCE_AUTH_URL') || 'https://login.salesforce.com';
}

export const SALESFORCE_SCOPES = ['api', 'refresh_token', 'offline_access'];

export function getSalesforceRedirectUri() {
  const projectRef = Deno.env.get('SUPABASE_PROJECT_REF');
  if (projectRef) {
    return `https://${projectRef}.supabase.co/functions/v1/salesforce-oauth-callback`;
  }
  return 'http://localhost:54321/functions/v1/salesforce-oauth-callback';
}

export function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstname: '', lastname: '[Unknown]' };
  if (parts.length === 1) return { firstname: '', lastname: parts[0] };
  return { firstname: parts.slice(0, -1).join(' '), lastname: parts[parts.length - 1] };
}

export async function refreshSalesforceToken(connectionId: string): Promise<string> {
  const supabase = getAdminClient();
  const { data: tokenRow, error } = await supabase
    .from('crm_connection_tokens')
    .select('*, crm_connections(instance_url)')
    .eq('connection_id', connectionId)
    .single();

  if (error || !tokenRow) throw new Error('Salesforce token not found.');

  const expiresAt = new Date(tokenRow.expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) {
    return await decryptToken(tokenRow.access_token_ciphertext, tokenRow.access_token_iv);
  }

  const refreshToken = await decryptToken(tokenRow.refresh_token_ciphertext, tokenRow.refresh_token_iv);
  const domain = getSalesforceAuthDomain();

  const response = await fetch(`${domain}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: requireEnv('SALESFORCE_CLIENT_ID'),
      client_secret: requireEnv('SALESFORCE_CLIENT_SECRET'),
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) throw new Error(`Salesforce token refresh failed: ${await response.text()}`);
  const refreshed = await response.json();
  const nextExpiresAt = new Date(Date.now() + 7200 * 1000).toISOString(); // Salesforce access tokens default to 2 hrs
  const encryptedAccessToken = await encryptToken(refreshed.access_token);
  const encryptedRefreshToken = await encryptToken(refreshed.refresh_token ?? refreshToken);

  await supabase
    .from('crm_connection_tokens')
    .update({
      access_token_ciphertext: encryptedAccessToken.ciphertext,
      access_token_iv: encryptedAccessToken.iv,
      refresh_token_ciphertext: encryptedRefreshToken.ciphertext,
      refresh_token_iv: encryptedRefreshToken.iv,
      expires_at: nextExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('connection_id', connectionId);

  await supabase
    .from('crm_connections')
    .update({
      expires_at: nextExpiresAt,
      updated_at: new Date().toISOString(),
      status: 'active',
      instance_url: refreshed.instance_url || tokenRow.crm_connections?.instance_url,
    })
    .eq('id', connectionId);

  return refreshed.access_token as string;
}

export async function getActiveConnection(organizationId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('crm_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('provider', 'salesforce')
    .neq('status', 'disconnected')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Salesforce is not connected.');
  return data;
}

export async function getOrCreateAccount(accessToken: string, instanceUrl: string, companyName: string): Promise<string | null> {
  if (!companyName) return null;

  try {
    const query = `SELECT Id FROM Account WHERE Name = '${companyName.replace(/'/g, "\\'")}' LIMIT 1`;
    const res = await fetch(`${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.records && data.records.length > 0) {
        return data.records[0].Id;
      }
    }

    const createRes = await fetch(`${instanceUrl}/services/data/v60.0/sobjects/Account`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ Name: companyName }),
    });
    if (createRes.ok) {
      const data = await createRes.json();
      return data.id;
    }
  } catch (err) {
    console.error('Error resolving Salesforce Account:', err);
  }
  return null;
}

export async function fetchSalesforceContacts(accessToken: string, instanceUrl: string): Promise<CrmContact[]> {
  const query = 'SELECT Id, FirstName, LastName, Email, Phone, Title, Account.Name, MailingCity, MailingState, MailingCountry, Description, LastModifiedDate FROM Contact LIMIT 1000';
  const res = await fetch(`${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to query Salesforce contacts: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const records = data.records ?? [];

  return records.map((rec: any) => {
    const mailingCity = rec.MailingCity || '';
    const mailingState = rec.MailingState || '';
    const mailingCountry = rec.MailingCountry || '';
    const location = [mailingCity, mailingState, mailingCountry].filter(Boolean).join(', ');

    return {
      externalId: rec.Id,
      name: [rec.FirstName, rec.LastName].filter(Boolean).join(' ').trim(),
      firstName: rec.FirstName || '',
      lastName: rec.LastName || '',
      email: rec.Email || '',
      phone: rec.Phone || '',
      company: rec.Account?.Name || '',
      title: rec.Title || '',
      location,
      source: 'Salesforce',
      notes: rec.Description || '',
      status: 'new',
      updatedAt: rec.LastModifiedDate || null,
    };
  });
}

export async function pushSalesforceContacts(
  accessToken: string,
  instanceUrl: string,
  leads: LeadPayload[],
  organizationId: string,
  userId: string
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] };

  for (const lead of leads) {
    try {
      const { data: link } = await getAdminClient()
        .from('crm_contact_links')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('provider', 'salesforce')
        .eq('lead_id', lead.id)
        .maybeSingle();

      const accountId = lead.company ? await getOrCreateAccount(accessToken, instanceUrl, lead.company) : null;
      const { firstname, lastname } = splitName(lead.name || '');

      const contactPayload: Record<string, any> = {
        FirstName: firstname,
        LastName: lastname,
        Email: lead.email || '',
        Phone: lead.phone || '',
        Title: lead.title || '',
        Description: lead.notes || '',
      };
      if (accountId) {
        contactPayload.AccountId = accountId;
      }

      let externalId = link?.external_contact_id;

      if (externalId) {
        const patchRes = await fetch(`${instanceUrl}/services/data/v60.0/sobjects/Contact/${externalId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(contactPayload),
        });

        if (!patchRes.ok && patchRes.status !== 204) {
          throw new Error(`PATCH Contact failed: ${patchRes.status} ${await patchRes.text()}`);
        }
        result.updated += 1;
      } else {
        const postRes = await fetch(`${instanceUrl}/services/data/v60.0/sobjects/Contact`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(contactPayload),
        });

        if (!postRes.ok) {
          throw new Error(`POST Contact failed: ${postRes.status} ${await postRes.text()}`);
        }

        const data = await postRes.json();
        externalId = data.id;
        result.created += 1;
      }

      await getAdminClient().from('crm_contact_links').upsert({
        organization_id: organizationId,
        user_id: userId,
        lead_id: lead.id,
        provider: 'salesforce',
        external_contact_id: externalId,
        remote_updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,provider,lead_id' });

      await getAdminClient()
        .from('leads')
        .update({
          crm_source: 'salesforce',
          crm_external_id: externalId,
          crm_last_synced_at: new Date().toISOString(),
        })
        .eq('id', lead.id)
        .eq('organization_id', organizationId);

    } catch (error) {
      result.failed += 1;
      result.errors.push(error instanceof Error ? error.message : 'Salesforce contact push failed.');
    }
  }

  return result;
}

class SalesforceAdapter implements CrmAdapter {
  readonly provider: CrmProvider = 'salesforce';

  getAuthUrl(state: string, redirectUri: string): string {
    const clientId = Deno.env.get('SALESFORCE_CLIENT_ID');
    if (!clientId) throw new Error('Missing SALESFORCE_CLIENT_ID');
    const domain = getSalesforceAuthDomain();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: SALESFORCE_SCOPES.join(' '),
      state,
    });

    return `${domain}/services/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenSet> {
    const clientId = Deno.env.get('SALESFORCE_CLIENT_ID');
    const clientSecret = Deno.env.get('SALESFORCE_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new Error('Missing Salesforce OAuth credentials');
    const domain = getSalesforceAuthDomain();

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });

    const res = await fetch(`${domain}/services/oauth2/token`, {
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
      instanceUrl: data.instance_url,
    };
  }

  async getAccessToken(connectionId: string): Promise<string> {
    return await refreshSalesforceToken(connectionId);
  }

  async getIdentity(accessToken: string): Promise<CrmIdentity> {
    const domain = getSalesforceAuthDomain();
    const res = await fetch(`${domain}/services/oauth2/userinfo`, {
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
    throw new Error('Please use fetchSalesforceContacts helper directly to supply instanceUrl.');
  }

  async pushContacts(accessToken: string, leads: LeadPayload[], organizationId: string, userId: string): Promise<SyncResult> {
    throw new Error('Please use pushSalesforceContacts helper directly to supply instanceUrl.');
  }
}

// Register the adapter
registerCrmAdapter('salesforce', () => new SalesforceAdapter());

export async function createSyncRun(userId: string, organizationId: string, connectionId: string, operation: 'import' | 'export' | 'sync') {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('crm_sync_runs')
    .insert({ user_id: userId, organization_id: organizationId, connection_id: connectionId, provider: 'salesforce', operation })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function finishSyncRun(runId: string, result: SyncResult, status: 'success' | 'error' = 'success') {
  const supabase = getAdminClient();
  await supabase
    .from('crm_sync_runs')
    .update({
      status,
      created_count: result.created,
      updated_count: result.updated,
      skipped_count: result.skipped,
      failed_count: result.failed,
      errors: result.errors,
      finished_at: new Date().toISOString(),
    })
    .eq('id', runId);
}

export async function updateConnectionSyncTime(connectionId: string) {
  const supabase = getAdminClient();
  await supabase
    .from('crm_connections')
    .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(), status: 'active' })
    .eq('id', connectionId);
}
