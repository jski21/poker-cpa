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
import Icon from './components/ui/Icon.jsx';

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
      <div className="flex min-h-full items-center justify-center bg-[#f6f7f9] text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-felt-500 text-white shadow-hero">
            <Icon name="spade" className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <div className="text-sm font-medium">Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f6f7f9] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-felt-500 to-felt-700 text-white shadow-sm">
              <Icon name="spade" className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </span>
            <div>
              <h1 className="text-[15px] font-bold leading-none tracking-tight">Felt Ledger</h1>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">{activeTab?.full}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowBankroll(true)}
              className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-left ring-1 ring-slate-200/70 shadow-card transition hover:ring-felt-300"
              title="Edit bankroll"
            >
              <span className="text-felt-500">
                <Icon name="wallet" className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">Bankroll</span>
                <span className={`block text-sm font-semibold leading-none tabular-nums ${stats.currentBankroll >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  {formatMoney(stats.currentBankroll, currency)}
                </span>
              </span>
            </button>
            <AccountMenu
              configured={configured}
              user={user}
              onSignIn={signInWithGoogle}
              onSignOut={signOut}
            />
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-xl bg-white p-2 text-slate-500 ring-1 ring-slate-200/70 shadow-card transition hover:text-slate-900 hover:ring-felt-300"
              title="Settings"
            >
              <Icon name="settings" className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        {/* Cloud sync progress */}
        {mode === 'cloud' && loading && (
          <div className="h-0.5 w-full overflow-hidden bg-felt-100">
            <div className="skeleton h-full w-1/2" />
          </div>
        )}

        {/* Desktop tab bar — segmented pill */}
        <nav className="mx-auto hidden max-w-5xl px-4 pb-2.5 sm:block">
          <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                  tab === t.id
                    ? 'bg-white text-felt-700 shadow-sm ring-1 ring-slate-200/70'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon name={t.icon} className="h-4 w-4" /> {t.full}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Sample data banner */}
      {isSample && (
        <div className="mx-auto max-w-5xl px-4 pt-3">
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            <Icon name="alert" className="h-4 w-4 shrink-0" />
            <span>Showing sample data — log your first session to start tracking your own.</span>
          </div>
        </div>
      )}

      {/* Migrate guest data into a fresh cloud account */}
      {showMigrate && (
        <div className="mx-auto max-w-5xl px-4 pt-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-felt-300 bg-felt-50 px-3 py-2 text-xs font-medium text-felt-700">
            <Icon name="cloud" className="h-4 w-4 shrink-0" />
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
                className="rounded-md px-3 py-1 font-medium text-slate-500 transition hover:text-slate-900"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-4 pb-24 sm:pb-10">{tabProps[tab]}</main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-md">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5 text-[10px] font-semibold transition ${
                  active ? 'text-felt-600' : 'text-slate-400'
                }`}
              >
                {active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-felt-500" />}
                <Icon name={t.icon} className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                {t.label}
              </button>
            );
          })}
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
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-card-md ring-1 ring-slate-200/70 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const modalInput =
  'w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-felt-400 focus:ring-1 focus:ring-felt-400';

function BankrollModal({ bankroll, stats, currency, onSetCurrent, onClose }) {
  const [val, setVal] = useState(String(bankroll.current ?? 0));
  return (
    <Modal title="Bankroll" onClose={onClose}>
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Starting Bankroll ({currency})
          </span>
          <input type="number" value={val} onChange={(e) => setVal(e.target.value)} className={modalInput} />
          <span className="mt-1 block text-[11px] text-slate-400">
            Your current bankroll = starting figure + all-time P&amp;L.
          </span>
        </label>

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-3 text-sm">
          <div className="text-slate-500">Starting</div>
          <div className="text-right font-mono tabular-nums">{formatMoney(Number(val) || 0, currency)}</div>
          <div className="text-slate-500">All-time P&amp;L</div>
          <div className={`text-right font-mono tabular-nums ${stats.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatMoney(stats.totalProfit, currency, { sign: true })}
          </div>
          <div className="border-t border-slate-200 pt-1 font-medium text-slate-600">Current</div>
          <div className="border-t border-slate-200 pt-1 text-right font-mono font-semibold tabular-nums">
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
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs">
          {mode === 'cloud' ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600">Synced to your cloud account</span>
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-slate-600">Local mode — data stays in this browser. Sign in to sync.</span>
            </>
          )}
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Currency</span>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {CURRENCIES.map((cur) => (
              <button
                key={cur}
                onClick={() => onUpdate({ currency: cur })}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
                  settings.currency === cur ? 'bg-felt-500 text-white' : 'text-slate-500'
                }`}
              >
                {cur}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
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
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
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
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
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
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <Icon name="cards" className="h-4 w-4" /> Reload sample data
          </button>
        )}
      </div>
    </Modal>
  );
}
