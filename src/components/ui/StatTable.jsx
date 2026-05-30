import { formatMoney, formatNumber, pnlColor } from '../../utils/formatting.js';

// Generic breakdown table: rows of { key, sessions, profit, hours, hourly }.
export default function StatTable({ rows, keyLabel, currency, emptyText = 'No data yet.' }) {
  if (!rows || rows.length === 0) {
    return <div className="px-1 py-6 text-center text-sm text-slate-400">{emptyText}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
            <th className="py-2 pr-3 font-medium">{keyLabel}</th>
            <th className="py-2 px-2 text-right font-medium">Sess</th>
            <th className="py-2 px-2 text-right font-medium">Hours</th>
            <th className="py-2 px-2 text-right font-medium">P&amp;L</th>
            <th className="py-2 pl-2 text-right font-medium">$/hr</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-slate-100 last:border-0">
              <td className="py-2 pr-3 font-medium text-slate-800">{r.key}</td>
              <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-500">{r.sessions}</td>
              <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-500">
                {formatNumber(r.hours, r.hours % 1 === 0 ? 0 : 1)}
              </td>
              <td className={`py-2 px-2 text-right font-mono tabular-nums ${pnlColor(r.profit)}`}>
                {formatMoney(r.profit, currency, { sign: true })}
              </td>
              <td className={`py-2 pl-2 text-right font-mono tabular-nums ${pnlColor(r.hourly)}`}>
                {formatMoney(r.hourly, currency, { sign: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
