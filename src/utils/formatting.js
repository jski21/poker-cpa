// Pure display formatters. No app state here.

export function formatMoney(value, currency = '$', { sign = false, decimals = 2 } = {}) {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return `${currency}0.00`;
  const neg = value < 0;
  const abs = Math.abs(value);
  const body = abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const prefix = neg ? '-' : sign ? '+' : '';
  return `${prefix}${currency}${body}`;
}

export function formatNumber(value, decimals = 2) {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '0';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value, decimals = 1) {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '0.0%';
  return `${value.toFixed(decimals)}%`;
}

export function formatHours(value) {
  if (!value) return '0h';
  return `${formatNumber(value, value % 1 === 0 ? 0 : 1)}h`;
}

// Tailwind text color for a P&L value. Near-breakeven (|x| <= threshold) is amber.
export function pnlColor(value, threshold = 20) {
  if (value > threshold) return 'text-emerald-400';
  if (value < -threshold) return 'text-rose-400';
  return 'text-amber-400';
}

export function pnlBg(value, threshold = 20) {
  if (value > threshold) return 'bg-emerald-500/10 border-emerald-500/30';
  if (value < -threshold) return 'bg-rose-500/10 border-rose-500/30';
  return 'bg-amber-500/10 border-amber-500/30';
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}
