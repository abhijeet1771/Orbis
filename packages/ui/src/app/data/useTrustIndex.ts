import { useEffect, useMemo, useState } from 'react';
import type { TestRun } from '@orbisreport/core';
import { getRun, getRuns } from '../api/client';
import { computeTrust, type TrustAssessment, type HistoryPoint } from '../../common/trust/trustScore';

type TrustState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; trustByTestId: Record<string, TrustAssessment> };

export function useTrustIndex(activeRunId?: string): TrustState {
  const [state, setState] = useState<TrustState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const runsMeta = await getRuns();
        const runs: TestRun[] = [];
        for (const r of runsMeta.runs) {
          const full = await getRun(r.runId);
          runs.push(full);
        }
        if (cancelled) return;
        const trustByTestId: Record<string, TrustAssessment> = {};
        const historyMap: Record<string, HistoryPoint[]> = {};
        for (const run of runs) {
          const ts = run.endTime ?? run.startTime ?? Date.now();
          for (const project of run.projects) {
            for (const test of project.tests) {
              if (!historyMap[test.testId]) historyMap[test.testId] = [];
              historyMap[test.testId].push({
                status: test.status,
                durationMs: test.timing.durationMs ?? 0,
                timestamp: ts
              });
            }
          }
        }
        Object.entries(historyMap).forEach(([testId, points]) => {
          trustByTestId[testId] = computeTrust(points);
        });
        setState({ status: 'ready', trustByTestId });
      } catch (error) {
        if (cancelled) return;
        setState({ status: 'error', error });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [activeRunId]);

  return useMemo(() => state, [state]);
}

