import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { AttachmentInfo, TestRun, TestCaseResult } from '@orbisreport/core';
import { useRunData } from '../data/useRunData';
import { useDataContext } from '../data/DataContext';
import { formatDateTime, formatDuration } from '../util/format';
import './artifacts.css';

type AttachmentType = AttachmentInfo['type'];

interface ArtifactItem {
  attachment: AttachmentInfo;
  testId: string;
  testTitle: string;
  stepTitle?: string;
  timestamp?: number;
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; run: TestRun; artifacts: ArtifactItem[] };

export function ArtifactsPage(): JSX.Element {
  const { runId } = useParams<{ runId: string }>();
  const runState = useRunData(runId);
  const { mode } = useDataContext();
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const [typeFilter, setTypeFilter] = useState<AttachmentType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ArtifactItem | undefined>(undefined);
  const [view, setView] = useState<'grid' | 'list'>('grid');

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
    const run = runState.run;
    if (!run) return;
    const artifacts = extractArtifacts(run);
    setState({ status: 'ready', run, artifacts });
  }, [runId, runState]);

  const filtered = useMemo(() => {
    if (state.status !== 'ready') return [];
    return state.artifacts.filter(item => {
      const matchesType = typeFilter === 'all' || item.attachment.type === typeFilter;
      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term ||
        item.testTitle.toLowerCase().includes(term) ||
        item.testId.toLowerCase().includes(term) ||
        (item.attachment.description ?? '').toLowerCase().includes(term);
      return matchesType && matchesSearch;
    });
  }, [state, typeFilter, search]);

  if (state.status === 'loading' || state.status === 'idle') {
    return <div className="card">Loading artifacts...</div>;
  }

  if (state.status === 'error') {
    return (
      <div className="card">
        <div>Failed to load artifacts: {state.error}</div>
        <div style={{ marginTop: 8 }}>
          <Link to="/">Back</Link>
        </div>
      </div>
    );
  }

  const counts = countByType(state.artifacts);
  const isLive = mode === 'live';

  return (
    <div className="card">
      <div className="artifacts__header">
        <div>
          <div className="muted" style={{ marginBottom: 4 }}>
            <Link to={`/runs/${runId}`}>← Overview</Link> ·{' '}
            <Link to={`/runs/${runId}/index`}>Execution Index</Link>
          </div>
          <h2 style={{ margin: 0 }}>Artifacts & Evidence</h2>
          <div className="muted">
            {formatDateTime(state.run.startTime)} · {state.run.environment.git?.branch ?? 'unknown'}@
            {state.run.environment.git?.commit?.slice(0, 7) ?? 'unknown'}
            {isLive && ' · LIVE'}
          </div>
        </div>
        <div className="artifacts__counts">
          {(['screenshot', 'video', 'trace', 'log', 'other'] as AttachmentType[]).map(type => (
            <div key={type} className="badge">
              {type}: {counts[type] ?? 0}
            </div>
          ))}
        </div>
      </div>

      <div className="artifacts__filters">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as AttachmentType | 'all')}>
          <option value="all">All types</option>
          <option value="screenshot">Screenshots</option>
          <option value="video">Videos</option>
          <option value="trace">Traces</option>
          <option value="log">Logs</option>
          <option value="other">Other</option>
        </select>
        <input
          placeholder="Search by test title or id"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="view-toggle">
          <button
            className={view === 'grid' ? 'active' : ''}
            onClick={() => setView('grid')}
          >
            Grid
          </button>
          <button
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
          >
            List
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">No artifacts found for this filter.</div>
      ) : view === 'grid' ? (
        <div className="artifacts__grid">
          {filtered.map(item => (
            <ArtifactCard
              key={item.attachment.id}
              item={item}
              onSelect={setSelected}
            />
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Test</th>
                <th>Time</th>
                <th>Links</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.attachment.id}>
                  <td>{item.attachment.description || item.attachment.type}</td>
                  <td>{item.attachment.type}</td>
                  <td>{item.testTitle}</td>
                  <td>{item.attachment.timestamp ? formatDateTime(item.attachment.timestamp) : '—'}</td>
                  <td>
                    <Link to={`/${item.attachment.path}`} target="_blank" rel="noreferrer">
                      Open
                    </Link>
                    {' · '}
                    <Link to={`/runs/${runId}/tests/${item.testId}/debugger`}>Debugger</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <SidePanel item={selected} onClose={() => setSelected(undefined)} runId={runId!} />
      )}
    </div>
  );
}

function extractArtifacts(run: TestRun): ArtifactItem[] {
  const items: ArtifactItem[] = [];
  for (const test of run.projects.flatMap(p => p.tests)) {
    for (const att of test.attachments ?? []) {
      items.push({
        attachment: att,
        testId: test.testId,
        testTitle: test.title,
        timestamp: att.timestamp
      });
    }
    for (const step of test.steps ?? []) {
      for (const att of step.attachments ?? []) {
        items.push({
          attachment: att,
          testId: test.testId,
          testTitle: test.title,
          stepTitle: step.title,
          timestamp: att.timestamp
        });
      }
    }
  }
  return items;
}

function countByType(items: ArtifactItem[]): Record<AttachmentType, number> {
  return items.reduce(
    (acc, item) => {
      acc[item.attachment.type] = (acc[item.attachment.type] ?? 0) + 1;
      return acc;
    },
    { screenshot: 0, video: 0, trace: 0, log: 0, other: 0 } as Record<AttachmentType, number>
  );
}

function ArtifactCard({
  item,
  onSelect
}: {
  item: ArtifactItem;
  onSelect: (item: ArtifactItem) => void;
}): JSX.Element {
  const type = item.attachment.type;
  const content = (() => {
    if (type === 'screenshot') {
      return <img src={`/${item.attachment.path}`} alt={item.attachment.description ?? item.attachment.type} />;
    }
    if (type === 'video') {
      return (
        <video controls>
          <source src={`/${item.attachment.path}`} type={item.attachment.contentType} />
        </video>
      );
    }
    if (type === 'trace') {
      return <div className="artifact__icon">🔍</div>;
    }
    if (type === 'log') {
      return <div className="artifact__icon">📜</div>;
    }
    return <div className="artifact__icon">📁</div>;
  })();

  return (
    <div className="artifact-card" onClick={() => onSelect(item)}>
      <div className="artifact-card__preview">{content}</div>
      <div className="artifact-card__meta">
        <div className="artifact-card__title">{item.attachment.description || item.attachment.type}</div>
        <div className="muted">{item.testTitle}</div>
        <div className="muted">
          {item.attachment.timestamp ? formatDateTime(item.attachment.timestamp) : '—'}
        </div>
      </div>
    </div>
  );
}

function SidePanel({
  item,
  onClose,
  runId
}: {
  item: ArtifactItem;
  onClose: () => void;
  runId: string;
}): JSX.Element {
  const type = item.attachment.type;
  return (
    <div className="artifact-panel">
      <div className="artifact-panel__header">
        <div>
          <div className="muted" style={{ marginBottom: 4 }}>
            {type.toUpperCase()}
          </div>
          <div style={{ fontWeight: 700 }}>{item.attachment.description || item.attachment.type}</div>
          <div className="muted">{item.testTitle}</div>
        </div>
        <button onClick={onClose} className="artifact-panel__close">
          ✕
        </button>
      </div>
      <div className="artifact-panel__body">
        {type === 'screenshot' && (
          <img src={`/${item.attachment.path}`} alt={item.attachment.description ?? item.attachment.type} />
        )}
        {type === 'video' && (
          <video controls style={{ width: '100%' }}>
            <source src={`/${item.attachment.path}`} type={item.attachment.contentType} />
          </video>
        )}
        {type === 'trace' && (
          <a href={`/${item.attachment.path}`} target="_blank" rel="noreferrer">
            Download trace
          </a>
        )}
        {type === 'log' && (
          <iframe
            src={`/${item.attachment.path}`}
            title="log"
            style={{ width: '100%', height: 240, border: '1px solid #1f2533', borderRadius: 8 }}
          />
        )}
      </div>
      <div className="artifact-panel__meta">
        <div className="muted">Path: {item.attachment.path}</div>
        <div className="muted">Type: {item.attachment.contentType}</div>
        <div className="muted">
          Timestamp: {item.attachment.timestamp ? formatDateTime(item.attachment.timestamp) : '—'}
        </div>
        <div style={{ marginTop: 10 }}>
          <Link to={`/runs/${runId}/tests/${item.testId}/debugger`}>Open Debugger</Link>
          {' · '}
          <Link to={`/tests/${item.testId}/history`}>Test History</Link>
        </div>
      </div>
    </div>
  );
}

