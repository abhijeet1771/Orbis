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
import { StatusPill } from '../shared/StatusPill';
import { formatDuration } from '../util/format';
import './debugger.css';
import { CodeViewer } from './CodeViewer';

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

export function DebuggerPage(): JSX.Element {
  const { runId, testId } = useParams<{ runId: string; testId: string }>();
  const navigate = useNavigate();
  const runState = useRunData(runId);
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const treeRef = useRef<HTMLDivElement | null>(null);
  const userControlUntil = useRef<number>(0);
  const seenFailureIds = useRef<Set<string>>(new Set());
  const seenAttachments = useRef<Set<string>>(new Set());

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

  const tree = useMemo(() => {
    if (state.status !== 'ready') return { nodes: new Map<string, TreeNode>(), order: [] as string[] };
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
      newFailures.forEach(id => seenFailureIds.current.add(id));
    }
  }, [state]);

  useEffect(() => {
    if (state.status !== 'ready') return;
    const firstFailure = Array.from(tree.order).find(id => tree.nodes.get(id)?.type === 'failure');
    if (firstFailure) {
      setSelectedId(firstFailure);
      const children = tree.nodes.get(firstFailure)?.children ?? [];
      setExpanded(new Set([firstFailure, ...children]));
      queueMicrotask(() => {
        treeRef.current?.focus();
      });
    }
  }, [state.status, tree.order, tree.nodes]);

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
    return <div className="card">Loading debugger...</div>;
  }

  if (state.status === 'error') {
    return (
      <div className="card">
        <div>Failed to load debugger: {state.error}</div>
        <div style={{ marginTop: 8 }}>
          <Link to={runId ? `/runs/${runId}` : '/'}>Back</Link>
        </div>
      </div>
    );
  }

  const selectedNode = selectedId ? tree.nodes.get(selectedId) : undefined;

  return (
    <div className="debugger">
      <div className="debugger__header">
        <div>
          <div className="muted" style={{ marginBottom: 4 }}>
            <Link to={`/runs/${runId}`}>← Back to run</Link>
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
        </div>
        <div>
          <StatusPill status={state.test.status} />
        </div>
      </div>
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
          {selectedNode ? (
            <DetailPanel node={selectedNode} test={state.test} />
          ) : (
            <div className="muted">Select a node to inspect details</div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildTree(test: TestCaseResult): { nodes: Map<string, TreeNode>; order: string[] } {
  const nodes = new Map<string, TreeNode>();
  const order: string[] = [];

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
  if (test.failure?.userLandFrames?.length) {
    const parentId = `${test.testId}-frames`;
    addNode({
      id: parentId,
      label: 'Stack frames',
      type: 'frame',
      depth: failureId ? 1 : 0,
      children: test.failure.userLandFrames.map((_, idx) => `${parentId}-${idx}`),
      parentId: failureId,
      data: { frame: test.failure.userLandFrames[0] }
    });
    test.failure.userLandFrames.forEach((frame, idx) => {
      addNode({
        id: `${parentId}-${idx}`,
        label: `${frame.function ?? '<anonymous>'} (${frame.file}:${frame.line ?? '?'})`,
        type: 'frame',
        depth: (failureId ? 2 : 1),
        parentId,
        children: [],
        data: { frame }
      });
    });
    rootChildren.push(parentId);
  }

  if (failureId) {
    const failureNode = nodes.get(failureId);
    if (failureNode) {
      failureNode.children = rootChildren.filter(id => id !== failureId);
      nodes.set(failureId, failureNode);
    }
  }

  return { nodes, order };
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
        </div>
      );
    }
    case 'step': {
      const step = (node.data as { step: TestStep }).step;
      return (
        <div>
          <h3>Step</h3>
          <div style={{ marginBottom: 6 }}>{step.title}</div>
          <StatusPill status={step.status === 'failed' ? 'failed' : step.status === 'passed' ? 'passed' : 'skipped'} />
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

