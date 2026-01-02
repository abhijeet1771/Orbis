import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { TestRun, TestCaseResult, TestStatus } from '@orbisreport/core';
import { getRuns, RunSummaryItem, getRun as getRunStatic } from '../api/client.js';
import { useRunData } from '../data/useRunData.js';
import { formatDateTime, formatDuration } from '../util/format.js';
import './overview.css';
import './executive-home.css';
import { SkeletonBlock, SkeletonLine } from '../../common/skeleton/index.js';
import { StatusBadge } from '../../common/status/StatusBadge.js';
import { useTrustIndex } from '../data/useTrustIndex.js';
import { computeRegressions } from '../../common/regression/regression.js';
import { TrustBadge } from '../../common/trust/TrustBadge.js';
import { computeReleaseReadiness } from '../../common/readiness/releaseReadiness.js';
import { resolveOwnership } from '../../common/ownership/ownership.js';
import { computeGovernanceSignals } from '../../common/governance/governance.js';
import { buildDecisionTrace } from '../../common/trace/decisionTrace.js';
import { ExecutiveFTX } from '../../components/ExecutiveFTX.js';
import { useExecutiveHomeState, useAwarenessLine, useMotionValidation } from '../../common/motion/index.js';
import '../../common/spatial/index.js'; /* Phase 8.5 - Spatial Rhythm System */
import '../../common/interactions/index.js'; /* Phase 8.7 - Micro-Interactions System */

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; current: TestRun; previous?: TestRun };

export function ExecutiveOverviewPage(): JSX.Element {
  const { runId } = useParams<{ runId: string }>();
  const runState = useRunData(runId);
  const trustState = useTrustIndex(runId);
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const [showFTX, setShowFTX] = useState(false);

  // Phase 8.3 - Motion System Integration
  const { currentState: motionState, transition: triggerMotionTransition } = useExecutiveHomeState();
  const { awarenessState, triggerPulse } = useAwarenessLine();
  const { validateMotion } = useMotionValidation();

  // Check if FTX has been shown for this workspace
  useEffect(() => {
    if (runId && state.status === 'ready') {
      // Extract workspace ID from run data (using project name as workspace identifier)
      const workspaceId = (state as any).current.projects[0]?.name || 'default';
      const ftxKey = `orbis.ftx.seen.${workspaceId}`;
      const hasSeenFTX = localStorage.getItem(ftxKey) === 'true';

      if (!hasSeenFTX) {
        setShowFTX(true);
      } else {
        // Phase 8.3 - Transition from Cold Entry to Awareness
        triggerMotionTransition('ftx-complete');
      }
    }
  }, [runId, state.status, triggerMotionTransition]);

  useEffect(() => {
    console.log('[DEBUG] ExecutiveOverviewPage useEffect triggered for runId:', runId, 'status:', runState.status);

    if (!runId) return;

    if (runState.status === 'loading' || runState.status === 'idle') {
      setState({ status: 'loading' });
      return;
    }

    if (runState.status === 'error') {
      console.log('[DEBUG] Setting error state:', runState.error);
      setState({ status: 'error', error: runState.error ?? 'Failed to load run' });
      return;
    }

    const current = runState.run;
    if (!current) return;

    console.log('[DEBUG] Loading overview for run:', current.runId, 'with', current.projects.length, 'projects');

    (async () => {
      try {
        const runsMeta = await getRuns();
        const previousMeta = findPreviousRunMeta(runsMeta.runs, runId);
        const previous = previousMeta ? await getRunStatic(previousMeta.runId) : undefined;

        console.log('[DEBUG] Overview data loaded - previous run:', previous?.runId || 'none');
        setState({ status: 'ready', current, previous });

        // Phase 8.3 - Data load complete, transition to Decision Stable
        setTimeout(() => {
          triggerMotionTransition('data-load');
          triggerPulse('data-load');
        }, 100); // Small delay for smooth transition

      } catch (err) {
        console.error('[DEBUG] Error in overview loading:', err);
        setState({ status: 'error', error: err instanceof Error ? err.message : 'Failed to load overview' });
      }
    })();
  }, [runId, runState, triggerMotionTransition, triggerPulse]);

  if (state.status === 'loading' || state.status === 'idle' || trustState.status === 'loading') {
    return (
      <div className="card">
        <SkeletonLine width="50%" />
        <SkeletonLine width="40%" />
        <SkeletonLine width="30%" />
        <div className="grid" style={{ marginTop: 16 }}>
          {[...Array(7)].map((_, idx) => (
            <SkeletonBlock key={idx} height={72} />
          ))}
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="card">
        <div>Failed to load overview: {state.error}</div>
        <div style={{ marginTop: 8 }}>
          <Link to="/">Back</Link>
        </div>
      </div>
    );
  }

  const current = state.current;
  const previous = state.previous;
  const trustByTestId = trustState.status === 'ready' ? trustState.trustByTestId : undefined;

  console.log('[DEBUG] About to compute regressions...');
  const regressions = trustByTestId ? computeRegressions(current, previous, trustByTestId) : undefined;
  console.log('[DEBUG] Regressions computed:', regressions);

  console.log('[DEBUG] About to compute readiness...');
  const readiness = computeReleaseReadiness(current, previous, regressions, trustByTestId);
  console.log('[DEBUG] Readiness computed:', readiness);
  console.log('[DEBUG] Motion state:', motionState, 'Awareness:', awarenessState);

  console.log('[DEBUG] About to compute deltas...');
  const deltas = computeDeltas(current, previous);
  console.log('[DEBUG] Deltas computed:', deltas);

  console.log('[DEBUG] About to compute risk areas...');
  const risk = riskAreas(current, previous);
  console.log('[DEBUG] Risk computed:', risk);

  console.log('[DEBUG] About to compute confidence score...');
  const confidenceScore = computeConfidenceScore(current, deltas);
  console.log('[DEBUG] Confidence score computed:', confidenceScore);
  // Fix: Compute ownershipAgg without useMemo to avoid infinite re-renders
  const ownershipAgg = (() => {
    const owners = new Set<string>();
    const blocking = new Set<string>();
    const areas = new Set<string>();

    current.projects.forEach(p => {
      p.tests.forEach(t => {
        const o = resolveOwnership(t);
        if (o.ownerTeam) owners.add(o.ownerTeam);
        if (o.featureArea) areas.add(o.featureArea);
        if ((t.status === 'failed' || t.status === 'timedOut') && o.ownerTeam) blocking.add(o.ownerTeam);
      });
    });

    return {
      owners: Array.from(owners),
      blocking: Array.from(blocking),
      areas: Array.from(areas)
    };
  })();
  // Compute governance signals
  const governance = computeGovernanceSignals({
    tests: current.projects.flatMap(p => p.tests),
    trust: trustByTestId,
    regressions,
    ownership: ownershipAgg
  });

  // Compute decision trace
  const decisionTrace = buildDecisionTrace({
    run: current,
    governance,
    trust: trustByTestId,
    regressions: regressions ? { 'summary': regressions.summary } : undefined,
    ownership: ownershipAgg ? { 'summary': ownershipAgg } : undefined,
    confidence: readiness.score,
    decisionLabel: readiness.band === 'ready' ? 'GO' : readiness.band === 'caution' ? 'GO WITH RISK' : 'NO-GO'
  });
  const confidenceHint = confidenceScore >= 85 ? 'Safe to proceed' : confidenceScore >= 65 ? 'Proceed with caution' : 'Do not proceed';
  const confidenceTone = confidenceScore >= 85 ? 'success' : confidenceScore >= 65 ? 'warning' : 'danger';

  // Show FTX on first visit
  if (showFTX && state.status === 'ready') {
    return (
      <ExecutiveFTX
        run={current}
        workspaceId={current.projects[0]?.name || 'default'}
        onComplete={() => setShowFTX(false)}
      />
    );
  }

  return (
    <div className="executive-home">
      {/* ZONE 1 — EXECUTIVE HEADER (Fixed, Thin - 56px) */}
      <header className="executive-home__zone-1">
        <div className="executive-home__zone-1-content">
          <div className="executive-home__zone-1-left">
            <div className="executive-home__wordmark">Orbis</div>
            <div className="executive-home__mode">Executive Intelligence</div>
          </div>
          <div className="executive-home__zone-1-center">
            <div>{formatDateTime(current.startTime)}</div>
            <div>Schema {current.schemaVersion}</div>
          </div>
          <div className="executive-home__zone-1-right">
            <div>{current.environment.os.name} {current.environment.os.version ?? ''}</div>
            <div>{current.projects.map(p => p.name).join(', ')}</div>
          </div>
        </div>
      </header>

      {/* ZONE 2 — PRIMARY DECISION BAND (Hero, but Calm - 198px) */}
      <section className="executive-home__zone-2">
        <div className="executive-home__zone-2-content">
          {/* Phase 8.3 - Awareness Line (horizontal presence line) */}
          <div
            className="executive-home__awareness-line"
            style={{
              opacity: awarenessState.opacity,
              transition: awarenessState.isPulsing ? 'opacity 140ms ease-out' : 'none'
            }}
          />

          <div className="executive-home__verdict-primary interaction-affirmation">
            <div className="executive-home__verdict-state">{readiness.label}</div>
            <div className="executive-home__verdict-score">{readiness.score}</div>
            <div className="executive-home__verdict-justification">{readiness.rationale}</div>
          </div>
        </div>
      </section>

      {/* ZONE 3 — INTELLIGENCE TRIAD (The Brain - 315px) */}
      <section className="executive-home__zone-3">
        <div className="executive-home__zone-3-content">
          {/* Governance Signals Block */}
          <div className="executive-home__intelligence-block">
            <div className="executive-home__intelligence-title">Governance Signals</div>
            <div className="executive-home__intelligence-content">
              <div className="executive-home__signal">
                <div className="executive-home__signal-count">{governance.blocking.length}</div>
                <div className="executive-home__signal-label">Blocking</div>
              </div>
              <div className="executive-home__signal">
                <div className="executive-home__signal-count">{governance.risk.length}</div>
                <div className="executive-home__signal-label">Risk</div>
              </div>
              <div className="executive-home__signal">
                <div className="executive-home__signal-count">{governance.info.length}</div>
                <div className="executive-home__signal-label">Informational</div>
              </div>
            </div>
          </div>

          {/* Ownership Impact Block */}
          <div className="executive-home__intelligence-block">
            <div className="executive-home__intelligence-title">Ownership Impact</div>
            <div className="executive-home__intelligence-content">
              <div className="executive-home__ownership-item">
                <div className="executive-home__ownership-count">{ownershipAgg.owners.length}</div>
                <div className="executive-home__ownership-label">Teams affected</div>
              </div>
              <div className="executive-home__ownership-item">
                <div className="executive-home__ownership-count">{ownershipAgg.blocking.length}</div>
                <div className="executive-home__ownership-label">Teams blocking</div>
              </div>
              <div className="executive-home__ownership-item">
                <div className="executive-home__ownership-count">{ownershipAgg.areas.length}</div>
                <div className="executive-home__ownership-label">Feature areas</div>
              </div>
            </div>
          </div>

          {/* Trust Profile Block */}
          <div className="executive-home__intelligence-block">
            <div className="executive-home__intelligence-title">Trust Profile</div>
            <div className="executive-home__intelligence-content">
              {trustByTestId ? (
                trustDistribution(trustByTestId).map(({ label, count }) => (
                  <div key={label} className="executive-home__trust-item">
                    <div className="executive-home__trust-count">{count}</div>
                    <div className="executive-home__trust-label">{label}</div>
                  </div>
                ))
              ) : (
                <div className="executive-home__trust-item">
                  <div className="executive-home__trust-label">Loading trust data...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ZONE 4 — EVIDENCE GATEWAY (Action Layer - 144px) */}
      <section className="executive-home__zone-4">
        <div className="executive-home__zone-4-content">
          {/* Why This Decision */}
          <div className="executive-home__evidence-card interaction-guidance">
            <div className="executive-home__evidence-title">Why This Decision</div>
            <div className="executive-home__evidence-summary">
              {decisionTrace.summary.failedHighTrust + decisionTrace.summary.regressions + decisionTrace.summary.flakyCritical} governance signals
            </div>
          </div>

          {/* Current Failures */}
          <div className="executive-home__evidence-card interaction-guidance" onClick={() => window.location.href = `/runs/${current.runId}/index?status=failed`}>
            <div className="executive-home__evidence-title">Current Failures</div>
            <div className="executive-home__evidence-summary">
              {risk.currentFailures.length > 0
                ? `${risk.currentFailures.length} tests failed`
                : 'No active failures'}
            </div>
          </div>

          {/* Risk Hotspots */}
          <div className="executive-home__evidence-card interaction-guidance" onClick={() => window.location.href = `/runs/${current.runId}/explorer`}>
            <div className="executive-home__evidence-title">Risk Hotspots</div>
            <div className="executive-home__evidence-summary">
              {regressions?.hotspots.folders.length ?? 0} concentrated areas
            </div>
          </div>

          {/* Longest Running */}
          <div className="executive-home__evidence-card interaction-guidance">
            <div className="executive-home__evidence-title">Longest Running</div>
            <div className="executive-home__evidence-summary">
              {risk.longestRunning.length > 0
                ? `${formatDuration(risk.longestRunning[0].timing?.durationMs ?? 0)}`
                : 'No timing data'}
            </div>
          </div>
        </div>
      </section>

      {/* ZONE 5 — NAVIGATION SPINE (Silent - 72px) */}
      <nav className="executive-home__zone-5">
        <div className="executive-home__zone-5-content">
          <Link to={`/runs/${current.runId}/index`} className="executive-home__nav-item interaction-guidance">
            Execution Index
          </Link>
          <Link to={`/runs/${current.runId}/tests/${risk.currentFailures[0]?.testId}/debugger`} className="executive-home__nav-item interaction-guidance">
            Debugger
          </Link>
          <Link to={`/tests/${risk.flaky[0]?.testId}/history`} className="executive-home__nav-item interaction-guidance">
            History
          </Link>
          <Link to={`/runs/${current.runId}/artifacts`} className="executive-home__nav-item interaction-guidance">
            Artifacts
          </Link>
        </div>
      </nav>
    </div>
  );
}

function findPreviousRunMeta(runs: RunSummaryItem[], runId: string): RunSummaryItem | undefined {
  const sorted = [...runs].sort(
    (a, b) => (b.startTime ?? b.createdAt ?? 0) - (a.startTime ?? a.createdAt ?? 0)
  );
  const idx = sorted.findIndex(r => r.runId === runId);
  return idx >= 0 ? sorted[idx + 1] : undefined;
}

function computeDeltas(current: TestRun, previous?: TestRun) {
  if (!previous) {
    return {
      passedDelta: 0,
      failedDelta: 0,
      flakyDelta: 0,
      durationDeltaMs: 0,
      newFailures: [] as TestCaseResult[],
      recovered: [] as TestCaseResult[]
    };
  }

  const prevTests = indexById(previous.projects.flatMap(p => p.tests));
  const currTests = indexById(current.projects.flatMap(p => p.tests));

  const newFailures = Array.from(currTests.values()).filter(t =>
    isFailure(t.status) && !isFailure(prevTests.get(t.testId)?.status ?? 'passed')
  );

  const recovered = Array.from(currTests.values()).filter(t =>
    !isFailure(t.status) && isFailure(prevTests.get(t.testId)?.status ?? 'passed')
  );

  return {
    passedDelta: current.summary.passed - previous.summary.passed,
    failedDelta: current.summary.failed - previous.summary.failed,
    flakyDelta: current.summary.flaky - previous.summary.flaky,
    durationDeltaMs: (current.summary.durationMs ?? 0) - (previous.summary.durationMs ?? 0),
    newFailures,
    recovered
  };
}

function releaseConfidence(deltas: ReturnType<typeof computeDeltas>) {
  if (deltas.newFailures.length > 0) return { kind: 'red', label: 'RED - New failures detected' };
  if (deltas.flakyDelta > 0) return { kind: 'amber', label: 'AMBER - Flakiness increased' };
  return { kind: 'green', label: 'GREEN - No new regressions' };
}

function riskAreas(current: TestRun, previous?: TestRun) {
  const currentTests = current.projects.flatMap(p => p.tests);
  const prevMap = previous ? indexById(previous.projects.flatMap(p => p.tests)) : new Map();

  const currentFailures = currentTests.filter(t => isFailure(t.status));
  const flaky = currentTests.filter(t => t.status === 'flaky');
  const persistentFailures = currentTests.filter(t => {
    const prev = prevMap.get(t.testId);
    return prev && isFailure(prev.status) && isFailure(t.status);
  });
  const longestRunning = [...currentTests]
    .filter(t => t.timing?.durationMs)
    .sort((a, b) => (b.timing?.durationMs ?? 0) - (a.timing?.durationMs ?? 0))
    .slice(0, 5);

  return { currentFailures, flaky, persistentFailures, longestRunning };
}

function isFailure(status: TestStatus | undefined): boolean {
  return status === 'failed' || status === 'timedOut';
}

function indexById(tests: TestCaseResult[]): Map<string, TestCaseResult> {
  const map = new Map<string, TestCaseResult>();
  for (const t of tests) map.set(t.testId, t);
  return map;
}

function passRate(run: TestRun): number {
  const total = run.summary.total || 1;
  return run.summary.passed / total;
}

function blockingFailures(run: TestRun): TestCaseResult[] {
  return run.projects.flatMap(p => p.tests).filter(t => isFailure(t.status)).slice(0, 4);
}

function trustDistribution(trust: Record<string, any> | undefined) {
  if (!trust) return [];
  const counts: Record<string, number> = {};
  Object.values(trust).forEach((t: any) => {
    counts[t.label] = (counts[t.label] ?? 0) + 1;
  });
  return Object.entries(counts).map(([label, count]) => ({ label, count }));
}

function GovernanceCard({
  title,
  count,
  summary,
  details
}: {
  title: string;
  count: number;
  summary: string;
  details: string;
}): JSX.Element {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>{count}</div>
      </div>
      <div className="muted" style={{ marginTop: 4 }}>
        {summary}
      </div>
      <details style={{ marginTop: 6 }}>
        <summary style={{ cursor: 'pointer' }}>Why this matters</summary>
        <div className="muted" style={{ marginTop: 4 }}>{details}</div>
      </details>
    </div>
  );
}

function computeConfidenceScore(current: TestRun, deltas: ReturnType<typeof computeDeltas>): number {
  const total = current.summary.total || 1;
  const passComponent = (current.summary.passed / total) * 70;
  const failurePenalty = Math.min(current.summary.failed * 5, 20);
  const flakyPenalty = Math.min(current.summary.flaky * 2, 10);
  const regressionPenalty = Math.min(deltas.newFailures.length * 4, 20);
  const score = Math.max(0, Math.min(100, Math.round(passComponent - failurePenalty - flakyPenalty - regressionPenalty + 30)));
  return score;
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="section">
      <h3 className="section__title">{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
    </div>
  );
}

function DeltaStat({
  label,
  delta,
  isDuration
}: {
  label: string;
  delta: number;
  isDuration?: boolean;
}): JSX.Element {
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
  const abs = Math.abs(delta);
  const text = isDuration ? `${sign}${formatDuration(abs)}` : `${sign}${abs}`;
  const color = delta > 0 ? '#ef5350' : delta < 0 ? '#66bb6a' : '#9aa3b5';
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className="stat__value" style={{ color }}>
        {text}
      </div>
    </div>
  );
}

function CardList({
  title,
  items,
  emptyText = 'None'
}: {
  title: string;
  items: { id: string; label: string; link: string }[];
  emptyText?: string;
}): JSX.Element {
  return (
    <div className="listcard">
      <div className="listcard__title">{title}</div>
      {items.length === 0 ? (
        <div className="muted">{emptyText}</div>
      ) : (
        <ul>
          {items.map(item => (
            <li key={item.id}>
              <Link to={item.link}>{item.label}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

