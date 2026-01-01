import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { TestRun, TestCaseResult, TestStatus } from '@orbisreport/core';
import { useRunData } from '../data/useRunData';
import { useDataContext } from '../data/DataContext';
import { formatDateTime, formatDuration, formatSummary } from '../util/format';
import { StatusPill } from '../shared/StatusPill';

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; run: TestRun };

export function RunDetailPage(): JSX.Element {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const runState = useRunData(runId);
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const { mode } = useDataContext();
  const autoNavCooldownUntil = useRef<number>(0);
  const seenFailures = useRef<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestStatus | 'all'>('all');

  useEffect(() => {
    if (runState.status === 'ready' && runState.run) {
      setState({ status: 'ready', run: runState.run });
    } else if (runState.status === 'loading' || runState.status === 'idle') {
      setState({ status: 'loading' });
    } else if (runState.status === 'error') {
      setState({ status: 'error', error: runState.error });
    }
  }, [runState]);

  useEffect(() => {
    if (mode !== 'live') return;
    if (state.status !== 'ready' || !runId) return;
    const tests = state.run.projects.flatMap(p => p.tests);
    const failedNow = tests.find(t => (t.status === 'failed' || t.status === 'flaky') && !seenFailures.current.has(t.testId));
    if (failedNow && Date.now() > autoNavCooldownUntil.current) {
      seenFailures.current.add(failedNow.testId);
      navigate(`/runs/${runId}/tests/${failedNow.testId}/debugger`);
      autoNavCooldownUntil.current = Date.now() + 12000;
    }
  }, [state, mode, runId, navigate]);

  if (state.status === 'loading' || state.status === 'idle') {
    return <div className="card">Loading run...</div>;
  }

  if (state.status === 'error') {
    return (
      <div className="card">
        <div>Failed to load run: {state.error}</div>
        <div style={{ marginTop: 8 }}>
          <Link to="/">Back to runs</Link>
        </div>
      </div>
    );
  }

  const run = state.run;
  const allTests = useMemo(() => {
    return run.projects.flatMap(p => p.tests);
  }, [run]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allTests.filter(t => {
      const matchesSearch =
        !term ||
        t.title.toLowerCase().includes(term) ||
        t.testId.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' ? true : t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allTests, search, statusFilter]);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 4px' }}>{run.runId}</h2>
          <div className="muted">
            {formatDateTime(run.startTime)} · schema {run.schemaVersion}
          </div>
          <div className="muted">
            {run.environment.git?.branch ? `${run.environment.git.branch}@` : ''}
            {run.environment.git?.commit?.slice(0, 7) ?? 'unknown'}
          </div>
            {mode === 'live' && (
              <div className="muted">LIVE mode · {state.run.endTime ? 'Completed' : 'Running'}</div>
            )}
            <div className="muted">
              <Link to={`/runs/${run.runId}`}>Executive overview</Link> ·{' '}
              <Link to={`/runs/${run.runId}/explorer`}>Suite explorer</Link> ·{' '}
              <Link to={`/runs/${run.runId}/artifacts`}>Artifacts</Link>
            </div>
        </div>
        <div>{formatSummary(run.summary)}</div>
      </div>

      <div className="grid" style={{ marginTop: 16 }}>
        <Stat label="Total" value={run.summary.total} />
        <Stat label="Passed" value={run.summary.passed} />
        <Stat label="Failed" value={run.summary.failed} />
        <Stat label="Skipped" value={run.summary.skipped} />
        <Stat label="Flaky" value={run.summary.flaky} />
        <Stat label="Timed Out" value={run.summary.timedOut} />
        <Stat label="Duration" value={formatDuration(run.summary.durationMs ?? 0)} />
      </div>

      <div className="controls" style={{ marginTop: 16 }}>
        <input
          placeholder="Search by title or id"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as TestStatus | 'all')}
        >
          <option value="all">All</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
          <option value="flaky">Flaky</option>
          <option value="timedOut">Timed Out</option>
        </select>
      </div>

      <div className="card" style={{ marginTop: 12, padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 180 }}>Test ID</th>
              <th>Title</th>
              <th style={{ width: 100 }}>Status</th>
              <th style={{ width: 120 }}>Duration</th>
              <th style={{ width: 200 }}>Tags</th>
              <th style={{ width: 120 }}>Debugger</th>
              <th style={{ width: 120 }}>History</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(test => (
              <tr key={test.testId} style={{ cursor: 'default' }}>
                <td className="muted">{test.testId.slice(0, 12)}</td>
                <td>{test.title}</td>
                <td>
                  <StatusPill status={test.status} />
                  {!test.timing.endTime && mode === 'live' && (
                    <span className="pill" style={{ marginLeft: 6 }}>RUNNING</span>
                  )}
                </td>
                <td>{formatDuration(test.timing.durationMs ?? 0)}</td>
                <td>
                  {test.tags.length ? test.tags.join(', ') : <span className="muted">—</span>}
                </td>
                <td>
                  {test.status === 'failed' || test.status === 'flaky' ? (
                    <Link to={`/runs/${run.runId}/tests/${test.testId}/debugger`}>Open</Link>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  <Link to={`/tests/${test.testId}/history`}>History</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="muted" style={{ marginTop: 8 }}>
        Showing {filtered.length} of {allTests.length} tests
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }): JSX.Element {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
    </div>
  );
}

