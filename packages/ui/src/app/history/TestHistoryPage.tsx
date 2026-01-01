import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { TestRun, TestCaseResult, TestStatus } from '@orbisreport/core';
import { getRuns, getRun, RunSummaryItem } from '../api/client';
import { useDataContext } from '../data/DataContext';
import { formatDateTime, formatDuration } from '../util/format';
import './history.css';

interface HistoryPoint {
  runId: string;
  timestamp: number;
  status: TestStatus;
  durationMs: number;
  title: string;
  tags: string[];
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; points: HistoryPoint[]; latestTitle?: string; tags: string[] };

export function TestHistoryPage(): JSX.Element {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
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
        const sorted = [...runs].sort(
          (a, b) => (a.startTime ?? a.createdAt ?? 0) - (b.startTime ?? b.createdAt ?? 0)
        );
        const points: HistoryPoint[] = [];
        let latestTitle: string | undefined;
        let tags: string[] = [];

        for (const runMeta of sorted) {
          const run = await getRun(runMeta.runId);
          const test = findTest(run, testId);
          if (test) {
            points.push({
              runId: run.runId,
              timestamp: run.startTime ?? runMeta.createdAt ?? Date.now(),
              status: test.status,
              durationMs: test.timing.durationMs ?? 0,
              title: test.title,
              tags: test.tags ?? []
            });
            latestTitle = test.title;
            tags = test.tags ?? [];
          }
        }

        if (!mounted) return;
        if (!points.length) {
          setState({ status: 'error', error: 'Test not found in any runs' });
          return;
        }
        setState({ status: 'ready', points, latestTitle, tags });
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
    return <div className="card">Loading history...</div>;
  }

  if (state.status === 'error') {
    return (
      <div className="card">
        <div>Failed to load history: {state.error}</div>
        <div style={{ marginTop: 8 }}>
          <Link to="/">Back</Link>
        </div>
      </div>
    );
  }

  const points = state.points;
  const summary = summarize(points);
  const stability = stabilityBadge(points);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="muted" style={{ marginBottom: 4 }}>
            <Link to="/">← Runs</Link>
          </div>
          <h2 style={{ margin: '0 0 4px' }}>{state.latestTitle ?? 'Unknown test'}</h2>
          <div className="muted">{testId}</div>
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {state.tags?.map(tag => (
              <span key={tag} className="badge">
                {tag}
              </span>
            ))}
            {!state.tags?.length && <span className="muted">No tags</span>}
          </div>
        </div>
        <div className={`stability stability--${stability.kind}`}>{stability.label}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Timeline points={points} onSelect={runId => navigate(`/runs/${runId}/tests/${testId}/debugger`)} />
      </div>

      <div className="grid" style={{ marginTop: 16 }}>
        <Stat label="Pass rate" value={`${summary.passRate.toFixed(0)}%`} />
        <Stat label="Failures" value={summary.failures} />
        <Stat label="Flaky" value={summary.flaky} />
        <Stat label="First failure" value={summary.firstFailure ? formatDateTime(summary.firstFailure) : '—'} />
        <Stat label="Last failure" value={summary.lastFailure ? formatDateTime(summary.lastFailure) : '—'} />
        <Stat label="Total runs" value={points.length} />
      </div>

      <div className="card" style={{ marginTop: 16, padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 160 }}>Run Date</th>
              <th style={{ width: 200 }}>Run ID</th>
              <th style={{ width: 120 }}>Status</th>
              <th style={{ width: 120 }}>Duration</th>
              <th style={{ width: 140 }}>Debugger</th>
            </tr>
          </thead>
          <tbody>
            {points
              .slice()
              .sort((a, b) => b.timestamp - a.timestamp)
              .map(point => (
                <tr key={point.runId}>
                  <td className="muted">{formatDateTime(point.timestamp)}</td>
                  <td>{point.runId}</td>
                  <td>
                    <StatusChip status={point.status} />
                  </td>
                  <td>{formatDuration(point.durationMs)}</td>
                  <td>
                    <Link to={`/runs/${point.runId}/tests/${testId}/debugger`}>Open Debugger</Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function findTest(run: TestRun, testId: string): TestCaseResult | undefined {
  for (const project of run.projects) {
    const found = project.tests.find(t => t.testId === testId);
    if (found) return found;
  }
  return undefined;
}

function summarize(points: HistoryPoint[]) {
  const total = points.length;
  const failures = points.filter(p => p.status === 'failed' || p.status === 'timedOut').length;
  const flaky = points.filter(p => p.status === 'flaky').length;
  const passRate = total === 0 ? 0 : ((total - failures - flaky) / total) * 100;
  const failureTimestamps = points
    .filter(p => p.status === 'failed' || p.status === 'timedOut' || p.status === 'flaky')
    .map(p => p.timestamp);
  return {
    passRate,
    failures,
    flaky,
    firstFailure: failureTimestamps.length ? Math.min(...failureTimestamps) : undefined,
    lastFailure: failureTimestamps.length ? Math.max(...failureTimestamps) : undefined
  };
}

function stabilityBadge(points: HistoryPoint[]) {
  const hasFlaky = points.some(p => p.status === 'flaky');
  const hasFailures = points.some(p => p.status === 'failed' || p.status === 'timedOut');
  if (!hasFlaky && !hasFailures) return { kind: 'stable', label: 'Stable' };
  if (hasFlaky && !hasFailures) return { kind: 'flaky', label: 'Flaky' };
  if (hasFailures && !hasFlaky) return { kind: 'unstable', label: 'Unstable' };
  return { kind: 'mixed', label: 'Flaky / Unstable' };
}

function Timeline({
  points,
  onSelect
}: {
  points: HistoryPoint[];
  onSelect: (runId: string) => void;
}): JSX.Element {
  if (!points.length) return <div className="card">No history data.</div>;
  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
  const minTs = sorted[0].timestamp;
  const maxTs = sorted[sorted.length - 1].timestamp || minTs + 1;
  const width = 800;
  const height = 200;

  const xFor = (ts: number) => {
    if (maxTs === minTs) return width / 2;
    return ((ts - minTs) / (maxTs - minTs)) * (width - 80) + 40;
  };

  const yFor = (status: TestStatus) => {
    switch (status) {
      case 'passed':
        return 60;
      case 'flaky':
        return 120;
      case 'failed':
      case 'timedOut':
        return 180;
      case 'skipped':
      default:
        return 140;
    }
  };

  const colorFor = (status: TestStatus) => {
    switch (status) {
      case 'passed':
        return '#66bb6a';
      case 'flaky':
        return '#ffca28';
      case 'failed':
      case 'timedOut':
        return '#ef5350';
      case 'skipped':
      default:
        return '#9aa3b5';
    }
  };

  return (
    <div className="timeline">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img">
        <line x1="0" y1="60" x2={width} y2="60" className="timeline__grid" />
        <line x1="0" y1="120" x2={width} y2="120" className="timeline__grid" />
        <line x1="0" y1="180" x2={width} y2="180" className="timeline__grid" />
        <text x="6" y="58" className="timeline__label">Passed</text>
        <text x="6" y="118" className="timeline__label">Flaky</text>
        <text x="6" y="178" className="timeline__label">Failed</text>

        {sorted.map(point => {
          const x = xFor(point.timestamp);
          const y = yFor(point.status);
          const color = colorFor(point.status);
          return (
            <g key={point.runId} className="timeline__point" onClick={() => onSelect(point.runId)}>
              <circle cx={x} cy={y} r={8} fill={color} />
              <title>
                {formatDateTime(point.timestamp)} · {point.status} · {point.runId}
              </title>
            </g>
          );
        })}
      </svg>
      <div className="timeline__legend">
        <Legend color="#66bb6a" label="Passed" />
        <Legend color="#ef5350" label="Failed/Timed Out" />
        <Legend color="#ffca28" label="Flaky" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }): JSX.Element {
  return (
    <span className="timeline__legend-item">
      <span className="timeline__legend-dot" style={{ background: color }} />
      {label}
    </span>
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

function StatusChip({ status }: { status: TestStatus }): JSX.Element {
  const color =
    status === 'passed'
      ? '#66bb6a'
      : status === 'flaky'
        ? '#ffca28'
        : status === 'failed' || status === 'timedOut'
          ? '#ef5350'
          : '#9aa3b5';
  return (
    <span className="pill" style={{ background: 'transparent', border: `1px solid ${color}`, color }}>
      {status}
    </span>
  );
}

