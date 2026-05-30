import { useState } from 'react';
import MetricCard from '../ui/MetricCard.jsx';
import StatTable from '../ui/StatTable.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import Tooltip from '../ui/Tooltip.jsx';
import { formatMoney, formatNumber, formatPercent, pnlColor } from '../../utils/formatting.js';

function SectionTitle({ children, hint }) {
  return (
    <h2 className="mb-2 mt-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/70">
      {children}
      {hint && <span className="text-[11px] font-normal normal-case text-white/35">{hint}</span>}
    </h2>
  );
}

function rorTone(ror) {
  if (ror < 5) return { text: 'text-emerald-400', bg: 'border-emerald-500/40 bg-emerald-600/15', label: 'Healthy' };
  if (ror <= 15) return { text: 'text-amber-400', bg: 'border-amber-500/40 bg-amber-600/15', label: 'Caution' };
  return { text: 'text-rose-400', bg: 'border-rose-500/40 bg-rose-600/15', label: 'Danger' };
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
      {/* A. Bankroll Overview */}
      <section>
        <SectionTitle>Bankroll Overview</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button onClick={onSetBankroll} className="text-left">
            <MetricCard
              label="Current Bankroll"
              tooltip="Starting bankroll + net profit + deposits − withdrawals. Tap to set your starting figure."
              value={formatMoney(s.currentBankroll, c)}
              valueClass={s.currentBankroll >= 0 ? 'text-white' : 'text-rose-400'}
              sub="tap to edit start"
              accent
            />
          </button>
          <MetricCard
            label="Total P&L"
            tooltip="All-time profit/loss across every logged session."
            value={formatMoney(s.totalProfit, c, { sign: true })}
            valueClass={pnlColor(s.totalProfit)}
          />
          <MetricCard
            label="Last 30 Days"
            tooltip="Net result of sessions in the last 30 days."
            value={formatMoney(s.last30Profit, c, { sign: true })}
            valueClass={pnlColor(s.last30Profit)}
          />
          <MetricCard
            label="All-Time ROI"
            tooltip="(Total profit ÷ total buy-ins) × 100."
            value={formatPercent(s.roi)}
            valueClass={pnlColor(s.roi, 0)}
          />
        </div>
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
            valueClass={s.bb100 == null ? 'text-white/40' : pnlColor(s.bb100, 0)}
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
            valueClass="text-emerald-400"
          />
          <MetricCard
            label="Avg Loss"
            tooltip="Mean loss across losing sessions."
            value={formatMoney(s.avgLoss, c)}
            valueClass="text-rose-400"
          />
          <MetricCard
            label="Win/Loss Ratio"
            tooltip="Avg win ÷ avg loss. Above 1.0 means wins outsize losses."
            value={formatNumber(s.winLossRatio, 2)}
            valueClass={s.winLossRatio >= 1 ? 'text-emerald-400' : 'text-amber-400'}
          />
          <MetricCard
            label="Biggest Win"
            tooltip="Largest single-session profit."
            value={formatMoney(s.biggestWin, c, { sign: true })}
            valueClass="text-emerald-400"
          />
          <MetricCard
            label="Biggest Loss"
            tooltip="Largest single-session loss."
            value={formatMoney(s.biggestLoss, c, { sign: true })}
            valueClass="text-rose-400"
          />
        </div>
      </section>

      {/* C. Variance & Risk */}
      <section>
        <SectionTitle hint={`σ in ${s.sdUnit}`}>Variance &amp; Risk</SectionTitle>

        {s.ror > 10 && (
          <div className="mb-2 rounded-xl border border-rose-500/40 bg-rose-600/15 px-4 py-3 text-sm text-rose-200">
            ⚠️ <span className="font-semibold">Under-rolled.</span> Your current bankroll may be too thin for these
            stakes (Risk of Ruin {formatPercent(s.ror)}). Consider dropping down or rebuilding.
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
            valueClass="text-white/85 text-base"
          />
          <MetricCard
            label="Hourly Range 95%"
            tooltip="Where ~19 of every 20 hours should land: hourly ± 2 standard deviations."
            value={range(s.range95[0], s.range95[1])}
            valueClass="text-white/85 text-base"
          />
          <div className={`rounded-xl border px-3 py-2.5 ${ror.bg}`}>
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-white/45">
              <Tooltip text="Probability of losing your whole bankroll at these stakes, given your win rate and variance.">
                Risk of Ruin
              </Tooltip>
            </div>
            <div className={`font-mono text-lg font-semibold tabular-nums ${ror.text}`}>
              {formatPercent(s.ror)}
            </div>
            <div className={`mt-0.5 text-[11px] ${ror.text}`}>{ror.label}</div>
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
            valueClass={s.bankrollInBuyins >= 20 ? 'text-emerald-400' : s.bankrollInBuyins >= 10 ? 'text-amber-400' : 'text-rose-400'}
          />
          <MetricCard
            label="Max Drawdown"
            tooltip="Largest peak-to-trough drop recorded across your session history."
            value={formatMoney(s.drawdown, c)}
            valueClass="text-rose-400"
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
        <div className="mb-3 flex flex-wrap gap-1 rounded-lg bg-ink-900 p-1">
          {BREAKDOWN_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setBreakdown(t.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                breakdown === t.id ? 'bg-felt-500 text-white' : 'text-white/55 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-white/10 bg-ink-850 p-3">{breakdownContent}</div>
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
            ? 'rgba(255,255,255,0.04)'
            : r.profit >= 0
              ? `rgba(16,185,129,${0.12 + intensity * 0.5})`
              : `rgba(244,63,94,${0.12 + intensity * 0.5})`;
        return (
          <div key={r.key} className="rounded-lg border border-white/10 p-2 text-center" style={{ background: bg }}>
            <div className="text-[11px] font-medium text-white/70">{r.key}</div>
            <div className={`font-mono text-xs font-semibold tabular-nums ${pnlColor(r.profit)}`}>
              {r.sessions ? formatMoney(r.profit, currency, { sign: true, decimals: 0 }) : '—'}
            </div>
            <div className="text-[10px] text-white/40">{r.sessions} s</div>
          </div>
        );
      })}
    </div>
  );
}
