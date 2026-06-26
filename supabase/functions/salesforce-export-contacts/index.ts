import {
  createSyncRun,
  finishSyncRun,
  getActiveConnection,
  getAuthenticatedUser,
  jsonResponse,
  optionsResponse,
  pushSalesforceContacts,
  refreshSalesforceToken,
  updateConnectionSyncTime,
} from '../_shared/salesforce.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();

  let runId: string | null = null;
  const result = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] as string[] };

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const organizationId = body.organizationId;
    if (!organizationId) throw new Error('Missing organizationId');

    const { supabase, user } = await getAuthenticatedUser(req);
    
    // Verify user has access to organization
    const { data: member } = await supabase.from('organization_members').select('id').eq('organization_id', organizationId).eq('user_id', user.id).maybeSingle();
    if (!member) throw new Error('Unauthorized for this organization.');

    const connection = await getActiveConnection(organizationId);
    
    const syncRun = await createSyncRun(user.id, organizationId, connection.id, 'export');
    runId = syncRun.id;

    const accessToken = await refreshSalesforceToken(connection.id);

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', organizationId);

    if (leadsError) throw leadsError;

    const pushResult = await pushSalesforceContacts(
      accessToken,
      connection.instance_url,
      (leads as any) ?? [],
      organizationId,
      user.id
    );

    result.created = pushResult.created;
    result.updated = pushResult.updated;
    result.skipped = pushResult.skipped;
    result.failed = pushResult.failed;
    result.errors = pushResult.errors;

    await updateConnectionSyncTime(connection.id);
    await finishSyncRun(runId, result);
    return jsonResponse({ result });
  } catch (error) {
    result.failed += 1;
    result.errors.push(error instanceof Error ? error.message : 'Salesforce export failed.');
    if (runId) await finishSyncRun(runId, result, 'error');
    return jsonResponse({ error: result.errors[0], result }, 400);
  }
});
