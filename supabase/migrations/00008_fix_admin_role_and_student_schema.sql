-- Migration 00008: Fix Admin Role Provisioning and Profiles Schema
-- 1. Ensure roll_number column exists on public.profiles to prevent query errors in Admin Students
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS roll_number TEXT;

-- 2. Update handle_new_user trigger function
-- All self-registered users via public auth signup are assigned 'student' by default.
-- Administrative privileges must be explicitly granted via trusted administrative processes
-- (e.g. direct SQL migration, Supabase dashboard, or service-role execution).
-- This ensures no user can obtain admin privileges merely by self-registering an email address.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, year, branch, section, roll_number)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Unknown User'),
    new.email,
    'student',
    new.raw_user_meta_data->>'year',
    new.raw_user_meta_data->>'branch',
    new.raw_user_meta_data->>'section',
    new.raw_user_meta_data->>'roll_number'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(NULLIF(excluded.name, 'Unknown User'), profiles.name),
    year = COALESCE(excluded.year, profiles.year),
    branch = COALESCE(excluded.branch, profiles.branch),
    section = COALESCE(excluded.section, profiles.section),
    roll_number = COALESCE(excluded.roll_number, profiles.roll_number),
    updated_at = now();
  
  RETURN new;
END;
$$;

-- 3. Ensure the intended administrator account (admin@classsync.in) has an active admin profile.
-- If a profile exists, ensure role is 'admin'.
UPDATE public.profiles
SET role = 'admin', updated_at = now()
WHERE LOWER(email) = 'admin@classsync.in';

-- If admin@classsync.in already exists in auth.users but has no profile row yet, safely insert it.
INSERT INTO public.profiles (id, name, email, role)
SELECT id, COALESCE(raw_user_meta_data->>'name', 'Administrator'), email, 'admin'
FROM auth.users
WHERE LOWER(email) = 'admin@classsync.in'
ON CONFLICT (id) DO UPDATE SET role = 'admin', updated_at = now();


-- 4. Trusted helper function to promote an admin profile by email.
-- Execution is restricted strictly to service_role.
-- Unprivileged students or anonymous users are explicitly blocked from executing this function.
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Block anonymous and authenticated student callers from executing this function
  IF auth.role() = 'anon' OR auth.role() = 'authenticated' THEN
    RAISE EXCEPTION 'Access denied. Privileged promotion is restricted to service_role.';
  END IF;

  UPDATE public.profiles
  SET role = 'admin', updated_at = now()
  WHERE LOWER(email) = LOWER(target_email);

  IF NOT FOUND THEN
    RAISE NOTICE 'No profile found with email %', target_email;
  END IF;
END;
$$;

-- Revoke execute permissions from public, anon, and general authenticated users
-- to prevent students from calling this function over the PostgREST / Supabase RPC API.
REVOKE ALL ON FUNCTION public.promote_user_to_admin(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.promote_user_to_admin(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.promote_user_to_admin(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin(TEXT) TO service_role;

