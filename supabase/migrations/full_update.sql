-- Create types
create type org_role as enum ('owner', 'admin', 'member');

-- Create tables
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, user_id)
);

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Add organization_id to existing tables
alter table public.leads add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.leads add column if not exists assigned_to uuid references auth.users(id) on delete set null;

alter table public.lead_activities add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.crm_connections add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.crm_contact_links add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.crm_sync_runs add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.billing_profiles add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.crm_oauth_states add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

-- Data Migration: Auto-create Personal Organization for existing users
do $$
declare
  r record;
  new_org_id uuid;
begin
  for r in (
    select distinct user_id from (
      select user_id from public.leads
      union
      select user_id from public.lead_activities
      union
      select user_id from public.crm_connections
      union
      select user_id from public.billing_profiles
      union
      select user_id from public.crm_sync_runs
      union
      select user_id from public.crm_contact_links
    ) as users
  ) loop
    -- Check if user already has an organization (safety check)
    if not exists (select 1 from public.organization_members where user_id = r.user_id) then
      -- Create organization for this user
      insert into public.organizations (name) values ('Personal Organization') returning id into new_org_id;
      
      -- Insert into members as owner
      insert into public.organization_members (organization_id, user_id, role) values (new_org_id, r.user_id, 'owner');
      
      -- Update existing records
      update public.leads set organization_id = new_org_id where user_id = r.user_id;
      update public.lead_activities set organization_id = new_org_id where user_id = r.user_id;
      update public.crm_connections set organization_id = new_org_id where user_id = r.user_id;
      update public.crm_contact_links set organization_id = new_org_id where user_id = r.user_id;
      update public.crm_sync_runs set organization_id = new_org_id where user_id = r.user_id;
      update public.billing_profiles set organization_id = new_org_id where user_id = r.user_id;
      update public.crm_oauth_states set organization_id = new_org_id where user_id = r.user_id;
    end if;
  end loop;
end;
$$;

-- Update unique constraints to use organization_id instead of user_id
alter table public.crm_connections drop constraint if exists crm_connections_user_id_provider_key;
alter table public.crm_connections add constraint crm_connections_org_provider_key unique(organization_id, provider);

alter table public.crm_contact_links drop constraint if exists crm_contact_links_user_id_provider_external_contact_id_key;
alter table public.crm_contact_links drop constraint if exists crm_contact_links_user_id_provider_lead_id_key;
alter table public.crm_contact_links add constraint crm_contact_links_org_provider_external_key unique(organization_id, provider, external_contact_id);
alter table public.crm_contact_links add constraint crm_contact_links_org_provider_lead_key unique(organization_id, provider, lead_id);

-- Helper functions for RLS
create or replace function public.is_site_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.site_admins where user_id = auth.uid()
  );
$$;

create or replace function public.user_has_org_access(org_id uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org_id and user_id = auth.uid()
  );
$$;

-- RLS for Organizations
alter table public.organizations enable row level security;
drop policy if exists "Members and Site Admins can view organizations" on public.organizations;
create policy "Members and Site Admins can view organizations" on public.organizations
  for select
  using (public.user_has_org_access(id) or public.is_site_admin());

-- RLS for Organization Members
alter table public.organization_members enable row level security;
drop policy if exists "Members and Site Admins can view organization_members" on public.organization_members;
create policy "Members and Site Admins can view organization_members" on public.organization_members
  for select
  using (public.user_has_org_access(organization_id) or public.is_site_admin());

-- RLS for Site Admins
alter table public.site_admins enable row level security;
drop policy if exists "Only site admins can view site_admins" on public.site_admins;
create policy "Only site admins can view site_admins" on public.site_admins
  for select
  using (public.is_site_admin());

-- Update RLS for other tables
drop policy if exists "Users can view their own crm connections" on public.crm_connections;
create policy "Users and Site Admins can view org crm connections" on public.crm_connections
  for select
  using (public.user_has_org_access(organization_id) or auth.uid() = user_id or public.is_site_admin());

drop policy if exists "Users can view their own crm contact links" on public.crm_contact_links;
create policy "Users and Site Admins can view org crm contact links" on public.crm_contact_links
  for select
  using (public.user_has_org_access(organization_id) or auth.uid() = user_id or public.is_site_admin());

drop policy if exists "Users can view their own crm sync runs" on public.crm_sync_runs;
create policy "Users and Site Admins can view org crm sync runs" on public.crm_sync_runs
  for select
  using (public.user_has_org_access(organization_id) or auth.uid() = user_id or public.is_site_admin());

drop policy if exists "Users can view their own lead activities" on public.lead_activities;
create policy "Users and Site Admins can view org lead activities" on public.lead_activities
  for select
  using (public.user_has_org_access(organization_id) or auth.uid() = user_id or public.is_site_admin());
-- Trigger to auto-create a Personal Organization for new users

create or replace function public.handle_new_user() 
returns trigger 
language plpgsql 
security definer set search_path = public
as $$
declare
  new_org_id uuid;
begin
  -- Insert a new organization for the user
  insert into public.organizations (name)
  values (coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Personal') || '''s Organization')
  returning id into new_org_id;

  -- Insert the user as the owner of the new organization
  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  -- Create a default billing profile for the organization (assuming free plan or similar)
  insert into public.billing_profiles (user_id, organization_id, plan_id, status)
  values (new.id, new_org_id, 'free', 'active');

  return new;
end;
$$;

-- Drop trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
-- Fix RLS policies for leads table to use organization_id

alter table public.leads enable row level security;

-- Drop old policies (some might not exist, ignore if so)
drop policy if exists "Users can view their own leads" on public.leads;
drop policy if exists "Users can insert their own leads" on public.leads;
drop policy if exists "Users can update their own leads" on public.leads;
drop policy if exists "Users can delete their own leads" on public.leads;

-- Create new multi-tenant policies
create policy "Users and Site Admins can view org leads" on public.leads
  for select
  using (public.user_has_org_access(organization_id) or public.is_site_admin());

create policy "Users and Site Admins can insert org leads" on public.leads
  for insert
  with check (public.user_has_org_access(organization_id) or public.is_site_admin());

create policy "Users and Site Admins can update org leads" on public.leads
  for update
  using (public.user_has_org_access(organization_id) or public.is_site_admin())
  with check (public.user_has_org_access(organization_id) or public.is_site_admin());

create policy "Users and Site Admins can delete org leads" on public.leads
  for delete
  using (public.user_has_org_access(organization_id) or public.is_site_admin());
-- Create global role enum
create type global_role as enum ('superadmin', 'user');

-- Create public.users table
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  global_role global_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill existing users
insert into public.users (id, email, global_role)
select 
  id, 
  email,
  case 
    when exists (select 1 from public.site_admins where site_admins.user_id = auth.users.id) then 'superadmin'::global_role
    else 'user'::global_role
  end as global_role
from auth.users
on conflict (id) do nothing;

-- Update the is_site_admin() function to use the new users table
create or replace function public.is_site_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and global_role = 'superadmin'
  );
$$;

-- Drop the old site_admins table
drop table if exists public.site_admins;

-- Enable RLS on public.users
alter table public.users enable row level security;

-- Only superadmins can view all users, users can view themselves
create policy "Superadmins can view all users" on public.users
  for select
  using (public.is_site_admin() or auth.uid() = id);

create policy "Superadmins can update users" on public.users
  for update
  using (public.is_site_admin())
  with check (public.is_site_admin());

-- Recreate the auth trigger for new users to insert into public.users
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  new_org_id uuid;
begin
  -- 1. Insert into public.users
  insert into public.users (id, email)
  values (new.id, new.email);

  -- 2. Create a personal organization for the user
  insert into public.organizations (name)
  values ('Personal Organization')
  returning id into new_org_id;

  -- 3. Add user as owner of their personal organization
  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$ language plpgsql security definer;

-- Ensure the trigger exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
