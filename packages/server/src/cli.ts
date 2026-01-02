#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import {
  resolveWorkspace,
  saveWorkspaceSelection,
  resolveProjectHash,
  getOrbisHome
} from './workspace.js';
import {
  readDaemonLock,
  writeDaemonLock,
  removeDaemonLock,
  isPidAlive,
  findFreePort,
  daemonLockPath
} from './daemon.js';

type Command = 'open' | 'live' | 'doctor' | 'help';

const args = process.argv.slice(2);
const command = (args[0] as Command) ?? 'open';
const requestedPort = Number(process.env.ORBIS_PORT) || Number(getArg('--port', args)) || 4173;
const focusRun = getArg('--run', args);
const noOpen = args.includes('--no-open');
const workspaceFlag = getArg('--workspace', args);
const repoRoot = process.cwd();

void main().catch(err => fail(err instanceof Error ? err.message : String(err)));

async function main(): Promise<void> {
  const resolved = await resolveWorkspace({ cliWorkspace: workspaceFlag, cwd: repoRoot });
  await saveWorkspaceSelection({
    path: resolved.path,
    projectHash: resolved.projectHash,
    source: resolved.source,
    lastUsed: Date.now()
  });
  const workspaceDir = resolved.path;
  const projectHash = resolved.projectHash;

  const daemon = await ensureDaemon({
    workspaceDir,
    projectHash,
    preferredPort: requestedPort,
    repoRoot
  });

  switch (command) {
    case 'open': {
      const base = `http://localhost:${daemon.port}`;
      logInfo(`Static report: ${base}/ui/`);
      if (focusRun) logInfo(`Open run: ${base}/ui/#/runs/${focusRun}`);
      logInfo(`API: http://localhost:${daemon.port}/api/runs`);
      logInfo(`Workspace: ${workspaceDir}`);
      break;
    }
    case 'live': {
      const url = `http://localhost:${daemon.port}/ui/`;
      logInfo(`Live server: ${url}`);
      logInfo(`Live ingest: http://localhost:${daemon.port}/live/ingest`);
      logInfo(`SSE stream: http://localhost:${daemon.port}/live`);
      logInfo(`Workspace: ${workspaceDir}`);
      logInfo(`Playwright: ['@orbisreport/reporter', { live: true, outputDir: '.orbisreport' }]`);

      if (shouldAutoOpenBrowser()) {
        openBrowser(url).catch(() => {});
      } else {
        logInfo(`Live UI available at: ${url} (auto-open disabled)`);
      }
      break;
    }
    case 'doctor': {
      await runDoctor(requestedPort, repoRoot, workspaceDir, daemon.port);
      break;
    }
    case 'help':
    default:
      printHelp();
      process.exit(command === 'help' ? 0 : 1);
  }
}

function getArg(flag: string, argv: string[]): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1];
  return undefined;
}

function ensureUiBuilt(repoRoot: string): void {
  const uiDist = path.join(repoRoot, 'packages', 'ui', 'dist', 'index.html');
  if (!fs.existsSync(uiDist)) {
    logWarn('UI build not found. Run: pnpm --filter @orbisreport/ui build');
  }
}

function logInfo(msg: string): void {
  // eslint-disable-next-line no-console
  console.log(`[orbis] ${msg}`);
}

function logWarn(msg: string): void {
  // eslint-disable-next-line no-console
  console.warn(`[orbis] ${msg}`);
}

function printHelp(): void {
  logInfo('Usage: orbis <open|live|doctor> [--port <port>] [--run <id>] [--workspace <path>] [--no-open]');
  logInfo('Commands:');
  logInfo('  open           Serve latest static Orbis report (default).');
  logInfo('  open --run ID  Serve and deep-link to a specific run.');
  logInfo('  live           Serve UI + /live SSE endpoints for streaming runs.');
  logInfo('  live --no-open Start live server without auto-opening browser.');
  logInfo('  doctor         Validate UI build, .orbisreport presence, and port.');
  logInfo('Env: ORBIS_PORT sets preferred port (auto-increments if busy).');
  logInfo('Workspace resolution: --workspace flag > saved workspace > global orbis home > cwd.');
}

function fail(msg: string): void {
  console.error(`[orbis] ${msg}`);
  process.exit(1);
}

async function runDoctor(
  port: number,
  repoRoot: string,
  workspaceDir: string,
  daemonPort: number
): Promise<void> {
  let healthy = true;
  const checks: Array<{ label: string; ok: boolean; hint?: string }> = [];

  const uiDist = path.join(repoRoot, 'packages', 'ui', 'dist', 'index.html');
  const uiBuilt = fs.existsSync(uiDist);
  checks.push({ label: 'UI build present', ok: uiBuilt, hint: 'pnpm --filter @orbisreport/ui build' });

  const runsDirLocal = path.join(workspaceDir, '.orbisreport', 'runs');
  const runsDirHome = path.join(await getOrbisHome(), 'runs');
  const hasRunsLocal = fs.existsSync(runsDirLocal);
  const hasRunsHome = fs.existsSync(runsDirHome);
  checks.push({
    label: '.orbisreport present (workspace or global)',
    ok: hasRunsLocal || hasRunsHome,
    hint: 'Run Playwright with @orbisreport/reporter'
  });

  const lock = await readDaemonLock();
  const pidAlive = lock ? isPidAlive(lock.pid) : false;
  const portMatches = lock ? lock.port === daemonPort : false;
  checks.push({
    label: 'Daemon lock healthy',
    ok: !!lock && pidAlive && portMatches,
    hint: 'Let orbis open/live recreate the daemon'
  });

  const freePort = await isPortFree(port);
  checks.push({ label: `Port ${port} available`, ok: freePort, hint: 'Use --port or ORBIS_PORT to override' });

  checks.forEach(c => {
    if (c.ok) logInfo(`✓ ${c.label}`);
    else {
      healthy = false;
      logWarn(`✗ ${c.label}${c.hint ? ` → ${c.hint}` : ''}`);
    }
  });

  if (healthy) {
    logInfo('Doctor: all checks passed. Try: npx orbis open');
  } else {
    fail('Doctor found issues. See hints above.');
  }
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => {
      srv.close(() => resolve(true));
    });
    srv.listen(port, '0.0.0.0');
  });
}

function shouldAutoOpenBrowser(): boolean {
  // Don't open in CI
  if (process.env.CI) return false;
  
  // Don't open if --no-open flag is set
  if (noOpen) return false;
  
  // Don't open if stdout is not a TTY (headless/SSH)
  if (!process.stdout.isTTY) return false;
  
  // Check if platform supports opening browser
  const plat = platform();
  return plat === 'win32' || plat === 'darwin' || plat === 'linux';
}

interface EnsureDaemonOptions {
  workspaceDir: string;
  projectHash: string;
  preferredPort: number;
  repoRoot: string;
}

interface DaemonInfo {
  port: number;
  pid: number;
  workspace: string;
  projectHash: string;
}

async function ensureDaemon(opts: EnsureDaemonOptions): Promise<DaemonInfo> {
  const existing = await readDaemonLock();
  if (existing && isPidAlive(existing.pid)) {
    return {
      port: existing.port,
      pid: existing.pid,
      workspace: existing.workspace,
      projectHash: existing.projectHash
    };
  }

  if (existing && !isPidAlive(existing.pid)) {
    await removeDaemonLock();
  }

  const envPort = Number(process.env.ORBIS_PORT);
  const basePort = !Number.isNaN(envPort) ? envPort : opts.preferredPort;
  const port = await findFreePort(basePort);
  const daemonPath = path.join(opts.repoRoot, 'packages', 'server', 'dist', 'daemon-entry.js');

  const child = spawn(process.execPath, [daemonPath], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      ORBIS_DAEMON_WORKSPACE: opts.workspaceDir,
      ORBIS_DAEMON_PROJECT_HASH: opts.projectHash,
      ORBIS_DAEMON_PORT: String(port),
      ORBIS_DAEMON_ROOT: opts.repoRoot
    }
  });

  child.unref();

  await writeDaemonLock({
    pid: child.pid ?? -1,
    port,
    workspace: opts.workspaceDir,
    projectHash: opts.projectHash,
    startedAt: Date.now()
  });

  return {
    port,
    pid: child.pid ?? -1,
    workspace: opts.workspaceDir,
    projectHash: opts.projectHash
  };
}

async function openBrowser(url: string): Promise<void> {
  const plat = platform();
  let command: string;
  let args: string[];

  if (plat === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '""', url];
  } else if (plat === 'darwin') {
    command = 'open';
    args = [url];
  } else if (plat === 'linux') {
    command = 'xdg-open';
    args = [url];
  } else {
    // Unsupported platform
    return;
  }

  logInfo('Opening Live UI in browser…');
  
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'ignore',
      detached: true,
    });
    
    proc.on('error', () => {
      // Fail silently - browser open is a convenience feature
      resolve();
    });
    
    proc.unref();
    
    // Resolve after a short delay to allow process to start
    setTimeout(() => resolve(), 100);
  });
}

