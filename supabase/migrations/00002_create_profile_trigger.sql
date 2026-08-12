-- Function to handle new user signups via trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, year, branch, section)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Unknown User'),
    new.email,
    'student', -- Hardcoded to student to prevent frontend elevation
    new.raw_user_meta_data->>'year',
    new.raw_user_meta_data->>'branch',
    new.raw_user_meta_data->>'section'
  )
  on conflict (id) do nothing;
  
  return new;
end;
$$;

-- Drop trigger if it already exists to ensure idempotency
drop trigger if exists on_auth_user_created on auth.users;

-- Create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
