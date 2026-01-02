import type { TestRun, TestCaseResult, TestStatus } from '@orbisreport/core';
import type { TrustAssessment } from '../trust/trustScore';

export type RegressionLabel = 'new-failure' | 'new-flaky' | 'recovered' | 'performance-regression';
export type RegressionSeverity = 'critical' | 'moderate' | 'minor' | 'info';

export interface RegressionEntry {
  testId: string;
  title: string;
  label: RegressionLabel;
  severity: RegressionSeverity;
  currentStatus: TestStatus;
  previousStatus?: TestStatus;
  currentDurationMs?: number;
  previousDurationMs?: number;
  trustScore?: number;
  trustLabel?: string;
  filePath?: string;
  tags: string[];
}

export interface RegressionResult {
  byTestId: Record<string, RegressionEntry>;
  summary: {
    newFailures: RegressionEntry[];
    newFlakies: RegressionEntry[];
    perf: RegressionEntry[];
    recovered: RegressionEntry[];
  };
  hotspots: {
    folders: Array<{ id: string; impact: number; count: number }>;
    tags: Array<{ tag: string; impact: number; count: number }>;
  };
}

export function computeRegressions(
  current: TestRun,
  previous: TestRun | undefined,
  trust?: Record<string, TrustAssessment>
): RegressionResult {
  const byTestId: Record<string, RegressionEntry> = {};
  if (!previous) {
    return {
      byTestId,
      summary: { newFailures: [], newFlakies: [], perf: [], recovered: [] },
      hotspots: { folders: [], tags: [] }
    };
  }

  const prevMap = flattenTests(previous);
  const currentMap = flattenTests(current);

  Object.values(currentMap).forEach(test => {
    const prev = prevMap[test.testId];
    if (!prev) return;

    const trustEntry = trust?.[test.testId];
    const trustScore = trustEntry?.score;
    const trustLabel = trustEntry?.label;

    // New failure
    if (isFailure(test.status) && prev && wasPassing(prev.status)) {
      const severity: RegressionSeverity = trustScore !== undefined && trustScore >= 85 ? 'critical' : 'moderate';
      const entry: RegressionEntry = {
        testId: test.testId,
        title: test.title,
        label: 'new-failure',
        severity,
        currentStatus: test.status,
        previousStatus: prev.status,
        currentDurationMs: test.durationMs,
        previousDurationMs: prev.durationMs,
        trustScore,
        trustLabel,
        filePath: test.filePath,
        tags: test.tags
      };
      byTestId[test.testId] = entry;
      return;
    }

    // New flaky
    if (test.status === 'flaky' && prev && wasPassing(prev.status)) {
      const severity: RegressionSeverity = 'moderate';
      byTestId[test.testId] = {
        testId: test.testId,
        title: test.title,
        label: 'new-flaky',
        severity,
        currentStatus: test.status,
        previousStatus: prev.status,
        currentDurationMs: test.durationMs,
        previousDurationMs: prev.durationMs,
        trustScore,
        trustLabel,
        filePath: test.filePath,
        tags: test.tags
      };
      return;
    }

    // Performance regression
    if (isPerfRegression(prev.durationMs, test.durationMs)) {
      byTestId[test.testId] = {
        testId: test.testId,
        title: test.title,
        label: 'performance-regression',
        severity: 'minor',
        currentStatus: test.status,
        previousStatus: prev.status,
        currentDurationMs: test.durationMs,
        previousDurationMs: prev.durationMs,
        trustScore,
        trustLabel,
        filePath: test.filePath,
        tags: test.tags
      };
      return;
    }

    // Recovered
    if (wasPassing(test.status) && prev && isFailure(prev.status)) {
      byTestId[test.testId] = {
        testId: test.testId,
        title: test.title,
        label: 'recovered',
        severity: 'info',
        currentStatus: test.status,
        previousStatus: prev.status,
        currentDurationMs: test.durationMs,
        previousDurationMs: prev.durationMs,
        trustScore,
        trustLabel,
        filePath: test.filePath,
        tags: test.tags
      };
    }
  });

  const summary = {
    newFailures: Object.values(byTestId).filter(e => e.label === 'new-failure'),
    newFlakies: Object.values(byTestId).filter(e => e.label === 'new-flaky'),
    perf: Object.values(byTestId).filter(e => e.label === 'performance-regression'),
    recovered: Object.values(byTestId).filter(e => e.label === 'recovered')
  };

  const hotspots = aggregateHotspots(Object.values(byTestId));

  return { byTestId, summary, hotspots };
}

function flattenTests(run: TestRun): Record<string, { testId: string; title: string; status: TestStatus; durationMs?: number; filePath?: string; tags: string[] }> {
  const map: Record<string, { testId: string; title: string; status: TestStatus; durationMs?: number; filePath?: string; tags: string[] }> = {};
  run.projects.forEach(project => {
    project.tests.forEach(t => {
      map[t.testId] = {
        testId: t.testId,
        title: t.title,
        status: t.status,
        durationMs: t.timing.durationMs ?? 0,
        filePath: t.location.file,
        tags: t.tags ?? []
      };
    });
  });
  return map;
}

function wasPassing(status: TestStatus): boolean {
  return status === 'passed' || status === 'skipped';
}

function isFailure(status: TestStatus): boolean {
  return status === 'failed' || status === 'timedOut';
}

function isPerfRegression(previous?: number, current?: number): boolean {
  if (previous === undefined || current === undefined) return false;
  if (previous <= 0) return false;
  const ratio = current / previous;
  const delta = current - previous;
  return ratio >= 1.5 && delta >= 200;
}

function aggregateHotspots(entries: RegressionEntry[]) {
  const folderImpact = new Map<string, { impact: number; count: number }>();
  const tagImpact = new Map<string, { impact: number; count: number }>();

  const weight = (severity: RegressionSeverity) => {
    if (severity === 'critical') return 3;
    if (severity === 'moderate') return 2;
    if (severity === 'minor') return 1;
    return 0;
  };

  entries.forEach(e => {
    const impact = weight(e.severity);
    const folder = e.filePath ? parentFolder(e.filePath) : 'root';
    const f = folderImpact.get(folder) ?? { impact: 0, count: 0 };
    folderImpact.set(folder, { impact: f.impact + impact, count: f.count + 1 });

    e.tags.forEach(tag => {
      const t = tagImpact.get(tag) ?? { impact: 0, count: 0 };
      tagImpact.set(tag, { impact: t.impact + impact, count: t.count + 1 });
    });
  });

  const folders = Array.from(folderImpact.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.impact - a.impact || b.count - a.count)
    .slice(0, 5);
  const tags = Array.from(tagImpact.entries())
    .map(([tag, v]) => ({ tag, ...v }))
    .sort((a, b) => b.impact - a.impact || b.count - a.count)
    .slice(0, 5);

  return { folders, tags };
}

function parentFolder(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/');
  if (idx === -1) return normalized;
  return normalized.slice(0, idx);
}

