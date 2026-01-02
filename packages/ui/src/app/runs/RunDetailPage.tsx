/**
 * Phase 8.11 - Execution Index v2
 *
 * "Power without overwhelm"
 *
 * Answers exactly 3 questions:
 * What failed?
 * What matters most right now?
 * Where should I click next?
 */

import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { TestRun, TestCaseResult, TestStatus } from '@orbisreport/core';
import { useRunData } from '../data/useRunData';
import { useTrustIndex } from '../data/useTrustIndex';
import { useRegression } from '../data/useRegression';
import { useDataContext } from '../data/DataContext';
import { formatDateTime, formatDuration } from '../util/format';
import { EmptyState } from '../../common/empty/EmptyState';
import { SkeletonBlock, SkeletonLine } from '../../common/skeleton';
import { TrustBadge } from '../../common/trust/TrustBadge';
import { computeGovernanceSignals } from '../../common/governance/governance';
import type { TrustAssessment } from '../../common/trust/trustScore';
import './execution-index.css';

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
  const [showPassed, setShowPassed] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TestStatus | ''>('');
  const [tagFilter, setTagFilter] = useState('');

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
  const regressions = regressionState.status === 'ready' ? regressionState.regressions : undefined;

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

  // Ranked test ordering (Phase 8.11 priority)
  const rankedTests = useMemo(() => {
    if (state.status !== 'ready') return [];

    const tests = run.projects.flatMap(p => p.tests);

    // Apply filters
    let filtered = tests;
    if (statusFilter) {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    if (tagFilter) {
      const term = tagFilter.toLowerCase();
      filtered = filtered.filter(t => (t.tags ?? []).some(tag => tag.toLowerCase().includes(term)));
    }

    // Priority ordering: blocking failures → trusted failures → regressions → long-running → flaky → passed
    const priorityOrder = (test: TestCaseResult): number => {
      // Blocking failures first
      if (test.status === 'failed' && test.failure) return 1;

      // Trusted failures
      const trust = trustByTestId?.[test.testId];
      if (test.status === 'failed' && trust && trust.score > 0.7) return 2;

      // Regressions
      const regression = regressions?.find(r => r.testId === test.testId);
      if (regression) return 3;

      // Long-running (failed or slow)
      if ((test.status === 'failed' || test.status === 'timedOut') && (test.timing.durationMs ?? 0) > 30000) return 4;

      // Flaky
      if (test.status === 'flaky') return 5;

      // Passed tests last (unless showPassed is true)
      if (test.status === 'passed') return showPassed ? 6 : 7;

      // Everything else
      return 8;
    };

    return [...filtered]
      .sort((a, b) => priorityOrder(a) - priorityOrder(b))
      .filter(test => priorityOrder(test) < 7); // Hide passed tests unless showPassed
  }, [state, run, trustByTestId, regressions, statusFilter, tagFilter, showPassed]);

  // Priority insights (max 3)
  const priorityInsights = useMemo(() => {
    if (state.status !== 'ready') return [];

    const tests = run.projects.flatMap(p => p.tests);
    const failedCount = tests.filter(t => t.status === 'failed').length;
    const trustedFailures = tests.filter(t =>
      t.status === 'failed' &&
      trustByTestId?.[t.testId] &&
      trustByTestId[t.testId].score > 0.7
    ).length;

    const longestFailure = tests
      .filter(t => t.status === 'failed' || t.status === 'timedOut')
      .sort((a, b) => (b.timing.durationMs ?? 0) - (a.timing.durationMs ?? 0))[0];

    const insights = [];

    if (failedCount > 0) {
      insights.push(`⚠️ ${failedCount} failures affecting release readiness`);
    }

    if (trustedFailures > failedCount * 0.5) {
      insights.push(`🧠 All failures are trusted tests`);
    }

    if (longestFailure && (longestFailure.timing.durationMs ?? 0) > 10000) {
      insights.push(`⏱️ Longest failure: ${formatDuration(longestFailure.timing.durationMs ?? 0)}`);
    }

    return insights.slice(0, 3);
  }, [state, run, trustByTestId]);

  return (
    <div className="execution-index">
      {/* 1. Context Header (Calm, Static) */}
      <div className="execution-index__header">
        <div className="execution-index__context">
          <div className="execution-index__timestamp">
            {formatDateTime(run.startTime)}
          </div>
          <div className="execution-index__meta">
            {run.environment.git?.branch ? `${run.environment.git.branch}@` : ''}
            {run.environment.git?.commit?.slice(0, 7) ?? 'unknown'}
          </div>
          {mode === 'live' && (
            <div className="execution-index__live-status">
              LIVE mode · {state.run.endTime ? 'Completed' : 'Running'}
            </div>
          )}
        </div>

        <div className="execution-index__summary">
          <div className="execution-index__pill execution-index__pill--failed">
            Failed: {run.summary.failed}
          </div>
          <div className="execution-index__pill execution-index__pill--flaky">
            Flaky: {run.summary.flaky}
          </div>
          <div className="execution-index__pill execution-index__pill--passed">
            Passed: {run.summary.passed}
          </div>
        </div>
      </div>

      {/* 2. Priority Strip (The Magic) */}
      {priorityInsights.length > 0 && (
        <div className="execution-index__priority-strip">
          {priorityInsights.map((insight, index) => (
            <div key={index} className="execution-index__insight">
              {insight}
            </div>
          ))}
        </div>
      )}

      {/* 3. Test List (The Heart) */}
      <div className="execution-index__test-list">
        {rankedTests.map(test => (
          <TestRow
            key={test.testId}
            test={test}
            trust={trustByTestId?.[test.testId]}
            regression={regressions?.find(r => r.testId === test.testId)}
            onDebuggerClick={() => navigate(`/runs/${runId}/tests/${test.testId}`)}
            onHistoryClick={() => navigate(`/tests/${test.testId}/history`)}
            onExplorerClick={() => navigate(`/runs/${runId}/explorer?test=${test.testId}`)}
          />
        ))}

        {/* Show passed tests toggle */}
        {!showPassed && run.summary.passed > 0 && (
          <div className="execution-index__passed-toggle">
            <button
              className="execution-index__passed-button"
              onClick={() => setShowPassed(true)}
            >
              Show passed tests ({run.summary.passed})
            </button>
          </div>
        )}
      </div>

      {/* 4. Filters (Secondary, Hidden by Default) */}
      {showFilters && (
        <div className="execution-index__filters">
          <div className="execution-index__filter-group">
            <label>Status:</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as TestStatus | '')}
            >
              <option value="">All</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="flaky">Flaky</option>
              <option value="skipped">Skipped</option>
              <option value="timedOut">Timed Out</option>
            </select>
          </div>

          <div className="execution-index__filter-group">
            <label>Tags:</label>
            <input
              type="text"
              placeholder="Filter by tag"
              value={tagFilter}
              onChange={e => setTagFilter(e.target.value)}
            />
          </div>

          <button
            className="execution-index__clear-filters"
            onClick={() => {
              setStatusFilter('');
              setTagFilter('');
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Refine button */}
      {!showFilters && (
        <div className="execution-index__refine">
          <button
            className="execution-index__refine-button"
            onClick={() => setShowFilters(true)}
          >
            Refine
          </button>
        </div>
      )}

      {/* Navigation footer */}
      <div className="execution-index__navigation">
        <Link to={`/runs/${runId}`}>Executive overview</Link> ·{' '}
        <Link to={`/runs/${runId}/history`}>Execution history</Link> ·{' '}
        <Link to={`/runs/${runId}/explorer`}>Suite explorer</Link> ·{' '}
        <Link to={`/runs/${runId}/artifacts`}>Artifacts</Link>
      </div>
    </div>
  );

  // TestRow component for Phase 8.11
  interface TestRowProps {
    test: TestCaseResult;
    trust?: TrustAssessment;
    regression?: any;
    onDebuggerClick: () => void;
    onHistoryClick: () => void;
    onExplorerClick: () => void;
  }

  function TestRow({ test, trust, regression, onDebuggerClick, onHistoryClick, onExplorerClick }: TestRowProps) {
    const getStatusIcon = (status: TestStatus) => {
      switch (status) {
        case 'passed': return '✓';
        case 'failed': return '✗';
        case 'flaky': return '~';
        case 'timedOut': return '⏱';
        case 'skipped': return '○';
        default: return '?';
      }
    };

    const getFailureReason = (test: TestCaseResult) => {
      if (!test.failure) return '';
      const message = test.failure.message;
      // Truncate long messages
      return message.length > 60 ? message.slice(0, 60) + '...' : message;
    };

    const isNewTest = trust && trust.historyLength < 3;
    const isSlow = (test.timing.durationMs ?? 0) > 30000;
    const isTrusted = trust && trust.score > 0.7;

    return (
      <div className="execution-index__test-row">
        {/* Status glyph */}
        <div className="execution-index__status">
          <span className={`execution-index__status-icon execution-index__status-icon--${test.status}`}>
            {getStatusIcon(test.status)}
          </span>
        </div>

        {/* Test info */}
        <div className="execution-index__test-info">
          <div className="execution-index__title">{test.title}</div>
          {test.failure && (
            <div className="execution-index__failure-reason">
              {getFailureReason(test)}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="execution-index__metadata">
          <div className="execution-index__duration">
            {formatDuration(test.timing.durationMs ?? 0)}
          </div>
          {test.retries?.attempts && test.retries.attempts.length > 0 && (
            <div className="execution-index__retries">
              {test.retries.attempts.length} retries
            </div>
          )}
        </div>

        {/* Inline signals */}
        <div className="execution-index__signals">
          {isTrusted && (
            <div className="execution-index__signal" title="Trusted test - has passed reliably">
              🧠
            </div>
          )}
          {test.status === 'flaky' && (
            <div className="execution-index__signal" title="Flaky test - inconsistent results">
              🔁
            </div>
          )}
          {isSlow && (
            <div className="execution-index__signal" title="Slow test - takes longer than 30s">
              ⏱️
            </div>
          )}
          {isNewTest && (
            <div className="execution-index__signal" title="New test - limited history">
              🧪
            </div>
          )}
          {regression && (
            <div className="execution-index__signal" title="Regression - recently failed after passing">
              📈
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="execution-index__actions">
          <button
            className="execution-index__action execution-index__action--primary"
            onClick={onDebuggerClick}
          >
            Open Debugger →
          </button>
          <div className="execution-index__hover-actions">
            <button
              className="execution-index__action execution-index__action--secondary"
              onClick={onHistoryClick}
              title="View test history"
            >
              History
            </button>
            <button
              className="execution-index__action execution-index__action--secondary"
              onClick={onExplorerClick}
              title="View in suite explorer"
            >
              Explorer
            </button>
          </div>
        </div>
      </div>
    );
  }
}
