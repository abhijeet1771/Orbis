import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { TestRun, TestCaseResult, TestStatus } from '@orbisreport/core';
import { useRunData } from '../data/useRunData';
import { EmptyState } from '../../common/empty/EmptyState';
import { SkeletonTree, SkeletonDetail, SkeletonLine } from '../../common/skeleton';
import { StatusLabel } from '../../common/status/StatusLabel';
import { StatusBadge } from '../../common/status/StatusBadge';
import { useTrustIndex } from '../data/useTrustIndex';
import { useRegression } from '../data/useRegression';
import type { RegressionEntry } from '../../common/regression/regression';
import './explorer.css';
import { formatDuration } from '../util/format';
import { resolveOwnership, pickHigherSeverity, type OwnershipInfo } from '../../common/ownership/ownership';

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; run: TestRun; tree: ExplorerTree };

type NodeType = 'folder' | 'file' | 'test';

interface ExplorerNodeBase {
  id: string;
  name: string;
  type: NodeType;
  parentId?: string;
  children: string[];
  depth: number;
  status: AggregatedStatus;
  hasRegression?: boolean;
  ownership?: OwnershipInfo;
  highestSeverity?: string;
}

type ExplorerNode =
  | (ExplorerNodeBase & { type: 'folder' })
  | (ExplorerNodeBase & { type: 'file'; path: string })
  | (ExplorerNodeBase & { type: 'test'; test: TestCaseResult; path: string });

interface ExplorerTree {
  nodes: Map<string, ExplorerNode>;
  roots: string[];
}

interface AggregatedStatus {
  worst: TestStatus;
  counts: Record<TestStatus, number>;
}

export function ExplorerPage(): JSX.Element {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const runState = useRunData(runId);
  const trustState = useTrustIndex(runId);
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const treeRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState('');

  const trustByTestId = trustState.status === 'ready' ? trustState.trustByTestId : undefined;
  const regressionState = useRegression(runId, runState.run, trustByTestId);

  useEffect(() => {
    if (!runId) return;
    if (
      runState.status === 'loading' ||
      runState.status === 'idle' ||
      trustState.status === 'loading' ||
      regressionState.status === 'loading'
    ) {
      setState({ status: 'loading' });
      return;
    }
    if (runState.status === 'error') {
      setState({ status: 'error', error: runState.error ?? 'Failed to load run' });
      return;
    }
    if (regressionState.status === 'error') {
      setState({ status: 'error', error: regressionState.error });
      return;
    }
    const run = runState.run;
    if (!run) return;
    const regs = regressionState.status === 'ready' ? regressionState.data.byTestId : undefined;
    const tree = buildTree(run, regs);
    const autoExpanded = defaultExpanded(tree);
    setExpanded(autoExpanded);
    setSelectedId(tree.roots[0]);
    setState({ status: 'ready', run, tree });
    queueMicrotask(() => treeRef.current?.focus());
  }, [runId, runState, trustState.status, regressionState]);

  const visible = useMemo(() => {
    if (state.status !== 'ready') return [];
    return flatten(state.tree, expanded, search);
  }, [state, expanded, search]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (state.status !== 'ready') return;
      if (!selectedId) return;
      const ids = visible.map(n => n.id);
      const idx = ids.indexOf(selectedId);
      if (e.key === 'ArrowDown') {
        const next = ids[idx + 1];
        if (next) setSelectedId(next);
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        const prev = ids[idx - 1];
        if (prev) setSelectedId(prev);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        const node = state.tree.nodes.get(selectedId);
        if (node && node.children.length && !expanded.has(node.id)) {
          setExpanded(new Set([...expanded, node.id]));
        }
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        if (expanded.has(selectedId)) {
          const copy = new Set(expanded);
          copy.delete(selectedId);
          setExpanded(copy);
        } else {
          const node = state.tree.nodes.get(selectedId);
          if (node?.parentId) setSelectedId(node.parentId);
        }
        e.preventDefault();
      }
    },
    [expanded, selectedId, state, visible]
  );

  if (state.status === 'loading' || state.status === 'idle') {
    return <div className="card">Loading explorer...</div>;
  }

  if (state.status === 'error') {
    return (
      <div className="card">
        <div>Failed to load explorer: {state.error}</div>
        <div style={{ marginTop: 8 }}>
          <Link to="/">Back</Link>
        </div>
      </div>
    );
  }

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="explorer">
        <div className="explorer__header">
          <SkeletonLine width="40%" />
        </div>
        <div className="explorer__body">
          <div className="explorer__tree">
            <SkeletonTree rows={10} />
          </div>
          <div className="explorer__detail">
            <SkeletonDetail />
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'ready' && state.tree.roots.length === 0) {
    return (
      <EmptyState
        title="No suites or tests mapped yet"
        description="Once suites execute, they will be organized here by folder and file."
        size="md"
      />
    );
  }

  const selected = selectedId ? state.tree.nodes.get(selectedId) : undefined;

  return (
    <div className="explorer">
      <div className="explorer__header">
        <div>
          <div className="muted" style={{ marginBottom: 4 }}>
            <Link to={`/runs/${runId}`}>← Overview</Link> ·{' '}
            <Link to={`/runs/${runId}/index`}>Execution Index</Link>
          </div>
          <h2 style={{ margin: 0 }}>Suite / Class Explorer</h2>
          <div className="muted">{state.run.runId}</div>
        </div>
      </div>
      <div className="explorer__body">
        <div className="explorer__tree-search">
          <input
            placeholder="Search suites, files, tests"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="explorer__tree" tabIndex={0} onKeyDown={handleKey} ref={treeRef} aria-label="Suite explorer">
          {visible.map(node => {
            const isSelected = node.id === selectedId;
            const isExpanded = expanded.has(node.id);
            const hasChildren = node.children.length > 0;
            const failCount = node.status.counts.failed + node.status.counts.timedOut;
            const flakyCount = node.status.counts.flaky;
            return (
              <div
                key={node.id}
                className={`explorer__node ${isSelected ? 'explorer__node--selected' : ''}`}
                style={{ paddingLeft: node.depth * 14 }}
                onClick={() => {
                  if (node.type === 'test') {
                    navigate(`/runs/${runId}/tests/${(node as any).test.testId}/debugger`);
                  } else {
                    setSelectedId(node.id);
                  }
                }}
              >
                {hasChildren ? (
                  <button
                    className="explorer__toggle"
                    onClick={e => {
                      e.stopPropagation();
                      const copy = new Set(expanded);
                      if (isExpanded) copy.delete(node.id);
                      else copy.add(node.id);
                      setExpanded(copy);
                    }}
                  >
                    {isExpanded ? '▾' : '▸'}
                  </button>
                ) : (
                  <span className="explorer__spacer" />
                )}
                <span className={`explorer__icon explorer__icon--${node.type}`} />
                <span>{node.name}</span>
                {node.hasRegression && <span className="pill" style={{ borderColor: '#f6c659', marginLeft: 6 }}>regression</span>}
                {node.highestSeverity && (
                  <span className="pill" style={{ borderColor: '#7ab1ec', marginLeft: 6 }}>
                    {node.highestSeverity}
                  </span>
                )}
              <span className="explorer__status">
                <StatusLabel status={node.status.worst} />
              </span>
              {(failCount > 0 || flakyCount > 0) && (
                <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>
                  {failCount > 0 ? `F:${failCount}` : ''} {flakyCount > 0 ? `Fl:${flakyCount}` : ''}
                </span>
              )}
              </div>
            );
          })}
        </div>
        <div className="explorer__detail">
          {selected ? <Detail node={selected} runId={state.run.runId} tree={state.tree} /> : <div className="muted">Select a node</div>}
        </div>
      </div>
    </div>
  );
}

function Detail({ node, runId, tree }: { node: ExplorerNode; runId: string; tree: ExplorerTree }): JSX.Element {
  if (node.type === 'folder' || node.type === 'file') {
    const descendants = collectDescendants(tree, node.id).filter(n => n.type === 'test') as Array<
      ExplorerNode & { type: 'test'; test: TestCaseResult }
    >;
    const summary = summarize(descendants.map(d => d.test));
    return (
      <div>
        <h3>{node.name}</h3>
        <div className="grid">
          <Stat label="Total" value={summary.total} />
          <Stat label="Passed" value={summary.passed} />
          <Stat label="Failed" value={summary.failed} />
          <Stat label="Flaky" value={summary.flaky} />
          <Stat label="Skipped" value={summary.skipped} />
        </div>
        <div style={{ marginTop: 10 }}>
          <Link to={`/runs/${runId}/index`}>Open in Execution Index</Link>
        </div>
        {node.type === 'file' && (
          <div className="card" style={{ marginTop: 12, padding: 12 }}>
            {descendants.map(d => (
              <div key={d.test.testId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{d.test.title}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{d.test.testId}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <StatusBadge status={d.test.status} />
                  <div className="muted">{formatDuration(d.test.timing.durationMs ?? 0)}</div>
                  <Link to={`/runs/${runId}/tests/${d.test.testId}/debugger`}>Debugger</Link>
                  <Link to={`/tests/${d.test.testId}/history`}>History</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (node.type === 'test') {
    const test = node.test;
    return (
      <div>
        <h3>{test.title}</h3>
        <div className="muted">{test.testId}</div>
        <div style={{ marginTop: 8 }}>
          <StatusBadge status={test.status} />
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          Duration: {formatDuration(test.timing.durationMs ?? 0)}
        </div>
        <div style={{ marginTop: 10 }}>
          <Link to={`/runs/${runId}/tests/${test.testId}/debugger`}>Open debugger</Link>
          {' · '}
          <Link to={`/tests/${test.testId}/history`}>History</Link>
        </div>
      </div>
    );
  }

  return <div className="muted">Select a node</div>;
}

function buildTree(run: TestRun, regressions?: Record<string, RegressionEntry>): ExplorerTree {
  const nodes = new Map<string, ExplorerNode>();
  const roots: string[] = [];

  const ensureFolder = (pathParts: string[], depth: number, parentId?: string): string => {
    const id = pathParts.join('/') || '/';
    if (!nodes.has(id)) {
      const node: ExplorerNode = {
        id,
        name: pathParts[pathParts.length - 1] || '/',
        type: 'folder',
        parentId,
        children: [],
        depth,
        status: emptyStatus(),
        hasRegression: false
      };
      nodes.set(id, node);
      if (!parentId) roots.push(id);
      else nodes.get(parentId)?.children.push(id);
    }
    return id;
  };

  for (const test of run.projects.flatMap(p => p.tests)) {
    const norm = test.location.file.replace(/\\/g, '/');
    const parts = norm.split('/');
    const fileName = parts.pop() ?? 'unknown';
    let parentId: string | undefined;
    let depth = 0;
    for (let i = 0; i < parts.length; i++) {
      const folderPath = parts.slice(0, i + 1);
      const id = ensureFolder(folderPath, depth, parentId);
      parentId = id;
      depth += 1;
    }
    const fileId = `${parts.join('/')}/${fileName}`;
    if (!nodes.has(fileId)) {
      const fileNode: ExplorerNode = {
        id: fileId,
        name: fileName,
        type: 'file',
        path: norm,
        parentId: parentId,
        children: [],
        depth,
        status: emptyStatus(),
        hasRegression: false
      };
      nodes.set(fileId, fileNode);
      (parentId ? nodes.get(parentId) : undefined)?.children.push(fileId);
      if (!parentId) roots.push(fileId);
    }
    const testId = `${fileId}::${test.testId}`;
    const reg = regressions?.[test.testId];
    const ownership = resolveOwnership(test);
    const testNode: ExplorerNode = {
      id: testId,
      name: test.title,
      type: 'test',
      test,
      path: norm,
      parentId: fileId,
      children: [],
      depth: depth + 1,
      status: {
        worst: test.status,
        counts: singleStatus(test.status)
      },
      hasRegression: Boolean(reg),
      ownership,
      highestSeverity: ownership.severity
    };
    nodes.set(testId, testNode);
    nodes.get(fileId)?.children.push(testId);
  }

  // aggregate statuses bottom-up
  const ordered = Array.from(nodes.values()).sort((a, b) => b.depth - a.depth);
  for (const node of ordered) {
    if (node.type === 'test') continue;
    const childNodes = node.children.map(id => nodes.get(id)!).filter(Boolean);
    const agg = aggregate(childNodes.map(c => c.status));
    node.status = agg;
    node.hasRegression = childNodes.some(c => c.hasRegression);
    node.highestSeverity = childNodes.reduce<string | undefined>((acc, c) => {
      return pickHigherSeverity(acc as any, c.highestSeverity as any);
    }, undefined);
  }

  return { nodes, roots };
}

function aggregate(statuses: AggregatedStatus[]): AggregatedStatus {
  const counts: Record<TestStatus, number> = {
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
    timedOut: 0
  };
  let worst: TestStatus = 'passed';
  for (const s of statuses) {
    for (const key of Object.keys(counts) as TestStatus[]) {
      counts[key] += s.counts[key] ?? 0;
    }
    worst = worse(worst, s.worst);
  }
  return { worst, counts };
}

function emptyStatus(): AggregatedStatus {
  return {
    worst: 'passed',
    counts: { passed: 0, failed: 0, skipped: 0, flaky: 0, timedOut: 0 }
  };
}

function singleStatus(status: TestStatus): AggregatedStatus {
  return {
    worst: status,
    counts: {
      passed: status === 'passed' ? 1 : 0,
      failed: status === 'failed' ? 1 : 0,
      skipped: status === 'skipped' ? 1 : 0,
      flaky: status === 'flaky' ? 1 : 0,
      timedOut: status === 'timedOut' ? 1 : 0
    }
  };
}

function worse(a: TestStatus, b: TestStatus): TestStatus {
  const order: TestStatus[] = ['passed', 'skipped', 'flaky', 'timedOut', 'failed'];
  return order.indexOf(b) > order.indexOf(a) ? b : a;
}

function flatten(tree: ExplorerTree, expanded: Set<string>, search: string): ExplorerNode[] {
  const result: ExplorerNode[] = [];
  const term = search.trim().toLowerCase();
  const walk = (id: string) => {
    const node = tree.nodes.get(id);
    if (!node) return;
    const matches =
      !term ||
      node.name.toLowerCase().includes(term) ||
      (node.type === 'test' && node.test.title.toLowerCase().includes(term));
    if (matches) {
      result.push(node);
      if (node.children.length && expanded.has(id)) {
        node.children.forEach(childId => walk(childId));
      }
    } else if (node.children.length && expanded.has(id)) {
      const before = result.length;
      node.children.forEach(childId => walk(childId));
      const after = result.length;
      if (after > before) {
        result.push(node);
      }
    }
  };
  tree.roots.forEach(r => walk(r));
  return result;
}

function defaultExpanded(tree: ExplorerTree): Set<string> {
  const set = new Set<string>();
  for (const node of tree.nodes.values()) {
    if ((node.type === 'folder' || node.type === 'file') && node.status.worst !== 'passed') {
      set.add(node.id);
      if (node.parentId) set.add(node.parentId);
    }
  }
  return set;
}

function collectDescendants(tree: ExplorerTree, id: string): ExplorerNode[] {
  const result: ExplorerNode[] = [];
  const walk = (nid: string) => {
    const node = tree.nodes.get(nid);
    if (!node) return;
    result.push(node);
    node.children.forEach(child => walk(child));
  };
  walk(id);
  return result;
}

function summarize(tests: TestCaseResult[]) {
  const summary = { total: tests.length, passed: 0, failed: 0, flaky: 0, skipped: 0 };
  tests.forEach(t => {
    if (t.status === 'passed') summary.passed += 1;
    else if (t.status === 'failed' || t.status === 'timedOut') summary.failed += 1;
    else if (t.status === 'flaky') summary.flaky += 1;
    else if (t.status === 'skipped') summary.skipped += 1;
  });
  return summary;
}

function statusLabel(status: TestStatus): string {
  switch (status) {
    case 'passed':
      return '✓';
    case 'failed':
      return '✕';
    case 'flaky':
      return '~';
    case 'timedOut':
      return '⏱';
    case 'skipped':
    default:
      return '•';
  }
}

