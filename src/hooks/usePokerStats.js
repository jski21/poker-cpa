import { useMemo } from 'react';
import {
  sessionProfit,
  sum,
  mean,
  stdDev,
  sessionRates,
  avgBigBlind,
  avgBuyIn,
  bbPer100,
  bb100Series,
  riskOfRuin,
  recommendedBuyins,
  maxDrawdown,
} from '../utils/calculations.js';
import { DAY_NAMES } from '../constants.js';

function startOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Group sessions by a key function and compute per-group aggregates.
function groupBy(sessions, keyFn) {
  const map = new Map();
  for (const s of sessions) {
    const key = keyFn(s);
    if (key == null || key === '') continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  const rows = [];
  for (const [key, group] of map.entries()) {
    const profit = sum(group.map(sessionProfit));
    const hours = sum(group.map((s) => Number(s.hoursPlayed) || 0));
    rows.push({
      key,
      sessions: group.length,
      profit,
      hours,
      hourly: hours > 0 ? profit / hours : 0,
    });
  }
  return rows.sort((a, b) => b.profit - a.profit);
}

/**
 * Computes the full derived-stats object from sessions + bankroll + settings.
 * Everything the dashboard, charts, and calculators read comes from here.
 */
export function usePokerStats(sessions, bankroll, settings) {
  return useMemo(() => {
    // Always work with a chronological copy.
    const ordered = [...sessions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const n = ordered.length;

    const profits = ordered.map(sessionProfit);
    const totalProfit = sum(profits);
    const totalHours = sum(ordered.map((s) => Number(s.hoursPlayed) || 0));
    const totalHands = sum(ordered.map((s) => Number(s.handsPlayed) || 0));
    const totalBuyIns = sum(ordered.map((s) => Number(s.buyIn) || 0));

    const bb = avgBigBlind(ordered, 1);
    const avgBuy = avgBuyIn(ordered);

    // Bankroll: manual starting figure + net P&L + deposits - withdrawals.
    const deposits = sum((bankroll.deposits || []).map((t) => Number(t.amount) || 0));
    const withdrawals = sum((bankroll.withdrawals || []).map((t) => Number(t.amount) || 0));
    const currentBankroll = (Number(bankroll.current) || 0) + totalProfit + deposits - withdrawals;

    // Time-windowed P&L.
    const monthStart = startOfMonthISO();
    const thirtyAgo = daysAgoISO(30);
    const thisMonthSessions = ordered.filter((s) => s.date >= monthStart);
    const last30Sessions = ordered.filter((s) => s.date >= thirtyAgo);
    const thisMonthProfit = sum(thisMonthSessions.map(sessionProfit));
    const last30Profit = sum(last30Sessions.map(sessionProfit));
    const hoursThisMonth = sum(thisMonthSessions.map((s) => Number(s.hoursPlayed) || 0));

    // Core win-rate metrics.
    const hourlyRate = totalHours > 0 ? totalProfit / totalHours : 0;
    const roi = totalBuyIns > 0 ? (totalProfit / totalBuyIns) * 100 : 0;
    const bb100 = bbPer100(totalProfit, totalHands, bb);
    const bbPerHour = bb ? hourlyRate / bb : 0;

    const winning = profits.filter((p) => p > 0);
    const losing = profits.filter((p) => p < 0);
    const sessionsWonPct = n > 0 ? (winning.length / n) * 100 : 0;
    const avgWin = winning.length ? mean(winning) : 0;
    const avgLoss = losing.length ? Math.abs(mean(losing)) : 0;
    const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
    const biggestWin = profits.length ? Math.max(...profits, 0) : 0;
    const biggestLoss = profits.length ? Math.min(...profits, 0) : 0;

    // Variance. Prefer BB/100 units when hands are tracked, else $/hr.
    const usingBB100 = totalHands > 0 && bb > 0 && bb100Series(ordered, bb).length >= 2;
    const rates = sessionRates(ordered);
    const sdRates = stdDev(rates);
    const bb100Vals = bb100Series(ordered, bb);
    const sdBB100 = stdDev(bb100Vals);

    // Standard deviation reported to the user (with optional override).
    const sdComputed = usingBB100 ? sdBB100 : sdRates;
    const sd = settings.stdDevOverride != null ? Number(settings.stdDevOverride) : sdComputed;
    const sdUnit = usingBB100 ? 'BB/100' : '$/hr';

    // Win rate in the matching unit for risk math.
    const wrForRisk = usingBB100 ? bb100 || 0 : hourlyRate;
    const sdForRisk = usingBB100 ? sdBB100 : sdRates;

    // Expected hourly ranges (always in $/hr for display).
    const range68 = [hourlyRate - sdRates, hourlyRate + sdRates];
    const range95 = [hourlyRate - 2 * sdRates, hourlyRate + 2 * sdRates];

    // Risk of ruin uses bankroll expressed in buy-ins.
    const bankrollInBuyins = avgBuy > 0 ? currentBankroll / avgBuy : 0;
    const ror = riskOfRuin(wrForRisk, sdForRisk, bankrollInBuyins) * 100;
    const targetRoRProb = (Number(settings.targetRoR) || 5) / 100;
    const recBuyins = recommendedBuyins(wrForRisk, sdForRisk, targetRoRProb);
    const recommendedBankroll = Number.isFinite(recBuyins) ? recBuyins * avgBuy : Infinity;

    const drawdown = maxDrawdown(profits);

    // Volume.
    const avgSessionLength = n > 0 ? totalHours / n : 0;

    // Breakdown tables.
    const byStakes = groupBy(ordered, (s) => s.stakes || '—');
    const byLocation = groupBy(ordered, (s) => s.location || '—');
    const byGameType = groupBy(ordered, (s) => s.gameType || '—');

    // By day of week.
    const dowMap = DAY_NAMES.map((name, i) => ({ key: name, idx: i, sessions: 0, profit: 0, hours: 0 }));
    for (const s of ordered) {
      const d = new Date(`${s.date}T00:00:00`);
      const idx = d.getDay();
      if (Number.isNaN(idx)) continue;
      dowMap[idx].sessions += 1;
      dowMap[idx].profit += sessionProfit(s);
      dowMap[idx].hours += Number(s.hoursPlayed) || 0;
    }
    const byDayOfWeek = dowMap.map((d) => ({
      ...d,
      hourly: d.hours > 0 ? d.profit / d.hours : 0,
    }));

    // Mental-game tag comparison (stretch): tilted vs focused.
    const taggedProfit = (tag) => {
      const g = ordered.filter((s) => (s.tags || []).includes(tag));
      const p = sum(g.map(sessionProfit));
      const h = sum(g.map((x) => Number(x.hoursPlayed) || 0));
      return { sessions: g.length, profit: p, hours: h, hourly: h > 0 ? p / h : 0 };
    };
    const mentalGame = {
      tilted: taggedProfit('tilted'),
      focused: taggedProfit('focused'),
      tired: taggedProfit('tired'),
    };

    // Distinct venues for the autocomplete in the log form.
    const venues = [...new Set(ordered.map((s) => s.location).filter(Boolean))];

    return {
      n,
      ordered,
      profits,
      totalProfit,
      totalHours,
      totalHands,
      totalBuyIns,
      bb,
      avgBuy,
      currentBankroll,
      startingBankroll: Number(bankroll.current) || 0,
      deposits,
      withdrawals,
      thisMonthProfit,
      last30Profit,
      thisMonthCount: thisMonthSessions.length,
      hoursThisMonth,
      hourlyRate,
      roi,
      bb100,
      bbPerHour,
      sessionsWonPct,
      winningCount: winning.length,
      losingCount: losing.length,
      avgWin,
      avgLoss,
      winLossRatio,
      biggestWin,
      biggestLoss,
      sd,
      sdUnit,
      sdComputed,
      usingBB100,
      sdRates,
      range68,
      range95,
      bankrollInBuyins,
      ror,
      recommendedBuyins: recBuyins,
      recommendedBankroll,
      drawdown,
      avgSessionLength,
      byStakes,
      byLocation,
      byGameType,
      byDayOfWeek,
      mentalGame,
      venues,
    };
  }, [sessions, bankroll, settings]);
}
