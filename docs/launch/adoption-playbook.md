# Adoption Playbook — How teams roll out Orbis successfully

## Phase 1: Pilot in one repo (local usage)
- **Steps:** Add the one-line reporter config, run tests locally, open `npx orbis open`.
- **Success signals:** First report shared internally; developers resolve at least one failure faster via Debugger.
- **Common objections & responses:**
  - “It’ll slow tests.” → Reporter overhead is minimal; no DB required.
  - “Another tool to learn.” → One command to open; Debugger is guided with failure path.

## Phase 2: Share Executive Overview with stakeholders
- **Steps:** Run a real suite, capture `.orbisreport`, and walk managers through the Executive Overview.
- **Success signals:** Managers can state a release posture (GO / GO WITH RISK / NO-GO) without engineer narration.
- **Objections & responses:**
  - “Scores are subjective.” → Readiness blends pass rate, regressions, and high-trust failures; rationale is shown.
  - “What about flaky tests?” → Flaky rate and trust scores are explicit; low-trust tests are discounted.

## Phase 3: Enable in CI / Jenkins
- **Steps:** Keep the reporter config; archive `.orbisreport`; serve via `npx orbis open` (or host `packages/ui/dist`).
- **Success signals:** CI job artifacts include Orbis; teams open reports from CI links; live runs are optionally watched with `npx orbis live`.
- **Objections & responses:**
  - “Port conflicts.” → Use `ORBIS_PORT` or `--port`; Orbis auto-increments.
  - “Artifacts too big.” → Outputs are JSON + attachments already produced by tests; prune attachments if needed.

## Phase 4: Make Orbis the default test report
- **Steps:** Standardize the reporter config across repos; link CI jobs to Orbis; add Live Mode to long suites.
- **Success signals:** Orbis links replace raw logs; managers consult the Executive Overview first; Debugger is used for root-cause flows.
- **Objections & responses:**
  - “Can teams opt out?” → Yes, but default to Orbis; opt-out needs a reason (e.g., non-Playwright stack).
  - “Does it cover non-functional?” → Today focused on Playwright; roadmap can expand with demand.

