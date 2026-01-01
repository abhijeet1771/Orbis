import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { TestRun, TestCaseResult, TestStatus } from '@orbisreport/core';
import { getRuns, RunSummaryItem, getRun as getRunStatic } from '../api/client';
import { useRunData } from '../data/useRunData';
import { formatDateTime, formatDuration } from '../util/format';
import './overview.css';

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; current: TestRun; previous?: TestRun };

export function ExecutiveOverviewPage(): JSX.Element {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const runState = useRunData(runId);
  const [state, setState] = useState<LoadState>({ status: 'idle' });

  useEffect(() => {
    if (!runId) return;
    if (runState.status === 'loading' || runState.status === 'idle') {
      setState({ status: 'loading' });
      return;
    }
    if (runState.status === 'error') {
      setState({ status: 'error', error: runState.error ?? 'Failed to load run' });
      return;
    }
    const current = runState.run;
    if (!current) return;
    (async () => {
      const runsMeta = await getRuns();
      const previousMeta = findPreviousRunMeta(runsMeta, runId);
      const previous = previousMeta ? await getRunStatic(previousMeta.runId) : undefined;
      setState({ status: 'ready', current, previous });
    })().catch(err => setState({ status: 'error', error: err.message }));
  }, [runId, runState]);

  if (state.status === 'loading' || state.status === 'idle') {
    return <div className="card">Loading overview...</div>;
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
  const deltas = computeDeltas(current, previous);
  const confidence = releaseConfidence(deltas);
  const risk = riskAreas(current, previous);

  return (
    <div className="card">
      <div className="overview__header">
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
            {current.environment.os.name} {current.environment.os.version ?? ''} ·{' '}
            {current.projects.map(p => p.name).join(', ')}
          </div>
        </div>
        <div className={`confidence confidence--${confidence.kind}`}>{confidence.label}</div>
      </div>

      <Section title="Execution Summary">
        <div className="grid">
          <Stat label="Total" value={current.summary.total} />
          <Stat label="Passed" value={current.summary.passed} />
          <Stat label="Failed" value={current.summary.failed} />
          <Stat label="Flaky" value={current.summary.flaky} />
          <Stat label="Skipped" value={current.summary.skipped} />
          <Stat label="Duration" value={formatDuration(current.summary.durationMs ?? 0)} />
          <Stat label="Retries" value={current.config.retries ?? 0} />
        </div>
      </Section>

      <Section title="Change Since Last Run">
        {previous ? (
          <div className="grid">
            <DeltaStat label="Passed change" delta={deltas.passedDelta} />
            <DeltaStat label="Failed change" delta={deltas.failedDelta} />
            <DeltaStat label="Flaky change" delta={deltas.flakyDelta} />
            <DeltaStat label="Duration change" delta={deltas.durationDeltaMs} isDuration />
            <CardList
              title={`New failures (${deltas.newFailures.length})`}
              items={deltas.newFailures.map(t => ({
                id: t.testId,
                label: t.title,
                link: `/runs/${current.runId}/tests/${t.testId}/debugger`
              }))}
            />
            <CardList
              title={`Recovered tests (${deltas.recovered.length})`}
              items={deltas.recovered.map(t => ({
                id: t.testId,
                label: t.title,
                link: `/tests/${t.testId}/history`
              }))}
            />
          </div>
        ) : (
          <div className="muted">No previous run available for comparison.</div>
        )}
      </Section>

      <Section title="Risk Areas">
        <div className="grid">
          <CardList
            title="Failing now"
            items={risk.currentFailures.map(t => ({
              id: t.testId,
              label: t.title,
              link: `/runs/${current.runId}/tests/${t.testId}/debugger`
            }))}
          />
          <CardList
            title="Flaky tests"
            items={risk.flaky.map(t => ({
              id: t.testId,
              label: t.title,
              link: `/tests/${t.testId}/history`
            }))}
          />
          <CardList
            title="Persistent regressions"
            items={risk.persistentFailures.map(t => ({
              id: t.testId,
              label: t.title,
              link: `/tests/${t.testId}/history`
            }))}
          />
        </div>
      </Section>

      <Section title="Proof & Evidence">
        <div className="grid">
          <CardList
            title="Debugger (failed tests)"
            items={risk.currentFailures.map(t => ({
              id: t.testId,
              label: t.title,
              link: `/runs/${current.runId}/tests/${t.testId}/debugger`
            }))}
          />
          <CardList
            title="History (unstable tests)"
            items={[...risk.flaky, ...risk.persistentFailures].map(t => ({
              id: t.testId,
              label: t.title,
              link: `/tests/${t.testId}/history`
            }))}
          />
          <CardList
            title="Artifacts"
            items={risk.currentFailures
              .flatMap(t => t.attachments ?? [])
              .slice(0, 5)
              .map(att => ({
                id: att.id,
                label: att.description || att.type,
                link: `/${att.path}`
              }))}
            emptyText="Attachments from failed tests appear here."
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

  return { currentFailures, flaky, persistentFailures };
}

function isFailure(status: TestStatus | undefined): boolean {
  return status === 'failed' || status === 'timedOut';
}

function indexById(tests: TestCaseResult[]): Map<string, TestCaseResult> {
  const map = new Map<string, TestCaseResult>();
  for (const t of tests) map.set(t.testId, t);
  return map;
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

