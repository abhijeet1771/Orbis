import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type {
  TestRun,
  TestCaseResult,
  TestStep,
  FailureInfo,
  StackFrameInfo,
  AttachmentInfo,
  ConsoleLogEntry,
  NetworkRequestInfo
} from '@orbisreport/core';
import { useRunData } from '../data/useRunData';
import { formatDuration } from '../util/format';
import './debugger.css';
import { CodeViewer } from './CodeViewer';
import { EmptyState } from '../../common/empty/EmptyState';
import { SkeletonTree, SkeletonDetail } from '../../common/skeleton';
import { StatusBadge } from '../../common/status/StatusBadge';
import { useDataContext } from '../data/DataContext';
import { useTrustIndex } from '../data/useTrustIndex';
import { TrustBadge } from '../../common/trust/TrustBadge';
import { TrustExplain } from '../../common/trust/TrustExplain';
import { resolveOwnership } from '../../common/ownership/ownership';
import { computeGovernanceSignals } from '../../common/governance/governance';

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; run: TestRun; test: TestCaseResult };

type NodeType = 'failure' | 'step' | 'frame' | 'attachment' | 'console' | 'network';

interface TreeNode {
  id: string;
  label: string;
  type: NodeType;
  depth: number;
  children: string[];
  parentId?: string;
  data:
    | { failure: FailureInfo }
    | { step: TestStep }
    | { frame: StackFrameInfo }
    | { attachment: AttachmentInfo }
    | { console: ConsoleLogEntry }
    | { network: NetworkRequestInfo };
}

interface FailurePathResult {
  nodes: Map<string, TreeNode>;
  order: string[];
  failurePath: string[];
}

export function DebuggerPage(): JSX.Element {
  const { runId, testId } = useParams<{ runId: string; testId: string }>();
  const navigate = useNavigate();
  const runState = useRunData(runId);
  const trustState = useTrustIndex(runId);
  const { mode } = useDataContext();
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const treeRef = useRef<HTMLDivElement | null>(null);
  const userControlUntil = useRef<number>(0);
  const seenFailureIds = useRef<Set<string>>(new Set());
  const seenAttachments = useRef<Set<string>>(new Set());
  const [newFailureNotice, setNewFailureNotice] = useState<string | null>(null);
  const [showAllEvidence, setShowAllEvidence] = useState(false);

  useEffect(() => {
    if (!runId || !testId) return;
    if (runState.status === 'loading' || runState.status === 'idle') {
      setState({ status: 'loading' });
      return;
    }
    if (runState.status === 'error') {
      setState({ status: 'error', error: runState.error });
      return;
    }
    const run = runState.run;
    if (!run) return;
    const test = run.projects.flatMap(p => p.tests).find(t => t.testId === testId);
    if (!test) {
      setState({ status: 'error', error: 'Test not found' });
      return;
    }
    setState({ status: 'ready', run, test });
  }, [runId, testId, runState]);

  const tree = useMemo<FailurePathResult>(() => {
    if (state.status !== 'ready') return { nodes: new Map<string, TreeNode>(), order: [] as string[], failurePath: [] as string[] };
    return buildTree(state.test);
  }, [state]);

  useEffect(() => {
    if (state.status !== 'ready') return;
    const failingSteps = state.test.steps.filter(s => s.failure);
    const newFailures = new Set<string>([
      ...(state.test.failure ? [`${state.test.testId}-failure`] : []),
      ...failingSteps.map(s => s.stepId)
    ]);
    let shouldAutoFocus = false;
    newFailures.forEach(id => {
      if (!seenFailureIds.current.has(id)) shouldAutoFocus = true;
    });
    if (Date.now() < userControlUntil.current) {
      shouldAutoFocus = false;
    }
    if (shouldAutoFocus) {
      const failurePathIds = tree.failurePath.length ? tree.failurePath : [];
      if (failurePathIds.length) {
        setSelectedId(failurePathIds[failurePathIds.length - 1]);
        setExpanded(new Set(failurePathIds));
      } else {
        const targetStep = failingSteps[failingSteps.length - 1];
        if (targetStep) {
          setSelectedId(targetStep.stepId);
          const chain: string[] = [];
          let parent = targetStep.parentStepId;
          while (parent) {
            chain.push(parent);
            const p = state.test.steps.find(s => s.stepId === parent);
            parent = p?.parentStepId;
          }
          setExpanded(prev => new Set([...prev, targetStep.stepId, ...chain]));
        } else if (state.test.failure) {
          const failureId = `${state.test.testId}-failure`;
          setSelectedId(failureId);
          setExpanded(prev => new Set([...prev, failureId]));
        }
      }
      newFailures.forEach(id => seenFailureIds.current.add(id));
      setNewFailureNotice(null);
    } else {
      if (mode === 'live' && newFailures.size > 0) {
        const failurePathIds = tree.failurePath.length ? tree.failurePath : [];
        const target = failurePathIds.length ? failurePathIds[failurePathIds.length - 1] : undefined;
        setNewFailureNotice(target ?? 'new-failure');
      }
    }
  }, [state, tree.failurePath, mode]);

  useEffect(() => {
    if (state.status !== 'ready') return;
    const path = tree.failurePath;
    if (path.length) {
      setSelectedId(path[path.length - 1]);
      setExpanded(new Set(path));
    } else {
      const firstFailure = Array.from(tree.order).find(id => tree.nodes.get(id)?.type === 'failure');
      if (firstFailure) {
        setSelectedId(firstFailure);
        const children = tree.nodes.get(firstFailure)?.children ?? [];
        setExpanded(new Set([firstFailure, ...children]));
      }
    }
    queueMicrotask(() => {
      treeRef.current?.focus();
    });
  }, [state.status, tree.failurePath, tree.order, tree.nodes]);

  const visibleOrder = useMemo(() => {
    return flattenVisible(tree, expanded);
  }, [tree, expanded]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selectedId) return;
      if (visibleOrder.length === 0) return;
      const idx = visibleOrder.indexOf(selectedId);
      if (e.key === 'ArrowDown') {
        const next = visibleOrder[idx + 1];
        if (next) setSelectedId(next);
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        const prev = visibleOrder[idx - 1];
        if (prev) setSelectedId(prev);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        if (!expanded.has(selectedId) && (tree.nodes.get(selectedId)?.children.length ?? 0) > 0) {
          setExpanded(new Set([...expanded, selectedId]));
        } else {
          const next = visibleOrder[idx + 1];
          if (next) setSelectedId(next);
        }
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        if (expanded.has(selectedId)) {
          const copy = new Set(expanded);
          copy.delete(selectedId);
          setExpanded(copy);
        } else {
          const parent = tree.nodes.get(selectedId)?.parentId;
          if (parent) setSelectedId(parent);
        }
        e.preventDefault();
      }
    },
    [expanded, selectedId, tree.nodes, visibleOrder]
  );

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="debugger">
        <div className="debugger__header">
          <SkeletonLine width="40%" />
        </div>
        <div className="debugger__body">
          <div className="debugger__tree">
            <SkeletonTree rows={8} />
          </div>
          <div className="debugger__detail">
            <SkeletonDetail />
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="card">
        <EmptyState
          title="Debugger unavailable"
          description={state.error ?? 'Unable to load debugger data.'}
          actionLabel="Back to run"
          onAction={() => navigate(runId ? `/runs/${runId}` : '/')}
          size="md"
        />
      </div>
    );
  }

  const selectedNode = selectedId ? tree.nodes.get(selectedId) : undefined;
  const trust =
    trustState.status === 'ready' && testId ? trustState.trustByTestId?.[testId] : undefined;
  const ownership = state.status === 'ready' ? resolveOwnership(state.test) : undefined;
  const governance =
    state.status === 'ready'
      ? computeGovernanceSignals({
          tests: [state.test],
          trust: trustState.status === 'ready' ? trustState.trustByTestId : undefined,
          regressions: undefined,
          ownership: ownership ? { [state.test.testId]: ownership } : undefined
        })
      : undefined;

  return (
    <div className="debugger">
      <div className="debugger__header">
        <div>
          <div className="muted" style={{ marginBottom: 4 }}>
            <Link to={`/runs/${runId}`}>← Back to run</Link>
            {' · '}
            <Link to={`/runs/${runId}/tests/${testId}`}>Test Case</Link>
            {' · '}
            <Link to={`/tests/${testId}/history`}>History</Link>
            {' · '}
            <Link to={`/runs/${runId}/explorer`}>Explorer</Link>
            {' · '}
            <Link to={`/runs/${runId}/artifacts`}>Artifacts</Link>
          </div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{state.test.title}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {state.test.testId}
          </div>
          {mode === 'live' && (
            <div className="pill pill--skipped" style={{ display: 'inline-block', marginTop: 4 }}>
              LIVE mode
            </div>
          )}
        </div>
        <div>
          <StatusBadge status={state.test.status} />
          <div style={{ marginTop: 6 }}>
            <TrustBadge trust={trust} />
          </div>
          {ownership && (
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              Owner: {ownership.ownerTeam ?? '—'} · Feature: {ownership.featureArea ?? '—'} · Severity:{' '}
              {ownership.severity ?? '—'}
            </div>
          )}
        </div>
      </div>
      {mode === 'live' && newFailureNotice && (
        <div className="card" style={{ marginTop: 8, padding: 10, borderColor: '#3a82f7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#e6e9f0' }}>New failure detected</div>
            <button
              className="mode-toggle"
              onClick={() => {
                if (tree.failurePath.length) {
                  setSelectedId(tree.failurePath[tree.failurePath.length - 1]);
                  setExpanded(new Set(tree.failurePath));
                }
                setNewFailureNotice(null);
                userControlUntil.current = Date.now() + 8000;
              }}
            >
              View
            </button>
          </div>
        </div>
      )}
      {trust && (
        <div className="card" style={{ marginTop: 8, padding: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#e6e9f0' }}>Test trust</div>
              <div className="muted" style={{ marginTop: 4 }}>How reliable is this test historically?</div>
            </div>
            <TrustBadge trust={trust} />
          </div>
          <TrustExplain trust={trust} />
        </div>
      )}
      {governance && (
        <div className="card" style={{ marginTop: 8, padding: 10 }}>
          <div style={{ fontWeight: 600, color: '#e6e9f0' }}>Governance context</div>
          <div className="muted" style={{ marginTop: 4 }}>
            This may impact release confidence because it triggered: {governance.perTest[state.test.testId] ?? 'info'}.
          </div>
          <div className="muted" style={{ marginTop: 4 }}>
            Signals consider trust, severity, regressions, and duration. Informational only; no enforcement applied.
          </div>
        </div>
      )}
      <div className="debugger__body">
        <div
          className="debugger__tree"
          tabIndex={0}
          onKeyDown={handleKey}
          ref={treeRef}
          aria-label="Failure tree"
        >
          {visibleOrder.map(id => {
            const node = tree.nodes.get(id)!;
            const isSelected = node.id === selectedId;
            const hasChildren = node.children.length > 0;
            const isExpanded = expanded.has(node.id);
            return (
              <div
                key={id}
                className={`tree-node ${isSelected ? 'tree-node--selected' : ''}`}
                style={{ paddingLeft: node.depth * 14 }}
                onClick={() => {
                  userControlUntil.current = Date.now() + 12000;
                  setSelectedId(node.id);
                }}
              >
                {hasChildren && (
                  <button
                    className="tree-node__toggle"
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
                )}
                {!hasChildren && <span className="tree-node__spacer" />}
                <span className={`tree-node__icon tree-node__icon--${node.type}`} />
                <span>{node.label}</span>
              </div>
            );
          })}
        </div>
        <div className="debugger__detail">
          {tree.order.length === 0 ? (
            <EmptyState
              title="No failure details yet"
              description="When a failure is reported, steps and evidence will land here instantly."
              size="md"
            />
          ) : selectedNode ? (
            <DetailPanel node={selectedNode} test={state.test} />
          ) : (
            <div className="muted">Select a node to inspect details</div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildTree(test: TestCaseResult): FailurePathResult {
  const nodes = new Map<string, TreeNode>();
  const order: string[] = [];
  const failurePath: string[] = [];

  const addNode = (node: TreeNode) => {
    nodes.set(node.id, node);
    order.push(node.id);
  };

  const rootChildren: string[] = [];
  let failureId: string | undefined;

  // Failure root
  if (test.failure) {
    failureId = `${test.testId}-failure`;
    addNode({
      id: failureId,
      label: test.failure.message,
      type: 'failure',
      depth: 0,
      children: [],
      data: { failure: test.failure }
    });
    rootChildren.push(failureId);
  }

  // Steps
  if (test.steps.length) {
    const stepsParentId = `${test.testId}-steps`;
    const stepTree = buildStepTree(test.steps, stepsParentId, failureId ? 1 : 0, failureId);
    addNode({
      id: stepsParentId,
      label: 'Steps',
      type: 'step',
      depth: failureId ? 1 : 0,
      parentId: failureId,
      children: stepTree.filter(s => !s.parentId || s.parentId === stepsParentId).map(s => s.id),
      data: { step: test.steps[0] }
    });
    stepTree.forEach(node => addNode(node));
    rootChildren.push(stepsParentId);
  }

  // Attachments
  if (test.attachments?.length) {
    const parentId = `${test.testId}-attachments`;
    addNode({
      id: parentId,
      label: 'Attachments',
      type: 'attachment',
      depth: failureId ? 1 : 0,
      children: test.attachments.map((a, idx) => `${parentId}-${idx}`),
      parentId: failureId,
      data: { attachment: test.attachments[0] }
    });
    test.attachments.forEach((att, idx) => {
      addNode({
        id: `${parentId}-${idx}`,
        label: att.description || att.type,
        type: 'attachment',
        depth: (failureId ? 2 : 1),
        parentId,
        children: [],
        data: { attachment: att }
      });
    });
    rootChildren.push(parentId);
  }

  // Console logs
  if (test.consoleLogs?.length) {
    const parentId = `${test.testId}-console`;
    addNode({
      id: parentId,
      label: 'Console',
      type: 'console',
      depth: failureId ? 1 : 0,
      children: test.consoleLogs.map((_, idx) => `${parentId}-${idx}`),
      parentId: failureId,
      data: { console: test.consoleLogs[0] }
    });
    test.consoleLogs.forEach((log, idx) => {
      addNode({
        id: `${parentId}-${idx}`,
        label: `${new Date(log.timestamp).toLocaleTimeString()} · ${log.level}`,
        type: 'console',
        depth: (failureId ? 2 : 1),
        parentId,
        children: [],
        data: { console: log }
      });
    });
    rootChildren.push(parentId);
  }

  // Network
  if (test.network?.length) {
    const parentId = `${test.testId}-network`;
    addNode({
      id: parentId,
      label: 'Network',
      type: 'network',
      depth: failureId ? 1 : 0,
      children: test.network.map((_, idx) => `${parentId}-${idx}`),
      parentId: failureId,
      data: { network: test.network[0] }
    });
    test.network.forEach((net, idx) => {
      addNode({
        id: `${parentId}-${idx}`,
        label: `${net.method} ${net.url}`,
        type: 'network',
        depth: (failureId ? 2 : 1),
        parentId,
        children: [],
        data: { network: net }
      });
    });
    rootChildren.push(parentId);
  }

  // Stack frames
  const userFrames =
    test.failure?.userLandFrames?.filter(f => f.isUserLand).slice(0, 6) ??
    [];
  if (userFrames.length) {
    const parentId = `${test.testId}-frames`;
    addNode({
      id: parentId,
      label: 'Failure path',
      type: 'frame',
      depth: failureId ? 1 : 0,
      children: userFrames.map((_, idx) => `${parentId}-${idx}`),
      parentId: failureId,
      data: { frame: userFrames[0] }
    });
    userFrames.forEach((frame, idx) => {
      const id = `${parentId}-${idx}`;
      addNode({
        id,
        label: `${frame.function ?? '<anonymous>'} (${frame.file}:${frame.line ?? '?'})`,
        type: 'frame',
        depth: failureId ? 2 : 1,
        parentId,
        children: [],
        data: { frame }
      });
      failurePath.push(id);
    });
    rootChildren.push(parentId);
    failurePath.unshift(parentId);
  }

  if (failureId) {
    const failureNode = nodes.get(failureId);
    if (failureNode) {
      failureNode.children = rootChildren.filter(id => id !== failureId);
      nodes.set(failureId, failureNode);
    }
  }

  const autoPath = failureId ? [failureId, ...failurePath] : failurePath;
  return { nodes, order, failurePath: autoPath };
}

function buildStepTree(
  steps: TestStep[],
  parentGroupId: string,
  baseDepth: number,
  failureId?: string
): TreeNode[] {
  const byId = new Map<string, TestStep>();
  steps.forEach(s => byId.set(s.stepId, s));
  const children = new Map<string, TestStep[]>();
  steps.forEach(s => {
    if (!s.parentStepId) return;
    const arr = children.get(s.parentStepId) ?? [];
    arr.push(s);
    children.set(s.parentStepId, arr);
  });

  const result: TreeNode[] = [];

  function add(step: TestStep, depth: number, parentId?: string) {
    const id = step.stepId;
    const kids = children.get(step.stepId) ?? [];
    const node: TreeNode = {
      id,
      label: step.title,
      type: 'step',
      depth,
      parentId: parentId ?? parentGroupId,
      children: kids.map(k => k.stepId),
      data: { step }
    };
    result.push(node);
    kids.forEach(k => add(k, depth + 1, id));
  }

  steps.filter(s => !s.parentStepId).forEach(root => add(root, baseDepth + 1, parentGroupId));
  return result;
}

function flattenVisible(tree: { nodes: Map<string, TreeNode>; order: string[] }, expanded: Set<string>) {
  const visible: string[] = [];
  const nodeMap = tree.nodes;
  const roots = tree.order.filter(id => !nodeMap.get(id)?.parentId);

  const walk = (id: string) => {
    visible.push(id);
    const node = nodeMap.get(id);
    if (!node) return;
    if (node.children.length && expanded.has(id)) {
      node.children.forEach(childId => walk(childId));
    }
  };

  roots.forEach(r => walk(r));
  return visible;
}

function failureTimestamp(test: TestCaseResult, _failure: FailureInfo): number | undefined {
  return test.timing?.endTime ?? test.timing?.startTime ?? Date.now();
}

function frameTimestamp(_frame: StackFrameInfo, test: TestCaseResult): number | undefined {
  return test.timing?.endTime ?? test.timing?.startTime;
}

function EvidencePanel({
  test,
  anchorTimestamp,
  windowBefore = 10_000,
  windowAfter = 5_000
}: {
  test: TestCaseResult;
  anchorTimestamp?: number;
  windowBefore?: number;
  windowAfter?: number;
}): JSX.Element | null {
  const [showAll, setShowAll] = useState(false);
  if (!anchorTimestamp) return null;

  const windowStart = anchorTimestamp - windowBefore;
  const windowEnd = anchorTimestamp + windowAfter;

  const attachments = collectAttachments(test);
  const filteredAttachments = showAll
    ? attachments
    : attachments.filter(a => a.timestamp && a.timestamp >= windowStart && a.timestamp <= windowEnd);

  const logs = test.consoleLogs ?? [];
  const filteredLogs = showAll
    ? logs
    : logs.filter(l => l.timestamp >= windowStart && l.timestamp <= windowEnd);

  const network = test.network ?? [];
  const filteredNetwork = showAll
    ? network
    : network.filter(n => n.startTime >= windowStart && n.startTime <= windowEnd);

  const hasEvidence = filteredAttachments.length || filteredLogs.length || filteredNetwork.length;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>Evidence Around Failure</h4>
        <label style={{ color: '#9aa3b5', fontSize: 12 }}>
          <input
            type="checkbox"
            checked={showAll}
            onChange={e => setShowAll(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Show all evidence
        </label>
      </div>
      {!hasEvidence ? (
        <div className="muted" style={{ marginTop: 6 }}>
          No correlated evidence in the selected window.
        </div>
      ) : (
        <>
          <details open>
            <summary>Logs ({filteredLogs.length})</summary>
            {filteredLogs.length === 0 ? (
              <div className="muted">No logs in window.</div>
            ) : (
              filteredLogs.map(log => (
                <div key={log.id} style={{ marginTop: 6 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {relativeTime(log.timestamp, anchorTimestamp)}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{log.message}</div>
                </div>
              ))
            )}
          </details>
          <details style={{ marginTop: 8 }} open>
            <summary>Network ({filteredNetwork.length})</summary>
            {filteredNetwork.length === 0 ? (
              <div className="muted">No network entries in window.</div>
            ) : (
              filteredNetwork.map(net => (
                <div key={net.id} style={{ marginTop: 6 }}>
                  <div>
                    {net.method} {net.url} · {net.status ?? '—'}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {relativeTime(net.startTime, anchorTimestamp)}
                  </div>
                </div>
              ))
            )}
          </details>
          <details style={{ marginTop: 8 }} open>
            <summary>Artifacts ({filteredAttachments.length})</summary>
            {filteredAttachments.length === 0 ? (
              <div className="muted">No artifacts in window.</div>
            ) : (
              filteredAttachments.map(att => (
                <div key={att.id} style={{ marginTop: 6 }}>
                  <div>{att.description || att.type}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {relativeTime(att.timestamp ?? anchorTimestamp, anchorTimestamp)}
                  </div>
                  <div>
                    <a href={`/${att.path}`} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </div>
                </div>
              ))
            )}
          </details>
        </>
      )}
    </div>
  );
}

function collectAttachments(test: TestCaseResult): Array<AttachmentInfo & { timestamp?: number }> {
  const root = (test.attachments ?? []).map(att => ({ ...att }));
  const stepAttachments = test.steps.flatMap(step =>
    (step.attachments ?? []).map(att => ({
      ...att,
      timestamp: att.timestamp ?? step.timing.endTime ?? step.timing.startTime
    }))
  );
  return [...root, ...stepAttachments];
}

function relativeTime(ts: number, anchor: number): string {
  const deltaMs = ts - anchor;
  const seconds = deltaMs / 1000;
  const label = seconds.toFixed(1) + 's';
  return seconds === 0 ? '0.0s' : seconds > 0 ? `+${label}` : label;
}
function DetailPanel({ node, test }: { node: TreeNode; test: TestCaseResult }): JSX.Element {
  switch (node.type) {
    case 'failure': {
      const failure = (node.data as { failure: FailureInfo }).failure;
      return (
        <div>
          <h3>Failure</h3>
          <div style={{ whiteSpace: 'pre-wrap' }}>{failure.message}</div>
          {failure.failedAt && (
            <div className="muted" style={{ marginTop: 8 }}>
              {failure.failedAt.file}:{failure.failedAt.line}:{failure.failedAt.column}
            </div>
          )}
          {failure.stacktrace && (
            <details style={{ marginTop: 8 }}>
              <summary>Stacktrace</summary>
              <pre className="stacktrace">{failure.stacktrace}</pre>
            </details>
          )}
          <EvidencePanel test={test} anchorTimestamp={failureTimestamp(test, failure)} />
        </div>
      );
    }
    case 'step': {
      const step = (node.data as { step: TestStep }).step;
      return (
        <div>
          <h3>Step</h3>
          <div style={{ marginBottom: 6 }}>{step.title}</div>
          <StatusBadge
            status={
              step.status === 'failed'
                ? 'failed'
                : step.status === 'passed'
                  ? 'passed'
                  : step.status === 'running'
                    ? 'running'
                    : 'skipped'
            }
          />
          <div className="muted" style={{ marginTop: 6 }}>
            Duration: {formatDuration(step.timing.durationMs ?? 0)}
          </div>
          {step.metadata?.location && (
            <div className="muted" style={{ marginTop: 6 }}>
              {step.metadata.location.file}:{step.metadata.location.line}:{step.metadata.location.column}
            </div>
          )}
          {step.failure?.message && (
            <div style={{ marginTop: 10 }}>
              <strong>Failure:</strong>
              <div style={{ whiteSpace: 'pre-wrap' }}>{step.failure.message}</div>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <EvidencePanel test={test} anchorTimestamp={step.timing.endTime ?? step.timing.startTime} />
          </div>
        </div>
      );
    }
    case 'frame': {
      const frame = (node.data as { frame: StackFrameInfo }).frame;
      return (
        <div>
          <h3>Stack Frame</h3>
          <div className="muted">
            {frame.file}:{frame.line}:{frame.column}
          </div>
          <div style={{ marginTop: 8 }}>
            <CodeViewer filePath={frame.file} highlightLine={frame.line} flashKey={`${node.id}-${frame.line}`} />
          </div>
          <EvidencePanel test={test} anchorTimestamp={frameTimestamp(frame, test)} />
        </div>
      );
    }
    case 'attachment': {
      const attachment = (node.data as { attachment: AttachmentInfo }).attachment;
      const isNew = !seenAttachments.current.has(attachment.id);
      seenAttachments.current.add(attachment.id);
      return (
        <div>
          <h3>Attachment</h3>
          <div>{attachment.description || attachment.type}</div>
          {isNew && <div className="pill pill--skipped" style={{ display: 'inline-block', marginTop: 4 }}>new</div>}
          <div className="muted" style={{ marginTop: 6 }}>
            {attachment.contentType} · {attachment.size ? `${attachment.size} bytes` : 'size unknown'}
          </div>
          <div style={{ marginTop: 10 }}>
            <a href={`/${attachment.path}`} target="_blank" rel="noreferrer">
              Open attachment
            </a>
          </div>
        </div>
      );
    }
    case 'console': {
      const log = (node.data as { console: ConsoleLogEntry }).console;
      return (
        <div>
          <h3>Console</h3>
          <div className="muted">{new Date(log.timestamp).toLocaleTimeString()}</div>
          <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{log.message}</div>
        </div>
      );
    }
    case 'network': {
      const net = (node.data as { network: NetworkRequestInfo }).network;
      return (
        <div>
          <h3>Network</h3>
          <div>{net.method} {net.url}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Status: {net.status ?? '—'} · {net.startTime ? new Date(net.startTime).toLocaleTimeString() : ''}
          </div>
          {net.failureText && (
            <div style={{ marginTop: 6, color: '#ff8a80' }}>{net.failureText}</div>
          )}
          {net.timing && (
            <div style={{ marginTop: 6 }}>
              <small className="muted">Timing (ms):</small>
              <div className="muted">
                dns {net.timing.dns ?? '-'} · connect {net.timing.connect ?? '-'} · ssl {net.timing.ssl ?? '-'} · ttfb {net.timing.ttfb ?? '-'} · download {net.timing.download ?? '-'} · total {net.timing.total ?? '-'}
              </div>
            </div>
          )}
        </div>
      );
    }
    default:
      return <div className="muted">Select a node to inspect details</div>;
  }
}

