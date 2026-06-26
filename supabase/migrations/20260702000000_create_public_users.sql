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
