import type { TestRun } from '@orbisreport/core';
import type { RegressionResult } from '../regression/regression';
import type { TrustAssessment } from '../trust/trustScore';

export interface ReadinessResult {
  score: number;
  band: 'ready' | 'caution' | 'no-go';
  label: 'GO' | 'GO WITH RISK' | 'NO-GO';
  rationale: string;
}

export function computeReleaseReadiness(
  current: TestRun,
  previous: TestRun | undefined,
  regressions: RegressionResult | undefined,
  trustByTestId: Record<string, TrustAssessment> | undefined
): ReadinessResult {
  const total = current.summary.total || 0;
  const passRate = total ? current.summary.passed / total : 0;
  const flakyRate = total ? current.summary.flaky / total : 0;

  const regEntries = regressions ? Object.values(regressions.byTestId) : [];
  const criticalRegs = regEntries.filter(r => r.severity === 'critical').length;
  const moderateRegs = regEntries.filter(r => r.severity === 'moderate').length;
  const perfRegs = regEntries.filter(r => r.label === 'performance-regression').length;

  const failedHighTrust = countHighTrustFailures(current, trustByTestId);

  let score = 100;
  score -= criticalRegs * 12;
  score -= moderateRegs * 7;
  score -= Math.min(perfRegs * 4, 12);
  score -= failedHighTrust * 8;
  score -= (1 - passRate) * 45;
  score -= flakyRate * 35;

  const prevPassRate = previous && previous.summary.total ? previous.summary.passed / previous.summary.total : undefined;
  if (prevPassRate !== undefined) {
    const delta = (passRate - prevPassRate) * 100;
    if (delta < -10) score -= 12;
    else if (delta < -5) score -= 6;
    else if (delta > 5) score += 4;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let band: ReadinessResult['band'] = 'no-go';
  let label: ReadinessResult['label'] = 'NO-GO';
  if (score >= 80) {
    band = 'ready';
    label = 'GO';
  } else if (score >= 60) {
    band = 'caution';
    label = 'GO WITH RISK';
  }

  const rationale = buildRationale({
    score,
    passRate,
    flakyRate,
    criticalRegs,
    moderateRegs,
    perfRegs,
    failedHighTrust
  });

  return { score, band, label, rationale };
}

function countHighTrustFailures(current: TestRun, trustByTestId?: Record<string, TrustAssessment>): number {
  if (!trustByTestId) return 0;
  let count = 0;
  current.projects.forEach(p => {
    p.tests.forEach(t => {
      if ((t.status === 'failed' || t.status === 'timedOut') && trustByTestId[t.testId]?.score >= 85) {
        count += 1;
      }
    });
  });
  return count;
}

function buildRationale(params: {
  score: number;
  passRate: number;
  flakyRate: number;
  criticalRegs: number;
  moderateRegs: number;
  perfRegs: number;
  failedHighTrust: number;
}): string {
  const bits: string[] = [];
  if (params.criticalRegs > 0) bits.push(`${params.criticalRegs} critical regressions`);
  if (params.failedHighTrust > 0) bits.push(`${params.failedHighTrust} failures on high-trust tests`);
  if (params.moderateRegs > 0) bits.push(`${params.moderateRegs} moderate regressions`);
  if (params.perfRegs > 0) bits.push(`performance regressions detected`);
  if (params.flakyRate > 0.05) bits.push(`flaky concentration ${(params.flakyRate * 100).toFixed(0)}%`);
  if (bits.length === 0) bits.push(`Pass rate ${(params.passRate * 100).toFixed(0)}% with no critical regressions`);
  return bits.join(' · ');
}

