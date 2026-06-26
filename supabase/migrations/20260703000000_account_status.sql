-- Add status to users
alter table public.users add column if not exists status text not null default 'active' check (status in ('active', 'inactive'));

-- Add status to organization_members
alter table public.organization_members add column if not exists status text not null default 'active' check (status in ('active', 'inactive'));

-- Add status to organizations
alter table public.organizations add column if not exists status text not null default 'active' check (status in ('active', 'inactive'));

-- Update the user_has_org_access function to only allow access for 'active' members in 'active' organizations where the user is also 'active'
create or replace function public.user_has_org_access(org_id uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    join public.users u on u.id = om.user_id
    where om.organization_id = org_id 
      and om.user_id = auth.uid()
      and om.status = 'active'
      and o.status = 'active'
      and u.status = 'active'
  );
$$;

-- Update is_site_admin to also check if the user is active
create or replace function public.is_site_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and global_role = 'superadmin' and status = 'active'
  );
$$;
