# Orbis Internal Standards (Draft)

## When to use Live Mode
- Use for long or critical suites where progress and early failure surfacing matter.
- Keep the live server running during execution: `npx orbis live`.
- Switch to Static after completion for final sign-off and sharing.

## When to use Static Mode
- Use for post-run review, CI artifacts, and manager approvals.
- Default command: `npx orbis open` (or `--run <id>` to deep-link).

## What defines a release-ready run
- Release Readiness band is **GO** or **GO WITH RISK** with rationale understood.
- No critical regressions on high-trust tests.
- Flaky rate acceptable for the team (default expectation: low flake or quarantined).
- Executive Overview reviewed; blocking failures either fixed or explicitly waived.

## How to interpret trust and regressions
- **Trust**: High-trust failures demand action; low-trust failures may indicate flaky or unstable tests.
- **Regressions**: “New Failure” and “New Flaky” versus the previous comparable run; performance regressions flagged separately.
- Decisions: Prioritize critical regressions on high-trust tests first.

