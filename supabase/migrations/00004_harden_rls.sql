-- 1. Secure admin check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- 2. Profile policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete all profiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 3. Prevent non-admin role changes
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Not authorized to change roles.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_profile_role_not_escalated
ON public.profiles;

CREATE TRIGGER ensure_profile_role_not_escalated
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_role();

-- 4. Academic event policies
DROP POLICY IF EXISTS "Authenticated users can view academic events"
ON public.academic_events;

DROP POLICY IF EXISTS "Admins can view all events"
ON public.academic_events;

DROP POLICY IF EXISTS "Students can view applicable active events"
ON public.academic_events;

DROP POLICY IF EXISTS "Admins can insert academic events"
ON public.academic_events;

DROP POLICY IF EXISTS "Admins can update academic events"
ON public.academic_events;

DROP POLICY IF EXISTS "Admins can delete academic events"
ON public.academic_events;

CREATE POLICY "Admins can view all events"
  ON public.academic_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Students can view applicable active events"
  ON public.academic_events
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'student'
        AND (
          academic_events.year = 'All'
          OR academic_events.year = profiles.year
        )
        AND (
          academic_events.branch = 'All'
          OR academic_events.branch = profiles.branch
        )
        AND (
          academic_events.section = 'All'
          OR academic_events.section = profiles.section
        )
    )
  );

CREATE POLICY "Admins can insert academic events"
  ON public.academic_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update academic events"
  ON public.academic_events
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete academic events"
  ON public.academic_events
  FOR DELETE
  TO authenticated
  USING (public.is_admin());