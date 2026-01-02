import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { TestRun, TestCaseResult, TestStatus } from '@orbisreport/core';
import { useRunData } from '../data/useRunData';
import { useTrustIndex } from '../data/useTrustIndex';
import { useRegression } from '../data/useRegression';
import { useDataContext } from '../data/DataContext';
import { formatDateTime, formatDuration, formatSummary } from '../util/format';
import { EmptyState } from '../../common/empty/EmptyState';
import { SkeletonTable, SkeletonBlock, SkeletonLine } from '../../common/skeleton';
import { StatusBadge } from '../../common/status/StatusBadge';
import { StatusDot } from '../../common/status/StatusDot';
import { TrustBadge } from '../../common/trust/TrustBadge';
import { RegressionBadge } from '../../common/regression/RegressionBadge';
import type { RegressionEntry } from '../../common/regression/regression';
import type { TrustAssessment } from '../../common/trust/trustScore';
import { resolveOwnership, type OwnershipInfo } from '../../common/ownership/ownership';
import { computeGovernanceSignals, type GovernanceSignal } from '../../common/governance/governance';

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; run: TestRun };

export function RunDetailPage(): JSX.Element {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const runState = useRunData(runId);
  const trustState = useTrustIndex(runId);
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const { mode } = useDataContext();
  const autoNavCooldownUntil = useRef<number>(0);
  const seenFailures = useRef<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Array<TestStatus | 'running'>>([]);
  const [tagFilter, setTagFilter] = useState('');
  const [fileFilter, setFileFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [durationMin, setDurationMin] = useState<string>('');
  const [durationMax, setDurationMax] = useState<string>('');
  const [sortBy, setSortBy] = useState<'status' | 'duration' | 'title'>('status');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    status: true,
    trust: true,
    regression: true,
    owner: false,
    severity: false,
    title: true,
    testId: true,
    duration: true,
    retries: true,
    tags: true,
    file: true
  });
  const [newFailures, setNewFailures] = useState<Set<string>>(new Set());
  const [regressionOnly, setRegressionOnly] = useState(false);

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

  const trustByTestId = trustState.status === 'ready' ? trustState.trustByTestId : undefined;
  const regressionState = useRegression(runId, runState.run, trustByTestId);
  const ownershipMap = useMemo(() => {
    if (state.status !== 'ready') return {};
    const map: Record<string, OwnershipInfo> = {};
    for (const t of state.run.projects.flatMap(p => p.tests)) {
      map[t.testId] = resolveOwnership(t);
    }
    return map;
  }, [state]);
  const governance = useMemo(
    () =>
      state.status === 'ready'
        ? computeGovernanceSignals({
            tests: state.run.projects.flatMap(p => p.tests),
            trust: trustByTestId,
            regressions: regressions,
            ownership: ownershipMap
          })
        : { perTest: {}, blocking: [], risk: [], info: [] },
    [state, trustByTestId, regressions, ownershipMap]
  );

  if (
    state.status === 'loading' ||
    state.status === 'idle' ||
    trustState.status === 'loading' ||
    regressionState.status === 'loading'
  ) {
    return (
      <div className="card">
        <SkeletonLine width="40%" />
        <SkeletonLine width="30%" />
        <div className="grid" style={{ marginTop: 16 }}>
          {[...Array(6)].map((_, idx) => (
            <SkeletonBlock key={idx} height={64} />
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <SkeletonTable rows={6} columns={[180, 260, 120, 140, 140]} />
        </div>
      </div>
    );
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
  const trustMap = trustByTestId ?? {};
  const regressions =
    regressionState.status === 'ready' ? regressionState.data.byTestId : ({} as Record<string, RegressionEntry>);
  const allTests = useMemo(() => {
    return run.projects.flatMap(p => p.tests);
  }, [run]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const tagTerm = tagFilter.trim().toLowerCase();
    const fileTerm = fileFilter.trim().toLowerCase();
    const min = durationMin ? Number(durationMin) : undefined;
    const max = durationMax ? Number(durationMax) : undefined;
    const statusSet = new Set(statusFilter);

    const matches = allTests.filter(t => {
      const matchesSearch =
        !term ||
        t.title.toLowerCase().includes(term) ||
        t.testId.toLowerCase().includes(term);
      const matchesStatus = statusSet.size === 0 ? true : statusSet.has(t.status as TestStatus | 'running');
      const matchesTags =
        !tagTerm || (t.tags ?? []).some(tag => tag.toLowerCase().includes(tagTerm));
      const matchesFile =
        !fileTerm || t.location.file.toLowerCase().includes(fileTerm);
      const duration = t.timing.durationMs ?? 0;
      const matchesDuration =
        (min === undefined || duration >= min) && (max === undefined || duration <= max);
      if (regressionOnly && !regressions[t.testId]) return false;
      const ownership = ownershipMap[t.testId];
      if (ownerFilter && ownership?.ownerTeam !== ownerFilter) return false;
      if (severityFilter && ownership?.severity !== severityFilter) return false;
      return matchesSearch && matchesStatus && matchesTags && matchesFile && matchesDuration;
    });

    const sorted = [...matches].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'status') {
        return dir * (statusPriority(b.status) - statusPriority(a.status));
      }
      if (sortBy === 'duration') {
        return dir * ((a.timing.durationMs ?? 0) - (b.timing.durationMs ?? 0));
      }
      return dir * a.title.localeCompare(b.title);
    });

    return sorted;
  }, [allTests, search, statusFilter, tagFilter, fileFilter, durationMin, durationMax, sortBy, sortDir]);

  useEffect(() => {
    if (mode !== 'live') return;
    const failingNow = new Set(
      filtered.filter(t => t.status === 'failed' || t.status === 'flaky' || t.status === 'timedOut').map(t => t.testId)
    );
    setNewFailures(prev => {
      const next = new Set(prev);
      failingNow.forEach(id => {
        if (!prev.has(id)) next.add(id);
      });
      return next;
    });
  }, [filtered, mode]);

  const noTests = allTests.length === 0;

  const toggleColumn = (col: string) => {
    setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const toggleStatus = (s: TestStatus | 'running') => {
    setStatusFilter(prev => {
      const has = prev.includes(s);
      if (has) return prev.filter(x => x !== s);
      return [...prev, s];
    });
  };

  const applyFailureFilter = () => {
    setStatusFilter(['failed', 'flaky', 'timedOut']);
  };

  const openAllFailures = () => {
    filtered
      .filter(t => t.status === 'failed' || t.status === 'timedOut')
      .slice(0, 5)
      .forEach(t => window.open(`/runs/${run.runId}/tests/${t.testId}/debugger`, '_blank'));
  };

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
              <Link to={`/runs/${run.runId}/history`}>Execution history</Link> ·{' '}
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
        <Stat label="Flaky" value={run.summary.flaky} />
        <Stat label="Skipped" value={run.summary.skipped} />
        <Stat label="Timed Out" value={run.summary.timedOut} />
        <Stat label="Duration" value={formatDuration(run.summary.durationMs ?? 0)} />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="controls" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            placeholder="Search title or id"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <input
            placeholder="Filter tags"
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
          />
          <input
            placeholder="Filter file/suite"
            value={fileFilter}
            onChange={e => setFileFilter(e.target.value)}
          />
          <input
            placeholder="Owner team"
            value={ownerFilter}
            onChange={e => setOwnerFilter(e.target.value)}
          />
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
            <option value="">All severities</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
          <input
            placeholder="Min ms"
            value={durationMin}
            onChange={e => setDurationMin(e.target.value)}
            style={{ width: 90 }}
          />
          <input
            placeholder="Max ms"
            value={durationMax}
            onChange={e => setDurationMax(e.target.value)}
            style={{ width: 90 }}
          />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'status' | 'duration' | 'title')}>
            <option value="status">Sort by status</option>
            <option value="duration">Sort by duration</option>
            <option value="title">Sort by title</option>
          </select>
          <select value={sortDir} onChange={e => setSortDir(e.target.value as 'asc' | 'desc')}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['passed', 'failed', 'flaky', 'skipped', 'running', 'timedOut'].map(s => (
            <button
              key={s}
              className="pill"
              style={{
                background: statusFilter.includes(s as TestStatus | 'running') ? '#1b2436' : 'transparent',
                border: '1px solid #1f2533'
              }}
              onClick={() => toggleStatus(s as TestStatus | 'running')}
            >
              {s}
            </button>
          ))}
          <button className="pill" style={{ border: '1px solid #3a82f7' }} onClick={applyFailureFilter}>
            Filter failures
          </button>
          <button className="pill" style={{ border: '1px solid #3a82f7' }} onClick={openAllFailures}>
            Open all failures
          </button>
          <button
            className="pill"
            style={{
              border: regressionOnly ? '1px solid #3a82f7' : '1px solid #1f2533',
              background: regressionOnly ? '#0f1724' : 'transparent'
            }}
            onClick={() => setRegressionOnly(!regressionOnly)}
          >
            Show regressions
          </button>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.keys(visibleColumns).map(col => (
            <label key={col} style={{ color: '#9aa3b5', fontSize: 12 }}>
              <input
                type="checkbox"
                checked={visibleColumns[col]}
                onChange={() => toggleColumn(col)}
                style={{ marginRight: 6 }}
              />
              {col}
            </label>
          ))}
        </div>
      </div>

      {noTests ? (
        <EmptyState
          title="No tests captured in this run"
          description="As soon as this project executes with the Orbis reporter, test results will appear here."
          size="md"
        />
      ) : (
        <VirtualTable
          rows={filtered}
          visibleColumns={visibleColumns}
          runId={run.runId}
          trustByTestId={trustMap}
          newFailures={newFailures}
          regressions={regressions}
          ownershipMap={ownershipMap}
        />
      )}
      {!noTests && (
        <div className="muted" style={{ marginTop: 8 }}>
          Showing {filtered.length} of {allTests.length} tests
        </div>
      )}
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

function VirtualTable({
  rows,
  visibleColumns,
  runId,
  trustByTestId,
  newFailures,
  regressions,
  ownershipMap,
  governance
}: {
  rows: TestCaseResult[];
  visibleColumns: Record<string, boolean>;
  runId: string;
  trustByTestId: Record<string, TrustAssessment>;
  newFailures: Set<string>;
  regressions: Record<string, RegressionEntry>;
  ownershipMap: Record<string, OwnershipInfo>;
  governance: Record<string, GovernanceSignal | undefined>;
}): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const rowHeight = 56;
  const buffer = 8;
  const totalHeight = rows.length * rowHeight;
  const visibleCount = 18;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const endIndex = Math.min(rows.length, startIndex + visibleCount + buffer * 2);
  const slice = rows.slice(startIndex, endIndex);

  const onScroll = useCallback(() => {
    if (!containerRef.current) return;
    setScrollTop(containerRef.current.scrollTop);
  }, []);

  const columns = [
    visibleColumns.testId && { key: 'testId', label: 'Test ID', width: 180 },
    visibleColumns.title && { key: 'title', label: 'Title' },
    visibleColumns.status && { key: 'status', label: 'Status', width: 140 },
    visibleColumns.regression && { key: 'regression', label: 'Regression', width: 160 },
    visibleColumns.trust && { key: 'trust', label: 'Trust', width: 140 },
    visibleColumns.owner && { key: 'owner', label: 'Owner', width: 160 },
    visibleColumns.severity && { key: 'severity', label: 'Severity', width: 120 },
    visibleColumns.duration && { key: 'duration', label: 'Duration', width: 140 },
    visibleColumns.tags && { key: 'tags', label: 'Tags', width: 220 },
    visibleColumns.file && { key: 'file', label: 'File', width: 200 },
    visibleColumns.retries && { key: 'retries', label: 'Retries', width: 90 },
    { key: 'actions', label: 'Actions', width: 160 }
  ].filter(Boolean) as Array<{ key: string; label: string; width?: number }>;

  return (
    <div className="card" style={{ marginTop: 12, padding: 0 }}>
      <div className="table-wrapper" style={{ maxHeight: 640, overflow: 'auto' }} onScroll={onScroll} ref={containerRef}>
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ position: 'relative', display: 'block', height: totalHeight }}>
            {slice.map((test, idx) => {
              const realIndex = startIndex + idx;
              return (
                <tr
                  key={test.testId}
                  style={{
                    position: 'absolute',
                    top: realIndex * rowHeight,
                    display: 'grid',
                    gridTemplateColumns: columns
                      .map(col => (col.width ? `${col.width}px` : '1fr'))
                      .join(' '),
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                  tabIndex={0}
                  onClick={() => (window.location.href = `/runs/${runId}/tests/${test.testId}/debugger`)}
                >
                  {visibleColumns.testId && (
                    <td className="muted">
                      {test.testId.slice(0, 12)}
                      {test.status !== 'passed' && (
                        <span className="pill" style={{ marginLeft: 6 }}>
                          {test.status}
                        </span>
                      )}
                    </td>
                  )}
                  {visibleColumns.title && <td>{test.title}</td>}
                  {visibleColumns.status && (
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StatusBadge status={test.status} />
                        {newFailures.has(test.testId) && <span className="pill" style={{ borderColor: '#f6c659' }}>new</span>}
                      </div>
                    </td>
                  )}
                  {visibleColumns.regression && (
                    <td>
                      <RegressionBadge regression={regressions[test.testId]} />
                    </td>
                  )}
                  {visibleColumns.trust && (
                    <td>
                      <TrustBadge trust={trustByTestId[test.testId]} />
                    </td>
                  )}
                  {visibleColumns.owner && (
                    <td>
                      {ownershipMap[test.testId]?.ownerTeam ? (
                        <span className="pill" style={{ borderColor: '#7ab1ec' }}>
                          Owned by {ownershipMap[test.testId].ownerTeam}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.severity && (
                    <td className="muted">{ownershipMap[test.testId]?.severity ?? '—'}</td>
                  )}
                  <td className="muted">
                    {governance[test.testId] ? (
                      <span className="pill" title="This test influenced the release decision via governance signals (trust, severity, regressions, duration).">
                        Referenced in decision: {governance[test.testId]}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  {visibleColumns.duration && <td>{formatDuration(test.timing.durationMs ?? 0)}</td>}
                  {visibleColumns.tags && (
                    <td>{test.tags.length ? test.tags.join(', ') : <span className="muted">—</span>}</td>
                  )}
                  {visibleColumns.file && <td className="muted">{test.location.file}</td>}
                  {visibleColumns.retries && <td className="muted">{test.retries.attempts.length}</td>}
                  <td style={{ display: 'flex', gap: 8 }}>
                    {(test.status === 'failed' || test.status === 'flaky' || test.status === 'timedOut') && (
                      <Link to={`/runs/${runId}/tests/${test.testId}/debugger`}>Debugger</Link>
                    )}
                    <Link to={`/tests/${test.testId}/history`}>History</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusPriority(status: TestStatus): number {
  switch (status) {
    case 'failed':
      return 5;
    case 'timedOut':
      return 4;
    case 'flaky':
      return 3;
    case 'running':
      return 2;
    case 'skipped':
      return 1;
    case 'passed':
    default:
      return 0;
  }
}

