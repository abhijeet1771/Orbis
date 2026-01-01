import { useEffect, useState } from 'react';
import type { TestRun } from '@orbisreport/core';
import { useDataContext } from './DataContext';
import { StaticDataAdapter } from './adapters';

interface RunState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  run: TestRun | null;
  error?: string;
  isLive: boolean;
}

export function useRunData(runId: string | undefined): RunState {
  const { adapter, mode, setActiveRunId } = useDataContext();
  const [state, setState] = useState<RunState>({ status: 'idle', run: null, isLive: mode === 'live' });

  useEffect(() => {
    setActiveRunId(runId ?? '');
  }, [runId, setActiveRunId]);

  useEffect(() => {
    if (!runId) return;
    setState({ status: 'loading', run: null, isLive: mode === 'live' });

    let cancelled = false;
    const unsubscribe = adapter.subscribe(() => {
      if (cancelled) return;
      setState({
        status: adapter.getRun() ? 'ready' : 'loading',
        run: adapter.getRun(),
        isLive: mode === 'live'
      });
    });

    if (mode === 'static' && adapter instanceof StaticDataAdapter) {
      adapter
        .load(runId)
        .catch(err => {
          if (!cancelled) setState({ status: 'error', run: null, error: err.message, isLive: false });
        });
    }

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [adapter, mode, runId]);

  return state;
}

