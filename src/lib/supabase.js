import { createClient } from '@supabase/supabase-js';

// Read at build time from Vite env. When either is missing, the app runs in
// local-only "guest" mode and no network calls are made.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Diagnostic: if cloud sync is off, say why in the console so a deployed build
// can be debugged without source access. (No secrets are printed.)
if (!isSupabaseConfigured && typeof window !== 'undefined') {
  const missing = [!url && 'VITE_SUPABASE_URL', !anonKey && 'VITE_SUPABASE_ANON_KEY']
    .filter(Boolean)
    .join(', ');
  // eslint-disable-next-line no-console
  console.warn(
    `[Felt Ledger] Cloud sync disabled — running in local mode. ` +
      `Missing build-time env var(s): ${missing}. ` +
      `Set them in your host (Vercel) and redeploy. Note: Vite inlines VITE_* vars at build time.`
  );
}

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
