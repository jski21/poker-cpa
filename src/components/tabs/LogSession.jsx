import { useMemo, useState } from 'react';
import {
  GAME_TYPES_SEGMENTED,
  FORMATS,
  TAG_OPTIONS,
  STAKES_PRESETS,
  STAKES_QUICK_PICKS,
} from '../../constants.js';
import { formatMoney, pnlColor, todayISO } from '../../utils/formatting.js';

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const blankForm = () => ({
  date: todayISO(),
  location: '',
  gameType: 'NLH',
  format: 'Cash',
  stakes: '',
  bigBlind: '',
  buyIn: '',
  cashOut: '',
  hoursPlayed: '',
  handsPlayed: '',
  notes: '',
  tags: [],
});

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-1 rounded-lg bg-ink-900 p-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition ${
            value === opt ? 'bg-felt-500 text-white shadow' : 'text-white/55 hover:text-white'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</span>
        {hint && <span className="text-[11px] text-white/35">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition focus:border-felt-400 focus:ring-1 focus:ring-felt-400';

export default function LogSession({ onAdd, venues, currency, showToast }) {
  const [form, setForm] = useState(blankForm);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // When stakes match a known preset, auto-fill the big blind.
  const onStakesChange = (val) => {
    setForm((f) => {
      const next = { ...f, stakes: val };
      const preset = STAKES_PRESETS[val.trim()];
      if (preset != null && (!f.bigBlind || STAKES_PRESETS[f.stakes?.trim()] === Number(f.bigBlind))) {
        next.bigBlind = String(preset);
      }
      return next;
    });
  };

  const toggleTag = (tag) =>
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));

  const buyIn = parseFloat(form.buyIn) || 0;
  const cashOut = parseFloat(form.cashOut) || 0;
  const hours = parseFloat(form.hoursPlayed) || 0;
  const hasResult = form.buyIn !== '' && form.cashOut !== '';
  const pnl = cashOut - buyIn;
  const sessionHourly = hours > 0 ? pnl / hours : 0;

  const venueSuggestions = useMemo(() => [...new Set(venues)], [venues]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.buyIn === '' || form.cashOut === '') {
      showToast({ tone: 'loss', icon: '⚠️', title: 'Missing amounts', message: 'Enter both buy-in and cash-out.' });
      return;
    }
    const session = {
      id: uid(),
      date: form.date || todayISO(),
      location: form.location.trim() || (form.tags.includes('online') ? 'Online' : 'Unknown'),
      gameType: form.gameType,
      format: form.format,
      stakes: form.stakes.trim(),
      bigBlind: parseFloat(form.bigBlind) || 0,
      buyIn,
      cashOut,
      hoursPlayed: hours,
      handsPlayed: parseInt(form.handsPlayed, 10) || 0,
      notes: form.notes.trim(),
      tags: form.tags,
    };
    onAdd(session);

    const hourlyTxt = hours > 0 ? ` · ${formatMoney(sessionHourly, currency, { sign: true })}/hr` : '';
    showToast({
      tone: pnl >= 0 ? 'win' : 'loss',
      icon: pnl >= 0 ? '💰' : '📉',
      title: `Session logged: ${formatMoney(pnl, currency, { sign: true })}`,
      message: `${session.stakes || session.format} at ${session.location}${hourlyTxt}`,
    });
    setForm(blankForm());
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4 pb-8">
      {/* Live P&L preview */}
      <div
        className={`rounded-2xl border px-4 py-4 text-center transition ${
          hasResult ? 'border-white/10 bg-ink-850' : 'border-dashed border-white/10 bg-ink-850/40'
        }`}
      >
        <div className="text-xs font-medium uppercase tracking-wide text-white/40">Session Result</div>
        <div className={`font-mono text-4xl font-bold tabular-nums ${hasResult ? pnlColor(pnl) : 'text-white/25'}`}>
          {hasResult ? formatMoney(pnl, currency, { sign: true }) : `${currency}0.00`}
        </div>
        {hasResult && hours > 0 && (
          <div className={`mt-1 text-sm font-medium ${pnlColor(sessionHourly)}`}>
            {formatMoney(sessionHourly, currency, { sign: true })}/hr over {hours}h
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Location" hint="autocompletes">
          <input
            list="venue-list"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="Venue or Online"
            className={inputClass}
          />
          <datalist id="venue-list">
            {venueSuggestions.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
      </div>

      <Field label="Game Type">
        <Segmented options={GAME_TYPES_SEGMENTED} value={form.gameType} onChange={(v) => set('gameType', v)} />
      </Field>

      <Field label="Format">
        <Segmented options={FORMATS} value={form.format} onChange={(v) => set('format', v)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Stakes" hint="e.g. 1/2 or buy-in">
          <input
            value={form.stakes}
            onChange={(e) => onStakesChange(e.target.value)}
            placeholder="2/5"
            className={inputClass}
          />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {STAKES_QUICK_PICKS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onStakesChange(s)}
                className="rounded-md bg-ink-900 px-2 py-0.5 text-xs text-white/50 transition hover:bg-felt-600/40 hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Big Blind ($)" hint="auto-fills">
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={form.bigBlind}
            onChange={(e) => set('bigBlind', e.target.value)}
            placeholder="5"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Buy-in ($)">
          <input
            type="number"
            inputMode="decimal"
            value={form.buyIn}
            onChange={(e) => set('buyIn', e.target.value)}
            placeholder="500"
            className={inputClass}
          />
        </Field>
        <Field label="Cash-out ($)">
          <input
            type="number"
            inputMode="decimal"
            value={form.cashOut}
            onChange={(e) => set('cashOut', e.target.value)}
            placeholder="800"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Hours Played" hint="0.5 steps">
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={form.hoursPlayed}
            onChange={(e) => set('hoursPlayed', e.target.value)}
            placeholder="5"
            className={inputClass}
          />
        </Field>
        <Field label="Hands Played" hint="optional">
          <input
            type="number"
            inputMode="numeric"
            value={form.handsPlayed}
            onChange={(e) => set('handsPlayed', e.target.value)}
            placeholder="150"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Tags">
        <div className="flex flex-wrap gap-1.5">
          {TAG_OPTIONS.map((tag) => {
            const active = form.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  active
                    ? 'bg-felt-500 text-white'
                    : 'bg-ink-900 text-white/50 hover:bg-ink-850 hover:text-white/80'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Notes">
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          placeholder="How did it go? Game flow, reads, mistakes…"
          className={`${inputClass} resize-none`}
        />
      </Field>

      <button
        type="submit"
        className="w-full rounded-xl bg-felt-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-felt-600/30 transition hover:bg-felt-400 active:scale-[0.99]"
      >
        Log Session
      </button>
    </form>
  );
}
