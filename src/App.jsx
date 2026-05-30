import { useCallback, useState } from 'react';
import { usePokerStats } from './hooks/usePokerStats.js';
import { useAuth } from './hooks/useAuth.js';
import { useStore } from './hooks/useStore.js';
import { TABS, CURRENCIES } from './constants.js';
import { formatMoney } from './utils/formatting.js';

import LogSession from './components/tabs/LogSession.jsx';
import Dashboard from './components/tabs/Dashboard.jsx';
import Charts from './components/tabs/Charts.jsx';
import Calculators from './components/tabs/Calculators.jsx';
import SessionHistory from './components/tabs/SessionHistory.jsx';
import Toast from './components/ui/Toast.jsx';
import AccountMenu from './components/ui/AccountMenu.jsx';

export default function App() {
  const [tab, setTab] = useState('log');
  const [toast, setToast] = useState(null);
  const [showBankroll, setShowBankroll] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [migrateDismissed, setMigrateDismissed] = useState(false);

  const showToast = useCallback((t) => setToast({ ...t, key: Date.now() }), []);

  const { user, ready, signInWithGoogle, signOut, configured } = useAuth();

  const store = useStore(user, {
    onError: (msg) => showToast({ tone: 'loss', icon: '⚠️', title: 'Sync error', message: msg }),
  });
  const {
    sessions,
    bankroll,
    settings,
    isSample,
    mode,
    loading,
    localSessionCount,
    addSession,
    updateSession,
    deleteSession,
    setBankrollCurrent,
    updateSettings,
    loadSamples,
    uploadLocalSessions,
  } = store;

  const currency = settings.currency || '$';
  const stats = usePokerStats(sessions, bankroll, settings);

  const handleLoadSamples = useCallback(() => {
    loadSamples();
    showToast({ icon: '🃏', title: 'Sample data loaded' });
  }, [loadSamples, showToast]);

  // Offer to upload guest sessions when a fresh cloud account is empty.
  const showMigrate =
    mode === 'cloud' && !loading && !migrateDismissed && localSessionCount > 0 && sessions.length === 0;

  const handleMigrate = useCallback(async () => {
    const count = await uploadLocalSessions();
    setMigrateDismissed(true);
    if (count > 0) showToast({ tone: 'win', icon: '☁️', title: `Uploaded ${count} sessions to your account` });
  }, [uploadLocalSessions, showToast]);

  const tabProps = {
    log: <LogSession onAdd={addSession} venues={stats.venues} currency={currency} showToast={showToast} />,
    dashboard: <Dashboard stats={stats} currency={currency} onSetBankroll={() => setShowBankroll(true)} />,
    charts: <Charts stats={stats} currency={currency} />,
    calculators: <Calculators stats={stats} currency={currency} settings={settings} />,
    history: (
      <SessionHistory
        sessions={sessions}
        onUpdate={updateSession}
        onDelete={deleteSession}
        currency={currency}
        showToast={showToast}
      />
    ),
  };

  const activeTab = TABS.find((t) => t.id === tab);

  // Wait for the auth session to resolve before rendering, so we don't flash
  // guest data to a user who's actually signed in.
  if (configured && !ready) {
    return (
      <div className="flex min-h-full items-center justify-center bg-ink-900 text-white/50">
        <div className="flex flex-col items-center gap-3">
          <span className="text-3xl">♠️</span>
          <div className="text-sm">Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-ink-900 to-[#0a120e] text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink-900/85 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">♠️</span>
            <div>
              <h1 className="text-base font-bold leading-none tracking-tight">Felt Ledger</h1>
              <p className="text-[11px] text-white/40">{activeTab?.full}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowBankroll(true)}
              className="rounded-lg border border-white/10 bg-ink-850 px-3 py-1.5 text-right transition hover:border-felt-500/40"
              title="Bankroll"
            >
              <div className="text-[10px] uppercase tracking-wide text-white/40">Bankroll</div>
              <div className={`font-mono text-sm font-semibold tabular-nums ${stats.currentBankroll >= 0 ? 'text-white' : 'text-rose-400'}`}>
                {formatMoney(stats.currentBankroll, currency)}
              </div>
            </button>
            <AccountMenu
              configured={configured}
              user={user}
              onSignIn={signInWithGoogle}
              onSignOut={signOut}
            />
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-lg border border-white/10 bg-ink-850 p-2 text-white/60 transition hover:text-white"
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Cloud sync progress */}
        {mode === 'cloud' && loading && (
          <div className="h-0.5 w-full overflow-hidden bg-felt-600/30">
            <div className="skeleton h-full w-1/2" />
          </div>
        )}

        {/* Desktop tab bar */}
        <nav className="mx-auto hidden max-w-4xl gap-1 px-4 pb-2 sm:flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === t.id ? 'bg-felt-500 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>{t.icon}</span> {t.full}
            </button>
          ))}
        </nav>
      </header>

      {/* Sample data banner */}
      {isSample && (
        <div className="mx-auto max-w-4xl px-4 pt-3">
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <span>🧪</span>
            <span>Showing sample data — log your first session to start tracking your own.</span>
          </div>
        </div>
      )}

      {/* Migrate guest data into a fresh cloud account */}
      {showMigrate && (
        <div className="mx-auto max-w-4xl px-4 pt-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-felt-500/40 bg-felt-600/20 px-3 py-2 text-xs text-felt-50">
            <span>☁️</span>
            <span>
              You have {localSessionCount} session{localSessionCount === 1 ? '' : 's'} stored locally. Upload them to
              your account so they sync across devices?
            </span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={handleMigrate}
                className="rounded-md bg-felt-500 px-3 py-1 font-medium text-white transition hover:bg-felt-400"
              >
                Upload
              </button>
              <button
                onClick={() => setMigrateDismissed(true)}
                className="rounded-md px-3 py-1 font-medium text-white/60 transition hover:text-white"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-4 pb-24 sm:pb-8">{tabProps[tab]}</main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-4xl">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition ${
                tab === t.id ? 'text-felt-400' : 'text-white/45'
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <Toast key={toast?.key} toast={toast} onClose={() => setToast(null)} />

      {showBankroll && (
        <BankrollModal
          bankroll={bankroll}
          stats={stats}
          currency={currency}
          onSetCurrent={setBankrollCurrent}
          onClose={() => setShowBankroll(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setShowSettings(false)}
          onLoadSamples={handleLoadSamples}
          mode={mode}
        />
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl border border-white/10 bg-ink-850 p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="text-white/40 transition hover:text-white">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const modalInput =
  'w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white outline-none focus:border-felt-400 focus:ring-1 focus:ring-felt-400';

function BankrollModal({ bankroll, stats, currency, onSetCurrent, onClose }) {
  const [val, setVal] = useState(String(bankroll.current ?? 0));
  return (
    <Modal title="Bankroll" onClose={onClose}>
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
            Starting Bankroll ({currency})
          </span>
          <input type="number" value={val} onChange={(e) => setVal(e.target.value)} className={modalInput} />
          <span className="mt-1 block text-[11px] text-white/40">
            Your current bankroll = starting figure + all-time P&amp;L.
          </span>
        </label>

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-ink-900 p-3 text-sm">
          <div className="text-white/50">Starting</div>
          <div className="text-right font-mono tabular-nums">{formatMoney(Number(val) || 0, currency)}</div>
          <div className="text-white/50">All-time P&amp;L</div>
          <div className={`text-right font-mono tabular-nums ${stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatMoney(stats.totalProfit, currency, { sign: true })}
          </div>
          <div className="border-t border-white/10 pt-1 font-medium text-white/70">Current</div>
          <div className="border-t border-white/10 pt-1 text-right font-mono font-semibold tabular-nums">
            {formatMoney((Number(val) || 0) + stats.totalProfit, currency)}
          </div>
        </div>

        <button
          onClick={() => {
            onSetCurrent(parseFloat(val) || 0);
            onClose();
          }}
          className="w-full rounded-lg bg-felt-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-felt-400"
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function SettingsModal({ settings, onUpdate, onClose, onLoadSamples, mode }) {
  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg bg-ink-900 px-3 py-2 text-xs">
          {mode === 'cloud' ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-white/70">Synced to your cloud account</span>
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="text-white/70">Local mode — data stays in this browser. Sign in to sync.</span>
            </>
          )}
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">Currency</span>
          <div className="flex gap-1 rounded-lg bg-ink-900 p-1">
            {CURRENCIES.map((cur) => (
              <button
                key={cur}
                onClick={() => onUpdate({ currency: cur })}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
                  settings.currency === cur ? 'bg-felt-500 text-white' : 'text-white/55'
                }`}
              >
                {cur}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
            Target Risk of Ruin (%)
          </span>
          <input
            type="number"
            value={settings.targetRoR}
            onChange={(e) => onUpdate({ targetRoR: parseFloat(e.target.value) || 5 })}
            className={modalInput}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
            Std Dev Override (optional)
          </span>
          <input
            type="number"
            value={settings.stdDevOverride ?? ''}
            placeholder="auto from sessions"
            onChange={(e) => onUpdate({ stdDevOverride: e.target.value === '' ? null : parseFloat(e.target.value) })}
            className={modalInput}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
            Hands per Hour (live default 25)
          </span>
          <input
            type="number"
            value={settings.handsPerHour}
            onChange={(e) => onUpdate({ handsPerHour: parseFloat(e.target.value) || 25 })}
            className={modalInput}
          />
        </label>

        {mode !== 'cloud' && (
          <button
            onClick={onLoadSamples}
            className="w-full rounded-lg border border-white/10 bg-ink-900 px-4 py-2 text-sm font-medium text-white/70 transition hover:text-white"
          >
            🃏 Reload sample data
          </button>
        )}
      </div>
    </Modal>
  );
}
