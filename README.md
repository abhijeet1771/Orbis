# OrbisReport

## What is Orbis?
OrbisReport is a test execution intelligence layer for Playwright. It turns raw runs into an Executive Overview for managers, a developer-grade Debugger with evidence correlation, and live progress visibility—without changing how you write tests. It installs as a drop-in reporter; no meetings, training, or migrations required.

## Why Orbis vs Allure / Raw CI logs
| | OrbisReport | Allure | Raw CI logs |
|---|---|---|---|
| Drop-in Playwright setup | ✔ one-line | ✔ config | ✖ parsing |
| Manager-ready overview | ✔ | △ plugins | ✖ |
| Live mode (SSE) | ✔ | △ | ✖ |
| Failure path + evidence correlation | ✔ | △ | ✖ |
| Trust / Regressions / Release readiness | ✔ | ✖ | ✖ |
| Zero-DB static hosting | ✔ | ✔ | ✔ |

## Quick Start (Golden Path)
- Install: `pnpm install`
- Enable reporter (one line) in `playwright.config.ts`:
  ```ts
  reporter: [['@orbisreport/reporter', { outputDir: '.orbisreport' }]];
  ```
- Run tests: `npx playwright test`
- Open report: `npx orbis open` (URL printed)

## Static vs Live Mode
- **Static**: After a run finishes; great for CI artifacts and manager reviews.
- **Live**: During long suites; see progress, failures, and evidence in real time with `npx orbis live`.

## Executive Overview (what managers see & why)
Release Readiness score, change since last run, risk hotspots, and proof links—designed to answer “Can we ship?” in under a minute.

## Debugger (failure path, code, evidence)
Auto-focused failure path, inline code snippets, correlated logs/network/artifacts, and trust indicators so developers land on root cause fast.

## Trust, Regressions, Release Readiness (plain English)
- **Trust**: Per-test reliability from history (flakiness, streaks, recency).
- **Regressions**: New failures/flakies/perf regressions vs previous run, severity-tagged.
- **Release Readiness**: Blends pass rate, regressions, flaky concentration, and high-trust failures into GO / GO WITH RISK / NO-GO with rationale.

## CLI Reference
- `npx orbis open` — Serve latest static report (auto-picks port)
- `npx orbis open --run <id>` — Serve and deep-link to a specific run
- `npx orbis live` — Serve UI + /live SSE endpoints for streaming runs
- `npx orbis doctor` — Check UI build, `.orbisreport` presence, and port availability
- Env: `ORBIS_PORT` preferred port (auto-increments if busy)

## CI / Jenkins Usage
- Run Playwright with the Orbis reporter; archive `.orbisreport` as an artifact.
- Static publish: `npx orbis open --port 4173` (or host `packages/ui/dist`).
- Live in CI: run `npx orbis live` while tests execute (SSE at `/live`).

## FAQ / Common Issues
- **UI blank/404**: Build UI: `pnpm --filter @orbisreport/ui build`.
- **Port in use**: Set `ORBIS_PORT` or `--port`; Orbis will try the next few.
- **“No runs found”**: Ensure `.orbisreport/runs` exists; rerun tests with the reporter.
- **Slow load**: Serve from local disk/CI artifact; no DB needed.

## Roadmap (short, confident)
- Exportable PDF/briefing packs for managers.
- Deeper IDE jump links and source previews.
- More CI integrations and zero-config live tunnels.

## Golden Path (copy-paste)
```ts
// playwright.config.ts
reporter: [['@orbisreport/reporter', { outputDir: '.orbisreport' }]];
```
```bash
npx playwright test
npx orbis open
# Live streaming (optional)
npx orbis live
```
What you’ll see:
- Executive Overview: release readiness, change vs last run.
- Execution Index: filters, trust, regression badges for triage.
- Debugger: failure path + evidence.
- Live Mode: progress, running tests, recent events.

## Screens (placeholders)
![Executive Overview](./docs/executive-overview.png "Executive Overview — answers 'Can we ship?' with readiness, change, and hotspots")
![Execution Index](./docs/execution-index.png "Execution Index — fast triage with filters, trust, regression badges")
![Debugger](./docs/debugger.png "Debugger — failure path, inline code, and evidence around the failure moment")
![Live Mode](./docs/live-mode.png "Live Mode — progress, what’s running, and what just happened")

## Internal Adoption: how teams typically roll out Orbis
1) Start with one project using the one-line reporter config.  
2) Share the Executive Overview with managers on the next run.  
3) Wire into CI to publish `.orbisreport` and host via `orbis open`.  
4) Make Orbis the default reporter across projects once trust builds.  

