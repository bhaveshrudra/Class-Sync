-- Migration 00006: Create calendar_connections table for Google Calendar Integration

CREATE TABLE IF NOT EXISTS public.calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  google_email TEXT,
  google_calendar_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_calendar UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;

-- Policies

-- Users can view their own calendar connection
DROP POLICY IF EXISTS "Users can view own calendar connection" ON public.calendar_connections;
CREATE POLICY "Users can view own calendar connection"
  ON public.calendar_connections FOR SELECT
  TO authenticated
  USING ( auth.uid() = user_id );

-- Users can insert their own calendar connection
DROP POLICY IF EXISTS "Users can insert own calendar connection" ON public.calendar_connections;
CREATE POLICY "Users can insert own calendar connection"
  ON public.calendar_connections FOR INSERT
  TO authenticated
  WITH CHECK ( auth.uid() = user_id );

-- Users can update their own calendar connection
DROP POLICY IF EXISTS "Users can update own calendar connection" ON public.calendar_connections;
CREATE POLICY "Users can update own calendar connection"
  ON public.calendar_connections FOR UPDATE
  TO authenticated
  USING ( auth.uid() = user_id );

-- Users can delete their own calendar connection
DROP POLICY IF EXISTS "Users can delete own calendar connection" ON public.calendar_connections;
CREATE POLICY "Users can delete own calendar connection"
  ON public.calendar_connections FOR DELETE
  TO authenticated
  USING ( auth.uid() = user_id );

-- Admins can view all calendar connections
DROP POLICY IF EXISTS "Admins can view all calendar connections" ON public.calendar_connections;
CREATE POLICY "Admins can view all calendar connections"
  ON public.calendar_connections FOR SELECT
  TO authenticated
  USING ( public.is_admin() );
