import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';

const ORBIS_HOME_DIR = path.join(os.homedir(), '.orbis');
const WORKSPACE_FILE = path.join(ORBIS_HOME_DIR, 'workspace.json');

export interface SavedWorkspace {
  path: string;
  projectHash: string;
  source: 'cli' | 'saved' | 'auto' | 'cwd';
  lastUsed: number;
}

export interface ResolvedWorkspace {
  path: string;
  projectHash: string;
  source: SavedWorkspace['source'];
  reason: string;
}

export async function getOrbisHome(): Promise<string> {
  await fs.mkdir(ORBIS_HOME_DIR, { recursive: true });
  return ORBIS_HOME_DIR;
}

export async function resolveProjectHash(cwd: string): Promise<string> {
  const repoRoot = path.resolve(cwd);
  const gitConfig = path.join(repoRoot, '.git', 'config');
  try {
    const raw = await fs.readFile(gitConfig, 'utf-8');
    const remoteMatch = raw.match(/url\\s*=\\s*(.+)/);
    if (remoteMatch?.[1]) {
      return stableHash(remoteMatch[1].trim());
    }
  } catch {
    /* ignore */
  }
  return stableHash(repoRoot);
}

export async function loadSavedWorkspace(): Promise<SavedWorkspace | undefined> {
  try {
    const raw = await fs.readFile(WORKSPACE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as SavedWorkspace;
    if (parsed?.path && parsed?.projectHash) {
      return parsed;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export async function saveWorkspaceSelection(ws: SavedWorkspace): Promise<void> {
  const home = await getOrbisHome();
  await fs.mkdir(path.dirname(WORKSPACE_FILE), { recursive: true });
  await fs.writeFile(WORKSPACE_FILE, JSON.stringify(ws, null, 2), 'utf-8');
  // Ensure runs folder exists for the saved workspace hash in the global home
  await fs.mkdir(path.join(home, 'runs', ws.projectHash), { recursive: true });
}

export interface ResolveWorkspaceOptions {
  cliWorkspace?: string;
  cwd?: string;
}

export async function resolveWorkspace(options: ResolveWorkspaceOptions = {}): Promise<ResolvedWorkspace> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const home = await getOrbisHome();

  // 1) CLI flag
  if (options.cliWorkspace) {
    const candidate = path.resolve(options.cliWorkspace);
    return {
      path: candidate,
      projectHash: await resolveProjectHash(candidate),
      source: 'cli',
      reason: '--workspace flag'
    };
  }

  // 2) saved workspace
  const saved = await loadSavedWorkspace();
  if (saved) {
    return {
      path: path.resolve(saved.path),
      projectHash: saved.projectHash,
      source: 'saved',
      reason: 'saved workspace'
    };
  }

  // 3) global Orbis home project-hash folder
  const autoHash = await resolveProjectHash(cwd);
  const autoPath = path.join(home, 'runs', autoHash);
  await fs.mkdir(autoPath, { recursive: true });
  return {
    path: autoPath,
    projectHash: autoHash,
    source: 'auto',
    reason: 'orbis home project folder'
  };
}

function stableHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

