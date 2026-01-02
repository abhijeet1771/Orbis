import type { TestStatus } from '@orbisreport/core';

export type TrustLabel = 'Highly Reliable' | 'Mostly Stable' | 'Flaky' | 'Unreliable';

export interface TrustFactors {
  passRate: number;
  failRate: number;
  flakyRate: number;
  passStreak: number;
  failStreak: number;
  lastFailureAgeMs?: number;
  durationMedianMs?: number;
  durationP95Ms?: number;
}

export interface TrustAssessment {
  score: number;
  label: TrustLabel;
  factors: TrustFactors;
}

export interface HistoryPoint {
  status: TestStatus | 'timedOut';
  durationMs?: number;
  timestamp: number;
}

export function computeTrust(points: HistoryPoint[]): TrustAssessment {
  if (!points.length) {
    return {
      score: 50,
      label: 'Mostly Stable',
      factors: {
        passRate: 0,
        failRate: 0,
        flakyRate: 0,
        passStreak: 0,
        failStreak: 0
      }
    };
  }

  const total = points.length;
  const passCount = points.filter(p => p.status === 'passed').length;
  const failCount = points.filter(p => p.status === 'failed' || p.status === 'timedOut').length;
  const flakyCount = points.filter(p => p.status === 'flaky').length;
  const passRate = passCount / total;
  const failRate = failCount / total;
  const flakyRate = flakyCount / total;

  // streaks from latest backwards
  let passStreak = 0;
  let failStreak = 0;
  for (const p of [...points].reverse()) {
    if (p.status === 'passed') {
      if (failStreak === 0) passStreak += 1;
      else break;
    } else if (p.status === 'failed' || p.status === 'timedOut') {
      if (passStreak === 0) failStreak += 1;
      else break;
    } else if (p.status === 'flaky') {
      break;
    }
  }

  const lastFailure = [...points]
    .reverse()
    .find(p => p.status === 'failed' || p.status === 'timedOut' || p.status === 'flaky');
  const lastFailureAgeMs = lastFailure ? Date.now() - lastFailure.timestamp : undefined;

  const durations = points.map(p => p.durationMs).filter((d): d is number => typeof d === 'number');
  const durationMedianMs = durations.length ? median(durations) : undefined;
  const durationP95Ms = durations.length ? percentile(durations, 0.95) : undefined;
  const durationRatio =
    durationMedianMs && durationP95Ms && durationMedianMs > 0 ? durationP95Ms / durationMedianMs : 1;

  // scoring
  let score = 100;
  score -= failRate * 50;
  score -= flakyRate * 40;
  score -= (1 - passRate) * 10;

  if (lastFailureAgeMs !== undefined) {
    if (lastFailureAgeMs < 24 * 3600 * 1000) score -= 25;
    else if (lastFailureAgeMs < 7 * 24 * 3600 * 1000) score -= 15;
    else score -= 5;
  }

  if (durationRatio > 2) score -= 18;
  else if (durationRatio > 1.6) score -= 10;

  score += Math.min(passStreak * 2, 15);
  score -= Math.min(failStreak * 3, 20);

  score = Math.max(0, Math.min(100, Math.round(score)));

  const label: TrustLabel =
    score >= 85 ? 'Highly Reliable' : score >= 70 ? 'Mostly Stable' : score >= 50 ? 'Flaky' : 'Unreliable';

  return {
    score,
    label,
    factors: {
      passRate,
      failRate,
      flakyRate,
      passStreak,
      failStreak,
      lastFailureAgeMs,
      durationMedianMs,
      durationP95Ms
    }
  };
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[idx];
}

