import { useState } from 'react';
import MetricCard from '../ui/MetricCard.jsx';
import StatTable from '../ui/StatTable.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import Tooltip from '../ui/Tooltip.jsx';
import Icon from '../ui/Icon.jsx';
import { formatMoney, formatNumber, formatPercent, pnlColor } from '../../utils/formatting.js';

function SectionTitle({ children, hint }) {
  return (
    <h2 className="mb-2.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
      {children}
      {hint && <span className="text-[11px] font-normal normal-case tracking-normal text-slate-400">{hint}</span>}
    </h2>
  );
}

// A stat shown inside the green bankroll hero (light text on dark felt).
function HeroStat({ label, value, positive, arrow }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-felt-100/70">{label}</div>
      <div className="mt-1 flex items-center gap-1 text-[15px] font-semibold tabular-nums">
        {arrow && (
          <Icon
            name={positive ? 'trendUp' : 'trendDown'}
            className={`h-3.5 w-3.5 ${positive ? 'text-emerald-200' : 'text-rose-200'}`}
          />
        )}
        <span>{value}</span>
      </div>
    </div>
  );
}

function rorTone(ror) {
  if (ror < 5) return { text: 'text-emerald-600', bg: 'border-emerald-300 bg-emerald-50', label: 'Healthy' };
  if (ror <= 15) return { text: 'text-amber-600', bg: 'border-amber-300 bg-amber-50', label: 'Caution' };
  return { text: 'text-rose-600', bg: 'border-rose-300 bg-rose-50', label: 'Danger' };
}

const BREAKDOWN_TABS = [
  { id: 'stakes', label: 'By Stakes' },
  { id: 'location', label: 'By Location' },
  { id: 'game', label: 'By Game' },
  { id: 'dow', label: 'By Day' },
];

export default function Dashboard({ stats, currency, onSetBankroll }) {
  const [breakdown, setBreakdown] = useState('stakes');

  if (stats.n === 0) {
    return (
      <EmptyState
        icon="📊"
        title="No stats yet"
        message="Log your first session to see your bankroll, win rate, and variance come to life."
      />
    );
  }

  const s = stats;
  const ror = rorTone(s.ror);
  const c = currency;

  const range = (lo, hi) =>
    `${formatMoney(lo, c, { sign: true })} to ${formatMoney(hi, c, { sign: true })}`;

  const breakdownContent = {
    stakes: <StatTable rows={s.byStakes} keyLabel="Stakes" currency={c} />,
    location: <StatTable rows={s.byLocation} keyLabel="Location" currency={c} />,
    game: <StatTable rows={s.byGameType} keyLabel="Game" currency={c} />,
    dow: <DayOfWeek rows={s.byDayOfWeek} currency={c} />,
  }[breakdown];

  return (
    <div className="space-y-6 pb-8">
      {/* A. Bankroll hero */}
      <section>
        <button onClick={onSetBankroll} className="block w-full text-left">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-felt-500 to-felt-700 p-5 text-white shadow-hero">
            <div className="pointer-events-none absolute -right-7 -top-10 opacity-[0.08]">
              <Icon name="spade" className="h-44 w-44" strokeWidth={1} />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-felt-100/80">
                  <Icon name="wallet" className="h-4 w-4" /> Current Bankroll
                </div>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-felt-50">
                  {formatNumber(s.bankrollInBuyins, 1)} buy-ins
                </span>
              </div>
              <div className="mt-2 text-[2.5rem] font-bold leading-none tracking-tight tabular-nums">
                {formatMoney(s.currentBankroll, c)}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2.5">
                <HeroStat
                  label="All-Time P&L"
                  value={formatMoney(s.totalProfit, c, { sign: true })}
                  positive={s.totalProfit >= 0}
                  arrow
                />
                <HeroStat
                  label="Last 30 Days"
                  value={formatMoney(s.last30Profit, c, { sign: true })}
                  positive={s.last30Profit >= 0}
                  arrow
                />
                <HeroStat label="ROI" value={formatPercent(s.roi)} positive={s.roi >= 0} arrow />
              </div>
            </div>
          </div>
        </button>
      </section>

      {/* B. Win Rate Metrics */}
      <section>
        <SectionTitle>Win Rate</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricCard
            label="Hourly Rate"
            tooltip="Total profit ÷ total hours. Your primary KPI."
            value={`${formatMoney(s.hourlyRate, c, { sign: true })}/hr`}
            valueClass={pnlColor(s.hourlyRate)}
            accent
          />
          <MetricCard
            label="BB / 100"
            tooltip="Big blinds won per 100 hands. The standard win-rate measure. Needs hands logged."
            value={s.bb100 == null ? '—' : formatNumber(s.bb100, 2)}
            valueClass={s.bb100 == null ? 'text-slate-400' : pnlColor(s.bb100, 0)}
            sub={s.bb100 == null ? 'log hands to enable' : null}
          />
          <MetricCard
            label="Win Rate (BB/hr)"
            tooltip="Hourly rate ÷ average big blind."
            value={formatNumber(s.bbPerHour, 2)}
            valueClass={pnlColor(s.bbPerHour, 0)}
          />
          <MetricCard
            label="Sessions Won"
            tooltip="Share of sessions that finished in profit."
            value={formatPercent(s.sessionsWonPct)}
            sub={`${s.winningCount}W / ${s.losingCount}L`}
          />
          <MetricCard
            label="Avg Win"
            tooltip="Mean profit across winning sessions."
            value={formatMoney(s.avgWin, c)}
            valueClass="text-emerald-600"
          />
          <MetricCard
            label="Avg Loss"
            tooltip="Mean loss across losing sessions."
            value={formatMoney(s.avgLoss, c)}
            valueClass="text-rose-600"
          />
          <MetricCard
            label="Win/Loss Ratio"
            tooltip="Avg win ÷ avg loss. Above 1.0 means wins outsize losses."
            value={formatNumber(s.winLossRatio, 2)}
            valueClass={s.winLossRatio >= 1 ? 'text-emerald-600' : 'text-amber-600'}
          />
          <MetricCard
            label="Biggest Win"
            tooltip="Largest single-session profit."
            value={formatMoney(s.biggestWin, c, { sign: true })}
            valueClass="text-emerald-600"
          />
          <MetricCard
            label="Biggest Loss"
            tooltip="Largest single-session loss."
            value={formatMoney(s.biggestLoss, c, { sign: true })}
            valueClass="text-rose-600"
          />
        </div>
      </section>

      {/* C. Variance & Risk */}
      <section>
        <SectionTitle hint={`σ in ${s.sdUnit}`}>Variance &amp; Risk</SectionTitle>

        {s.ror > 10 && (
          <div className="mb-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="font-semibold">Under-rolled.</span> Your current bankroll may be too thin for these
              stakes (Risk of Ruin {formatPercent(s.ror)}). Consider dropping down or rebuilding.
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricCard
            label="Standard Deviation"
            tooltip={`Spread of your per-session results, in ${s.sdUnit}. Higher means swingier.`}
            value={`${formatNumber(s.sd, 2)} ${s.sdUnit}`}
          />
          <MetricCard
            label="Hourly Range 68%"
            tooltip="Where ~2 of every 3 hours should land: hourly ± 1 standard deviation."
            value={range(s.range68[0], s.range68[1])}
            valueClass="!text-sm font-semibold text-slate-700"
          />
          <MetricCard
            label="Hourly Range 95%"
            tooltip="Where ~19 of every 20 hours should land: hourly ± 2 standard deviations."
            value={range(s.range95[0], s.range95[1])}
            valueClass="!text-sm font-semibold text-slate-700"
          />
          <div className={`rounded-2xl border px-3.5 py-3 shadow-card ${ror.bg}`}>
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-400">
              <Tooltip text="Probability of losing your whole bankroll at these stakes, given your win rate and variance.">
                Risk of Ruin
              </Tooltip>
            </div>
            <div className={`text-[1.35rem] font-semibold leading-none tracking-tight tabular-nums ${ror.text}`}>
              {formatPercent(s.ror)}
            </div>
            <div className={`mt-1.5 text-[11px] font-medium ${ror.text}`}>{ror.label}</div>
          </div>
          <MetricCard
            label="Recommended Roll"
            tooltip={`Bankroll needed to keep Risk of Ruin under your ${s.sdUnit === 'BB/100' ? 'target' : 'target'}. Compare to current.`}
            value={Number.isFinite(s.recommendedBankroll) ? formatMoney(s.recommendedBankroll, c) : '∞'}
            sub={
              Number.isFinite(s.recommendedBuyins)
                ? `${formatNumber(s.recommendedBuyins, 1)} buy-ins`
                : 'win rate ≤ 0'
            }
          />
          <MetricCard
            label="Roll in Buy-ins"
            tooltip="Current bankroll ÷ average buy-in. How many full buy-ins you're carrying."
            value={formatNumber(s.bankrollInBuyins, 1)}
            valueClass={s.bankrollInBuyins >= 20 ? 'text-emerald-600' : s.bankrollInBuyins >= 10 ? 'text-amber-600' : 'text-rose-600'}
          />
          <MetricCard
            label="Max Drawdown"
            tooltip="Largest peak-to-trough drop recorded across your session history."
            value={formatMoney(s.drawdown, c)}
            valueClass="text-rose-600"
          />
        </div>
      </section>

      {/* D. Session Volume */}
      <section>
        <SectionTitle>Volume</SectionTitle>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <MetricCard label="Sessions" value={formatNumber(s.n, 0)} />
          <MetricCard label="Total Hours" value={formatNumber(s.totalHours, 1)} />
          <MetricCard label="Total Hands" value={s.totalHands ? formatNumber(s.totalHands, 0) : '—'} />
          <MetricCard label="Avg Length" value={`${formatNumber(s.avgSessionLength, 1)}h`} />
          <MetricCard label="This Month" value={formatNumber(s.thisMonthCount, 0)} sub="sessions" />
          <MetricCard label="Hrs / Month" value={formatNumber(s.hoursThisMonth, 1)} />
        </div>
      </section>

      {/* E. Breakdown tables */}
      <section>
        <SectionTitle>Breakdowns</SectionTitle>
        <div className="mb-3 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {BREAKDOWN_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setBreakdown(t.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                breakdown === t.id ? 'bg-felt-500 text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="rounded-xl bg-white ring-1 ring-slate-200/70 shadow-card p-3">{breakdownContent}</div>
      </section>
    </div>
  );
}

// Day-of-week heatmap-style table.
function DayOfWeek({ rows, currency }) {
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.profit)));
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {rows.map((r) => {
        const intensity = Math.abs(r.profit) / maxAbs;
        const bg =
          r.sessions === 0
            ? 'rgba(15,23,42,0.05)'
            : r.profit >= 0
              ? `rgba(16,185,129,${0.12 + intensity * 0.5})`
              : `rgba(244,63,94,${0.12 + intensity * 0.5})`;
        return (
          <div key={r.key} className="rounded-lg border border-slate-200 p-2 text-center" style={{ background: bg }}>
            <div className="text-[11px] font-medium text-slate-600">{r.key}</div>
            <div className={`font-mono text-xs font-semibold tabular-nums ${pnlColor(r.profit)}`}>
              {r.sessions ? formatMoney(r.profit, currency, { sign: true, decimals: 0 }) : '—'}
            </div>
            <div className="text-[10px] text-slate-400">{r.sessions} s</div>
          </div>
        );
      })}
    </div>
  );
}
