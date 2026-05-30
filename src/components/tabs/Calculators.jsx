import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceLine,
} from 'recharts';
import MetricCard from '../ui/MetricCard.jsx';
import { CHART, tooltipStyle, moneyTick } from '../ui/chartTheme.js';
import { recommendedBuyins, riskOfRuin, simulatePaths, simulateOutcomes } from '../../utils/calculations.js';
import { formatMoney, formatNumber, formatPercent } from '../../utils/formatting.js';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-felt-400 focus:ring-1 focus:ring-felt-400';

function NumField({ label, value, onChange, step = 'any', suffix, hint }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function Card({ title, icon, children }) {
  return (
    <section className="rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </section>
  );
}

export default function Calculators({ stats, currency, settings }) {
  const c = currency;

  // ---- Bankroll Calculator ----
  const [brWr, setBrWr] = useState(() => round2(stats.usingBB100 ? stats.bb100 || 5 : stats.hourlyRate || 25));
  const [brSd, setBrSd] = useState(() => round2(stats.sd || (stats.usingBB100 ? 80 : 250)));
  const [brTarget, setBrTarget] = useState(() => String(settings.targetRoR || 5));
  const [brBuyIn, setBrBuyIn] = useState(() => String(round2(stats.avgBuy || 500)));

  const wr = parseFloat(brWr) || 0;
  const sd = parseFloat(brSd) || 0;
  const target = (parseFloat(brTarget) || 5) / 100;
  const buyInSize = parseFloat(brBuyIn) || 0;

  const recBuyins = recommendedBuyins(wr, sd, target);
  const recDollars = Number.isFinite(recBuyins) ? recBuyins * buyInSize : Infinity;
  // Months to build it, assuming ~stats.hoursThisMonth*... — use current monthly profit proxy.
  const monthlyProfit = estimateMonthlyProfit(stats);
  const monthsToBuild =
    Number.isFinite(recDollars) && monthlyProfit > 0
      ? Math.max(0, (recDollars - stats.currentBankroll) / monthlyProfit)
      : null;

  const verdict = useMemo(() => {
    if (!Number.isFinite(recDollars)) return { text: 'Win rate must be positive to ever be safely rolled.', tone: 'text-rose-600' };
    if (stats.currentBankroll >= recDollars)
      return { text: `You're rolled. Current bankroll covers this with ${formatMoney(stats.currentBankroll - recDollars, c)} to spare.`, tone: 'text-emerald-600' };
    return {
      text: `Short by ${formatMoney(recDollars - stats.currentBankroll, c)}. Build up before moving in.`,
      tone: 'text-amber-600',
    };
  }, [recDollars, stats.currentBankroll, c]);

  // ---- Variance Simulator ----
  const [simN, setSimN] = useState('100');
  const [useActual, setUseActual] = useState(true);
  const [simMean, setSimMean] = useState(() => round2(perSessionMean(stats)));
  const [simSd, setSimSd] = useState(() => round2(perSessionSd(stats)));
  const [seed, setSeed] = useState(0); // bump to re-roll

  const n = clampInt(simN, 1, 1000);
  const meanV = useActual ? perSessionMean(stats) : parseFloat(simMean) || 0;
  const sdV = useActual ? perSessionSd(stats) : parseFloat(simSd) || 0;

  const sim = useMemo(() => {
    const paths = simulatePaths({ paths: 10, n, mean: meanV, sd: sdV, start: 0 });
    const rows = [];
    for (let i = 0; i <= n; i++) {
      const row = { i };
      paths.forEach((p, idx) => (row[`p${idx}`] = p[i]));
      rows.push(row);
    }
    const outcomes = simulateOutcomes({ trials: 2000, n, mean: meanV, sd: sdV, start: 0 });
    return { rows, outcomes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, meanV, sdV, seed]);

  return (
    <div className="space-y-4 pb-8">
      <Card title="Bankroll Calculator" icon="🧮">
        <div className="grid grid-cols-2 gap-3">
          <NumField label={`Win Rate`} value={brWr} onChange={setBrWr} hint={stats.usingBB100 ? 'BB/100' : '$/hr'} />
          <NumField label="Std Dev" value={brSd} onChange={setBrSd} hint={stats.sdUnit} />
          <NumField label="Target RoR" value={brTarget} onChange={setBrTarget} suffix="%" />
          <NumField label="Buy-in / Stake" value={brBuyIn} onChange={setBrBuyIn} suffix={c} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCard
            label="Required (buy-ins)"
            value={Number.isFinite(recBuyins) ? formatNumber(recBuyins, 1) : '∞'}
            accent
          />
          <MetricCard label="Required ($)" value={Number.isFinite(recDollars) ? formatMoney(recDollars, c) : '∞'} />
          <MetricCard label="Current Roll" value={formatMoney(stats.currentBankroll, c)} />
          <MetricCard
            label="Months to Build"
            value={monthsToBuild == null ? '—' : monthsToBuild <= 0 ? 'Now' : formatNumber(monthsToBuild, 1)}
            sub={monthlyProfit > 0 ? `${formatMoney(monthlyProfit, c)}/mo` : 'need a win rate'}
          />
        </div>
        <div className={`mt-3 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm ${verdict.tone}`}>
          {verdict.text}
        </div>
      </Card>

      <Card title="Variance Simulator" icon="🎲">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="w-28">
            <NumField label="Sessions" value={simN} onChange={setSimN} step="1" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={useActual}
              onChange={(e) => setUseActual(e.target.checked)}
              className="h-4 w-4 accent-felt-500"
            />
            Use my actual stats
          </label>
          {!useActual && (
            <>
              <div className="w-32">
                <NumField label="Mean / session" value={simMean} onChange={setSimMean} suffix={c} />
              </div>
              <div className="w-32">
                <NumField label="SD / session" value={simSd} onChange={setSimSd} suffix={c} />
              </div>
            </>
          )}
          <button
            onClick={() => setSeed((s) => s + 1)}
            className="ml-auto rounded-lg bg-felt-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-felt-400"
          >
            Re-roll 🎲
          </button>
        </div>

        {useActual && (
          <div className="mb-3 text-xs text-slate-400">
            Using mean {formatMoney(meanV, c, { sign: true })}/session, SD {formatMoney(sdV, c)}/session.
          </div>
        )}

        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={sim.rows} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
            <XAxis dataKey="i" tick={{ fill: CHART.axis, fontSize: 10 }} minTickGap={24} />
            <YAxis tick={{ fill: CHART.axis, fontSize: 10 }} tickFormatter={moneyTick(c)} width={56} />
            <RTooltip {...tooltipStyle()} formatter={(v) => [formatMoney(v, c, { sign: true }), 'Path']} />
            <ReferenceLine y={0} stroke={CHART.axis} strokeDasharray="2 2" />
            {Array.from({ length: 10 }, (_, idx) => (
              <Line
                key={idx}
                type="monotone"
                dataKey={`p${idx}`}
                stroke={CHART.paths[idx % CHART.paths.length]}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricCard label="Median outcome" value={formatMoney(sim.outcomes.median, c, { sign: true })} accent />
          <MetricCard label="Best (p100)" value={formatMoney(sim.outcomes.best, c, { sign: true })} valueClass="text-emerald-600" />
          <MetricCard label="Worst (p0)" value={formatMoney(sim.outcomes.worst, c, { sign: true })} valueClass="text-rose-600" />
          <MetricCard label="5th–95th pct" value={`${formatMoney(sim.outcomes.p05, c, { sign: true })} … ${formatMoney(sim.outcomes.p95, c, { sign: true })}`} valueClass="text-slate-700 text-sm" />
          <MetricCard label="Prob. Up" value={formatPercent(sim.outcomes.probUp)} valueClass="text-emerald-600" />
          <MetricCard label="Exp. Max Drawdown" value={formatMoney(sim.outcomes.expectedMaxDrawdown, c)} valueClass="text-rose-600" />
        </div>
      </Card>
    </div>
  );
}

function round2(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}
function clampInt(v, lo, hi) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
function perSessionMean(stats) {
  return stats.n > 0 ? stats.totalProfit / stats.n : 0;
}
function perSessionSd(stats) {
  const profits = stats.profits || [];
  const n = profits.length;
  if (n < 2) return 0;
  const m = profits.reduce((a, b) => a + b, 0) / n;
  const v = profits.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1);
  return Math.sqrt(v);
}
function estimateMonthlyProfit(stats) {
  // Average monthly profit from total profit over the months spanned.
  if (stats.n === 0) return 0;
  const dates = stats.ordered.map((s) => s.date).sort();
  const first = new Date(`${dates[0]}T00:00:00`);
  const last = new Date(`${dates[dates.length - 1]}T00:00:00`);
  const months = Math.max(1, (last - first) / (1000 * 60 * 60 * 24 * 30.44));
  return stats.totalProfit / months;
}
