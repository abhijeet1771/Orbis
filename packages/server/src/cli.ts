#!/usr/bin/env node
import { startServer } from './server.js';
import path from 'node:path';
import fs from 'node:fs';

type Command = 'open' | 'live' | 'help';

const args = process.argv.slice(2);
const command = (args[0] as Command) ?? 'open';
const port = Number(process.env.ORBIS_PORT) || Number(getArg('--port', args)) || 4173;
const rootDir = process.cwd();

switch (command) {
  case 'open': {
    ensureUiBuilt();
    const server = startServer({ port, rootDir });
    logInfo(`OrbisReport static server listening on http://localhost:${port}`);
    logInfo(`Workspace: ${rootDir}`);
    onShutdown(server);
    break;
  }
  case 'live': {
    ensureUiBuilt();
    const server = startServer({ port, rootDir });
    logInfo(`OrbisReport live server listening on http://localhost:${port}`);
    logInfo(`Live endpoint: http://localhost:${port}/live`);
    logInfo(`Start Playwright with reporter: ['@orbisreport/reporter', { live: true }]`);
    onShutdown(server);
    break;
  }
  case 'help':
  default:
    printHelp();
    process.exit(command === 'help' ? 0 : 1);
}

function getArg(flag: string, argv: string[]): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1];
  return undefined;
}

function ensureUiBuilt(): void {
  const uiDist = path.join(rootDir, 'packages', 'ui', 'dist', 'index.html');
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
  logInfo('Usage: orbis <open|live> [--port <port>]');
  logInfo('Commands:');
  logInfo('  open   Serve static Orbis report (default)');
  logInfo('  live   Serve static + /live SSE endpoint');
  logInfo('Env: ORBIS_PORT overrides port.');
}

function onShutdown(server: ReturnType<typeof startServer>): void {
  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

