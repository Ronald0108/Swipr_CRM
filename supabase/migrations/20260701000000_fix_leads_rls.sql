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
