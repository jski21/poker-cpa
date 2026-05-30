// Shared light-theme constants and a tooltip renderer for Recharts.
import { formatMoney } from '../../utils/formatting.js';

export const CHART = {
  grid: '#e2e8f0', // slate-200
  axis: '#64748b', // slate-500
  green: '#059669', // emerald-600
  greenSoft: '#2d6a4f',
  red: '#e11d48', // rose-600
  amber: '#d97706', // amber-600
  ev: '#0284c7', // sky-600
  paths: ['#059669', '#0284c7', '#d97706', '#e11d48', '#7c3aed', '#db2777', '#0891b2', '#16a34a'],
};

export function tooltipStyle() {
  return {
    contentStyle: {
      background: '#ffffff',
      border: '1px solid #2d6a4f55',
      borderRadius: 10,
      fontSize: 12,
      color: '#0f172a',
      boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
    },
    labelStyle: { color: '#475569', marginBottom: 4 },
    itemStyle: { color: '#0f172a' },
  };
}

export function moneyTick(currency) {
  return (v) => formatMoney(v, currency, { decimals: 0 });
}
