import {
  createSyncRun,
  fetchHubSpotContactPropertyNames,
  finishSyncRun,
  getActiveConnection,
  getAuthenticatedUser,
  hubspotRequest,
  jsonResponse,
  leadToHubSpotProperties,
  optionsResponse,
  refreshHubSpotToken,
  updateConnectionSyncTime,
} from '../_shared/hubspot.ts';

async function createHubSpotNote(accessToken: string, contactId: string, body: string, timestamp: string) {
  const note = await hubspotRequest(accessToken, '/crm/v3/objects/notes', {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        hs_note_body: body,
        hs_timestamp: timestamp,
      },
    }),
  });

  await hubspotRequest(accessToken, `/crm/v3/objects/notes/${note.id}/associations/contact/${contactId}/202`, {
    method: 'PUT',
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();

  let runId: string | null = null;
  const result = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] as string[] };

  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const connection = await getActiveConnection(user.id);
    const syncRun = await createSyncRun(user.id, connection.id, 'export');
    runId = syncRun.id;
    const accessToken = await refreshHubSpotToken(connection.id);
    const propertyNames = await fetchHubSpotContactPropertyNames(accessToken);

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', user.id);
    if (leadsError) throw leadsError;

    for (const lead of leads ?? []) {
      try {
        const { data: link } = await supabase
          .from('crm_contact_links')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', 'hubspot')
          .eq('lead_id', lead.id)
          .maybeSingle();

        let contactId = link?.external_contact_id as string | undefined;
        const properties = leadToHubSpotProperties(lead, propertyNames);

        if (contactId) {
          await hubspotRequest(accessToken, `/crm/v3/objects/contacts/${contactId}`, {
            method: 'PATCH',
            body: JSON.stringify({ properties }),
          });
          result.updated += 1;
        } else {
          const contact = await hubspotRequest(accessToken, '/crm/v3/objects/contacts', {
            method: 'POST',
            body: JSON.stringify({ properties }),
          });
          contactId = contact.id;
          result.created += 1;
        }

        await supabase.from('crm_contact_links').upsert({
          user_id: user.id,
          lead_id: lead.id,
          provider: 'hubspot',
          external_contact_id: contactId,
          remote_updated_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,provider,lead_id' });

        await supabase
          .from('leads')
          .update({
            crm_source: 'hubspot',
            crm_external_id: contactId,
            crm_last_synced_at: new Date().toISOString(),
          })
          .eq('id', lead.id)
          .eq('user_id', user.id);

        const { data: activities } = await supabase
          .from('lead_activities')
          .select('*')
          .eq('user_id', user.id)
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
          .limit(10);

        for (const activity of activities ?? []) {
          const noteBody = `Swipr activity: ${activity.activity_type}\nLead: ${lead.name || 'Unnamed Lead'}\nCompany: ${lead.company || 'N/A'}`;
          await createHubSpotNote(accessToken, contactId, noteBody, activity.created_at);
        }
      } catch (error) {
        result.failed += 1;
        result.errors.push(error instanceof Error ? error.message : 'Failed to export lead.');
      }
    }

    await updateConnectionSyncTime(connection.id);
    await finishSyncRun(runId, result);
    return jsonResponse({ result });
  } catch (error) {
    result.failed += 1;
    result.errors.push(error instanceof Error ? error.message : 'HubSpot export failed.');
    if (runId) await finishSyncRun(runId, result, 'error');
    return jsonResponse({ error: result.errors[0], result }, 400);
  }
});
