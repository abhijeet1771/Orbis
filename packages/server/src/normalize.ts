import path from 'node:path';

import type {
  AttachmentInfo,
  ProjectRun,
  StackFrameInfo,
  TestCaseResult,
  TestRun,
  TestStatus,
  TestStep
} from '@orbisreport/core';

import { normalizeIdentities } from './normalize/identity.js';

type RunFixLog = { fixed: boolean };

const STATUS_WHITELIST: TestStatus[] = ['passed', 'failed', 'skipped', 'timedOut'];

export function normalizeRun(run: TestRun): TestRun {
  const log: RunFixLog = { fixed: false };
  const projects = Array.isArray(run.projects) ? run.projects : [];
  const normalizedProjects = projects.length
    ? projects.map(p => normalizeProject(p, log)).filter(Boolean) as ProjectRun[]
    : [makeEmptyProject()];

  const normalizedRun: TestRun = {
    ...run,
    projects: normalizedProjects,
    summary: run.summary ?? emptySummary(),
    _normalized: {
      by: 'orbis-normalizer',
      version: '1.0.0',
      timestamp: Date.now()
    }
  } as TestRun;

  if (log.fixed && typeof console !== 'undefined' && console.debug) {
    console.debug(`[orbis] normalized run ${run.runId ?? ''}`);
  }

  return normalizedRun;
}

function normalizeProject(project: ProjectRun, log: RunFixLog): ProjectRun {
  const tests = Array.isArray(project.tests) ? project.tests : [];
  const normalizedTests: TestCaseResult[] = [];

  for (const t of tests) {
    const norm = normalizeTest(t, log);
    if (norm) normalizedTests.push(norm);
  }

  const summary = project.summary ?? recomputeSummary(normalizedTests);

  return {
    ...project,
    tests: normalizedTests,
    summary
  };
}

function normalizeTest(test: TestCaseResult, log: RunFixLog): TestCaseResult | undefined {
  try {
    const retries = ensureRetries(test.retries, log);
    const steps = Array.isArray(test.steps) ? test.steps.map(s => normalizeStep(s, log)) : [];
    const attachments = Array.isArray(test.attachments) ? test.attachments.filter(Boolean) : [];
    const consoleLogs = Array.isArray(test.consoleLogs) ? test.consoleLogs.filter(Boolean) : [];

    const failure = test.failure
      ? {
          ...test.failure,
          userLandFrames: normalizeFrames(test.failure.userLandFrames, test.failure.failedAt, log)
        }
      : undefined;

    const status: TestStatus = STATUS_WHITELIST.includes(test.status as TestStatus)
      ? (test.status as TestStatus)
      : 'failed';

    const timing = normalizeTiming(test.timing);

    // Normalize identities (enterprise traceability layer)
    const normalizedTest = normalizeIdentities({
      ...test,
      status,
      timing,
      retries,
      steps,
      attachments,
      consoleLogs,
      annotations: Array.isArray((test as any).annotations) ? (test as any).annotations : [],
      failure
    }, log);

    return normalizedTest;
  } catch {
    log.fixed = true;
    return undefined; // drop bad test to protect UI
  }
}

function normalizeStep(step: TestStep, log: RunFixLog): TestStep {
  const failure = step.failure
    ? {
        ...step.failure,
        userLandFrames: normalizeFrames(step.failure.userLandFrames, step.failure.failedAt, log)
      }
    : undefined;

  return {
    ...step,
    attachments: Array.isArray(step.attachments) ? step.attachments.filter(Boolean) : [],
    consoleLogs: Array.isArray(step.consoleLogs) ? step.consoleLogs.filter(Boolean) : [],
    timing: normalizeTiming(step.timing),
    failure
  };
}

function normalizeFrames(
  frames: StackFrameInfo[] | undefined,
  fallback: { file?: string; line?: number; column?: number } | undefined,
  log: RunFixLog
): StackFrameInfo[] {
  if (!Array.isArray(frames)) {
    return [];
  }

  const out: StackFrameInfo[] = [];
  for (const frame of frames) {
    const file = normalizeFrameFile(frame.file ?? fallback?.file);
    const line = toInt(frame.line ?? fallback?.line, 1);
    const column = toInt(frame.column ?? fallback?.column, 0);
    if (!file || line < 1 || column < 0) {
      log.fixed = true;
      continue;
    }
    out.push({
      ...frame,
      file,
      line,
      column
    });
  }

  return out;
}

function normalizeFrameFile(file?: string): string | undefined {
  if (!file) return undefined;
  if (typeof file !== 'string') return undefined;
  const trimmed = file.trim();
  if (!trimmed) return undefined;
  if (/^\d+$/.test(trimmed)) return undefined;
  return toPosix(trimmed);
}

function ensureRetries(
  retries: TestCaseResult['retries'],
  log: RunFixLog
): NonNullable<TestCaseResult['retries']> {
  if (retries && typeof retries === 'object' && Array.isArray(retries.attempts)) {
    const maxRetries = Number.isInteger(retries.maxRetries) ? retries.maxRetries : 0;
    return { maxRetries: maxRetries < 0 ? 0 : maxRetries, attempts: retries.attempts };
  }
  log.fixed = true;
  return { maxRetries: 0, attempts: [] };
}

function normalizeTiming(timing: any): NonNullable<TestCaseResult['timing']> {
  const startTime = toInt(timing?.startTime, Date.now());
  const durationMs = toInt(timing?.durationMs, 0);
  const endTime =
    timing?.endTime !== undefined ? toInt(timing.endTime, startTime + durationMs) : startTime + durationMs;
  return {
    startTime,
    endTime,
    durationMs
  };
}

function recomputeSummary(tests: TestCaseResult[]): any {
  const summary = emptySummary();
  for (const t of tests) {
    summary.total += 1;
    summary.durationMs += t.timing?.durationMs ?? 0;
    if (t.status === 'passed') summary.passed += 1;
    else if (t.status === 'failed') summary.failed += 1;
    else if (t.status === 'skipped') summary.skipped += 1;
    else if (t.status === 'timedOut') summary.timedOut += 1;
  }
  return summary;
}

function emptySummary() {
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

function toInt(value: any, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  const n = Number(value);
  if (Number.isFinite(n)) return Math.trunc(n);
  return fallback;
}

function toPosix(p: string): string {
  return path.normalize(p).replace(/\\/g, '/');
}

function makeEmptyProject(): ProjectRun {
  return {
    projectId: 'default',
    name: 'default',
    summary: emptySummary(),
    tests: []
  };
}

