import {
  createSyncRun,
  finishSyncRun,
  getActiveConnection,
  getAuthenticatedUser,
  jsonResponse,
  optionsResponse,
  updateConnectionSyncTime,
} from '../_shared/salesforce.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();

  let runId: string | null = null;
  const emptyResult = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] as string[] };

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const organizationId = body.organizationId;
    if (!organizationId) throw new Error('Missing organizationId');

    const { supabase, user } = await getAuthenticatedUser(req);
    
    const { data: member } = await supabase.from('organization_members').select('id').eq('organization_id', organizationId).eq('user_id', user.id).maybeSingle();
    if (!member) throw new Error('Unauthorized for this organization.');

    const connection = await getActiveConnection(organizationId);
    const syncRun = await createSyncRun(user.id, organizationId, connection.id, 'sync');
    runId = syncRun.id;

    const authorization = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) throw new Error('Missing SUPABASE_URL.');

    const invoke = async (name: string) => {
      const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId }),
      });
      const bodyText = await response.text();
      let responseBody;
      try { responseBody = JSON.parse(bodyText); } catch { throw new Error(`${name} failed with non-JSON response.`); }
      if (!response.ok) throw new Error(responseBody.error ?? `${name} failed.`);
      return responseBody.result;
    };

    const imported = await invoke('salesforce-import-contacts');
    const exported = await invoke('salesforce-export-contacts');
    const result = {
      created: Number(imported.created ?? 0) + Number(exported.created ?? 0),
      updated: Number(imported.updated ?? 0) + Number(exported.updated ?? 0),
      skipped: Number(imported.skipped ?? 0) + Number(exported.skipped ?? 0),
      failed: Number(imported.failed ?? 0) + Number(exported.failed ?? 0),
      errors: [...(imported.errors ?? []), ...(exported.errors ?? [])],
    };

    await updateConnectionSyncTime(connection.id);
    await finishSyncRun(runId, result);
    return jsonResponse({ result });
  } catch (error) {
    emptyResult.failed = 1;
    emptyResult.errors = [error instanceof Error ? error.message : 'Salesforce sync failed.'];
    if (runId) await finishSyncRun(runId, emptyResult, 'error');
    return jsonResponse({ error: emptyResult.errors[0], result: emptyResult }, 400);
  }
});
