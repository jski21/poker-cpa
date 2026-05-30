# Supabase Setup — Cloud Sync & Google Sign-In

The app works **with zero configuration** in local guest mode (data lives in the
browser's `localStorage`). Follow these steps to add Google sign-in and sync a
user's data across every device and any deployed website.

Architecture: when a user is **signed out** the app uses `localStorage` (guest
mode). When **signed in**, all sessions + bankroll + settings live in Supabase
Postgres, scoped to that user by Row Level Security, so the same account sees the
same data everywhere.

---

## 1. Create a Supabase project

1. Go to <https://supabase.com> → **New project**.
2. Pick a name, a strong database password, and a region near you.
3. Wait ~2 minutes for it to provision.

## 2. Create the database tables

Open **SQL Editor** in the Supabase dashboard, paste the following, and run it:

```sql
-- One profile row per user holds bankroll + settings as JSON.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  bankroll jsonb not null default '{"current":0,"deposits":[],"withdrawals":[]}'::jsonb,
  settings jsonb not null default '{"currency":"$","stdDevOverride":null,"handsPerHour":25,"targetRoR":5}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are private to their owner"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- One row per logged session.
create table public.sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  location text,
  game_type text,
  format text,
  stakes text,
  big_blind numeric not null default 0,
  buy_in numeric not null default 0,
  cash_out numeric not null default 0,
  hours_played numeric not null default 0,
  hands_played integer not null default 0,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "sessions are private to their owner"
  on public.sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index sessions_user_date_idx on public.sessions (user_id, date);
```

Row Level Security is the key line: every query is automatically filtered to the
signed-in user, and writes for any other `user_id` are rejected. The public anon
key is therefore safe to ship in the client.

## 3. Enable Google sign-in

1. In Supabase: **Authentication → Providers → Google** → toggle **Enabled**.
2. You need a Google OAuth client:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/) →
     **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - **Authorized redirect URI** — copy the callback URL shown on the Supabase
     Google provider page. It looks like:
     `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
   - Create it, then copy the **Client ID** and **Client secret** back into the
     Supabase Google provider form and save.
3. In Supabase **Authentication → URL Configuration**, set:
   - **Site URL**: `http://localhost:5173` (for local dev)
   - **Redirect URLs**: add both `http://localhost:5173` and your production
     domain (e.g. `https://your-app.vercel.app`).

## 4. Add your keys to the app

In Supabase: **Project Settings → API**. Copy the **Project URL** and the
**anon / public** key. Then locally:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Restart the dev server (`npm run dev`). A **Sign in** button appears in the
header. Sign in with Google — your sessions now sync to the cloud, and the app
will offer to upload any guest sessions you'd already logged.

> ⚠️ Never put the `service_role` key in `.env.local` or any client code — it
> bypasses Row Level Security. Only the **anon** key belongs here.

## 5. Deploy the website (optional)

The app is a static Vite build, so any static host works (Vercel, Netlify,
Cloudflare Pages, GitHub Pages):

```bash
npm run build      # outputs to dist/
```

On the host, set the same two environment variables
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the project settings, and add
the deployed domain to Supabase's **Redirect URLs** (step 3). The deployed site
and your local app share the same Supabase data because they use the same
project — exactly the "same data on a website" goal.

---

### How it maps to the code

| Concern | File |
|---|---|
| Supabase client (reads env, null when unconfigured) | `src/lib/supabase.js` |
| Auth session + Google sign-in | `src/hooks/useAuth.js` |
| Unified storage (cloud vs local), all CRUD | `src/hooks/useStore.js` |
| camelCase ⇄ snake_case row mapping | `src/lib/mappers.js` |
| Sign-in / account UI | `src/components/ui/AccountMenu.jsx` |

No UI/stats/charts code changes between modes — every tab consumes the same
`sessions` array and handlers regardless of where the data lives.
