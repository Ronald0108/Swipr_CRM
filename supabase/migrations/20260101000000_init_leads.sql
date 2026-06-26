create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  title text not null default '',
  company text not null default '',
  industry text not null default '',
  phone text not null default '',
  email text not null default '',
  deal_size text not null default '',
  deal_size_num numeric not null default 0,
  score numeric not null default 0,
  last_contact text not null default '',
  notes text not null default '',
  status text not null default 'new',
  avatar text not null default '',
  location text not null default '',
  source text not null default '',
  call_attempts numeric not null default 0,
  timezone text not null default '',
  tags text[] not null default '{}',
  company_size text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads enable row level security;
