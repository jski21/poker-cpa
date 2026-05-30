// Loading placeholder for charts while data is computing.
export default function Skeleton({ height = 240, label }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70 shadow-card" style={{ height }}>
      <div className="skeleton absolute inset-0 opacity-60" />
      {label && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-300">{label}</div>
      )}
    </div>
  );
}
