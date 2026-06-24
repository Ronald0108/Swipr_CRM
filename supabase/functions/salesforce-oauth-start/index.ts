import { getCrmAdapter } from '../_shared/crm-adapter.ts';
import { getSalesforceRedirectUri } from '../_shared/salesforce.ts';
import '../_shared/salesforce.ts'; // Ensure adapter is registered

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  }

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const state = crypto.randomUUID();
    const adapter = getCrmAdapter('salesforce');
    const authUrl = adapter.getAuthUrl(state, getSalesforceRedirectUri());

    return new Response(JSON.stringify({ authUrl }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to start Salesforce OAuth.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
