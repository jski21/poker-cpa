import { useEffect } from 'react';

// Bottom-center toast. Auto-dismisses after `duration` ms.
export default function Toast({ toast, onClose, duration = 4500 }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [toast, onClose, duration]);

  if (!toast) return null;

  const tone =
    toast.tone === 'win'
      ? 'border-emerald-500/50 bg-emerald-600/20'
      : toast.tone === 'loss'
        ? 'border-rose-500/50 bg-rose-600/20'
        : 'border-felt-500/50 bg-felt-600/30';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 sm:bottom-8">
      <div
        className={`animate-toast-in pointer-events-auto max-w-sm rounded-xl border px-4 py-3 shadow-2xl shadow-black/60 backdrop-blur ${tone}`}
      >
        <div className="flex items-start gap-3">
          <div className="text-xl leading-none">{toast.icon || '✅'}</div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">{toast.title}</div>
            {toast.message && <div className="mt-0.5 text-xs text-white/70">{toast.message}</div>}
          </div>
          <button
            onClick={onClose}
            className="ml-1 text-white/40 transition hover:text-white"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
