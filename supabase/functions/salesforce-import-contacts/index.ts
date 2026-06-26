import { crmContactToLeadPayload } from '../_shared/crm-adapter.ts';
import {
  createSyncRun,
  fetchSalesforceContacts,
  finishSyncRun,
  getActiveConnection,
  getAuthenticatedUser,
  jsonResponse,
  optionsResponse,
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
    
    const { data: member } = await supabase.from('organization_members').select('id').eq('organization_id', organizationId).eq('user_id', user.id).maybeSingle();
    if (!member) throw new Error('Unauthorized for this organization.');

    const connection = await getActiveConnection(organizationId);
    
    const syncRun = await createSyncRun(user.id, organizationId, connection.id, 'import');
    runId = syncRun.id;

    const accessToken = await refreshSalesforceToken(connection.id);
    const contacts = await fetchSalesforceContacts(accessToken, connection.instance_url);

    for (const contact of contacts) {
      try {
        const remoteUpdatedAt = contact.updatedAt;
        const { data: existingLink } = await supabase
          .from('crm_contact_links')
          .select('*, leads(*)')
          .eq('organization_id', organizationId)
          .eq('provider', 'salesforce')
          .eq('external_contact_id', contact.externalId)
          .maybeSingle();

        const payload = crmContactToLeadPayload(contact, organizationId, user.id, 'salesforce');

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
            .eq('organization_id', organizationId);
          if (error) throw error;

          await supabase
            .from('crm_contact_links')
            .update({ remote_updated_at: remoteUpdatedAt, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', existingLink.id);

          result.updated += 1;
          continue;
        }

        const email = contact.email;
        const { data: matchingLead } = email
          ? await supabase.from('leads').select('*').eq('organization_id', organizationId).eq('email', email).maybeSingle()
          : { data: null };

        const leadId = matchingLead?.id;
        if (leadId) {
          await supabase
            .from('leads')
            .update(payload)
            .eq('id', leadId)
            .eq('organization_id', organizationId);
          result.updated += 1;
        } else {
          const { data: createdLead, error } = await supabase.from('leads').insert(payload).select('*').single();
          if (error) throw error;
          result.created += 1;
          await supabase.from('crm_contact_links').insert({
            organization_id: organizationId,
            user_id: user.id,
            lead_id: createdLead.id,
            provider: 'salesforce',
            external_contact_id: contact.externalId,
            remote_updated_at: remoteUpdatedAt,
            last_synced_at: new Date().toISOString(),
          });
          continue;
        }

        await supabase.from('crm_contact_links').upsert({
          organization_id: organizationId,
          user_id: user.id,
          lead_id: leadId,
          provider: 'salesforce',
          external_contact_id: contact.externalId,
          remote_updated_at: remoteUpdatedAt,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'organization_id,provider,external_contact_id' });
      } catch (error) {
        result.failed += 1;
        result.errors.push(error instanceof Error ? error.message : 'Failed to import Salesforce contact.');
      }
    }

    await updateConnectionSyncTime(connection.id);
    await finishSyncRun(runId, result);
    return jsonResponse({ result });
  } catch (error) {
    result.failed += 1;
    result.errors.push(error instanceof Error ? error.message : 'Salesforce import failed.');
    if (runId) await finishSyncRun(runId, result, 'error');
    return jsonResponse({ error: result.errors[0], result }, 400);
  }
});
