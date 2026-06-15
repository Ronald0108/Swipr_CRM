create table if not exists public.billing_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free', 'individual', 'team')),
  status text not null default 'free' check (
    status in (
      'free',
      'active',
      'trialing',
      'past_due',
      'canceled',
      'unpaid',
      'incomplete',
      'incomplete_expired',
      'paused'
    )
  ),
  price_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_billing_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_billing_profiles_updated_at on public.billing_profiles;
create trigger trg_billing_profiles_updated_at
  before update on public.billing_profiles
  for each row
  execute function public.set_billing_profiles_updated_at();

create index if not exists idx_billing_profiles_customer
  on public.billing_profiles (stripe_customer_id);

create index if not exists idx_billing_profiles_subscription
  on public.billing_profiles (stripe_subscription_id);

alter table public.billing_profiles enable row level security;

drop policy if exists "Users can view their own billing profile" on public.billing_profiles;
create policy "Users can view their own billing profile"
  on public.billing_profiles
  for select
  using (auth.uid() = user_id);
