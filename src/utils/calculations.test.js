import { describe, it, expect } from 'vitest';
import {
  sessionProfit,
  mean,
  stdDev,
  riskOfRuin,
  recommendedBuyins,
  maxDrawdown,
  cumulative,
  bbPer100,
} from './calculations.js';

describe('sessionProfit', () => {
  it('is cashOut minus buyIn', () => {
    expect(sessionProfit({ buyIn: 500, cashOut: 800 })).toBe(300);
    expect(sessionProfit({ buyIn: 500, cashOut: 200 })).toBe(-300);
  });
});

describe('mean & stdDev', () => {
  it('computes mean', () => {
    expect(mean([2, 4, 6])).toBe(4);
  });
  it('uses sample (n-1) std dev', () => {
    // values 2,4,6 -> variance = (4+0+4)/2 = 4 -> sd = 2
    expect(stdDev([2, 4, 6])).toBeCloseTo(2, 6);
  });
  it('returns 0 for <2 values', () => {
    expect(stdDev([5])).toBe(0);
  });
});

describe('riskOfRuin', () => {
  it('is exp(-2 (wr/sd)^2 N)', () => {
    const ror = riskOfRuin(2, 4, 10); // exp(-2 * 0.25 * 10) = exp(-5)
    expect(ror).toBeCloseTo(Math.exp(-5), 6);
  });
  it('is 1 when win rate <= 0', () => {
    expect(riskOfRuin(-1, 4, 10)).toBe(1);
    expect(riskOfRuin(0, 4, 10)).toBe(1);
  });
  it('is bounded to [0,1]', () => {
    expect(riskOfRuin(100, 1, 100)).toBeGreaterThanOrEqual(0);
    expect(riskOfRuin(100, 1, 100)).toBeLessThanOrEqual(1);
  });
});

describe('recommendedBuyins', () => {
  it('inverts the RoR formula', () => {
    const wr = 2;
    const sd = 4;
    const target = 0.05;
    const N = recommendedBuyins(wr, sd, target);
    // plugging back in should reproduce the target
    expect(riskOfRuin(wr, sd, N)).toBeCloseTo(target, 6);
  });
  it('is Infinity for non-positive win rate', () => {
    expect(recommendedBuyins(0, 4, 0.05)).toBe(Infinity);
  });
});

describe('maxDrawdown', () => {
  it('finds largest peak-to-trough', () => {
    // cumulative: 100, 50, 150, 30 -> peak 150, trough 30 -> dd 120
    expect(maxDrawdown([100, -50, 100, -120])).toBe(120);
  });
  it('is 0 for monotonic up', () => {
    expect(maxDrawdown([10, 20, 30])).toBe(0);
  });
});

describe('cumulative', () => {
  it('runs a running total', () => {
    expect(cumulative([1, 2, 3])).toEqual([1, 3, 6]);
  });
});

describe('bbPer100', () => {
  it('returns null without hands or bb', () => {
    expect(bbPer100(100, 0, 2)).toBeNull();
    expect(bbPer100(100, 1000, 0)).toBeNull();
  });
  it('computes (profitInBB / hands) * 100', () => {
    // profit 200 / bb 2 = 100 BB over 1000 hands -> 10 BB/100
    expect(bbPer100(200, 1000, 2)).toBeCloseTo(10, 6);
  });
});
