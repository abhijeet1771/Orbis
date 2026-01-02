import type { TestRun, TestCaseResult } from '@orbisreport/core';
import type { GovernanceAssessment } from '../governance/governance';
import type { TrustAssessment } from '../trust/trustScore';
import type { RegressionEntry } from '../regression/regression';
import type { OwnershipInfo } from '../ownership/ownership';

export interface DecisionTrace {
  decision: 'GO' | 'GO WITH RISK' | 'NO-GO';
  confidence: number;
  runId: string;
  branch?: string;
  commit?: string;
  timestamp: number;
  summary: {
    blocking: number;
    risk: number;
    info: number;
    failedHighTrust: number;
    regressions: number;
    flakyCritical: number;
  };
  factors: Array<{
    kind: 'blocking' | 'risk' | 'info';
    label: string;
    explanation: string;
    owners: string[];
    count: number;
    link: string;
  }>;
}

export function buildDecisionTrace(params: {
  run: TestRun;
  governance: GovernanceAssessment;
  trust?: Record<string, TrustAssessment>;
  regressions?: Record<string, RegressionEntry>;
  ownership?: Record<string, OwnershipInfo>;
  confidence: number;
  decisionLabel: 'GO' | 'GO WITH RISK' | 'NO-GO';
}): DecisionTrace {
  const { run, governance, trust, regressions, ownership, confidence, decisionLabel } = params;
  const tests = run.projects.flatMap(p => p.tests);
  const failedHighTrust = tests.filter(
    t => (t.status === 'failed' || t.status === 'timedOut') && (trust?.[t.testId]?.score ?? 0) >= 85
  ).length;
  const regressionCount = Object.values(regressions ?? {}).length;
  const flakyCritical = tests.filter(
    t => t.status === 'flaky' && (ownership?.[t.testId]?.severity === 'critical')
  ).length;

  const factorEntries: Array<{
    kind: 'blocking' | 'risk' | 'info';
    label: string;
    tests: TestCaseResult[];
  }> = [
    { kind: 'blocking', label: 'Blocking signals', tests: filterBy(governance.blocking, tests) },
    { kind: 'risk', label: 'Risk signals', tests: filterBy(governance.risk, tests) },
    { kind: 'info', label: 'Informational signals', tests: filterBy(governance.info, tests) }
  ];

  const factors = factorEntries
    .filter(f => f.tests.length > 0)
    .map(f => {
      const owners = new Set<string>();
      f.tests.forEach(t => {
        const o = ownership?.[t.testId];
        if (o?.ownerTeam) owners.add(o.ownerTeam);
      });
      const explanation =
        f.kind === 'blocking'
          ? 'High-severity, high-trust failures reduced release confidence.'
          : f.kind === 'risk'
            ? 'Flaky in critical areas or regressions on trusted tests lowered confidence.'
            : 'New/low-trust or long-running tests were noted for visibility.';
      return {
        kind: f.kind,
        label: f.label,
        explanation,
        owners: Array.from(owners),
        count: f.tests.length,
        link: f.kind === 'blocking' ? `/runs/${run.runId}/index` : `/runs/${run.runId}/index`
      };
    });

  return {
    decision: decisionLabel,
    confidence,
    runId: run.runId,
    branch: run.environment.git?.branch,
    commit: run.environment.git?.commit,
    timestamp: run.endTime ?? run.startTime ?? Date.now(),
    summary: {
      blocking: governance.blocking.length,
      risk: governance.risk.length,
      info: governance.info.length,
      failedHighTrust,
      regressions: regressionCount,
      flakyCritical
    },
    factors
  };
}

function filterBy(ids: string[], tests: TestCaseResult[]): TestCaseResult[] {
  const map = new Map<string, TestCaseResult>();
  tests.forEach(t => map.set(t.testId, t));
  return ids.map(id => map.get(id)).filter(Boolean) as TestCaseResult[];
}

