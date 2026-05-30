import { useState, useRef, useEffect } from 'react';

// Hover (desktop) / tap (mobile) tooltip. Wraps a label and shows `text`.
export default function Tooltip({ text, children, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  return (
    <span
      ref={ref}
      className={`relative inline-flex items-center gap-1 ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        className="cursor-help border-b border-dotted border-slate-300"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {children}
      </span>
      {open && text && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-lg border border-felt-300 bg-white px-3 py-2 text-xs font-normal normal-case leading-snug text-slate-800 shadow-xl shadow-slate-400/30"
        >
          {text}
          <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r border-felt-300 bg-white" />
        </span>
      )}
    </span>
  );
}
