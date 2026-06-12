import {
  createSyncRun,
  fetchAllHubSpotContacts,
  fetchHubSpotContactPropertyNames,
  finishSyncRun,
  getActiveConnection,
  getAuthenticatedUser,
  hubspotContactToLeadPayload,
  jsonResponse,
  optionsResponse,
  refreshHubSpotToken,
  updateConnectionSyncTime,
} from '../_shared/hubspot.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();

  let runId: string | null = null;
  const result = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] as string[] };

  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const connection = await getActiveConnection(user.id);
    const syncRun = await createSyncRun(user.id, connection.id, 'import');
    runId = syncRun.id;

    const accessToken = await refreshHubSpotToken(connection.id);
    const propertyNames = await fetchHubSpotContactPropertyNames(accessToken);
    const contacts = await fetchAllHubSpotContacts(accessToken, propertyNames);

    for (const contact of contacts) {
      try {
        const remoteUpdatedAt = contact.updatedAt ?? contact.properties?.lastmodifieddate ?? null;
        const { data: existingLink } = await supabase
          .from('crm_contact_links')
          .select('*, leads(*)')
          .eq('user_id', user.id)
          .eq('provider', 'hubspot')
          .eq('external_contact_id', contact.id)
          .maybeSingle();

        const payload = hubspotContactToLeadPayload(contact, user.id);

        if (existingLink?.lead_id) {
          const localUpdatedAt = existingLink.leads?.local_updated_at ? new Date(existingLink.leads.local_updated_at).getTime() : 0;
          const remoteTime = remoteUpdatedAt ? new Date(remoteUpdatedAt).getTime() : 0;

          if (localUpdatedAt > remoteTime) {
            result.skipped += 1;
            continue;
          }

          const { error } = await supabase
            .from('leads')
            .update(payload)
            .eq('id', existingLink.lead_id)
            .eq('user_id', user.id);
          if (error) throw error;

          await supabase
            .from('crm_contact_links')
            .update({ remote_updated_at: remoteUpdatedAt, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', existingLink.id);

          result.updated += 1;
          continue;
        }

        const email = contact.properties?.email;
        const { data: matchingLead } = email
          ? await supabase.from('leads').select('*').eq('user_id', user.id).eq('email', email).maybeSingle()
          : { data: null };

        const leadId = matchingLead?.id;
        if (leadId) {
          await supabase
            .from('leads')
            .update(payload)
            .eq('id', leadId)
            .eq('user_id', user.id);
          result.updated += 1;
        } else {
          const { data: createdLead, error } = await supabase.from('leads').insert(payload).select('*').single();
          if (error) throw error;
          result.created += 1;
          await supabase.from('crm_contact_links').insert({
            user_id: user.id,
            lead_id: createdLead.id,
            provider: 'hubspot',
            external_contact_id: contact.id,
            remote_updated_at: remoteUpdatedAt,
            last_synced_at: new Date().toISOString(),
          });
          continue;
        }

        await supabase.from('crm_contact_links').upsert({
          user_id: user.id,
          lead_id: leadId,
          provider: 'hubspot',
          external_contact_id: contact.id,
          remote_updated_at: remoteUpdatedAt,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,provider,external_contact_id' });
      } catch (error) {
        result.failed += 1;
        result.errors.push(error instanceof Error ? error.message : 'Failed to import contact.');
      }
    }

    await updateConnectionSyncTime(connection.id);
    await finishSyncRun(runId, result);
    return jsonResponse({ result });
  } catch (error) {
    result.failed += 1;
    result.errors.push(error instanceof Error ? error.message : 'HubSpot import failed.');
    if (runId) await finishSyncRun(runId, result, 'error');
    return jsonResponse({ error: result.errors[0], result }, 400);
  }
});
