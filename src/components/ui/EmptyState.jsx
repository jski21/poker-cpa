// Friendly placeholder shown when a section has no data.
export default function EmptyState({ icon = '🃏', title = 'Nothing here yet', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-ink-850/40 px-6 py-12 text-center">
      <div className="mb-3 text-4xl opacity-80">{icon}</div>
      <div className="text-base font-semibold text-white/85">{title}</div>
      {message && <div className="mt-1 max-w-xs text-sm text-white/45">{message}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
