import { createSyncRun, finishSyncRun, getActiveConnection, getAuthenticatedUser, jsonResponse, optionsResponse, updateConnectionSyncTime } from '../_shared/hubspot.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();

  let runId: string | null = null;
  const emptyResult = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] as string[] };

  try {
    const { user } = await getAuthenticatedUser(req);
    const connection = await getActiveConnection(user.id);
    const syncRun = await createSyncRun(user.id, connection.id, 'sync');
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
        body: '{}',
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `${name} failed.`);
      return body.result;
    };

    const imported = await invoke('hubspot-import-contacts');
    const exported = await invoke('hubspot-export-contacts');
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
    emptyResult.errors = [error instanceof Error ? error.message : 'HubSpot sync failed.'];
    if (runId) await finishSyncRun(runId, emptyResult, 'error');
    return jsonResponse({ error: emptyResult.errors[0], result: emptyResult }, 400);
  }
});
