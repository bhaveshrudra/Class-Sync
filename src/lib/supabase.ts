import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawAnonKey &&
  rawUrl.trim() !== '' &&
  rawAnonKey.trim() !== '' &&
  rawUrl !== 'https://placeholder.supabase.co' &&
  rawAnonKey !== 'placeholder' &&
  !rawUrl.includes('placeholder')
);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase URL or Anon Key is missing or using placeholder values. Please add valid credentials to your .env file to enable authentication and database access.'
  );
}

const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? rawAnonKey : 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

