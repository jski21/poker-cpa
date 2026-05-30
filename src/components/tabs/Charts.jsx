import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import EmptyState from '../ui/EmptyState.jsx';
import Skeleton from '../ui/Skeleton.jsx';
import { CHART, tooltipStyle, moneyTick } from '../ui/chartTheme.js';
import { sessionProfit, rollingAverage, simulatePaths } from '../../utils/calculations.js';
import { formatMoney, formatDateShort } from '../../utils/formatting.js';

function ChartCard({ title, subtitle, children, loading }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-card p-3 sm:p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {loading ? <Skeleton height={240} label="Computing…" /> : children}
    </div>
  );
}

export default function Charts({ stats, currency }) {
  const [loading, setLoading] = useState(true);

  // Brief skeleton so the charts feel like they're computing (and to mount cleanly).
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, [stats.n]);

  const c = currency;
  const ordered = stats.ordered;

  // 1. Bankroll curve: actual cumulative vs EV (hourly × cumulative hours).
  const bankrollData = useMemo(() => {
    let cumHours = 0;
    let cumProfit = 0;
    return ordered.map((s, i) => {
      cumProfit += sessionProfit(s);
      cumHours += Number(s.hoursPlayed) || 0;
      return {
        i: i + 1,
        date: formatDateShort(s.date),
        actual: cumProfit,
        ev: stats.hourlyRate * cumHours,
      };
    });
  }, [ordered, stats.hourlyRate]);

  // 2. Session results distribution histogram.
  const histData = useMemo(() => {
    const profits = ordered.map(sessionProfit);
    if (!profits.length) return [];
    const min = Math.min(...profits);
    const max = Math.max(...profits);
    const span = max - min || 1;
    const bucketSize = niceBucket(span / 8);
    const start = Math.floor(min / bucketSize) * bucketSize;
    const buckets = new Map();
    for (let edge = start; edge <= max + bucketSize; edge += bucketSize) {
      buckets.set(edge, 0);
    }
    for (const p of profits) {
      const edge = Math.floor(p / bucketSize) * bucketSize;
      buckets.set(edge, (buckets.get(edge) || 0) + 1);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([edge, count]) => ({
        label: formatMoney(edge, c, { decimals: 0 }),
        edge,
        count,
      }));
  }, [ordered, c]);

  // 3. Rolling 10-session average hourly rate.
  const rollingData = useMemo(() => {
    const rates = ordered.map((s) => {
      const h = Number(s.hoursPlayed) || 0;
      return h > 0 ? sessionProfit(s) / h : 0;
    });
    const roll = rollingAverage(rates, 10);
    return ordered.map((s, i) => ({
      i: i + 1,
      date: formatDateShort(s.date),
      hourly: roll[i],
    }));
  }, [ordered]);

  // 4. P&L by month (last 12).
  const monthlyData = useMemo(() => {
    const map = new Map();
    for (const s of ordered) {
      const key = s.date.slice(0, 7); // YYYY-MM
      map.set(key, (map.get(key) || 0) + sessionProfit(s));
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-12)
      .map(([key, profit]) => {
        const [y, m] = key.split('-');
        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
        return { label, profit };
      });
  }, [ordered]);

  // 5. Session length vs profitability scatter.
  const scatterData = useMemo(
    () =>
      ordered
        .filter((s) => Number(s.hoursPlayed) > 0)
        .map((s) => ({ hours: Number(s.hoursPlayed), profit: sessionProfit(s) })),
    [ordered]
  );

  // 6. Variance simulation — 5 future bankroll paths over next 100 sessions.
  const simData = useMemo(() => {
    const meanResult = stats.n > 0 ? stats.totalProfit / stats.n : 0;
    const sdResult = sdOfSessionProfits(ordered);
    const paths = simulatePaths({ paths: 5, n: 100, mean: meanResult, sd: sdResult, start: 0 });
    const rows = [];
    for (let i = 0; i <= 100; i++) {
      const row = { i };
      paths.forEach((p, idx) => {
        row[`p${idx}`] = p[i];
      });
      rows.push(row);
    }
    return rows;
  }, [ordered, stats.n, stats.totalProfit]);

  if (stats.n === 0) {
    return (
      <EmptyState
        icon="📈"
        title="No charts yet"
        message="Log your first session to chart your bankroll curve, variance, and more."
      />
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <ChartCard
        title="Bankroll Curve"
        subtitle="Cumulative profit (actual) vs expected value line"
        loading={loading}
      >
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={bankrollData} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: CHART.axis, fontSize: 10 }} minTickGap={24} />
            <YAxis tick={{ fill: CHART.axis, fontSize: 10 }} tickFormatter={moneyTick(c)} width={56} />
            <RTooltip
              {...tooltipStyle()}
              formatter={(v, name) => [formatMoney(v, c, { sign: true }), name === 'actual' ? 'Actual' : 'EV']}
            />
            <ReferenceLine y={0} stroke={CHART.axis} strokeDasharray="2 2" />
            <Line type="monotone" dataKey="ev" stroke={CHART.ev} strokeWidth={1.5} strokeDasharray="5 4" dot={false} name="EV" />
            <Line type="monotone" dataKey="actual" stroke={CHART.green} strokeWidth={2.5} dot={false} name="Actual" />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Session Results Distribution" subtitle="How often each result band occurs" loading={loading}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={histData} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
            <YAxis allowDecimals={false} tick={{ fill: CHART.axis, fontSize: 10 }} width={28} />
            <RTooltip {...tooltipStyle()} formatter={(v) => [`${v} sessions`, 'Count']} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {histData.map((d) => (
                <Cell key={d.edge} fill={d.edge >= 0 ? CHART.green : CHART.red} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Hourly Rate Over Time" subtitle="Rolling 10-session average $/hr" loading={loading}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={rollingData} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: CHART.axis, fontSize: 10 }} minTickGap={24} />
            <YAxis tick={{ fill: CHART.axis, fontSize: 10 }} tickFormatter={moneyTick(c)} width={48} />
            <RTooltip {...tooltipStyle()} formatter={(v) => [`${formatMoney(v, c, { sign: true })}/hr`, 'Rolling $/hr']} />
            <ReferenceLine y={0} stroke={CHART.axis} strokeDasharray="2 2" />
            <Line type="monotone" dataKey="hourly" stroke={CHART.amber} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="P&L by Month" subtitle="Last 12 months" loading={loading}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 10 }} />
            <YAxis tick={{ fill: CHART.axis, fontSize: 10 }} tickFormatter={moneyTick(c)} width={56} />
            <RTooltip {...tooltipStyle()} formatter={(v) => [formatMoney(v, c, { sign: true }), 'P&L']} />
            <ReferenceLine y={0} stroke={CHART.axis} />
            <Bar dataKey="profit" radius={[3, 3, 0, 0]}>
              {monthlyData.map((d, i) => (
                <Cell key={i} fill={d.profit >= 0 ? CHART.green : CHART.red} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Session Length vs Profitability"
        subtitle="Does playing longer help or hurt? Each dot is a session"
        loading={loading}
      >
        <ResponsiveContainer width="100%" height={240}>
          <ScatterChart margin={{ top: 5, right: 8, left: -8, bottom: 5 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="hours"
              name="Hours"
              tick={{ fill: CHART.axis, fontSize: 10 }}
              tickFormatter={(v) => `${v}h`}
            />
            <YAxis
              type="number"
              dataKey="profit"
              name="Profit"
              tick={{ fill: CHART.axis, fontSize: 10 }}
              tickFormatter={moneyTick(c)}
              width={56}
            />
            <RTooltip
              {...tooltipStyle()}
              cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }}
              formatter={(v, name) => (name === 'Profit' ? [formatMoney(v, c, { sign: true }), name] : [`${v}h`, name])}
            />
            <ReferenceLine y={0} stroke={CHART.axis} strokeDasharray="2 2" />
            <Scatter data={scatterData}>
              {scatterData.map((d, i) => (
                <Cell key={i} fill={d.profit >= 0 ? CHART.green : CHART.red} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Variance Simulation"
        subtitle="5 possible bankroll paths over your next 100 sessions, based on your mean & SD"
        loading={loading}
      >
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={simData} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
            <XAxis dataKey="i" tick={{ fill: CHART.axis, fontSize: 10 }} minTickGap={24} />
            <YAxis tick={{ fill: CHART.axis, fontSize: 10 }} tickFormatter={moneyTick(c)} width={56} />
            <RTooltip {...tooltipStyle()} formatter={(v) => [formatMoney(v, c, { sign: true }), 'Path']} />
            <ReferenceLine y={0} stroke={CHART.axis} strokeDasharray="2 2" />
            {[0, 1, 2, 3, 4].map((idx) => (
              <Line
                key={idx}
                type="monotone"
                dataKey={`p${idx}`}
                stroke={CHART.paths[idx]}
                strokeWidth={1.75}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function niceBucket(raw) {
  if (raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const frac = raw / pow;
  let nice;
  if (frac < 1.5) nice = 1;
  else if (frac < 3) nice = 2;
  else if (frac < 7) nice = 5;
  else nice = 10;
  return Math.max(1, nice * pow);
}

function sdOfSessionProfits(sessions) {
  const profits = sessions.map(sessionProfit);
  const n = profits.length;
  if (n < 2) return 0;
  const m = profits.reduce((a, b) => a + b, 0) / n;
  const v = profits.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1);
  return Math.sqrt(v);
}
