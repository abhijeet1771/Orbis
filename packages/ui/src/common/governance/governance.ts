import type { TestCaseResult } from '@orbisreport/core';
import type { TrustAssessment } from '../trust/trustScore';
import type { RegressionEntry } from '../regression/regression';
import type { OwnershipInfo } from '../ownership/ownership';

export type GovernanceSignal = 'blocking' | 'risk' | 'info';

export interface GovernanceAssessment {
  perTest: Record<string, GovernanceSignal | undefined>;
  blocking: string[];
  risk: string[];
  info: string[];
}

export function computeGovernanceSignals(options: {
  tests: TestCaseResult[];
  trust?: Record<string, TrustAssessment>;
  regressions?: Record<string, RegressionEntry>;
  ownership?: Record<string, OwnershipInfo>;
}): GovernanceAssessment {
  const { tests, trust, regressions, ownership } = options;
  const durations = tests.map(t => t.timing.durationMs ?? 0).filter(Boolean).sort((a, b) => a - b);
  const p75 = percentile(durations, 0.75);

  const perTest: Record<string, GovernanceSignal | undefined> = {};
  const blocking: string[] = [];
  const risk: string[] = [];
  const info: string[] = [];

  for (const t of tests) {
    const trustScore = trust?.[t.testId]?.score ?? 50;
    const own = ownership?.[t.testId];
    const reg = regressions?.[t.testId];
    const severity = own?.severity;
    const isHighTrust = trustScore >= 85;
    const longRunning = (t.timing.durationMs ?? 0) > p75 && p75 > 0;

    let signal: GovernanceSignal | undefined;

    // Blocking: failed high/critical with high trust
    if ((t.status === 'failed' || t.status === 'timedOut') && isHighTrust && (severity === 'high' || severity === 'critical')) {
      signal = 'blocking';
    }
    // Risk: flaky in critical area, or regression on high-trust test
    else if (
      t.status === 'flaky' && severity === 'critical' ||
      (reg && isHighTrust)
    ) {
      signal = 'risk';
    }
    // Informational: new/low-trust/first run indicators or long-running
    else if (trustScore < 60 || !trust?.[t.testId] || longRunning) {
      signal = 'info';
    }

    perTest[t.testId] = signal;
    if (signal === 'blocking') blocking.push(t.testId);
    else if (signal === 'risk') risk.push(t.testId);
    else if (signal === 'info') info.push(t.testId);
  }

  return { perTest, blocking, risk, info };
}

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const idx = Math.floor((arr.length - 1) * p);
  return arr[idx];
}

