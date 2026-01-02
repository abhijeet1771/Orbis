import type { TestRun } from '@orbisreport/core';

export interface RunSummaryItem {
  runId: string;
  schemaVersion: string;
  startTime?: number;
  branch?: string;
  commit?: string;
  summary: TestRun['summary'];
  createdAt?: number;
}

export interface WorkspaceInfo {
  path: string;
  name: string;
}

const defaultHeaders = {
  Accept: 'application/json'
};

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as T;
}

export async function getRuns(): Promise<{ runs: RunSummaryItem[]; workspace?: WorkspaceInfo }> {
  const res = await fetch('/api/runs', { headers: defaultHeaders });
  const data = await handleJson<{ runs: RunSummaryItem[]; workspace?: WorkspaceInfo }>(res);
  return {
    runs: data.runs ?? [],
    workspace: data.workspace
  };
}

export async function getRun(runId: string): Promise<TestRun> {
  const res = await fetch(`/api/runs/${encodeURIComponent(runId)}`, { headers: defaultHeaders });
  return handleJson<TestRun>(res);
}

