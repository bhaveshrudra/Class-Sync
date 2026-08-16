-- Migration 00007: Create calendar_event_sync table for Google Calendar Sync and Duplicate Prevention

CREATE TABLE IF NOT EXISTS public.calendar_event_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_event_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('synced', 'failed', 'pending', 'cancelled')) DEFAULT 'synced',
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_academic_event_sync UNIQUE (user_id, academic_event_id)
);

-- Enable RLS
ALTER TABLE public.calendar_event_sync ENABLE ROW LEVEL SECURITY;

-- Policies

-- Users can view their own calendar sync records
DROP POLICY IF EXISTS "Users can view own calendar sync records" ON public.calendar_event_sync;
CREATE POLICY "Users can view own calendar sync records"
  ON public.calendar_event_sync FOR SELECT
  TO authenticated
  USING ( auth.uid() = user_id );

-- Users can insert their own calendar sync records
DROP POLICY IF EXISTS "Users can insert own calendar sync records" ON public.calendar_event_sync;
CREATE POLICY "Users can insert own calendar sync records"
  ON public.calendar_event_sync FOR INSERT
  TO authenticated
  WITH CHECK ( auth.uid() = user_id );

-- Users can update their own calendar sync records
DROP POLICY IF EXISTS "Users can update own calendar sync records" ON public.calendar_event_sync;
CREATE POLICY "Users can update own calendar sync records"
  ON public.calendar_event_sync FOR UPDATE
  TO authenticated
  USING ( auth.uid() = user_id );

-- Users can delete their own calendar sync records
DROP POLICY IF EXISTS "Users can delete own calendar sync records" ON public.calendar_event_sync;
CREATE POLICY "Users can delete own calendar sync records"
  ON public.calendar_event_sync FOR DELETE
  TO authenticated
  USING ( auth.uid() = user_id );

-- Admins can view all calendar sync records
DROP POLICY IF EXISTS "Admins can view all calendar sync records" ON public.calendar_event_sync;
CREATE POLICY "Admins can view all calendar sync records"
  ON public.calendar_event_sync FOR SELECT
  TO authenticated
  USING ( public.is_admin() );

-- Indexes for efficient duplicate checking and querying
CREATE INDEX IF NOT EXISTS idx_calendar_event_sync_user_event ON public.calendar_event_sync(user_id, academic_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_sync_google_event ON public.calendar_event_sync(google_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_sync_academic_event ON public.calendar_event_sync(academic_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_sync_status ON public.calendar_event_sync(sync_status);

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_calendar_event_sync_updated_at ON public.calendar_event_sync;
CREATE TRIGGER set_calendar_event_sync_updated_at
  BEFORE UPDATE ON public.calendar_event_sync
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();
