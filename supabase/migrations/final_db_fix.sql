-- 1. Add columns (if they don't exist)
alter table public.users add column if not exists status text not null default 'active' check (status in ('active', 'inactive'));
alter table public.organization_members add column if not exists status text not null default 'active' check (status in ('active', 'inactive'));
alter table public.organizations add column if not exists status text not null default 'active' check (status in ('active', 'inactive'));
alter table public.organizations add column if not exists is_personal boolean not null default false;

-- 2. Update functions to check status
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

create or replace function public.is_site_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and global_role = 'superadmin' and status = 'active'
  );
$$;

-- 3. Backfill missing personal organizations for existing users
do $$
declare
  r record;
  new_org_id uuid;
begin
  for r in (
    select id from auth.users where not exists (
      select 1 from public.organization_members where user_id = auth.users.id
    )
  ) loop
    insert into public.organizations (name, is_personal) values ('Personal Organization', true) returning id into new_org_id;
    insert into public.organization_members (organization_id, user_id, role) values (new_org_id, r.id, 'owner');
  end loop;
end;
$$;

-- 4. Mark all existing 'Personal Organization' as is_personal = true
update public.organizations set is_personal = true where name = 'Personal Organization';

-- 5. Update auth trigger to set new user organizations as personal
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_org_id uuid;
begin
  -- 1. Insert into public.users
  insert into public.users (id, email, full_name, global_role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'user'
  );

  -- 2. Create a personal organization for this user
  insert into public.organizations (name, is_personal)
  values ('Personal Organization', true)
  returning id into new_org_id;

  -- 3. Add the user as the owner of their new organization
  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;

-- Inform PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
