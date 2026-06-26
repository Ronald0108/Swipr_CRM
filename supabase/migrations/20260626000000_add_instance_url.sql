-- Add instance_url column to crm_connections table to support Salesforce
alter table public.crm_connections
  add column if not exists instance_url text;
