import Tooltip from './Tooltip.jsx';

// A compact stat tile. `tone` controls the value color: pass an explicit tailwind
// class via `valueClass`, or use the 'neutral'/'muted' presets.
export default function MetricCard({ label, value, sub, tooltip, tone = 'neutral', valueClass = '', accent = false }) {
  const toneClass = tone === 'muted' ? 'text-slate-600' : 'text-slate-900';

  return (
    <div
      className={`rounded-2xl px-3.5 py-3 transition ${
        accent
          ? 'bg-felt-50 ring-1 ring-felt-200 shadow-card'
          : 'bg-white ring-1 ring-slate-200/70 shadow-card'
      }`}
    >
      <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-400">
        {tooltip ? <Tooltip text={tooltip}>{label}</Tooltip> : label}
      </div>
      <div className={`text-[1.35rem] font-semibold leading-none tracking-tight tabular-nums ${valueClass || toneClass}`}>
        {value}
      </div>
      {sub != null && <div className="mt-1.5 text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}
