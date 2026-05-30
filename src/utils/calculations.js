// Pure math functions for poker accounting. No React, no app state — easy to test.

export function sessionProfit(session) {
  return (Number(session.cashOut) || 0) - (Number(session.buyIn) || 0);
}

export function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

export function mean(arr) {
  if (!arr.length) return 0;
  return sum(arr) / arr.length;
}

// Sample standard deviation (n - 1). Returns 0 for fewer than 2 values.
export function stdDev(arr) {
  const n = arr.length;
  if (n < 2) return 0;
  const m = mean(arr);
  const variance = sum(arr.map((x) => (x - m) ** 2)) / (n - 1);
  return Math.sqrt(variance);
}

// Per-session $/hr results, skipping sessions with no hours.
export function sessionRates(sessions) {
  return sessions
    .filter((s) => Number(s.hoursPlayed) > 0)
    .map((s) => sessionProfit(s) / Number(s.hoursPlayed));
}

// Average big blind across cash sessions that carry one. Falls back to provided default.
export function avgBigBlind(sessions, fallback = 1) {
  const bbs = sessions.map((s) => Number(s.bigBlind)).filter((b) => b > 0);
  return bbs.length ? mean(bbs) : fallback;
}

export function avgBuyIn(sessions) {
  const buys = sessions.map((s) => Number(s.buyIn)).filter((b) => b > 0);
  return buys.length ? mean(buys) : 0;
}

// BB/100: (total profit in BB / total hands) * 100. Needs hands logged.
export function bbPer100(totalProfit, totalHands, bb) {
  if (!totalHands || !bb) return null;
  const profitInBB = totalProfit / bb;
  return (profitInBB / totalHands) * 100;
}

// Standard deviation of per-hand-block results, expressed in BB/100.
// We approximate from per-session BB/100 results when hands are present.
export function bb100Series(sessions, bb) {
  if (!bb) return [];
  return sessions
    .filter((s) => Number(s.handsPlayed) > 0)
    .map((s) => {
      const profitInBB = sessionProfit(s) / bb;
      return (profitInBB / Number(s.handsPlayed)) * 100;
    });
}

// Risk of Ruin (Malmuth/Sileo style):
//   ror = exp(-2 * (wr / sd)^2 * N)
// wr and sd in the SAME units; N = bankroll expressed in buy-ins.
// Returns a probability in [0, 1]. If wr <= 0, ruin is effectively certain.
export function riskOfRuin(wr, sd, bankrollInBuyins) {
  if (!sd || sd <= 0) return wr > 0 ? 0 : 1;
  if (wr <= 0) return 1;
  if (bankrollInBuyins <= 0) return 1;
  const exponent = -2 * (wr / sd) ** 2 * bankrollInBuyins;
  return Math.min(1, Math.max(0, Math.exp(exponent)));
}

// Bankroll (in buy-ins) required to hit a target risk of ruin.
//   N = -ln(targetRoR) / (2 * (wr/sd)^2)
// targetRoR is a probability in (0, 1). Returns Infinity when wr <= 0.
export function recommendedBuyins(wr, sd, targetRoR) {
  if (wr <= 0 || !sd || sd <= 0) return Infinity;
  if (targetRoR <= 0 || targetRoR >= 1) return Infinity;
  return -Math.log(targetRoR) / (2 * (wr / sd) ** 2);
}

// Largest peak-to-trough drop across a cumulative-profit series.
// Input is the ordered list of per-session profits.
export function maxDrawdown(profits) {
  let peak = 0;
  let cum = 0;
  let maxDD = 0;
  for (const p of profits) {
    cum += p;
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

// Cumulative running total of a series.
export function cumulative(values) {
  let acc = 0;
  return values.map((v) => (acc += v));
}

// Box–Muller standard normal sample.
export function randNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Monte Carlo: simulate `paths` cumulative bankroll trajectories over `n` sessions,
// each session result ~ Normal(mean, sd). Returns array of paths, each length n+1
// (index 0 = starting bankroll).
export function simulatePaths({ paths = 10, n = 100, mean: mu = 0, sd = 0, start = 0 }) {
  const out = [];
  for (let p = 0; p < paths; p++) {
    const path = [start];
    let bankroll = start;
    for (let i = 0; i < n; i++) {
      bankroll += mu + sd * randNormal();
      path.push(bankroll);
    }
    out.push(path);
  }
  return out;
}

// Summary stats over many simulated endpoints for probability estimates.
export function simulateOutcomes({ trials = 1000, n = 100, mean: mu = 0, sd = 0, start = 0 }) {
  const endpoints = [];
  let drawdownSum = 0;
  for (let t = 0; t < trials; t++) {
    let bankroll = start;
    let peak = start;
    let maxDD = 0;
    for (let i = 0; i < n; i++) {
      bankroll += mu + sd * randNormal();
      if (bankroll > peak) peak = bankroll;
      const dd = peak - bankroll;
      if (dd > maxDD) maxDD = dd;
    }
    endpoints.push(bankroll - start);
    drawdownSum += maxDD;
  }
  endpoints.sort((a, b) => a - b);
  const pct = (q) => endpoints[Math.min(endpoints.length - 1, Math.floor(q * endpoints.length))];
  const upCount = endpoints.filter((e) => e > 0).length;
  return {
    best: endpoints[endpoints.length - 1],
    worst: endpoints[0],
    median: pct(0.5),
    p05: pct(0.05),
    p95: pct(0.95),
    probUp: (upCount / trials) * 100,
    probDown: ((trials - upCount) / trials) * 100,
    expectedMaxDrawdown: drawdownSum / trials,
  };
}

// Rolling average of the last `window` values, aligned to each index.
export function rollingAverage(values, window) {
  const out = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    out.push(mean(slice));
  }
  return out;
}

export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}
