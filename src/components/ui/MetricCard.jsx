import Tooltip from './Tooltip.jsx';

// A compact stat tile. `tone` controls the value color: 'pnl' colors by sign,
// or pass an explicit tailwind class string.
export default function MetricCard({ label, value, sub, tooltip, tone = 'neutral', valueClass = '', accent = false }) {
  const toneClass =
    tone === 'neutral'
      ? 'text-white'
      : tone === 'muted'
        ? 'text-white/70'
        : tone;

  return (
    <div
      className={`rounded-xl border bg-ink-850/80 px-3 py-2.5 ${
        accent ? 'border-felt-500/50 bg-felt-600/20' : 'border-white/10'
      }`}
    >
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-white/45">
        {tooltip ? <Tooltip text={tooltip}>{label}</Tooltip> : label}
      </div>
      <div className={`font-mono text-lg font-semibold leading-tight tabular-nums ${valueClass || toneClass}`}>
        {value}
      </div>
      {sub != null && <div className="mt-0.5 text-[11px] text-white/45">{sub}</div>}
    </div>
  );
}
