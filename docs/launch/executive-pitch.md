# OrbisReport — From Test Results to Release Decisions

## The problem today
- Test signals are trapped in logs and job consoles; managers wait on engineers for translation.
- Failures are noisy: flaky tests, retries, and partial logs obscure real risk.
- Confidence is delayed: teams hesitate to ship because “we’re not sure what actually failed.”

## Why reports fail managers
- Traditional reports focus on counts, not decisions.
- They require engineers to narrate context; managers can’t self-serve.
- Live runs are opaque: no sense of progress or where to look first.

## What Orbis changes
- **Live clarity:** Live Mode shows progress, running tests, and new failures as they happen—no waiting for the job to finish.
- **Trust & regressions:** Tests carry a trust score from history; regressions flag what got worse vs the last run.
- **Release readiness:** A GO / GO WITH RISK / NO-GO call that blends pass rate, regressions, flaky concentration, and high-trust failures with clear rationale.
- **Debugger with evidence:** Failure path, inline code, logs, network, and artifacts in one view—no log spelunking.

## Decisions Orbis enables
- Can we release this build? (Release Readiness)
- What changed vs the last run? (Regressions)
- Where should devs focus first? (Trust + Debugger)
- Is live execution healthy right now? (Live Mode)

## Why this reduces risk and accelerates releases
- **Faster triage:** Developers land on the failing path with correlated evidence.
- **Higher confidence:** Managers get a defensible readiness call without meetings.
- **Less noise:** Flaky and low-trust tests are de-emphasized; high-trust failures are highlighted.
- **Continuous visibility:** Live Mode removes the “black box” during long suites.

