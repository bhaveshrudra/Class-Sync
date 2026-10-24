-- Migration 00009: Create calendar_tokens vault table for secure server-side OAuth token storage
-- Tokens are encrypted at rest (AES-256-GCM) by the backend and NEVER exposed to frontend clients.

CREATE TABLE IF NOT EXISTS public.calendar_tokens (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Intentionally DO NOT grant any RLS policies to anon or authenticated users.
-- This ensures students cannot read, write, or query token records via the PostgREST client API.

-- Revoke all SQL table privileges from public, anon, and authenticated roles
REVOKE ALL ON TABLE public.calendar_tokens FROM PUBLIC;
REVOKE ALL ON TABLE public.calendar_tokens FROM anon;
REVOKE ALL ON TABLE public.calendar_tokens FROM authenticated;

-- Explicitly grant privileges strictly to service_role and postgres superuser
GRANT ALL ON TABLE public.calendar_tokens TO service_role;
GRANT ALL ON TABLE public.calendar_tokens TO postgres;

-- Hardening calendar_connections: Disallow client-side INSERT and UPDATE to eliminate client connection forgery
-- Client only needs SELECT (to read connection status) and DELETE (to remove connection).
DROP POLICY IF EXISTS "Users can insert own calendar connection" ON public.calendar_connections;
DROP POLICY IF EXISTS "Users can update own calendar connection" ON public.calendar_connections;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_calendar_tokens_updated_at ON public.calendar_tokens;
CREATE TRIGGER set_calendar_tokens_updated_at
  BEFORE UPDATE ON public.calendar_tokens
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();
