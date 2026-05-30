import { useEffect, useRef, useState } from 'react';

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.9 35.5 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

// Header control: shows a "Sign in" button when logged out, or the account
// avatar with a sign-out dropdown when logged in. Hidden entirely when Supabase
// isn't configured (pure local mode).
export default function AccountMenu({ configured, user, onSignIn, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  if (!configured) {
    return (
      <span
        className="rounded-lg bg-white ring-1 ring-slate-200/70 shadow-card px-2.5 py-1.5 text-[11px] font-medium text-slate-400"
        title="Cloud sync isn't configured. Data is stored locally in this browser."
      >
        Local
      </span>
    );
  }

  if (!user) {
    return (
      <button
        onClick={onSignIn}
        className="flex items-center gap-2 rounded-lg bg-white ring-1 ring-slate-200/70 shadow-card px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-felt-300 hover:text-slate-900"
      >
        <GoogleIcon /> Sign in
      </button>
    );
  }

  const email = user.email || 'Account';
  const avatar = user.user_metadata?.avatar_url;
  const initial = (email[0] || '?').toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg bg-white ring-1 ring-slate-200/70 shadow-card px-2 py-1.5 transition hover:border-felt-300"
        title={email}
      >
        {avatar ? (
          <img src={avatar} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-felt-500 text-xs font-semibold text-white">
            {initial}
          </span>
        )}
        <span className="hidden max-w-[120px] truncate text-sm text-slate-700 sm:inline">{email}</span>
        <span className="text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70 shadow-card shadow-2xl shadow-slate-400/30">
          <div className="border-b border-slate-200 px-3 py-2.5">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Signed in</div>
            <div className="truncate text-sm text-slate-800">{email}</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Synced to cloud
            </div>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="w-full px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
