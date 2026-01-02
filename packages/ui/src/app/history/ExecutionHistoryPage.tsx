/**
 * Execution History Page - Phase 8.9 History as Story
 *
 * Question: "How did the system behave over time?"
 * Visual: Horizontal execution timeline with discrete nodes
 * Each execution = one discrete node (Passed, Failed, Risky, Skipped)
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getRuns } from '../api/client';
import { useDataContext } from '../data/DataContext';
import { HistoryEntryPoint } from '../../common/history/HistoryEntryPoint';
import { EmptyState } from '../../common/empty/EmptyState';
import { SkeletonBlock, SkeletonLine } from '../../common/skeleton';
import '../../common/history/history.css';
import type { RunSummaryItem } from '../api/client';

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; runs: RunSummaryItem[] };

export function ExecutionHistoryPage(): JSX.Element {
  const { runId } = useParams<{ runId: string }>();
  const { mode } = useDataContext();
  const [state, setState] = useState<LoadState>({ status: 'idle' });

  useEffect(() => {
    if (mode === 'live') {
      setState({ status: 'error', error: 'Execution history is disabled in live mode; switch to static to view history.' });
      return;
    }

    let mounted = true;
    setState({ status: 'loading' });

    (async () => {
      try {
        const runs = await getRuns();

        if (!mounted) return;

        if (!runs.length) {
          setState({ status: 'error', error: 'No runs found' });
          return;
        }

        setState({ status: 'ready', runs });
      } catch (err) {
        if (!mounted) return;
        setState({ status: 'error', error: err instanceof Error ? err.message : 'Failed to load execution history' });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [mode]);

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
          title="Execution history unavailable"
          description={state.error}
          actionLabel="Back to run"
          onAction={() => window.history.back()}
          size="md"
        />
      </div>
    );
  }

  if (state.runs.length === 0) {
    return (
      <EmptyState
        title="No executions yet"
        description="No execution runs have been recorded. As tests execute over time, execution history will build here."
        actionLabel="Back to runs"
        onAction={() => window.history.back()}
        size="md"
      />
    );
  }

  // Use the new HistoryEntryPoint system with 'execution-index' entry point
  return (
    <div className="execution-history-page">
      <HistoryEntryPoint
        entryPoint="execution-index"
        context={{
          executionId: runId
        }}
        data={{
          runs: state.runs
        }}
        onClose={() => window.history.back()}
      />
    </div>
  );
}
