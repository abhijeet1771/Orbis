import type {
    Reporter,
    TestCase,
    TestResult,
    FullConfig,
    Suite
  } from '@playwright/test/reporter';
  import { promises as fs } from 'node:fs';
  import path from 'node:path';
import path from 'node:path';
  import { randomUUID, createHash } from 'node:crypto';
  import process from 'node:process';
  import os from 'node:os';
  import { createRequire } from 'node:module';
  import {
    AttachmentInfo,
    ConsoleLogEntry,
    EnvironmentInfo,
    ExecutionConfig,
    FailureInfo,
    ProjectRun,
    RunSummary,
    StackFrameInfo,
    TestCaseResult,
    TestRun,
    TestStatus,
    TestStep,
    TimingInfo
  } from '@orbisreport/core';
  
  const require = createRequire(import.meta.url);
  const { version: playwrightVersion } = require('@playwright/test/package.json');
  
  const SCHEMA_VERSION = '1.0.0';
  const DEFAULT_OUTPUT_ROOT = '.orbisreport';
  
  interface ProjectAggregates {
    project: ProjectRun;
    tests: Map<string, TestCaseResult>;
  }
  
  export class OrbisReporter implements Reporter {
    readonly name = '@orbisreport/reporter';
  
    private config!: FullConfig;
    private runId = createRunId();
    private runStartTime = Date.now();
    private projectAggregates = new Map<string, ProjectAggregates>();
    private outputRoot = DEFAULT_OUTPUT_ROOT;
  
    constructor(options?: { outputDir?: string }) {
      if (options?.outputDir) {
        this.outputRoot = options.outputDir;
      }
    }
  
    onBegin(config: FullConfig, suite: Suite): void {
      this.config = config;
      this.runId = createRunId();
      this.runStartTime = Date.now();
  
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
  
      ensureDir(this.outputRoot);
      ensureDir(this.runsDir());
      ensureDir(this.attachmentsDir());
    }
  
    onTestEnd(test: TestCase, result: TestResult): void {
      const testId = computeTestId(test);
      const projectName = test.parent?.project()?.name ?? 'default';
      const projectId = hashId(projectName);
      const aggregate = this.projectAggregates.get(projectId);
      if (!aggregate) return;
  
      const failure = mapFailure(result.error);
  
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
        retries: {
          maxRetries: (this.config as any)?.retries ?? 0,
          attempts: []
        },
        steps: [],
        failure,
        attachments: [],
        consoleLogs: mapConsoleLogs(result.stdout),
        network: undefined,
        annotations: undefined
      };
  
      aggregate.tests.set(testId, testResult);
    }
  
    async onEnd(): Promise<void> {
      const summary = computeRunSummary(this.projectAggregates);
      const environment = buildEnvironmentInfo();
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
  
      const runFile = path.join(this.runsDir(), `run-${this.runId}.json`);
      await fs.writeFile(runFile, JSON.stringify(testRun, null, 2), 'utf-8');
    }
  
    private runsDir(): string {
      return path.join(this.outputRoot, 'runs');
    }
  
    private attachmentsDir(): string {
      return path.join(this.outputRoot, 'attachments');
    }
  }
  
  /* ---------------- helpers ---------------- */
  
  function createRunId(): string {
    return `${Date.now()}-${randomUUID()}`;
  }
  
  function hashId(input: string): string {
    return createHash('sha1').update(input).digest('hex');
  }
  
  function computeTestId(test: TestCase): string {
    return hashId(`${test.location.file}::${test.titlePath().join(' > ')}`);
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
      default:
        return 'failed';
    }
  }
  
  function toTiming(start: Date, duration?: number): TimingInfo {
    const startTime = start.getTime();
    return {
      startTime,
      endTime: duration ? startTime + duration : undefined,
      durationMs: duration
    };
  }
  
  function mapFailure(error?: any): FailureInfo | undefined {
    if (!error) return undefined;
    const fallback = error?.location
      ? {
          file: relativeToCwd(error.location.file),
          line: Number(error.location.line),
          column: Number(error.location.column)
        }
      : undefined;
    return {
      message: error.message ?? 'Test failed',
      stacktrace: error.stack,
      userLandFrames: parseStackFrames(error.stack, fallback)
    };
  }

  function parseStackFrames(
    stack?: string,
    fallback?: { file?: string; line?: number; column?: number }
  ): StackFrameInfo[] | undefined {
    if (!stack) return undefined;
    const lines = stack.split('\n').map(l => l.trim());
    const frames: StackFrameInfo[] = [];
    for (const line of lines) {
      const match =
        line.match(/^at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)$/) ||
        line.match(/^at\s+(.*?):(\d+):(\d+)$/);
      if (!match) continue;

      let fnName: string | undefined;
      let fileRaw: string | undefined;
      let lineNum: string | undefined;
      let colNum: string | undefined;

      if (match.length === 5) {
        fnName = match[1];
        fileRaw = match[2];
        lineNum = match[3];
        colNum = match[4];
      } else {
        fnName = undefined;
        fileRaw = match[1];
        lineNum = match[2];
        colNum = match[3];
      }

      const file = relativeToCwd(fileRaw ?? '');
      const isUserLand = !file.includes('node_modules');
      frames.push({
        file,
        function: fnName,
        line: toInt(lineNum),
        column: toInt(colNum),
        isUserLand
      });
    }
    return normalizeStackFrames(frames, fallback);
  }

  function isValidFrameFile(file: string | undefined): file is string {
    if (!file) return false;
    const trimmed = file.trim();
    if (!trimmed) return false;
    if (/^\d+$/.test(trimmed)) return false; // reject numeric placeholders
    return true;
  }

  function toInt(value: unknown): number {
    if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : NaN;
    if (typeof value === 'string') {
      const n = Number(value);
      return Number.isFinite(n) ? Math.trunc(n) : NaN;
    }
    return NaN;
  }

  function normalizeStackFrames(
    frames: Array<Partial<StackFrameInfo>>,
    fallback?: { file?: string; line?: number; column?: number }
  ): StackFrameInfo[] | undefined {
    const out: StackFrameInfo[] = [];
    for (const frame of frames) {
      let file = typeof frame.file === 'string' ? frame.file : '';
      let line = toInt(frame.line as unknown);
      let column = toInt(frame.column as unknown);

      if (!isValidFrameFile(file) && isValidFrameFile(fallback?.file)) {
        file = fallback!.file!;
      }
      if (!Number.isInteger(line) || line < 1) {
        line = Number.isInteger(fallback?.line) && (fallback?.line ?? 0) >= 1 ? fallback!.line! : 1;
      }
      if (!Number.isInteger(column) || column < 0) {
        column = Number.isInteger(fallback?.column) && (fallback?.column ?? 0) >= 0 ? fallback!.column! : 0;
      }

      if (!isValidFrameFile(file)) continue;

      out.push({
        file,
        function: frame.function,
        line,
        column,
        isUserLand: Boolean(frame.isUserLand)
      });
    }
    return out.length ? out : undefined;
  }
  
  function computeRunSummary(aggregates: Map<string, ProjectAggregates>): RunSummary {
    let total = 0, passed = 0, failed = 0, skipped = 0, timedOut = 0, durationMs = 0;
  
    for (const a of aggregates.values()) {
      for (const t of a.tests.values()) {
        total++;
        durationMs += t.timing.durationMs ?? 0;
        if (t.status === 'passed') passed++;
        else if (t.status === 'failed') failed++;
        else if (t.status === 'skipped') skipped++;
        else if (t.status === 'timedOut') timedOut++;
      }
    }
    return { total, passed, failed, skipped, flaky: 0, timedOut, durationMs };
  }
  
  function computeProjectSummary(tests: TestCaseResult[]): RunSummary {
    let total = 0, passed = 0, failed = 0, skipped = 0, timedOut = 0, durationMs = 0;
    for (const t of tests) {
      total++;
      durationMs += t.timing.durationMs ?? 0;
      if (t.status === 'passed') passed++;
      else if (t.status === 'failed') failed++;
      else if (t.status === 'skipped') skipped++;
      else if (t.status === 'timedOut') timedOut++;
    }
    return { total, passed, failed, skipped, flaky: 0, timedOut, durationMs };
  }
  
  function buildEnvironmentInfo(): EnvironmentInfo {
    return {
      os: { name: os.platform(), version: os.release(), arch: os.arch() },
      runtime: { name: 'node', version: process.versions.node }
    };
  }
  
  function buildExecutionConfig(config: FullConfig): ExecutionConfig {
    return {
      runner: 'playwright',
      runnerVersion: playwrightVersion,
      workers: config.workers as number | undefined,
      retries: (config as any).retries,
      projectFilter: config.projects.map(p => p.name)
    };
  }
  
  function mapConsoleLogs(stdout: any[]): ConsoleLogEntry[] | undefined {
    if (!stdout?.length) return undefined;
    return stdout.map((s, i) => ({
      id: `log-${i}`,
      level: 'log',
      message: String(s),
      timestamp: Date.now(),
      source: 'test'
    }));
  }
  
  function relativeToCwd(p: string): string {
    return path.relative(process.cwd(), p).replace(/\\/g, '/');
  }
  
  async function ensureDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      /* non-blocking */
    }
  }
  
  export default OrbisReporter;
  