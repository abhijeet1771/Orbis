/**
 * Test History Page - Phase 8.9 History as Story
 *
 * Question: "Can I trust this test?"
 * Visual: Single-row timeline per test (dots, not bars)
 * Only one test at a time - trust built from patterns, not counts
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getRuns, getRun } from '../api/client';
import { useDataContext } from '../data/DataContext';
import { HistoryEntryPoint } from '../../common/history/HistoryEntryPoint';
import { EmptyState } from '../../common/empty/EmptyState';
import { SkeletonBlock, SkeletonLine } from '../../common/skeleton';
import '../../common/history/history.css';
import type { TestExecution } from '../../common/history/components/TestHistory';

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; executions: TestExecution[]; testTitle: string };

export function TestHistoryPage(): JSX.Element {
  const { testId } = useParams<{ testId: string }>();
  const { mode } = useDataContext();
  const [state, setState] = useState<LoadState>({ status: 'idle' });

  useEffect(() => {
    if (mode === 'live') {
      setState({ status: 'error', error: 'History is disabled in live mode; switch to static to view history.' });
      return;
    }
    if (!testId) return;

    let mounted = true;
    setState({ status: 'loading' });

    (async () => {
      try {
        const runs = await getRuns();
        const sortedRuns = [...runs].sort(
          (a, b) => (a.startTime ?? a.createdAt ?? 0) - (b.startTime ?? b.createdAt ?? 0)
        );

        const executions: TestExecution[] = [];
        let testTitle = 'Unknown test';

        for (const runMeta of sortedRuns) {
          const run = await getRun(runMeta.runId);
          const test = findTest(run, testId);
          if (test) {
            executions.push({
              runId: run.runId,
              timestamp: run.startTime ?? runMeta.createdAt ?? Date.now(),
              status: test.status,
              duration: test.timing.durationMs ?? 0,
              failureMessage: test.failure?.message,
              retryAttempts: test.retries?.attempts?.length ?? 0
            });
            testTitle = test.title;
          }
        }

        if (!mounted) return;

        if (!executions.length) {
          setState({ status: 'error', error: 'Test not found in any runs' });
          return;
        }

        setState({ status: 'ready', executions, testTitle });
      } catch (err) {
        if (!mounted) return;
        setState({ status: 'error', error: err instanceof Error ? err.message : 'Failed to load history' });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [testId, mode]);

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="card">
        <SkeletonLine width="50%" />
        <SkeletonLine width="40%" />
        <div style={{ marginTop: 16 }}>
          <SkeletonBlock height={120} />
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="card">
        <EmptyState
          title="History unavailable"
          description={state.error}
          actionLabel="Back to runs"
          onAction={() => window.history.back()}
          size="md"
        />
      </div>
    );
  }

  if (state.executions.length === 0) {
    return (
      <EmptyState
        title="No history yet"
        description="This test hasn't appeared in prior runs. As it executes over time, its history will build here."
        actionLabel="Back to runs"
        onAction={() => window.history.back()}
        size="md"
      />
    );
  }

  // Use the new HistoryEntryPoint system with 'test-case-view' entry point
  return (
    <div className="test-history-page">
      <HistoryEntryPoint
        entryPoint="test-case-view"
        context={{
          testId,
          testTitle: state.testTitle
        }}
        data={{
          testExecutions: state.executions
        }}
        onClose={() => window.history.back()}
      />
    </div>
  );
}

function findTest(run: any, testId: string): any {
  for (const project of run.projects) {
    const found = project.tests.find((t: any) => t.testId === testId);
    if (found) return found;
  }
  return undefined;
}

