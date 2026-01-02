import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { TestRun, TestCaseResult, TestStatus } from '@orbisreport/core';
import { getRuns, RunSummaryItem, getRun as getRunStatic } from '../api/client';
import { useRunData } from '../data/useRunData';
import { formatDateTime, formatDuration } from '../util/format';
import './overview.css';
import { SkeletonBlock, SkeletonLine } from '../../common/skeleton';
import { StatusBadge } from '../../common/status/StatusBadge';
import { useTrustIndex } from '../data/useTrustIndex';
import { computeRegressions } from '../../common/regression/regression';
import { TrustBadge } from '../../common/trust/TrustBadge';
import { computeReleaseReadiness } from '../../common/readiness/releaseReadiness';
import { resolveOwnership } from '../../common/ownership/ownership';
import { computeGovernanceSignals } from '../../common/governance/governance';
import { buildDecisionTrace } from '../../common/trace/decisionTrace';

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
      } catch (err) {
        console.error('[DEBUG] Error in overview loading:', err);
        setState({ status: 'error', error: err.message });
      }
    })();
  }, [runId, runState]);

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
  const governance = useMemo(
    () =>
      computeGovernanceSignals({
        tests: current.projects.flatMap(p => p.tests),
        trust: trustByTestId,
        regressions: regressions?.byTestId,
        ownership: undefined
      }),
    [current, trustByTestId, regressions]
  );
  const decisionTrace = useMemo(
    () =>
      buildDecisionTrace({
        run: current,
        governance,
        trust: trustByTestId,
        regressions: regressions?.byTestId,
        ownership: undefined,
        confidence: readiness.score,
        decisionLabel: readiness.label as 'GO' | 'GO WITH RISK' | 'NO-GO'
      }),
    [current, governance, trustByTestId, regressions, readiness.score, readiness.label]
  );
  const confidenceHint = confidenceScore >= 85 ? 'Safe to proceed' : confidenceScore >= 65 ? 'Proceed with caution' : 'Do not proceed';
  const confidenceTone = confidenceScore >= 85 ? 'success' : confidenceScore >= 65 ? 'warning' : 'danger';

  return (
    <div className="card">
      <div className="card" style={{ background: '#0d1018', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
          <div>
            <div className="muted" style={{ marginBottom: 4 }}>
              <Link to="/">← Runs</Link> · <Link to={`/runs/${runId}/index`}>Execution Index</Link>
            </div>
            <h2 style={{ margin: 0 }}>{formatDateTime(current.startTime)}</h2>
            <div className="muted">
              {current.environment.git?.branch ? `${current.environment.git.branch}@` : ''}
              {current.environment.git?.commit?.slice(0, 7) ?? 'unknown'} · schema {current.schemaVersion}
            </div>
            <div className="muted">
              {current.environment.os.name} {current.environment.os.version ?? ''} · {current.projects.map(p => p.name).join(', ')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{readiness.score}</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {readiness.label} {readiness.band === 'ready' ? '' : '—'}
            </div>
            <div className="muted" style={{ maxWidth: 260 }}>{readiness.rationale}</div>
          </div>
        </div>
        <div className="score-bar" style={{ marginTop: 12 }}>
          <div className="score-bar__label">Release Readiness</div>
          <div className="score-bar__track">
            <div
              className={`score-bar__fill confidence--${readiness.band === 'ready' ? 'success' : readiness.band === 'caution' ? 'warning' : 'danger'}`}
              style={{ width: `${readiness.score}%` }}
            />
          </div>
          <div className="score-bar__meta">
            <span>{readiness.label}</span>
            <span>
              Pass rate {(passRate(current) * 100).toFixed(0)}% · Failures {current.summary.failed} · Flaky {current.summary.flaky}
            </span>
          </div>
        </div>
      </div>

      <details className="card" style={{ marginTop: 8 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Ownership Impact</summary>
        <div className="muted" style={{ marginTop: 6 }}>
          Affected teams: {ownershipAgg.owners.length ? ownershipAgg.owners.join(', ') : '—'}
        </div>
        <div className="muted" style={{ marginTop: 4 }}>
          Teams with blocking failures: {ownershipAgg.blocking.length ? ownershipAgg.blocking.join(', ') : '—'}
        </div>
        <div className="muted" style={{ marginTop: 4 }}>
          Feature areas impacted: {ownershipAgg.areas.length ? ownershipAgg.areas.join(', ') : '—'}
        </div>
      </details>

      <Section title="Governance Signals">
        <div className="grid">
          <GovernanceCard
            title="Blocking"
            count={governance.blocking.length}
            summary="High-severity, high-trust failures that may impact readiness."
            details="These are failed or timed-out tests marked high/critical severity with high trust. They are treated as release-impacting signals."
          />
          <GovernanceCard
            title="Risk"
            count={governance.risk.length}
            summary="Flaky in critical areas or regressions on trusted tests."
            details="Risk signals highlight flaky tests in critical areas and regressions on high-trust tests, prompting focused review."
          />
          <GovernanceCard
            title="Informational"
            count={governance.info.length}
            summary="New/low-trust tests or long-running cases to watch."
            details="Informational signals surface new or low-trust tests and unusually long-running cases; they do not block release."
          />
        </div>
      </Section>

      <details className="card" style={{ marginTop: 8, padding: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Decision Trace</summary>
        <div className="muted" style={{ marginTop: 4 }}>
          Decision: {decisionTrace.decision} · Score {decisionTrace.confidence} · Run {decisionTrace.runId}
        </div>
        <div className="muted" style={{ marginTop: 4 }}>
          Branch {decisionTrace.branch ?? 'unknown'} @ {decisionTrace.commit?.slice(0, 7) ?? 'unknown'} · Time{' '}
          {new Date(decisionTrace.timestamp).toLocaleString()}
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          This decision was based on: {decisionTrace.summary.failedHighTrust} failed high-trust tests,{' '}
          {decisionTrace.summary.regressions} regressions, {decisionTrace.summary.flakyCritical} flaky in critical areas.
        </div>
        <div style={{ marginTop: 8 }}>
          {decisionTrace.factors.map(f => (
            <div key={f.kind} className="card" style={{ marginBottom: 8, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700 }}>{f.label}</div>
                <div className="muted">{f.count} tests</div>
              </div>
              <div className="muted" style={{ marginTop: 4 }}>{f.explanation}</div>
              <div className="muted" style={{ marginTop: 4 }}>Teams: {f.owners.length ? f.owners.join(', ') : '—'}</div>
              <div style={{ marginTop: 4 }}>
                <Link to={f.link}>View evidence</Link>
              </div>
            </div>
          ))}
        </div>
      </details>

      <Section title="Change Since Last Run">
        {previous ? (
          regressions ? (
            <div className="grid">
              <DeltaStat label="New failures" delta={regressions.summary.newFailures.length} />
              <DeltaStat label="New flaky" delta={regressions.summary.newFlakies.length} />
              <DeltaStat label="Perf regressions" delta={regressions.summary.perf.length} />
              <DeltaStat label="Recovered" delta={regressions.summary.recovered.length} positiveIsUp />
            </div>
          ) : (
            <div className="muted">Loading regression insights…</div>
          )
        ) : (
          <div className="muted">This is the first recorded execution.</div>
        )}
      </Section>

      {regressions && (
        <Section title="Why this decision">
          <div className="grid">
            <CardList
              title="Blocking failures"
              items={blockingFailures(current).map(t => ({
                id: t.testId,
                label: t.title,
                link: `/runs/${current.runId}/tests/${t.testId}/debugger`
              }))}
              emptyText="No blocking failures."
            />
            <CardList
              title="Regressions"
              items={
                regressions.summary.newFailures.slice(0, 4).map(r => ({
                  id: r.testId,
                  label: `${r.title} (${r.severity})`,
                  link: `/runs/${current.runId}/tests/${r.testId}/debugger`
                })) || []
              }
              emptyText="No regressions detected."
            />
            <CardList
              title="Risk hotspots"
              items={
                regressions.hotspots.folders.slice(0, 4).map(f => ({
                  id: f.id,
                  label: `${f.id} (${f.count})`,
                  link: `/runs/${current.runId}/explorer`
                })) || []
              }
              emptyText="No concentrated risk areas."
            />
            <CardList
              title="Trust profile"
              items={trustDistribution(trustByTestId).map(t => ({
                id: t.label,
                label: `${t.label}: ${t.count}`,
                link: `/runs/${current.runId}/index`
              }))}
              emptyText="No trust data."
            />
            <CardList
              title="Governance signals contributing"
              items={[
                { id: 'blocking', label: `Blocking signals: ${governance.blocking.length}`, link: `/runs/${current.runId}/index` },
                { id: 'risk', label: `Risk signals: ${governance.risk.length}`, link: `/runs/${current.runId}/index` },
                { id: 'info', label: `Informational signals: ${governance.info.length}`, link: `/runs/${current.runId}/index` }
              ]}
              emptyText="No governance signals detected."
            />
          </div>
        </Section>
      )}

      <Section title="Risk Areas">
        <div className="grid">
          <CardList
            title="Current failures"
            items={risk.currentFailures.slice(0, 4).map(t => ({
              id: t.testId,
              label: t.title,
              link: `/runs/${current.runId}/tests/${t.testId}/debugger`
            }))}
            emptyText="No active failures."
          />
          <CardList
            title="Flaky tests"
            items={risk.flaky.slice(0, 4).map(t => ({
              id: t.testId,
              label: t.title,
              link: `/tests/${t.testId}/history`
            }))}
            emptyText="No flaky signals detected."
          />
          <CardList
            title="Persistent regressions"
            items={risk.persistentFailures.slice(0, 4).map(t => ({
              id: t.testId,
              label: t.title,
              link: `/tests/${t.testId}/history`
            }))}
            emptyText="No consecutive failures observed."
          />
          <CardList
            title="Longest running tests"
            items={risk.longestRunning.slice(0, 4).map(t => ({
              id: t.testId,
              label: `${t.title} (${formatDuration(t.timing?.durationMs ?? 0)})`,
              link: `/runs/${current.runId}/tests/${t.testId}/debugger`
            }))}
            emptyText="No duration risks detected."
          />
        </div>
      </Section>

      {regressions && (
        <Section title="Regression Hotspots">
          <div className="grid">
            <CardList
              title="Folders"
              items={
                regressions.hotspots.folders.length
                  ? regressions.hotspots.folders.map(f => ({
                      id: f.id,
                      label: `${f.id} (${f.count})`,
                      link: `/runs/${current.runId}/explorer`
                    }))
                  : []
              }
              emptyText="No concentrated folder regressions."
            />
            <CardList
              title="Tags"
              items={
                regressions.hotspots.tags.length
                  ? regressions.hotspots.tags.map(t => ({
                      id: t.tag,
                      label: `${t.tag} (${t.count})`,
                      link: `/runs/${current.runId}/index`
                    }))
                  : []
              }
              emptyText="No tag-based regressions."
            />
          </div>
        </Section>
      )}

      <Section title="Proof & Details">
        <div className="grid">
          <CardList
            title="View failed tests"
            items={[
              {
                id: 'exec-index-failed',
                label: 'Open Execution Index',
                link: `/runs/${current.runId}/index`
              }
            ]}
          />
          <CardList
            title="Open Debugger"
            items={
              risk.currentFailures.length
                ? [
                    {
                      id: 'first-failure-debugger',
                      label: `First failure: ${risk.currentFailures[0].title}`,
                      link: `/runs/${current.runId}/tests/${risk.currentFailures[0].testId}/debugger`
                    }
                  ]
                : [
                    {
                      id: 'debugger-generic',
                      label: 'Open debugger',
                      link: `/runs/${current.runId}/index`
                    }
                  ]
            }
          />
          <CardList
            title="Test history"
            items={
              risk.flaky.length
                ? [
                    {
                      id: 'history',
                      label: `Review history: ${risk.flaky[0].title}`,
                      link: `/tests/${risk.flaky[0].testId}/history`
                    }
                  ]
                : [
                    {
                      id: 'history-generic',
                      label: 'Browse test histories',
                      link: `/runs/${current.runId}/index`
                    }
                  ]
            }
          />
          <CardList
            title="Artifacts & Evidence"
            items={[
              {
                id: 'artifacts',
                label: 'View attachments and evidence',
                link: `/runs/${current.runId}/artifacts`
              }
            ]}
          />
        </div>
      </Section>
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

