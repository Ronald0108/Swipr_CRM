create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id text not null,
  activity_type text not null check (activity_type in ('connected', 'lost', 'voicemail', 'next', 'call', 'email', 'notes')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_activities_user_lead_created_at
  on public.lead_activities (user_id, lead_id, created_at desc);

create index if not exists idx_lead_activities_user_created_at
  on public.lead_activities (user_id, created_at desc);

alter table public.lead_activities enable row level security;

drop policy if exists "Users can view their own lead activities" on public.lead_activities;
create policy "Users can view their own lead activities"
  on public.lead_activities
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own lead activities" on public.lead_activities;
create policy "Users can insert their own lead activities"
  on public.lead_activities
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own lead activities" on public.lead_activities;
create policy "Users can delete their own lead activities"
  on public.lead_activities
  for delete
  using (auth.uid() = user_id);
