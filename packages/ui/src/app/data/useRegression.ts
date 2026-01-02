import { useEffect, useMemo, useState } from 'react';
import type { TestRun } from '@orbisreport/core';
import { getRuns, getRun } from '../api/client';
import { computeRegressions, type RegressionResult } from '../../common/regression/regression';
import type { TrustAssessment } from '../../common/trust/trustScore';

type RegressionState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: RegressionResult };

export function useRegression(
  runId: string | undefined,
  currentRun: TestRun | null,
  trustByTestId: Record<string, TrustAssessment> | undefined
): RegressionState {
  const [state, setState] = useState<RegressionState>({ status: 'loading' });

  useEffect(() => {
    if (!runId || !currentRun || !trustByTestId) {
      setState({ status: 'loading' });
      return;
    }
    let cancelled = false;

    async function load() {
      try {
        const runsMeta = await getRuns();
        const previousMeta = findPreviousRun(runsMeta.runs, runId);
        const previous = previousMeta ? await getRun(previousMeta.runId) : undefined;
        if (cancelled) return;
        const data = computeRegressions(currentRun, previous, trustByTestId);
        setState({ status: 'ready', data });
      } catch (err) {
        if (cancelled) return;
        setState({ status: 'error', error: err instanceof Error ? err.message : 'Failed to load regressions' });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [runId, currentRun, trustByTestId]);

  return useMemo(() => state, [state]);
}

function findPreviousRun(
  runs: Array<{ runId: string; startTime?: number; createdAt?: number }>,
  currentRunId: string
) {
  const sorted = [...runs].sort(
    (a, b) => (b.startTime ?? b.createdAt ?? 0) - (a.startTime ?? a.createdAt ?? 0)
  );
  const idx = sorted.findIndex(r => r.runId === currentRunId);
  if (idx === -1 || idx === sorted.length - 1) return undefined;
  return sorted[idx + 1];
}

