export type TestStatus = 'passed' | 'failed' | 'skipped' | 'flaky' | 'timedOut';

export type StepStatus = 'passed' | 'failed' | 'skipped' | 'running' | 'pending';

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

export interface TimingInfo {
  startTime: number; // epoch milliseconds
  endTime?: number; // epoch milliseconds
  durationMs?: number;
}

export interface EnvironmentInfo {
  os: {
    name: string;
    version?: string;
    arch?: string;
  };
  runtime: {
    name: string;
    version: string;
  };
  ci?: {
    name: string;
    buildNumber?: string;
    runId?: string;
    url?: string;
  };
  git?: {
    commit: string;
    branch?: string;
    tag?: string;
    repoUrl?: string;
  };
  device?: {
    name?: string;
    locale?: string;
    timezone?: string;
  };
  custom?: Record<string, unknown>;
}

export interface ExecutionConfig {
  runner: 'playwright';
  runnerVersion?: string;
  shard?: {
    index: number;
    total: number;
  };
  workers?: number;
  timeoutMs?: number;
  retries?: number;
  projectFilter?: string[];
  grep?: string[];
  outputDir?: string;
  trace?: 'on' | 'off' | 'retain-on-failure' | 'on-first-retry';
  video?: 'on' | 'off' | 'retain-on-failure' | 'on-first-retry';
  screenshot?: 'on' | 'off' | 'only-on-failure';
  custom?: Record<string, unknown>;
}

export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  timedOut: number;
  durationMs?: number;
}

export interface TestRun {
  runId: string;
  schemaVersion: string;
  startTime: number; // epoch milliseconds
  endTime?: number; // epoch milliseconds
  environment: EnvironmentInfo;
  config: ExecutionConfig;
  summary: RunSummary;
  projects: ProjectRun[];
  annotations?: Record<string, unknown>;
}

export interface ProjectRun {
  projectId: string;
  name: string; // Playwright project/browser name
  summary?: RunSummary;
  tests: TestCaseResult[];
}

export interface RetryAttempt {
  attempt: number;
  status: TestStatus | 'pending' | 'running';
  timing?: TimingInfo;
  failure?: FailureInfo;
}

export interface RetrySummary {
  maxRetries: number;
  attempts: RetryAttempt[];
}

export interface TestCaseResult {
  testId: string;
  title: string;
  location: SourceLocation;
  tags: string[];
  status: TestStatus;
  timing: TimingInfo;
  retries: RetrySummary;
  steps: TestStep[];
  failure?: FailureInfo;
  attachments: AttachmentInfo[];
  consoleLogs?: ConsoleLogEntry[];
  network?: NetworkRequestInfo[];
  annotations?: Record<string, unknown>;
  identities?: ExternalIdentity[]; // Enterprise test case traceability
}

export interface TestStep {
  stepId: string;
  parentStepId?: string;
  title: string;
  status: StepStatus;
  timing: TimingInfo;
  category?: 'hook' | 'action' | 'assertion' | 'setup' | 'teardown' | 'custom';
  failure?: FailureInfo;
  attachments?: AttachmentInfo[];
  consoleLogs?: ConsoleLogEntry[];
  metadata?: Record<string, unknown>;
}

export interface FailureInfo {
  message: string;
  expected?: unknown;
  actual?: unknown;
  stacktrace?: string; // raw stack string
  userLandFrames?: StackFrameInfo[];
  failedAt?: SourceLocation;
}

export interface StackFrameInfo {
  file: string;
  function?: string;
  line?: number;
  column?: number;
  isUserLand: boolean;
}

export interface AttachmentInfo {
  id: string;
  type: 'screenshot' | 'video' | 'trace' | 'log' | 'other';
  path: string; // OS-agnostic path
  contentType: string;
  size?: number; // bytes
  timestamp: number; // epoch milliseconds
  description?: string;
}

export interface ConsoleLogEntry {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: number; // epoch milliseconds
  args?: unknown[];
  source?: 'browser' | 'server' | 'test';
}

export interface NetworkRequestInfo {
  id: string;
  url: string;
  method: string;
  status?: number;
  startTime: number; // epoch milliseconds
  endTime?: number; // epoch milliseconds
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBodyBytes?: number;
  responseBodyBytes?: number;
  initiator?: 'script' | 'style' | 'image' | 'xhr' | 'fetch' | 'preload' | 'other';
  failureText?: string;
  timing?: {
    dns?: number;
    connect?: number;
    ssl?: number;
    ttfb?: number;
    download?: number;
    total?: number;
  };
  resourceType?: 'document' | 'stylesheet' | 'image' | 'media' | 'font' | 'script' | 'xhr' | 'fetch' | 'websocket' | 'other';
}

/**
 * External Identity - Enterprise test case traceability
 * Supports multiple systems (Jira, Xray, Zephyr, TestRail, custom)
 */
export interface ExternalIdentity {
  system: 'jira' | 'xray' | 'zephyr' | 'testrail' | 'custom';
  projectKey?: string;      // e.g. WEBAPP, BOX, SHIELD_CORE (derived)
  id: string;               // e.g. WEBAPP-12345 (canonical)
  numericId?: number;       // e.g. 12345 (derived from id)
  url?: string;             // Optional deep link to external system
  source: 'annotation' | 'tag' | 'title' | 'mapping';
}

// Causal Chain models for reverse call hierarchy
export * from './CausalChain.js';

