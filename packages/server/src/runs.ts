import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  RunSummary,
  TestRun,
  coreVersion
} from '@orbisreport/core';
import { getOrbisHome } from './workspace.js';
import { normalizeRun } from './normalize.js';

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

export async function listRuns(workspaceDir: string, projectHash: string): Promise<RunListItem[]> {
  const { indexPath, runRoot } = await resolveRunStorage(workspaceDir, projectHash);
  let index: RunIndexFile = { runs: [] };

  try {
    const raw = await fs.readFile(indexPath, 'utf-8');
    index = JSON.parse(raw) as RunIndexFile;
  } catch {
    return [];
  }

  const results: RunListItem[] = [];

  for (const entry of index.runs ?? []) {
  const run = await safeLoadRun(entry.runId, runRoot).catch(() => undefined);
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

export async function loadRun(
  runId: string,
  workspaceDir: string,
  projectHash: string
): Promise<TestRun> {
  validateRunId(runId);
  const { runRoot } = await resolveRunStorage(workspaceDir, projectHash);
  const run = await safeLoadRun(runId, runRoot);
  if (!run) {
    throw new Error(`Run ${runId} not found`);
  }
  return normalizeRun(run);
}

async function safeLoadRun(runId: string, runRoot: string): Promise<TestRun | undefined> {
  const runPath = resolveRunPath(runId, runRoot);
  const contents = await fs.readFile(runPath, 'utf-8').catch(() => undefined);
  if (!contents) return undefined;

  const run = JSON.parse(contents) as TestRun;
  if (run.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schemaVersion ${run.schemaVersion}; expected ${SUPPORTED_SCHEMA_VERSION}`
    );
  }
  return normalizeRun(run);
}

function resolveRunPath(runId: string, runRoot: string): string {
  const fileName = `run-${runId}.json`;
  const runPath = path.join(runRoot, fileName);
  const normalized = path.normalize(runPath);
  const allowedRoot = path.normalize(runRoot);
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

async function resolveRunStorage(
  workspaceDir: string,
  projectHash: string
): Promise<{ runRoot: string; indexPath: string }> {
  const workspaceRunsRoot = path.join(workspaceDir, RUNS_DIR);
  const workspaceIndex = path.join(workspaceDir, INDEX_FILE);
  const home = await getOrbisHome();
  const homeRunRoot = path.join(home, 'runs', projectHash);
  const homeIndex = path.join(homeRunRoot, 'index.json');

  const workspaceExists = await fs
    .stat(workspaceRunsRoot)
    .then(s => s.isDirectory())
    .catch(() => false);

  if (workspaceExists) {
    return { runRoot: workspaceRunsRoot, indexPath: workspaceIndex };
  }

  await fs.mkdir(homeRunRoot, { recursive: true });
  return { runRoot: homeRunRoot, indexPath: homeIndex };
}

export function getSupportedSchemaVersion(): string {
  return SUPPORTED_SCHEMA_VERSION;
}

export function getCoreVersion(): string {
  return coreVersion;
}

