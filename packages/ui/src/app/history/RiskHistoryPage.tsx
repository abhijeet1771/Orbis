/**
 * Risk History Page - Phase 8.9 History as Story
 *
 * Question: "Is risk increasing or stabilizing?"
 * Visual: Minimal stacked signal timeline
 * Each point: Blocking risk, High risk, Informational
 * No numbers on chart (outside only), direction only
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getRuns } from '../api/client';
import { useDataContext } from '../data/DataContext';
import { HistoryEntryPoint } from '../../common/history/HistoryEntryPoint';
import { EmptyState } from '../../common/empty/EmptyState';
import { SkeletonBlock, SkeletonLine } from '../../common/skeleton';
import '../../common/history/history.css';
import type { RiskDataPoint } from '../../common/history/components/RiskHistory';

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; riskData: RiskDataPoint[] };

export function RiskHistoryPage(): JSX.Element {
  const { runId } = useParams<{ runId: string }>();
  const { mode } = useDataContext();
  const [state, setState] = useState<LoadState>({ status: 'idle' });

  useEffect(() => {
    if (mode === 'live') {
      setState({ status: 'error', error: 'Risk history is disabled in live mode; switch to static to view history.' });
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

        // Generate risk data from runs - this is a simplified implementation
        // In a real implementation, this would compute actual risk signals
        const riskData: RiskDataPoint[] = runs.map(run => ({
          timestamp: run.startTime ?? run.createdAt ?? Date.now(),
          blocking: Math.floor(Math.random() * 5), // Placeholder - would be computed from actual risk logic
          risk: Math.floor(Math.random() * 10),
          informational: Math.floor(Math.random() * 15)
        }));

        setState({ status: 'ready', riskData });
      } catch (err) {
        if (!mounted) return;
        setState({ status: 'error', error: err instanceof Error ? err.message : 'Failed to load risk history' });
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
          title="Risk history unavailable"
          description={state.error}
          actionLabel="Back to run"
          onAction={() => window.history.back()}
          size="md"
        />
      </div>
    );
  }

  if (state.riskData.length === 0) {
    return (
      <EmptyState
        title="No risk data yet"
        description="Risk history will build as tests execute and risk signals are computed over time."
        actionLabel="Back to run"
        onAction={() => window.history.back()}
        size="md"
      />
    );
  }

  // Use the new HistoryEntryPoint system with 'executive-overview' entry point
  return (
    <div className="risk-history-page">
      <HistoryEntryPoint
        entryPoint="executive-overview"
        context={{
          executionId: runId
        }}
        data={{
          riskData: state.riskData
        }}
        onClose={() => window.history.back()}
      />
    </div>
  );
}
