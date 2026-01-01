import type { TestRun, TestCaseResult, TestStep, TestStatus, RunSummary, FailureInfo, AttachmentInfo } from '@orbisreport/core';

type LiveEventType =
  | 'live:state:init'
  | 'run:start'
  | 'project:start'
  | 'test:start'
  | 'step:start'
  | 'step:end'
  | 'test:end'
  | 'attachment:add'
  | 'run:end';

interface LiveEvent {
  type: LiveEventType;
  runId?: string;
  seq?: number;
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
  location?: TestCaseResult['location'];
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

export class LiveRunStore {
  private state?: LiveRunState;
  private seenSeq = new Set<number>();

  snapshot(): TestRun | null {
    if (!this.state) return null;
    return this.serialize();
  }

  apply(event: LiveEvent): boolean {
    if (!event || !event.type) return false;

    if (event.type === 'live:state:init') {
      const run = event.payload as TestRun;
      if (run?.runId) {
        this.hydrate(run);
        return true;
      }
      return false;
    }

    if (!event.runId || typeof event.seq !== 'number') return false;

    if (event.type === 'run:start') {
      this.reset(event);
      this.seenSeq.add(event.seq);
      return true;
    }

    if (!this.state || this.state.runId !== event.runId) return false;

    if (this.seenSeq.has(event.seq)) return false;
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

  private hydrate(run: TestRun): void {
    const projects = new Map<string, LiveProjectState>();
    const tests = new Map<string, LiveTestState>();
    for (const project of run.projects) {
      const proj: LiveProjectState = { projectId: project.projectId, name: project.name, tests: new Set() };
      projects.set(project.projectId, proj);
      for (const test of project.tests) {
        proj.tests.add(test.testId);
        tests.set(test.testId, {
          testId: test.testId,
          title: test.title,
          projectId: project.projectId,
          status: test.status,
          timing: test.timing,
          failure: test.failure,
          steps: new Map(test.steps.map(s => [s.stepId, s])),
          attachments: test.attachments,
          tags: test.tags,
          location: test.location
        });
      }
    }
    this.state = {
      runId: run.runId,
      startTime: run.startTime,
      config: run.config,
      projects,
      tests,
      summary: run.summary,
      completed: Boolean(run.endTime),
      lastSeq: 0
    };
    this.seenSeq.clear();
  }

  private reset(event: LiveEvent): void {
    this.state = {
      runId: event.runId!,
      startTime: event.timestamp ?? Date.now(),
      config: event.payload?.config,
      projects: new Map(),
      tests: new Map(),
      summary: emptySummary(),
      completed: false,
      lastSeq: event.seq ?? 0
    };
    this.seenSeq.clear();
  }

  private handleProjectStart(event: LiveEvent): void {
    if (!this.state) return;
    const projectId = (event.payload?.projectId as string) ?? event.projectId ?? 'default';
    const name = (event.payload?.name as string) ?? projectId;
    if (!this.state.projects.has(projectId)) {
      this.state.projects.set(projectId, { projectId, name, tests: new Set() });
    }
  }

  private handleTestStart(event: LiveEvent): void {
    if (!this.state || !event.testId) return;
    const projectId = (event.payload?.projectId as string) ?? event.projectId ?? 'default';
    const project = this.state.projects.get(projectId) ?? { projectId, name: projectId, tests: new Set<string>() };
    this.state.projects.set(projectId, project);
    project.tests.add(event.testId);
    const title = (event.payload?.title as string) ?? event.testId;
    const tags = Array.isArray(event.payload?.tags) ? (event.payload?.tags as string[]) : [];
    const location = (event.payload?.location as TestCaseResult['location']) ?? {
      file: projectId,
      line: 0,
      column: 0
    };
    this.state.tests.set(event.testId, {
      testId: event.testId,
      title,
      projectId,
      status: 'running',
      timing: { startTime: event.timestamp },
      steps: new Map(),
      attachments: [],
      tags,
      location
    });
  }

  private handleStepStart(event: LiveEvent): void {
    if (!this.state || !event.testId) return;
    const test = this.state.tests.get(event.testId);
    if (!test) return;
    const stepId = (event.payload?.stepId as string) ?? cryptoRandom();
    const step: LiveStepState = {
      stepId,
      parentStepId: event.payload?.parentStepId as string | undefined,
      title: (event.payload?.title as string) ?? 'step',
      status: 'running',
      timing: { startTime: event.timestamp },
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
    const status = (event.payload?.status as TestStatus) ?? 'passed';
    const durationMs = event.payload?.durationMs as number | undefined;
    const endTime = event.timestamp ?? (step.timing?.startTime ?? Date.now()) + (durationMs ?? 0);
    step.status = status;
    step.timing = {
      startTime: step.timing?.startTime,
      endTime,
      durationMs: durationMs ?? (step.timing?.startTime ? endTime - step.timing.startTime : undefined)
    };
    const failure = event.payload?.failure as FailureInfo | undefined;
    if (failure) step.failure = failure;
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
    const endTime = event.timestamp ?? (test.timing?.startTime ?? Date.now()) + (durationMs ?? 0);
    test.status = status as TestStatus;
    test.timing = {
      startTime: test.timing?.startTime,
      endTime,
      durationMs: durationMs ?? (test.timing?.startTime ? endTime - (test.timing?.startTime ?? 0) : undefined)
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
      config: this.state!.config as TestRun['config'],
      summary: computeSummary(this.state!.tests),
      projects
    };
  }
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
    if (test.timing?.durationMs) summary.durationMs += test.timing.durationMs;
    switch (normalizeStatus(test.status)) {
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
    location: test.location ?? {
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
    tags: test.tags,
    location: test.location
  };
}

function cryptoRandom(): string {
  return Math.random().toString(36).slice(2);
}

