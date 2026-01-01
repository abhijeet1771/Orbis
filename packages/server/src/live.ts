import { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import type {
  AttachmentInfo,
  FailureInfo,
  RunSummary,
  TestCaseResult,
  TestRun,
  TestStatus,
  TestStep
} from '@orbisreport/core';

export type LiveEventType =
  | 'run:start'
  | 'project:start'
  | 'test:start'
  | 'step:start'
  | 'step:end'
  | 'test:end'
  | 'attachment:add'
  | 'run:end';

export interface LiveEvent {
  type: LiveEventType;
  runId: string;
  seq: number;
  timestamp?: number;
  testId?: string;
  projectId?: string;
  payload?: Record<string, unknown>;
}

interface LiveStepState extends TestStep {
  attachments?: AttachmentInfo[];
}

interface LiveTestState {
  testId: string;
  title?: string;
  projectId?: string;
  status: TestStatus | 'running' | 'pending';
  timing?: { startTime?: number; endTime?: number; durationMs?: number };
  failure?: FailureInfo;
  steps: Map<string, LiveStepState>;
  attachments: AttachmentInfo[];
  tags?: string[];
}

interface LiveProjectState {
  projectId: string;
  name?: string;
  tests: Set<string>;
}

interface LiveRunState {
  runId: string;
  startTime?: number;
  config?: unknown;
  projects: Map<string, LiveProjectState>;
  tests: Map<string, LiveTestState>;
  summary: RunSummary;
  completed: boolean;
  lastSeq: number;
}

function toStepStatus(status: TestStatus): TestStep['status'] {
  if (status === 'failed') return 'failed';
  if (status === 'passed') return 'passed';
  if (status === 'skipped') return 'skipped';
  return 'running';
}

export class LiveRunStore {
  private state?: LiveRunState;
  private seenSeq = new Set<number>();

  get snapshot(): TestRun | undefined {
    if (!this.state) return undefined;
    return this.serialize();
  }

  apply(event: LiveEvent): boolean {
    if (!validateEvent(event)) return false;

    if (event.type === 'run:start') {
      this.reset(event);
      this.seenSeq.add(event.seq);
      return true;
    }

    if (!this.state || this.state.runId !== event.runId) {
      return false;
    }

    if (this.seenSeq.has(event.seq)) {
      return false;
    }
    this.seenSeq.add(event.seq);

    switch (event.type) {
      case 'project:start':
        this.handleProjectStart(event);
        break;
      case 'test:start':
        this.handleTestStart(event);
        break;
      case 'step:start':
        this.handleStepStart(event);
        break;
      case 'step:end':
        this.handleStepEnd(event);
        break;
      case 'attachment:add':
        this.handleAttachment(event);
        break;
      case 'test:end':
        this.handleTestEnd(event);
        break;
      case 'run:end':
        this.state.completed = true;
        break;
      default:
        break;
    }

    this.state.summary = computeSummary(this.state.tests);
    this.state.lastSeq = Math.max(this.state.lastSeq, event.seq);
    return true;
  }

  private reset(event: LiveEvent): void {
    this.state = {
      runId: event.runId,
      startTime: event.timestamp ?? Date.now(),
      config: event.payload?.config,
      projects: new Map(),
      tests: new Map(),
      summary: emptySummary(),
      completed: false,
      lastSeq: event.seq
    };
    this.seenSeq.clear();
  }

  private handleProjectStart(event: LiveEvent): void {
    if (!this.state) return;
    const projectId = (event.payload?.projectId as string) ?? event.projectId ?? randomUUID();
    const name = (event.payload?.name as string) ?? projectId;
    if (!this.state.projects.has(projectId)) {
      this.state.projects.set(projectId, { projectId, name, tests: new Set() });
    }
  }

  private handleTestStart(event: LiveEvent): void {
    if (!this.state || !event.testId) return;
    const projectId = (event.payload?.projectId as string) ?? event.projectId ?? 'default';
    const project = this.state.projects.get(projectId) ?? {
      projectId,
      name: projectId,
      tests: new Set<string>()
    };
    this.state.projects.set(projectId, project);
    project.tests.add(event.testId);

    const existing = this.state.tests.get(event.testId);
    const title = (event.payload?.title as string) ?? existing?.title ?? event.testId;
    const tags = Array.isArray(event.payload?.tags) ? (event.payload?.tags as string[]) : existing?.tags;

    this.state.tests.set(event.testId, {
      testId: event.testId,
      title,
      projectId,
      status: 'running',
      timing: { startTime: event.timestamp ?? Date.now() },
      steps: existing?.steps ?? new Map(),
      attachments: existing?.attachments ?? [],
      tags
    });
  }

  private handleStepStart(event: LiveEvent): void {
    if (!this.state || !event.testId) return;
    const test = this.state.tests.get(event.testId);
    if (!test) return;
    const stepId = (event.payload?.stepId as string) ?? randomUUID();
    const step: LiveStepState = {
      stepId,
      parentStepId: event.payload?.parentStepId as string | undefined,
      title: (event.payload?.title as string) ?? 'step',
      status: 'running',
      timing: { startTime: event.timestamp ?? Date.now() },
      category: event.payload?.category as TestStep['category'],
      failure: undefined,
      attachments: []
    };
    test.steps.set(stepId, step);
  }

  private handleStepEnd(event: LiveEvent): void {
    if (!this.state || !event.testId) return;
    const test = this.state.tests.get(event.testId);
    if (!test) return;
    const stepId = (event.payload?.stepId as string) ?? '';
    const step = test.steps.get(stepId);
    if (!step) return;
    const status = toStepStatus((event.payload?.status as TestStatus) ?? 'passed');
    const durationMs = event.payload?.durationMs as number | undefined;
    const endTime = event.timestamp ?? (step.timing?.startTime ?? Date.now()) + (durationMs ?? 0);
    step.status = status;
    step.timing = {
      startTime: step.timing?.startTime,
      endTime,
      durationMs: durationMs ?? (step.timing?.startTime ? endTime - step.timing.startTime : undefined)
    };
    const failure = event.payload?.failure as FailureInfo | undefined;
    if (failure) {
      step.failure = failure;
    }
    test.steps.set(stepId, step);
  }

  private handleAttachment(event: LiveEvent): void {
    if (!this.state || !event.testId) return;
    const test = this.state.tests.get(event.testId);
    if (!test) return;
    const attachment = event.payload?.attachment as AttachmentInfo | undefined;
    if (!attachment) return;
    const stepId = event.payload?.stepId as string | undefined;
    if (stepId && test.steps.has(stepId)) {
      const step = test.steps.get(stepId)!;
      step.attachments = [...(step.attachments ?? []), attachment];
      test.steps.set(stepId, step);
    } else {
      test.attachments.push(attachment);
    }
  }

  private handleTestEnd(event: LiveEvent): void {
    if (!this.state || !event.testId) return;
    const test = this.state.tests.get(event.testId);
    if (!test) return;
    const status = (event.payload?.status as TestStatus) ?? test.status;
    const durationMs = (event.payload?.durationMs as number | undefined) ?? test.timing?.durationMs;
    const endTime =
      event.timestamp ?? (test.timing?.startTime ?? Date.now()) + (durationMs ?? 0);
    test.status = status as TestStatus;
    test.timing = {
      startTime: test.timing?.startTime,
      endTime,
      durationMs: durationMs ?? (test.timing?.startTime ? endTime - test.timing.startTime : undefined)
    };
    if (event.payload?.failure) {
      test.failure = event.payload.failure as FailureInfo;
    }
    this.state.tests.set(event.testId, test);
  }

  private serialize(): TestRun {
    const projects = Array.from(this.state!.projects.values()).map(project => {
      const tests = Array.from(project.tests)
        .map(id => this.state!.tests.get(id))
        .filter(Boolean)
        .map(t => toTestCaseResult(t!));
      return {
        projectId: project.projectId,
        name: project.name ?? project.projectId,
        tests,
        summary: computeSummary(new Map(tests.map(t => [t.testId, fromTestCase(t)])))
      };
    });

    return {
      runId: this.state!.runId,
      schemaVersion: '1.0.0',
      startTime: this.state!.startTime ?? Date.now(),
      endTime: this.state!.completed ? Date.now() : undefined,
      environment: {
        os: { name: 'unknown' },
        runtime: { name: 'node', version: process.versions.node }
      },
      config: (this.state as LiveRunState).config as TestRun['config'],
      summary: computeSummary(this.state!.tests),
      projects
    };
  }
}

function validateEvent(event: Partial<LiveEvent>): event is LiveEvent {
  if (!event || typeof event !== 'object') return false;
  if (!event.type || !event.runId || typeof event.seq !== 'number') return false;
  return true;
}

function computeSummary(tests: Map<string, LiveTestState>): RunSummary {
  const summary: RunSummary = {
    total: tests.size,
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
    timedOut: 0,
    durationMs: 0
  };

  for (const test of tests.values()) {
    if (test.timing?.durationMs) summary.durationMs = (summary.durationMs ?? 0) + test.timing.durationMs;
    switch (test.status) {
      case 'passed':
        summary.passed += 1;
        break;
      case 'failed':
        summary.failed += 1;
        break;
      case 'flaky':
        summary.flaky += 1;
        break;
      case 'timedOut':
        summary.timedOut += 1;
        break;
      case 'skipped':
        summary.skipped += 1;
        break;
      default:
        break;
    }
  }

  return summary;
}

function normalizeStatus(status: LiveTestState['status']): TestStatus {
  if (status === 'passed' || status === 'failed' || status === 'flaky' || status === 'timedOut' || status === 'skipped') {
    return status;
  }
  return 'failed';
}

function emptySummary(): RunSummary {
  return {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
    timedOut: 0,
    durationMs: 0
  };
}

function toTestCaseResult(test: LiveTestState): TestCaseResult {
  const steps = Array.from(test.steps.values());
  const status = normalizeStatus(test.status);
  return {
    testId: test.testId,
    title: test.title ?? test.testId,
    location: (test as unknown as TestCaseResult).location ?? {
      file: test.projectId ?? 'unknown',
      line: 0,
      column: 0
    },
    tags: test.tags ?? [],
    status,
    timing: {
      startTime: test.timing?.startTime ?? Date.now(),
      endTime: test.timing?.endTime,
      durationMs: test.timing?.durationMs
    },
    retries: { maxRetries: 0, attempts: [] },
    steps,
    failure: test.failure,
    attachments: test.attachments,
    consoleLogs: undefined,
    network: undefined
  };
}

function fromTestCase(test: TestCaseResult): LiveTestState {
  return {
    testId: test.testId,
    title: test.title,
    projectId: 'unknown',
    status: test.status,
    timing: test.timing,
    failure: test.failure,
    steps: new Map(test.steps.map(s => [s.stepId, s])),
    attachments: test.attachments,
    tags: test.tags
  };
}

export interface SSEClient {
  id: string;
  res: ServerResponse;
}

export function registerSSEClient(
  res: ServerResponse,
  onClose: (id: string) => void,
  snapshot?: TestRun
): SSEClient {
  const id = randomUUID();
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  res.write('\n');
  if (snapshot) {
    sendSSE(res, { type: 'live:state:init', payload: snapshot });
  }
  res.on('close', () => onClose(id));
  return { id, res };
}

export function sendSSE(res: ServerResponse, data: unknown): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function handleIngestStream(
  req: IncomingMessage,
  res: ServerResponse,
  store: LiveRunStore,
  broadcast: (event: LiveEvent) => void
): Promise<void> {
  let buffer = '';
  req.setEncoding('utf8');

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const evt = JSON.parse(trimmed) as LiveEvent;
      const applied = store.apply(evt);
      if (applied) {
        broadcast(evt);
      }
    } catch {
      // ignore malformed lines
    }
  };

  req.on('data', chunk => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    lines.forEach(processLine);
  });

  req.on('end', () => {
    if (buffer) processLine(buffer);
    res.writeHead(202);
    res.end();
  });
}

