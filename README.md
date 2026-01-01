# OrbisReport

OrbisReport is a next-generation test execution intelligence platform for Playwright. It is designed to plug into existing Playwright frameworks as a drop-in reporter—similar to how Allure integrates—while providing both static and future live reporting capabilities.

## Monorepo layout

- `packages/reporter`: Playwright reporter SDK (no UI, no DB).
- `packages/core`: Shared data models, normalization, and failure intelligence utilities.
- `packages/server`: Static and (future) live server surface; handles filesystem/DB access.
- `packages/ui`: React + Vite frontend for static and live experiences.
- `.orbisreport`: Runtime output (ignored by git) for runs, attachments, and SQLite DB.

## Getting started

Prerequisites: Node.js >= 18 and pnpm.

```bash
pnpm install
pnpm build
pnpm --filter @orbisreport/ui dev
```

This foundation intentionally omits reporter logic, UI screens, database setup, and live mode. Future steps will layer those in.

## CLI usage (static and live)

- Static report server: `npx orbis open` (serves `/api/runs` + UI)
- Live server (with SSE): `npx orbis live`
- Port override: `ORBIS_PORT=5000 npx orbis open`

If `packages/ui/dist` is missing, build UI first: `pnpm --filter @orbisreport/ui build`.

## Playwright integration

Playwright config:
```ts
reporter: [
  ['@orbisreport/reporter', { live: true }]
]
```

After `playwright test`, archive `.orbisreport` as the CI artifact (Jenkins/GHA). For live mode, keep the `orbis live` server running during execution; UI will display streaming updates via `/live`.

## CI/Jenkins notes

- No absolute paths are written to JSON outputs; artifacts live under `.orbisreport/attachments`.
- Static HTML/JSON can be published directly as build artifacts.
- `ORBIS_PORT` configurable for CI runners; no auth/certs required initially.

