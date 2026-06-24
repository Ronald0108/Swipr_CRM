-- Multi-CRM support: extend provider constraints to include salesforce
-- This migration updates CHECK constraints on all CRM tables to allow 'salesforce' as a provider

-- crm_connections: update provider check
alter table public.crm_connections drop constraint if exists crm_connections_provider_check;
alter table public.crm_connections add constraint crm_connections_provider_check
  check (provider in ('hubspot', 'salesforce', 'pipedrive', 'zoho'));

-- crm_connection_tokens: update provider check
alter table public.crm_connection_tokens drop constraint if exists crm_connection_tokens_provider_check;
alter table public.crm_connection_tokens add constraint crm_connection_tokens_provider_check
  check (provider in ('hubspot', 'salesforce', 'pipedrive', 'zoho'));

-- crm_contact_links: update provider check
alter table public.crm_contact_links drop constraint if exists crm_contact_links_provider_check;
alter table public.crm_contact_links add constraint crm_contact_links_provider_check
  check (provider in ('hubspot', 'salesforce', 'pipedrive', 'zoho'));

-- crm_sync_runs: update provider check
alter table public.crm_sync_runs drop constraint if exists crm_sync_runs_provider_check;
alter table public.crm_sync_runs add constraint crm_sync_runs_provider_check
  check (provider in ('hubspot', 'salesforce', 'pipedrive', 'zoho'));

-- crm_oauth_states: update provider check
alter table public.crm_oauth_states drop constraint if exists crm_oauth_states_provider_check;
alter table public.crm_oauth_states add constraint crm_oauth_states_provider_check
  check (provider in ('hubspot', 'salesforce', 'pipedrive', 'zoho'));
