import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key is missing. Please add them to your .env file to enable authentication and database access.'
  );
}

// Never crash the app at startup if env vars are missing (e.g. a deploy without
// VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY set). Use placeholder values so the
// client constructs and the page renders; auth calls will fail at request time
// with a clear network error instead of blanking the whole page.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

// Whether real Supabase credentials are present. UI can use this to surface a
// clear "not configured" message instead of a misleading auth/network error.
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
