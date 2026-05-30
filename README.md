# ♠️ Felt Ledger

A full-featured, single-page **poker financials dashboard**. Log sessions and
instantly see every metric you need to make informed decisions about your game,
bankroll, and stakes. Works offline out of the box (data persists in
`localStorage`), with **optional Google sign-in + cloud sync** via Supabase so
your numbers follow you across devices. See [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md).

## Features

- **📋 Log Session** — fast-entry form with live P&L preview, stakes → big-blind
  auto-fill, venue autocomplete, tags, and a result toast with session hourly.
- **📊 Dashboard** — bankroll overview, win-rate KPIs (hourly, BB/100, BB/hr,
  win %, avg win/loss, biggest swings), a variance & risk panel (standard
  deviation, expected hourly ranges, **Risk of Ruin**, recommended bankroll,
  buy-ins, max drawdown), volume stats, and breakdowns by stakes / location /
  game / day-of-week heatmap.
- **📈 Charts** — bankroll curve vs EV, session-result histogram, rolling
  hourly rate, monthly P&L, session-length-vs-profit scatter, and a Monte Carlo
  variance simulation. Clean light theme (Recharts).
- **🧮 Calculators** — a bankroll calculator (required roll for a target Risk of
  Ruin, months to build) and a variance simulator (10 Monte Carlo paths,
  best/worst/median, probability of being up, expected max drawdown).
- **📝 Session History** — sortable, filterable table with inline edit/delete,
  expandable notes, and **CSV import/export**.

## Install as an app (PWA)

Felt Ledger is an installable Progressive Web App with offline support.

- **iPhone/iPad (Safari):** open the site → Share → **Add to Home Screen**. It
  launches fullscreen with its own icon, no browser chrome.
- **Android/Desktop (Chrome/Edge):** use the **Install** prompt in the address bar.

A service worker precaches the app shell so it opens instantly and works offline
(your data is local anyway, or syncs when back online if signed in). Icons are
generated from `public/icon.svg` via `node scripts/gen-icons.mjs` (needs `sharp`).

## Tech

- React 18 (hooks) · Tailwind CSS · Recharts · Vite · vite-plugin-pwa
- `localStorage` persistence · 15 pre-loaded sample sessions on first run

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build to dist/
npm test         # run the calculation unit tests (vitest)
```

## Structure

```
src/
  App.jsx                  # shell, tabs, bankroll & settings modals
  components/
    tabs/                  # LogSession, Dashboard, Charts, Calculators, SessionHistory
    ui/                    # MetricCard, StatTable, Tooltip, Toast, EmptyState, Skeleton
  hooks/
    useLocalStorage.js
    usePokerStats.js       # all derived metrics
  utils/
    calculations.js        # pure, tested math (RoR, std dev, drawdown, Monte Carlo)
    formatting.js          # currency / % / date formatters
    sampleData.js
  constants.js
```

## Key formulas

- **Hourly rate** = total profit ÷ total hours
- **BB/100** = (total profit in BB ÷ total hands) × 100
- **Risk of Ruin** = `exp(-2 · (wr/sd)² · N)` where `N` = bankroll in buy-ins
- **Recommended buy-ins** = `-ln(targetRoR) / (2 · (wr/sd)²)`
- **Max drawdown** = largest peak-to-trough drop across the cumulative curve

All calculation logic lives in `src/utils/calculations.js` and is covered by
`src/utils/calculations.test.js`.
