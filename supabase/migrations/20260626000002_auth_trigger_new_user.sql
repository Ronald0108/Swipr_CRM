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
