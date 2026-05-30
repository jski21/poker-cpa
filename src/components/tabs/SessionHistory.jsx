import { useMemo, useRef, useState } from 'react';
import EmptyState from '../ui/EmptyState.jsx';
import { sessionProfit } from '../../utils/calculations.js';
import { formatMoney, formatDate, pnlColor } from '../../utils/formatting.js';
import { GAME_TYPES, FORMATS, TAG_OPTIONS } from '../../constants.js';

const inputClass =
  'rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-felt-400';

function toCSV(sessions) {
  const headers = [
    'date', 'location', 'gameType', 'format', 'stakes', 'bigBlind',
    'buyIn', 'cashOut', 'profit', 'hoursPlayed', 'handsPlayed', 'tags', 'notes',
  ];
  const escape = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = sessions.map((s) =>
    [
      s.date, s.location, s.gameType, s.format, s.stakes, s.bigBlind,
      s.buyIn, s.cashOut, sessionProfit(s), s.hoursPlayed, s.handsPlayed,
      (s.tags || []).join('|'), s.notes,
    ]
      .map(escape)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function parseCSV(text) {
  // Minimal CSV parser handling quoted fields.
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];
  const parseLine = (line) => {
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]).map((h) => h.trim());
  const idx = (name) => headers.indexOf(name);
  return lines.slice(1).map((line) => {
    const f = parseLine(line);
    const g = (name, fallback = '') => (idx(name) >= 0 ? f[idx(name)] : fallback);
    return {
      id: (crypto.randomUUID && crypto.randomUUID()) || 'id-' + Math.random().toString(36).slice(2),
      date: g('date'),
      location: g('location'),
      gameType: g('gameType', 'NLH'),
      format: g('format', 'Cash'),
      stakes: g('stakes'),
      bigBlind: parseFloat(g('bigBlind')) || 0,
      buyIn: parseFloat(g('buyIn')) || 0,
      cashOut: parseFloat(g('cashOut')) || 0,
      hoursPlayed: parseFloat(g('hoursPlayed')) || 0,
      handsPlayed: parseInt(g('handsPlayed'), 10) || 0,
      tags: g('tags') ? g('tags').split('|').filter(Boolean) : [],
      notes: g('notes'),
    };
  }).filter((s) => s.date);
}

const SORTS = {
  date: (a, b) => (a.date < b.date ? 1 : -1),
  profit: (a, b) => sessionProfit(b) - sessionProfit(a),
  hours: (a, b) => (b.hoursPlayed || 0) - (a.hoursPlayed || 0),
  hourly: (a, b) => {
    const ha = a.hoursPlayed ? sessionProfit(a) / a.hoursPlayed : 0;
    const hb = b.hoursPlayed ? sessionProfit(b) / b.hoursPlayed : 0;
    return hb - ha;
  },
};

export default function SessionHistory({ sessions, onUpdate, onDelete, currency, showToast }) {
  const [sortKey, setSortKey] = useState('date');
  const [filters, setFilters] = useState({ from: '', to: '', game: '', format: '', text: '', result: '', tag: '' });
  const [expanded, setExpanded] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const fileRef = useRef(null);
  const c = currency;

  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    let list = sessions.filter((s) => {
      if (filters.from && s.date < filters.from) return false;
      if (filters.to && s.date > filters.to) return false;
      if (filters.game && s.gameType !== filters.game) return false;
      if (filters.format && s.format !== filters.format) return false;
      if (filters.tag && !(s.tags || []).includes(filters.tag)) return false;
      if (filters.result === 'win' && sessionProfit(s) <= 0) return false;
      if (filters.result === 'loss' && sessionProfit(s) >= 0) return false;
      if (filters.text) {
        const hay = `${s.location} ${s.stakes} ${s.notes} ${(s.tags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(filters.text.toLowerCase())) return false;
      }
      return true;
    });
    return [...list].sort(SORTS[sortKey]);
  }, [sessions, filters, sortKey]);

  const exportCSV = () => {
    const blob = new Blob([toCSV(filtered)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poker-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCSV(String(reader.result));
        if (!parsed.length) {
          showToast({ tone: 'loss', icon: '⚠️', title: 'Nothing imported', message: 'No valid rows found.' });
        } else {
          parsed.forEach((s) => onUpdate(s, true));
          showToast({ tone: 'win', icon: '📥', title: `Imported ${parsed.length} sessions` });
        }
      } catch {
        showToast({ tone: 'loss', icon: '⚠️', title: 'Import failed', message: 'Could not parse that CSV.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const startEdit = (s) => {
    setEditing(s.id);
    setEditForm({ ...s, tags: [...(s.tags || [])] });
    setExpanded(s.id);
  };
  const saveEdit = () => {
    onUpdate(
      {
        ...editForm,
        bigBlind: parseFloat(editForm.bigBlind) || 0,
        buyIn: parseFloat(editForm.buyIn) || 0,
        cashOut: parseFloat(editForm.cashOut) || 0,
        hoursPlayed: parseFloat(editForm.hoursPlayed) || 0,
        handsPlayed: parseInt(editForm.handsPlayed, 10) || 0,
      },
      false
    );
    setEditing(null);
    setEditForm(null);
    showToast({ icon: '✏️', title: 'Session updated' });
  };

  if (sessions.length === 0) {
    return <EmptyState icon="📝" title="No sessions logged" message="Log your first session to build your history." />;
  }

  return (
    <div className="space-y-3 pb-8">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm text-slate-500">
          {filtered.length} of {sessions.length} sessions
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-900"
          >
            ⬆ Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={importCSV} className="hidden" />
          <button
            onClick={exportCSV}
            className="rounded-lg bg-felt-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-felt-400"
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-4 lg:grid-cols-7">
        <input type="date" value={filters.from} onChange={(e) => setF('from', e.target.value)} className={inputClass} title="From date" />
        <input type="date" value={filters.to} onChange={(e) => setF('to', e.target.value)} className={inputClass} title="To date" />
        <select value={filters.game} onChange={(e) => setF('game', e.target.value)} className={inputClass}>
          <option value="">All games</option>
          {GAME_TYPES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filters.format} onChange={(e) => setF('format', e.target.value)} className={inputClass}>
          <option value="">All formats</option>
          {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={filters.tag} onChange={(e) => setF('tag', e.target.value)} className={inputClass}>
          <option value="">All tags</option>
          {TAG_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filters.result} onChange={(e) => setF('result', e.target.value)} className={inputClass}>
          <option value="">Win &amp; Loss</option>
          <option value="win">Wins only</option>
          <option value="loss">Losses only</option>
        </select>
        <input
          value={filters.text}
          onChange={(e) => setF('text', e.target.value)}
          placeholder="Search…"
          className={inputClass}
        />
      </div>

      {/* Sort row */}
      <div className="flex gap-1 text-xs">
        <span className="px-1 py-1.5 text-slate-400">Sort:</span>
        {[
          ['date', 'Newest'],
          ['profit', 'Profit'],
          ['hours', 'Hours'],
          ['hourly', '$/hr'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSortKey(k)}
            className={`rounded-md px-2.5 py-1.5 font-medium transition ${
              sortKey === k ? 'bg-felt-500 text-white' : 'bg-white text-slate-500 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-white text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-2 pl-3 pr-2 text-left font-medium">Date</th>
              <th className="px-2 py-2 text-left font-medium">Where</th>
              <th className="hidden px-2 py-2 text-left font-medium sm:table-cell">Stakes</th>
              <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Hrs</th>
              <th className="px-2 py-2 text-right font-medium">P&amp;L</th>
              <th className="px-2 py-2 text-right font-medium">$/hr</th>
              <th className="py-2 pl-2 pr-3 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const pnl = sessionProfit(s);
              const hourly = s.hoursPlayed ? pnl / s.hoursPlayed : 0;
              const isOpen = expanded === s.id;
              const isEditing = editing === s.id;
              return (
                <FragmentRow key={s.id}>
                  <tr
                    className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50"
                    onClick={() => setExpanded(isOpen ? null : s.id)}
                  >
                    <td className="py-2.5 pl-3 pr-2 text-slate-700">{formatDate(s.date)}</td>
                    <td className="px-2 py-2.5">
                      <div className="text-slate-800">{s.location}</div>
                      <div className="text-[11px] text-slate-400 sm:hidden">{s.stakes} · {s.gameType}</div>
                    </td>
                    <td className="hidden px-2 py-2.5 text-slate-500 sm:table-cell">{s.stakes || '—'}</td>
                    <td className="hidden px-2 py-2.5 text-right font-mono tabular-nums text-slate-500 sm:table-cell">
                      {s.hoursPlayed || '—'}
                    </td>
                    <td className={`px-2 py-2.5 text-right font-mono font-semibold tabular-nums ${pnlColor(pnl)}`}>
                      {formatMoney(pnl, c, { sign: true })}
                    </td>
                    <td className={`px-2 py-2.5 text-right font-mono tabular-nums ${pnlColor(hourly)}`}>
                      {s.hoursPlayed ? formatMoney(hourly, c, { sign: true }) : '—'}
                    </td>
                    <td className="py-2.5 pl-2 pr-3 text-right text-slate-300">{isOpen ? '▴' : '▾'}</td>
                  </tr>

                  {isOpen && (
                    <tr className="border-t border-slate-100 bg-slate-100/60">
                      <td colSpan={7} className="px-3 py-3">
                        {isEditing ? (
                          <EditPanel
                            form={editForm}
                            setForm={setEditForm}
                            onSave={saveEdit}
                            onCancel={() => { setEditing(null); setEditForm(null); }}
                          />
                        ) : (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                              <span>{s.gameType} · {s.format}</span>
                              <span>Buy-in {formatMoney(s.buyIn, c)}</span>
                              <span>Cash-out {formatMoney(s.cashOut, c)}</span>
                              {s.bigBlind > 0 && <span>BB {formatMoney(s.bigBlind, c)}</span>}
                              {s.handsPlayed > 0 && <span>{s.handsPlayed} hands</span>}
                            </div>
                            {s.tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {s.tags.map((t) => (
                                  <span key={t} className="rounded-full bg-felt-100 px-2 py-0.5 text-[11px] text-felt-700">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                            {s.notes && <p className="text-sm text-slate-600">{s.notes}</p>}
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); startEdit(s); }}
                                className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-900"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this session? This cannot be undone.')) {
                                    onDelete(s.id);
                                    showToast({ icon: '🗑️', title: 'Session deleted' });
                                  }
                                }}
                                className="rounded-md bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </FragmentRow>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="bg-white py-8 text-center text-sm text-slate-400">No sessions match these filters.</div>
        )}
      </div>
    </div>
  );
}

// Helper to allow two <tr> per row without a wrapping element.
function FragmentRow({ children }) {
  return <>{children}</>;
}

function EditPanel({ form, setForm, onSave, onCancel }) {
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleTag = (t) =>
    setForm((f) => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t] }));
  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputClass} />
        <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Location" className={inputClass} />
        <input value={form.stakes} onChange={(e) => set('stakes', e.target.value)} placeholder="Stakes" className={inputClass} />
        <select value={form.gameType} onChange={(e) => set('gameType', e.target.value)} className={inputClass}>
          {GAME_TYPES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <input type="number" value={form.buyIn} onChange={(e) => set('buyIn', e.target.value)} placeholder="Buy-in" className={inputClass} />
        <input type="number" value={form.cashOut} onChange={(e) => set('cashOut', e.target.value)} placeholder="Cash-out" className={inputClass} />
        <input type="number" step="0.5" value={form.hoursPlayed} onChange={(e) => set('hoursPlayed', e.target.value)} placeholder="Hours" className={inputClass} />
        <input type="number" value={form.handsPlayed} onChange={(e) => set('handsPlayed', e.target.value)} placeholder="Hands" className={inputClass} />
      </div>
      <div className="flex flex-wrap gap-1">
        {TAG_OPTIONS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => toggleTag(t)}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
              form.tags.includes(t) ? 'bg-felt-500 text-white' : 'bg-white text-slate-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <textarea
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
        rows={2}
        placeholder="Notes"
        className={`${inputClass} w-full resize-none`}
      />
      <div className="flex gap-2">
        <button onClick={onSave} className="rounded-md bg-felt-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-felt-400">
          Save
        </button>
        <button onClick={onCancel} className="rounded-md bg-white px-4 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900">
          Cancel
        </button>
      </div>
    </div>
  );
}
