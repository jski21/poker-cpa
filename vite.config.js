import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The app reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. But the official
// Supabase<->Vercel integration provisions env vars under different names
// (SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, etc.), and Vite
// only exposes VITE_* vars to client code. So at build time we resolve the
// value from whichever name is present and inject it as the VITE_* the app
// expects. This works locally (.env.local) and on Vercel with zero hand-copying.
export default defineConfig(({ mode }) => {
  // Empty prefix => include all vars from .env files *and* process.env (Vercel).
  const env = loadEnv(mode, process.cwd(), '');

  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.SUPABASE_URL ||
    '';

  const supabaseAnonKey =
    env.VITE_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    '';

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
    test: {
      environment: 'node',
    },
  };
});
