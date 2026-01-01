import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  RunSummary,
  TestRun,
  coreVersion
} from '@orbisreport/core';

const ORBIS_ROOT = '.orbisreport';
const RUNS_DIR = path.join(ORBIS_ROOT, 'runs');
const INDEX_FILE = path.join(ORBIS_ROOT, 'index.json');
const SUPPORTED_SCHEMA_VERSION = '1.0.0';

export interface RunListItem {
  runId: string;
  schemaVersion: string;
  startTime?: number;
  branch?: string;
  commit?: string;
  summary: RunSummary;
  createdAt?: number;
}

interface RunIndexEntry {
  runId: string;
  schemaVersion: string;
  createdAt?: number;
  summary: RunSummary;
}

interface RunIndexFile {
  runs: RunIndexEntry[];
}

export async function listRuns(rootDir = process.cwd()): Promise<RunListItem[]> {
  const indexPath = path.join(rootDir, INDEX_FILE);
  let index: RunIndexFile = { runs: [] };

  try {
    const raw = await fs.readFile(indexPath, 'utf-8');
    index = JSON.parse(raw) as RunIndexFile;
  } catch {
    return [];
  }

  const results: RunListItem[] = [];

  for (const entry of index.runs ?? []) {
    const run = await safeLoadRun(entry.runId, rootDir).catch(() => undefined);
    results.push({
      runId: entry.runId,
      schemaVersion: entry.schemaVersion,
      startTime: run?.startTime,
      branch: run?.environment.git?.branch,
      commit: run?.environment.git?.commit,
      summary: entry.summary ?? run?.summary ?? emptySummary(),
      createdAt: entry.createdAt
    });
  }

  return results;
}

export async function loadRun(runId: string, rootDir = process.cwd()): Promise<TestRun> {
  validateRunId(runId);
  const run = await safeLoadRun(runId, rootDir);
  if (!run) {
    throw new Error(`Run ${runId} not found`);
  }
  return run;
}

async function safeLoadRun(runId: string, rootDir: string): Promise<TestRun | undefined> {
  const runPath = resolveRunPath(runId, rootDir);
  const contents = await fs.readFile(runPath, 'utf-8').catch(() => undefined);
  if (!contents) return undefined;

  const run = JSON.parse(contents) as TestRun;
  if (run.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schemaVersion ${run.schemaVersion}; expected ${SUPPORTED_SCHEMA_VERSION}`
    );
  }
  return run;
}

function resolveRunPath(runId: string, rootDir: string): string {
  const fileName = `run-${runId}.json`;
  const runPath = path.join(rootDir, RUNS_DIR, fileName);
  const normalized = path.normalize(runPath);
  const allowedRoot = path.normalize(path.join(rootDir, RUNS_DIR));
  if (!normalized.startsWith(allowedRoot)) {
    throw new Error('Invalid run path');
  }
  return normalized;
}

function validateRunId(runId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(runId)) {
    throw new Error('Invalid runId');
  }
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

export function getSupportedSchemaVersion(): string {
  return SUPPORTED_SCHEMA_VERSION;
}

export function getCoreVersion(): string {
  return coreVersion;
}

