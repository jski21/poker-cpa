// Shared dark-theme constants and a tooltip renderer for Recharts.
import { formatMoney } from '../../utils/formatting.js';

export const CHART = {
  grid: '#1f2a25',
  axis: '#5b6b63',
  green: '#34d399',
  greenSoft: '#2d6a4f',
  red: '#fb7185',
  amber: '#fbbf24',
  ev: '#7dd3fc',
  paths: ['#34d399', '#7dd3fc', '#fbbf24', '#fb7185', '#a78bfa', '#f472b6', '#38bdf8', '#4ade80'],
};

export function tooltipStyle() {
  return {
    contentStyle: {
      background: '#0f1512',
      border: '1px solid #2d6a4f66',
      borderRadius: 10,
      fontSize: 12,
      color: '#fff',
    },
    labelStyle: { color: '#ffffffaa', marginBottom: 4 },
    itemStyle: { color: '#fff' },
  };
}

export function moneyTick(currency) {
  return (v) => formatMoney(v, currency, { decimals: 0 });
}
