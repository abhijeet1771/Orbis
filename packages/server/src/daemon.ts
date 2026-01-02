import { promises as fs } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';

export interface DaemonLock {
  pid: number;
  port: number;
  workspace: string;
  projectHash: string;
  startedAt: number;
}

const LOCK_PATH = path.join(os.homedir(), '.orbis', 'daemon.lock');

export async function readDaemonLock(): Promise<DaemonLock | undefined> {
  try {
    const raw = await fs.readFile(LOCK_PATH, 'utf-8');
    return JSON.parse(raw) as DaemonLock;
  } catch {
    return undefined;
  }
}

export async function writeDaemonLock(lock: DaemonLock): Promise<void> {
  await fs.mkdir(path.dirname(LOCK_PATH), { recursive: true });
  await fs.writeFile(LOCK_PATH, JSON.stringify(lock, null, 2), 'utf-8');
}

export async function removeDaemonLock(): Promise<void> {
  await fs.rm(LOCK_PATH, { force: true });
}

export function isPidAlive(pid: number): boolean {
  if (!pid || Number.isNaN(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function findFreePort(preferred: number, attempts = 20): Promise<number> {
  for (let i = 0; i < attempts; i++) {
    const port = preferred + i;
    const free = await isPortFree(port);
    if (free) return port;
  }
  throw new Error(`No available ports near ${preferred}`);
}

async function isPortFree(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => {
      srv.close(() => resolve(true));
    });
    srv.listen(port, '0.0.0.0');
  });
}

export function daemonLockPath(): string {
  return LOCK_PATH;
}

