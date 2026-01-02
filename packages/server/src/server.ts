import http, { ServerResponse } from 'node:http';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { loadRun, listRuns } from './runs.js';
import { getOrbisHome } from './workspace.js';
import {
  handleIngestStream,
  LiveRunStore,
  registerSSEClient,
  sendSSE,
  SSEClient
} from './live.js';

export interface ServerOptions {
  host?: string;
  port?: number;
  rootDir?: string;
  uiDir?: string;
  workspaceDir?: string;
  projectHash?: string;
}

export function startServer(options: ServerOptions = {}): http.Server {
  const host = options.host ?? '0.0.0.0';
  const envPort = Number(process.env.ORBIS_PORT);
  const port = options.port ?? (!Number.isNaN(envPort) ? envPort : undefined) ?? 4173;
  const repoRoot = options.rootDir ?? process.cwd();
  const workspaceDir = options.workspaceDir ?? repoRoot;
  const projectHash = options.projectHash ?? '';
  const uiDir = options.uiDir ?? path.join(repoRoot, 'packages', 'ui', 'dist');
  const orbisHomePromise = getOrbisHome();

  const liveStore = new LiveRunStore();
  const clients = new Map<string, SSEClient>();

  const server = http.createServer(async (req, res) => {
    if (!req.url) {
      return sendError(res, 400, 'Bad request');
    }

    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const pathname = url.pathname;

    process.stdout.write(`[SERVER] ${req.method} ${pathname}\n`);

    try {
      process.stdout.write(`[SERVER] Processing ${req.method} ${pathname}\n`);
      /* ---------------- API ---------------- */

      if (req.method === 'GET' && pathname === '/api/runs') {
        const runs = await listRuns(workspaceDir, projectHash || path.basename(workspaceDir));
        return sendJson(res, { runs });
      }

      const runMatch = pathname.match(/^\/api\/runs\/([^/]+)$/);
      if (req.method === 'GET' && runMatch) {
        const runId = runMatch[1];
        const run = await loadRun(runId, workspaceDir, projectHash || path.basename(workspaceDir));
        return sendJson(res, run);
      }

      /* ---------------- LIVE MODE ---------------- */

      if (req.method === 'POST' && pathname === '/live/ingest') {
        return handleIngestStream(req, res, liveStore, evt => {
          for (const client of clients.values()) {
            sendSSE(client.res, evt);
          }
        });
      }

      if (req.method === 'GET' && pathname === '/live') {
        const client = registerSSEClient(
          res,
          id => clients.delete(id),
          liveStore.snapshot
        );
        clients.set(client.id, client);
        return;
      }

      /* ---------------- UI STATIC SERVING ---------------- */

      // favicon support
      if (req.method === 'GET' && pathname === '/favicon.ico') {
        return serveStatic(uiDir, '/favicon.ico', res);
      }

      // normalize /ui and /ui/
      if (req.method === 'GET' && (pathname === '/ui' || pathname === '/ui/')) {
        return serveStatic(uiDir, '/index.html', res);
      }

      // serve /ui/* - with SPA fallback
      if (req.method === 'GET' && pathname.startsWith('/ui/')) {
        const uiPath = pathname.replace(/^\/ui/, '');
        const fullPath = path.join(uiDir, uiPath);

        process.stdout.write(`[SERVER] UI request: ${pathname} -> ${uiPath}\n`);

        // Check if file exists (for assets)
        try {
          await fs.access(fullPath);
          process.stdout.write(`[SERVER] Serving file: ${uiPath}\n`);
          return serveStatic(uiDir, uiPath, res);
        } catch {
          // File doesn't exist, serve index.html for SPA
          process.stdout.write(`[SERVER] Serving index.html for: ${pathname}\n`);
          return serveStatic(uiDir, '/index.html', res);
        }
      }

      /* ---------------- ROOT ---------------- */

      // optional redirect root → UI
      if (req.method === 'GET' && pathname === '/') {
        res.writeHead(302, { Location: '/ui/' });
        res.end();
        return;
      }

      return sendError(res, 404, 'Not found');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      process.stdout.write(`[SERVER] Error: ${message}\n`);
      return sendError(res, 500, message);
    }
  });

  server.listen(port, host);
  return server;
}

/* ================= HELPERS ================= */

async function serveStatic(
  baseDir: string,
  requestPath: string,
  res: ServerResponse
): Promise<void> {
  const sanitized = requestPath || '/index.html';
  const normalized = path.normalize(path.join(baseDir, sanitized));
  const allowedRoot = path.normalize(baseDir);

  if (!normalized.startsWith(allowedRoot)) {
    return sendError(res, 400, 'Invalid path');
  }

  try {
    const data = await fs.readFile(normalized);
    const contentType = mimeType(normalized);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    return sendError(res, 404, 'Asset not found. Build the UI to serve static assets.');
  }
}

function sendJson(res: ServerResponse, body: unknown, status = 200): void {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(json);
}

function sendError(res: ServerResponse, status: number, message: string): void {
  sendJson(res, { error: message, status }, status);
}

function mimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html';
    case '.js':
      return 'application/javascript';
    case '.css':
      return 'text/css';
    case '.json':
      return 'application/json';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}
