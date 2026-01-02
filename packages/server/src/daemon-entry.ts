import process from 'node:process';
import { startServer } from './server.js';
import { removeDaemonLock } from './daemon.js';

const workspaceDir = process.env.ORBIS_DAEMON_WORKSPACE;
const projectHash = process.env.ORBIS_DAEMON_PROJECT_HASH;
const port = Number(process.env.ORBIS_DAEMON_PORT);
const rootDir = process.env.ORBIS_DAEMON_ROOT ?? process.cwd();

if (!workspaceDir || !projectHash || Number.isNaN(port)) {
  // eslint-disable-next-line no-console
  console.error('[orbis] Daemon startup missing required env');
  process.exit(1);
}

const server = startServer({
  port,
  rootDir,
  workspaceDir,
  projectHash
});

function shutdown(): void {
  removeDaemonLock()
    .catch(() => {
      /* ignore */
    })
    .finally(() => {
      server.close(() => process.exit(0));
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', () => {
  void removeDaemonLock();
});

