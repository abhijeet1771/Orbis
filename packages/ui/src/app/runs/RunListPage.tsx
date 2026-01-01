import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRuns, RunSummaryItem } from '../api/client';
import { formatDateTime, formatSummary } from '../util/format';
import { useDataContext } from '../data/DataContext';

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; runs: RunSummaryItem[] };

export function RunListPage(): JSX.Element {
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const { mode, setMode } = useDataContext();

  useEffect(() => {
    let mounted = true;
    setState({ status: 'loading' });
    getRuns()
      .then(runs => {
        if (!mounted) return;
        const sorted = [...runs].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        setState({ status: 'ready', runs: sorted });
      })
      .catch(err => {
        if (!mounted) return;
        setState({ status: 'error', error: err.message });
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (state.status === 'loading' || state.status === 'idle') {
    return <div className="card">Loading runs...</div>;
  }

  if (state.status === 'error') {
    return <div className="card">Failed to load runs: {state.error}</div>;
  }

  if (state.runs.length === 0) {
    return <div className="card">No runs found. Execute tests to generate reports.</div>;
  }

  return (
    <div className="run-list">
      <div className="card" style={{ marginBottom: 12 }}>
        <div>Mode: {mode.toUpperCase()}</div>
        <button className="mode-toggle" onClick={() => setMode(mode === 'live' ? 'static' : 'live')}>
          Switch to {mode === 'live' ? 'Static' : 'Live'}
        </button>
      </div>
      {state.runs.map(run => (
        <Link key={run.runId} to={`/runs/${run.runId}`} className="run-list__item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{run.runId}</div>
              <div className="run-list__meta">
                <span className="badge">
                  {run.branch ? `${run.branch}@${(run.commit ?? '').slice(0, 7)}` : 'unknown'}
                </span>
                <span>{formatDateTime(run.startTime ?? run.createdAt)}</span>
                <span className="badge">schema {run.schemaVersion}</span>
              </div>
            </div>
            <div>{formatSummary(run.summary)}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

