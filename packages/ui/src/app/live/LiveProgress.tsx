import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { useRunData } from '../data/useRunData';
import { useDataContext } from '../data/DataContext';
import { formatDuration } from '../util/format';
import './liveProgress.css';

export function LiveProgress(): JSX.Element | null {
  const { runId } = useParams<{ runId: string }>();
  const location = useLocation();
  const { mode } = useDataContext();
  const runState = useRunData(runId);

  const isRunRoute = Boolean(runId) && location.pathname.includes('/runs/');

  if (!isRunRoute || mode !== 'live') return null;
  if (runState.status !== 'ready' || !runState.run) return null;

  const run = runState.run;
  const total = run.summary.total || 0;
  const completed =
    run.summary.passed +
    run.summary.failed +
    run.summary.flaky +
    run.summary.skipped +
    run.summary.timedOut;
  const progress = total ? Math.min(1, completed / total) : 0;
  const elapsedMs = Date.now() - run.startTime;
  const etaMs = progress > 0 ? Math.max(0, (elapsedMs / progress) * (1 - progress)) : undefined;

  const tone =
    run.summary.failed > 0 || run.summary.timedOut > 0
      ? 'danger'
      : run.summary.flaky > 0
        ? 'warning'
        : 'neutral';

  return (
    <div className={`live-progress heat-${tone}`}>
      <div className="live-progress__left">
        <div className="live-progress__label">Live progress</div>
        <div className="live-progress__meta">
          {Math.round(progress * 100)}% · {completed}/{total || '—'} tests · elapsed {formatDuration(elapsedMs)}
          {etaMs !== undefined && ` · ETA ${formatDuration(etaMs)}`}
        </div>
      </div>
      <div className="live-progress__bar">
        <div className={`live-progress__fill tone-${tone}`} style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="live-progress__right">
        <Link to={`/runs/${runId}/index`}>Execution Index</Link>
      </div>
    </div>
  );
}

export function RunningNowStrip(): JSX.Element | null {
  const { runId } = useParams<{ runId: string }>();
  const { mode } = useDataContext();
  const runState = useRunData(runId);
  if (mode !== 'live' || runState.status !== 'ready' || !runState.run) return null;
  const running = runState.run.projects.flatMap(p => p.tests).filter(t => t.status === 'running').slice(0, 3);
  if (!running.length) return null;
  return (
    <div className="running-strip">
      <div className="running-strip__label">Running now</div>
      <div className="running-strip__items">
        {running.map(test => (
          <Link key={test.testId} to={`/runs/${runId}/tests/${test.testId}/debugger`} className="running-strip__item">
            <span className="running-strip__dot" />
            <span className="running-strip__title">{test.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

type EventItem = {
  id: string;
  label: string;
  status: 'passed' | 'failed' | 'flaky';
};

export function ActivityFeed(): JSX.Element | null {
  const { runId } = useParams<{ runId: string }>();
  const { mode } = useDataContext();
  const runState = useRunData(runId);
  const [open, setOpen] = useState(false);
  const prev = useRef<Map<string, string>>(new Map());
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    if (runState.status !== 'ready' || !runState.run) return;
    const next = new Map<string, string>();
    runState.run.projects.forEach(p => {
      p.tests.forEach(t => {
        next.set(t.testId, t.status);
        const prevStatus = prev.current.get(t.testId);
        if (prevStatus && prevStatus !== t.status) {
          if (t.status === 'failed' || t.status === 'timedOut') {
            addEvent(t.testId, `Failed: ${t.title}`, 'failed');
          } else if (t.status === 'flaky') {
            addEvent(t.testId, `Flaky: ${t.title}`, 'flaky');
          } else if (t.status === 'passed' && (prevStatus === 'failed' || prevStatus === 'flaky')) {
            addEvent(t.testId, `Recovered: ${t.title}`, 'passed');
          }
        }
      });
    });
    prev.current = next;
  }, [runState]);

  const addEvent = (id: string, label: string, status: EventItem['status']) => {
    setEvents(prevEvents => {
      const next = [{ id, label, status }, ...prevEvents].slice(0, 8);
      return next;
    });
  };

  if (mode !== 'live' || events.length === 0) return null;

  return (
    <div className="activity-feed">
      <button className="activity-feed__toggle" onClick={() => setOpen(o => !o)}>
        {open ? 'Hide recent activity' : 'Show recent activity'}
      </button>
      {open && (
        <ul>
          {events.map(ev => (
            <li key={ev.id} className={`tone-${ev.status === 'failed' ? 'danger' : ev.status === 'flaky' ? 'warning' : 'success'}`}>
              {ev.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LiveCompletionBanner(): JSX.Element | null {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { mode, setMode } = useDataContext();
  const runState = useRunData(runId);
  const [dismissed, setDismissed] = useState(false);

  if (mode !== 'live' || dismissed) return null;
  if (runState.status !== 'ready' || !runState.run) return null;
  const run = runState.run;
  if (!run.endTime) return null;

  const tone =
    run.summary.failed > 0 || run.summary.timedOut > 0
      ? 'danger'
      : run.summary.flaky > 0
        ? 'warning'
        : 'success';

  const total = run.summary.total || 0;
  const completed =
    run.summary.passed +
    run.summary.failed +
    run.summary.flaky +
    run.summary.skipped +
    run.summary.timedOut;
  const passRate = total ? Math.round((run.summary.passed / total) * 100) : 0;

  const handleOverview = () => {
    setMode('static');
    navigate(`/runs/${runId}`);
  };
  const handleFailures = () => {
    setMode('static');
    navigate(`/runs/${runId}/index`);
  };

  return (
    <div className={`live-completion tone-${tone}`}>
      <div>
        <div className="live-completion__title">Live run completed</div>
        <div className="live-completion__meta">
          {completed}/{total || '—'} tests · Passed {run.summary.passed} · Failed {run.summary.failed} · Flaky{' '}
          {run.summary.flaky} · Duration {formatDuration(run.summary.durationMs ?? 0)}
        </div>
        <div className="live-completion__meta">Final release confidence: {passRate}%</div>
        <div className="live-completion__note">Live view is now read-only. Switch to the final report for full analysis.</div>
      </div>
      <div className="live-completion__actions">
        <button className="primary-btn" onClick={handleOverview}>
          Open Final Report
        </button>
        <button className="secondary-btn" onClick={handleFailures}>
          Review Failures
        </button>
        <button className="secondary-btn" onClick={() => setDismissed(true)}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

