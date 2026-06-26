alter table public.leads
  add column if not exists crm_source text,
  add column if not exists crm_external_id text,
  add column if not exists crm_last_synced_at timestamptz,
  add column if not exists crm_remote_updated_at timestamptz,
  add column if not exists local_updated_at timestamptz default now();

create or replace function public.set_leads_local_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.local_updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_leads_local_updated_at on public.leads;
create trigger trg_leads_local_updated_at
  before update on public.leads
  for each row
  execute function public.set_leads_local_updated_at();

create table if not exists public.crm_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('hubspot')),
  portal_id text,
  account_name text,
  status text not null default 'active' check (status in ('active', 'error', 'disconnected')),
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.crm_connection_tokens (
  connection_id uuid primary key references public.crm_connections(id) on delete cascade,
  provider text not null check (provider in ('hubspot')),
  access_token_ciphertext text not null,
  access_token_iv text not null,
  refresh_token_ciphertext text not null,
  refresh_token_iv text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_contact_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  provider text not null check (provider in ('hubspot')),
  external_contact_id text not null,
  remote_updated_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, external_contact_id),
  unique (user_id, provider, lead_id)
);

create table if not exists public.crm_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.crm_connections(id) on delete set null,
  provider text not null check (provider in ('hubspot')),
  operation text not null check (operation in ('import', 'export', 'sync')),
  status text not null default 'running' check (status in ('running', 'success', 'error')),
  created_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  errors jsonb not null default '[]',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.crm_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('hubspot')),
  redirect_to text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_connections_user_provider
  on public.crm_connections (user_id, provider);

create index if not exists idx_crm_contact_links_user_provider
  on public.crm_contact_links (user_id, provider);

create index if not exists idx_crm_sync_runs_user_started
  on public.crm_sync_runs (user_id, started_at desc);

alter table public.crm_connections enable row level security;
alter table public.crm_connection_tokens enable row level security;
alter table public.crm_contact_links enable row level security;
alter table public.crm_sync_runs enable row level security;
alter table public.crm_oauth_states enable row level security;

drop policy if exists "Users can view their own crm connections" on public.crm_connections;
create policy "Users can view their own crm connections"
  on public.crm_connections
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own crm contact links" on public.crm_contact_links;
create policy "Users can view their own crm contact links"
  on public.crm_contact_links
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own crm sync runs" on public.crm_sync_runs;
create policy "Users can view their own crm sync runs"
  on public.crm_sync_runs
  for select
  using (auth.uid() = user_id);
