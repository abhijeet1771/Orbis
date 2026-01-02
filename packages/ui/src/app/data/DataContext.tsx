import { createContext, useContext, useMemo, useState } from 'react';
import type { TestRun } from '@orbisreport/core';
import { LiveDataAdapter, RunDataAdapter, StaticDataAdapter } from './adapters';

type Mode = 'static' | 'live';

interface DataContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
  adapter: RunDataAdapter;
  setActiveRunId: (runId: string) => void;
  workspaceName?: string;
  setWorkspaceName: (name?: string) => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [mode, setMode] = useState<Mode>('static');
  const [runId, setRunId] = useState<string | undefined>(undefined);
  const [workspaceName, setWorkspaceName] = useState<string | undefined>(undefined);

  const adapter = useMemo<RunDataAdapter>(() => {
    if (mode === 'live') {
      const live = new LiveDataAdapter();
      live.connect();
      return live;
    }
    const stat = new StaticDataAdapter(runId);
    stat.connect();
    if (runId) {
      void stat.load(runId);
    }
    return stat;
  }, [mode, runId]);

  const value: DataContextValue = {
    mode,
    setMode,
    adapter,
    setActiveRunId: setRunId,
    workspaceName,
    setWorkspaceName
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataContext(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('DataContext not available');
  }
  return ctx;
}

