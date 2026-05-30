import { createClient } from '@supabase/supabase-js';

// Read at build time from Vite env. When either is missing, the app runs in
// local-only "guest" mode and no network calls are made.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Lets the OAuth redirect (?code=...) complete the sign-in automatically.
        detectSessionInUrl: true,
      },
    })
  : null;
