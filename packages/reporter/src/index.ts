import type {
  Reporter,
  TestCase,
  TestResult,
  TestStep as PWTestStep,
  TestError,
  FullConfig,
  Suite
} from '@playwright/test/reporter';
import { promises as fs } from 'node:fs';
import { posix as pathPosix, extname, relative as pathRelative } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import os from 'node:os';
import { createRequire } from 'node:module';
import {
  AttachmentInfo,
  ConsoleLogEntry,
  EnvironmentInfo,
  ExecutionConfig,
  FailureInfo,
  NetworkRequestInfo,
  ProjectRun,
  RunSummary,
  StackFrameInfo,
  TestCaseResult,
  TestRun,
  TestStatus,
  TestStep,
  TimingInfo,
  coreVersion
} from '@orbisreport/core';

const require = createRequire(import.meta.url);
const { version: playwrightVersion } = require('@playwright/test/package.json');

const SCHEMA_VERSION = '1.0.0';
const OUTPUT_ROOT = '.orbisreport';
const RUNS_DIR = pathPosix.join(OUTPUT_ROOT, 'runs');
const ATTACHMENTS_DIR = pathPosix.join(OUTPUT_ROOT, 'attachments');
const INDEX_FILE = pathPosix.join(OUTPUT_ROOT, 'index.json');

interface RunIndex {
  runs: Array<{
    runId: string;
    schemaVersion: string;
    createdAt: number;
    summary: RunSummary;
  }>;
}

interface ProjectAggregates {
  project: ProjectRun;
  tests: Map<string, TestCaseResult>;
}

export const reporterVersion = '0.0.1';

export class OrbisReporter implements Reporter {
  readonly name = '@orbisreport/reporter';

  private config!: FullConfig;
  private runId = createRunId();
  private runStartTime = Date.now();
  private projectAggregates = new Map<string, ProjectAggregates>();
  private retryAttempts = new Map<string, Array<{ attempt: number; result: TestResult }>>();

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.runStartTime = Date.now();
    this.runId = createRunId();

    // Initialize projects based on Playwright config to avoid missing empty projects.
    for (const project of config.projects) {
      const projectId = hashId(project.name);
      this.projectAggregates.set(projectId, {
        project: {
          projectId,
          name: project.name,
          summary: undefined,
          tests: []
        },
        tests: new Map()
      });
    }

    // Ensure output directories exist.
    void ensureDir(OUTPUT_ROOT);
    void ensureDir(RUNS_DIR);
    void ensureDir(ATTACHMENTS_DIR);
  }

  onTestBegin(test: TestCase): void {
    const testId = computeTestId(test);
    if (!this.retryAttempts.has(testId)) {
      this.retryAttempts.set(testId, []);
    }
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    const testId = computeTestId(test);
    const attempts = this.retryAttempts.get(testId);
    if (attempts) {
      attempts.push({ attempt: result.retry, result });
    }

    const projectName = test.parent?.project()?.name ?? 'default';
    const projectId = hashId(projectName);
    const aggregate = this.projectAggregates.get(projectId);
    if (!aggregate) {
      return;
    }

    const retrySummary = buildRetrySummary(attempts ?? [], (this.config as FullConfig & { retries?: number }).retries ?? 0);

    const mappedAttachments = await mapAttachments(
      result.attachments,
      this.runId,
      testId,
      ATTACHMENTS_DIR
    );
    const steps = mapSteps(result.steps ?? [], testId);
    const failure = mapFailure(result.error);
    const consoleLogs = mapConsoleLogs(result.stdout);
    const network = mapNetworkEvents(result.attachments);

    const testResult: TestCaseResult = {
      testId,
      title: test.title,
      location: {
        file: relativeToCwd(test.location.file),
        line: test.location.line,
        column: test.location.column
      },
      tags: test.annotations?.map(a => a.type) ?? [],
      status: mapTestStatus(result.status),
      timing: toTiming(result.startTime, result.duration),
      retries: retrySummary,
      steps,
      failure,
      attachments: mappedAttachments,
      consoleLogs,
      network,
      annotations: test.annotations?.length ? Object.fromEntries(test.annotations.map(a => [a.type, a.description ?? true])) : undefined
    };

    aggregate.tests.set(testId, testResult);
  }

  async onEnd(): Promise<void> {
    const summary = computeRunSummary(this.projectAggregates);
    const environment = buildEnvironmentInfo(this.config);
    const executionConfig = buildExecutionConfig(this.config);
    const projects: ProjectRun[] = [];

    for (const aggregate of this.projectAggregates.values()) {
      aggregate.project.tests = Array.from(aggregate.tests.values());
      aggregate.project.summary = computeProjectSummary(aggregate.project.tests);
      projects.push(aggregate.project);
    }

    const testRun: TestRun = {
      runId: this.runId,
      schemaVersion: SCHEMA_VERSION,
      startTime: this.runStartTime,
      endTime: Date.now(),
      environment,
      config: executionConfig,
      summary,
      projects
    };

    await persistRun(testRun);
    await updateIndex(testRun);
  }
}

function createRunId(): string {
  return `${Date.now()}-${randomUUID()}`;
}

function hashId(input: string): string {
  return createHash('sha1').update(input).digest('hex');
}

function normalizePath(p: string): string {
  const normalized = p.replace(/\\/g, '/');
  return pathPosix.normalize(normalized);
}

function relativeToCwd(p: string): string {
  const rel = pathRelative(process.cwd(), p);
  if (!rel || rel.startsWith('..')) {
    return normalizePath(p);
  }
  return normalizePath(rel);
}

function toTiming(start: Date, durationMs?: number): TimingInfo {
  const startTime = start.getTime();
  const endTime = durationMs !== undefined ? startTime + durationMs : undefined;
  return {
    startTime,
    endTime,
    durationMs
  };
}

function mapTestStatus(status: TestResult['status']): TestStatus {
  switch (status) {
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'timedOut':
      return 'timedOut';
    case 'skipped':
      return 'skipped';
    case 'interrupted':
    default:
      return 'failed';
  }
}

function computeTestId(test: TestCase): string {
  const titlePath = test.titlePath().join(' > ');
  const location = normalizePath(test.location.file);
  return hashId(`${location}::${titlePath}`);
}

function mapFailure(error?: TestError): FailureInfo | undefined {
  if (!error) return undefined;

  const stacktrace = error.stack;
  const userLandFrames = stacktrace ? parseStackFrames(stacktrace) : undefined;

  return {
    message: error.message ?? 'Test failure',
    expected: (error as unknown as { expected?: unknown }).expected,
    actual: (error as unknown as { actual?: unknown }).actual,
    stacktrace,
    userLandFrames,
    failedAt: error.location
      ? {
          file: relativeToCwd(error.location.file),
          line: error.location.line,
          column: error.location.column
        }
      : undefined
  };
}

function parseStackFrames(stack: string): StackFrameInfo[] {
  const lines = stack.split('\n').map(l => l.trim());
  const frames: StackFrameInfo[] = [];
  for (const line of lines) {
    const match = line.match(/^at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)$/) || line.match(/^at\s+(.*?):(\d+):(\d+)$/);
    if (!match) continue;
    const [, fnOrFile, fileRaw, lineNum, colNum] = match;
    const file = relativeToCwd(fileRaw);
    const isUserLand = !file.includes('node_modules');
    frames.push({
      file,
      function: match.length === 5 ? fnOrFile : undefined,
      line: Number(lineNum),
      column: Number(colNum),
      isUserLand
    });
  }
  return frames;
}

function mapSteps(steps: PWTestStep[], testId: string): TestStep[] {
  const mapped: TestStep[] = [];
  const idMap = new Map<PWTestStep, string>();

  steps.forEach((step, index) => {
    const stepId = `${testId}-step-${index}-${hashId(
      `${step.title}-${step.startTime?.getTime() ?? ''}`
    )}`;
    idMap.set(step, stepId);
  });

  steps.forEach(step => {
    const stepId = idMap.get(step)!;
    const parentId = step.parent ? idMap.get(step.parent) : undefined;
    const status = step.error ? 'failed' : step.duration ? 'passed' : 'running';

    const timing = step.startTime
      ? toTiming(step.startTime, step.duration ?? undefined)
      : { startTime: Date.now() };

    const failure = step.error ? mapFailure(step.error) : undefined;

    mapped.push({
      stepId,
      parentStepId: parentId,
      title: step.title,
      status,
      timing,
      category: step.category as TestStep['category'],
      failure,
      attachments: undefined,
      consoleLogs: undefined,
      metadata: step.location
        ? {
            location: {
              file: normalizePath(step.location.file),
              line: step.location.line,
              column: step.location.column
            }
          }
        : undefined
    });
  });

  return mapped;
}

async function mapAttachments(
  attachments: TestResult['attachments'],
  runId: string,
  testId: string,
  targetDir: string
): Promise<AttachmentInfo[]> {
  const results: AttachmentInfo[] = [];
  await ensureDir(targetDir);

  let counter = 0;
  for (const attachment of attachments) {
    if (!attachment.path) continue;
    const ext = extname(attachment.path) || '';
    const safeName = sanitizeFileName(attachment.name || 'attachment');
    const destFile = `${runId}-${testId}-${safeName}-${counter}${ext}`;
    const destPath = pathPosix.join('attachments', destFile);
    const destFullPath = pathPosix.join(OUTPUT_ROOT, destPath);

    await fs.copyFile(attachment.path, destFullPath).catch(() => {});

    results.push({
      id: `${testId}-att-${counter}`,
      type: classifyAttachmentType(attachment.contentType, attachment.name),
      path: normalizePath(destPath),
      contentType: attachment.contentType || 'application/octet-stream',
      size: undefined,
      timestamp: Date.now(),
      description: attachment.name
    });

    counter += 1;
  }

  return results;
}

function classifyAttachmentType(contentType?: string, name?: string): AttachmentInfo['type'] {
  if (contentType?.includes('image')) return 'screenshot';
  if (contentType?.includes('video')) return 'video';
  if (name?.toLowerCase().includes('trace')) return 'trace';
  if (contentType?.includes('json') || contentType?.includes('log')) return 'log';
  return 'other';
}

function mapConsoleLogs(stdout: TestResult['stdout']): ConsoleLogEntry[] | undefined {
  if (!stdout?.length) return undefined;
  return stdout.map((entry, idx) => {
    const text =
      typeof entry === 'string'
        ? entry
        : Buffer.isBuffer(entry)
          ? entry.toString('utf-8')
          : (entry as { text?: string; buffer?: Buffer }).text ??
            (entry as { text?: string; buffer?: Buffer }).buffer?.toString('utf-8') ??
            '';
    return {
      id: `log-${idx}-${Date.now()}`,
      level: 'log',
      message: text,
      timestamp: Date.now(),
      args: undefined,
      source: 'test'
    };
  });
}

function mapNetworkEvents(attachments: TestResult['attachments']): NetworkRequestInfo[] | undefined {
  // Placeholder for future richer capture; currently returns empty when no structured network data is present.
  const networkAttachment = attachments.find(att => att.name?.toLowerCase().includes('network'));
  if (!networkAttachment) return undefined;
  return [];
}

function computeRunSummary(projectAggregates: Map<string, ProjectAggregates>): RunSummary {
  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let flaky = 0;
  let timedOut = 0;
  let durationMs = 0;

  for (const aggregate of projectAggregates.values()) {
    for (const test of aggregate.tests.values()) {
      total += 1;
      durationMs += test.timing.durationMs ?? 0;
      switch (test.status) {
        case 'passed':
          passed += 1;
          break;
        case 'failed':
          failed += 1;
          break;
        case 'skipped':
          skipped += 1;
          break;
        case 'flaky':
          flaky += 1;
          break;
        case 'timedOut':
          timedOut += 1;
          break;
      }
    }
  }

  return { total, passed, failed, skipped, flaky, timedOut, durationMs };
}

function computeProjectSummary(tests: TestCaseResult[]): RunSummary {
  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let flaky = 0;
  let timedOut = 0;
  let durationMs = 0;

  for (const test of tests) {
    total += 1;
    durationMs += test.timing.durationMs ?? 0;
    switch (test.status) {
      case 'passed':
        passed += 1;
        break;
      case 'failed':
        failed += 1;
        break;
      case 'skipped':
        skipped += 1;
        break;
      case 'flaky':
        flaky += 1;
        break;
      case 'timedOut':
        timedOut += 1;
        break;
    }
  }

  return { total, passed, failed, skipped, flaky, timedOut, durationMs };
}

function buildRetrySummary(
  attempts: Array<{ attempt: number; result: TestResult }>,
  maxRetries: number
): TestCaseResult['retries'] {
  return {
    maxRetries,
    attempts: attempts
      .sort((a, b) => a.attempt - b.attempt)
      .map(({ attempt, result }) => ({
        attempt,
        status: mapTestStatus(result.status),
        timing: toTiming(result.startTime, result.duration),
        failure: mapFailure(result.error)
      }))
  };
}

function buildEnvironmentInfo(config: FullConfig): EnvironmentInfo {
  return {
    os: {
      name: os.platform(),
      version: os.release(),
      arch: os.arch()
    },
    runtime: {
      name: 'node',
      version: process.versions.node
    },
    ci: detectCI(),
    git: {
      commit: process.env.GIT_COMMIT ?? '',
      branch: process.env.GIT_BRANCH,
      tag: process.env.GIT_TAG,
      repoUrl: process.env.GIT_URL
    },
    device: undefined,
    custom: config.metadata ?? undefined
  };
}

function detectCI(): EnvironmentInfo['ci'] {
  if (process.env.GITHUB_RUN_ID) {
    return {
      name: 'GitHub Actions',
      buildNumber: process.env.GITHUB_RUN_NUMBER,
      runId: process.env.GITHUB_RUN_ID,
      url: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : undefined
    };
  }

  if (process.env.JENKINS_URL) {
    return {
      name: 'Jenkins',
      buildNumber: process.env.BUILD_NUMBER,
      runId: process.env.BUILD_ID,
      url: process.env.BUILD_URL
    };
  }

  if (process.env.CI) {
    return {
      name: 'CI',
      buildNumber: process.env.BUILD_NUMBER,
      runId: process.env.BUILD_ID
    };
  }

  return undefined;
}

function buildExecutionConfig(config: FullConfig): ExecutionConfig {
  const trace = config.projects[0]?.use?.trace as ExecutionConfig['trace'];
  const video = config.projects[0]?.use?.video as ExecutionConfig['video'];
  const screenshot = config.projects[0]?.use?.screenshot as ExecutionConfig['screenshot'];

  const grep =
    config.grep && !Array.isArray(config.grep)
      ? [config.grep.toString()]
      : Array.isArray(config.grep)
        ? config.grep.map(g => g.toString())
        : undefined;

  return {
    runner: 'playwright',
    runnerVersion: playwrightVersion,
    shard: config.shard ? { index: config.shard.current, total: config.shard.total } : undefined,
    workers: config.workers as number | undefined,
    timeoutMs: (config as FullConfig & { timeout?: number }).timeout,
    retries: (config as FullConfig & { retries?: number }).retries,
    projectFilter: config.projects.map(p => p.name),
    grep,
    outputDir: relativeToCwd((config as FullConfig & { outputDir?: string }).outputDir ?? ''),
    trace,
    video,
    screenshot,
    custom: config.metadata ?? undefined
  };
}

async function persistRun(run: TestRun): Promise<void> {
  const runFile = pathPosix.join(RUNS_DIR, `run-${run.runId}.json`);
  await ensureDir(RUNS_DIR);
  await fs.writeFile(runFile, JSON.stringify(run, null, 2), 'utf-8');
}

async function updateIndex(run: TestRun): Promise<void> {
  await ensureDir(OUTPUT_ROOT);
  let index: RunIndex = { runs: [] };

  try {
    const data = await fs.readFile(INDEX_FILE, 'utf-8');
    index = JSON.parse(data) as RunIndex;
  } catch {
    // fresh index
  }

  index.runs = [
    {
      runId: run.runId,
      schemaVersion: run.schemaVersion,
      createdAt: Date.now(),
      summary: run.summary
    },
    ...(index.runs || [])
  ];

  await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9_\-\.]/gi, '_');
}