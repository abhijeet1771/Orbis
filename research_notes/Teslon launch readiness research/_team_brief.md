# Team brief: Teslon launch-readiness research (2026-11-15)

Everyone on the team reads this first. It says what Teslon is, what the owner asked, and the rules.

## What Teslon is

Teslon is a "PR impact for QA" tool. Given a pull request (two git commits) it tells testers:
- which areas of the app to TEST (screens, APIs, background jobs), with concrete checks;
- which areas are safe to SKIP, each with a machine-checked proof;
- which areas are UNCLEAR (it could not rule them out), and why.

Every claim carries file:line evidence that is re-read from the commit before it is shown.

Design choices:
- Deterministic: no LLM and no AI in any decision. Static reading of the code of both commits.
- Offline: it runs on the team's own runner (a CLI and a GitHub Action). Code never leaves it.
- Core promise: never a wrong skip, and never silent. When it cannot follow a change it says so and holds
  the areas as unclear.
- An independent checker re-derives every skip from the facts of both commits; a skip it cannot prove is held.

What it reads today: Java/Spring (web, JPA, validation, security, Kafka, Feign, events, async, AOP, gateway),
Angular and Vue 3 front ends, Maven and npm, Liquibase and Flyway, YAML/properties config, Docker/K8s files as a
deployment area. Other stacks (React, Kotlin, Node back ends, Python, Go, .NET, Gradle) are detected, named,
and held as unclear, not read.

Outputs: a PR comment (markdown), a run summary, report.json, and report.html (a "cockpit").

Evidence so far (all on Teslon's own fixtures or two open-source apps):
- about 1,000 tests on every change: hand-written truth-first probes (196 OrderDesk, 93 ShopFlow, 9
  spring-petclinic-microservices), 434 compiler-proven mutants, 33 proving-ground runs, 221 unit tests;
- 55 live GitHub pull requests on its own fixture repos, where the Action's comment matched the lab answer;
- history scans of 60 real commits each on spring-petclinic-microservices and jhipster-sample-app: 0 failed
  citations, 0 crashes.
- NOT yet validated on a real team's code, and never judged by real QA users.

Target users: test engineers (manual and exploratory), automation engineers (SDETs), test leads, test managers,
in enterprises.

## What the owner asked (the final report answers each)

1. Do we understand what we set out to build, and what are we doing right and wrong?
2. Is Teslon enterprise grade today?
3. Will it be 100% without mistakes? If not, exactly what must be implemented or proven before launch?
4. What would make it "1 of 1": the strongest tool in its field, 100% accurate with evidence?
5. The report (this research report, and Teslon's own output) must be meaningful for test engineers,
   automation engineers, test leads and test managers.

The owner asked that no stone be left unturned: small and large GitHub repos, papers, theses, communities.

## Where things are

- Repo: /home/user/teslon. READ-ONLY for this research. Do not edit, build, install, commit or push there.
- Start with: README.md, HOW-IT-WORKS.md, ROADMAP.md.
- Earlier research (build on it, do not repeat it): research/PRIOR-ART.md, research/COUNCIL-2026-11-04.md and
  research/council/, research/RND-PLAN-2026-11-04.md, research/EXPECTATION-SCORECARD-2026-11-04.md,
  research/CERTIFICATE-2026-11-05.md, research/GAUNTLET-2026-11-05.md, research/CHANGE-ATLAS-2026-11-05.md,
  research/TECH-LANDSCAPE-2026-11-05.md, research/LIVE-RUN-2026-11-05.md, research/ADOPTION.md,
  research/IMPACT-ATLAS.md.
- Engine: packages/core/src/engine/*.ts (about 10,000 lines). CLI: packages/cli. Report UI: packages/ui.
  GitHub Action: action.yml.
- Sample outputs: research/sample-output/.
- Fixtures: fixtures/orderdesk (Spring + Angular), fixtures/shopflow (4 Spring services, Kafka, Vue 3).
- Earlier clones of public repos: /tmp/claude-0/-home-user-Orbis/a99ca81c-9750-554d-8faa-4222ad38b407/scratchpad/repos/

## Rules for everyone

- Evidence or it did not happen. External claims: URL and year. Code claims: file:line. Measurements: the
  command and its output.
- Separate three things: verified facts, vendor or author claims, and your own inference.
- Be adversarial. The owner wants to know where Teslon is wrong, weak or unproven. Do not flatter.
  Praise must be earned with evidence too.
- Write notes in plain English, dense, with tables where they help. Save your notes file early and update it
  as you go, so partial work survives an interruption.
- Today is 2026-11-15. Say how recent each source is.

## Lab rules (for those who run Teslon)

- Use the built engine read-only:
  `import { impact, brief } from '/home/user/teslon/packages/core/dist/index.js'`
  NEVER run npm install, npm run build or tsc in /home/user/teslon: other team members use dist at the same time.
- Run node as `env -u GITHUB_TOKEN -u GH_TOKEN node ...`.
- API (synchronous):
  ```js
  const r = impact({ repo: '/abs/path/to/git/repo', base: '<sha>', head: '<sha>' });
  const b = brief(r);
  // b.test, b.skip, b.unclear (counts); b.none; b.confidence.title ('High' | 'Partial' | 'Not proven' ...)
  // b.areas: [{ id, state: 'test' | 'skip' | 'unclear', name, why }]
  //   ids look like: screen:/orders/:id   api:GET /api/orders   job:Class.method   widget:tag   deploy:file
  //   module:name   screen:* (every screen)
  // r.triage.appEffect ('none' when the PR cannot change the running app), r.triage.summary
  // r.verification.failed: cited lines that did not re-check (must be empty)
  // r.unseen: [{ what, why, resolve, files }]  what Teslon could not see
  // r.ledger: [{ file, status, kind, reason }] one entry per changed file
  // r.deltas: [{ id, kind, title }]  what it understood as changed
  // r.certification: { certified, demoted, unknowns, assumptions }  the independent checker
  ```
- CLI: `node /home/user/teslon/packages/cli/dist/cli.js --help` (for example `impact <base>..<head> --json`).
- Examples of drivers: /home/user/teslon/bench/probes/run.mjs (one PR per probe on a fixture copy),
  /tmp/claude-0/-home-user-Orbis/a99ca81c-9750-554d-8faa-4222ad38b407/scratchpad/scan.mjs (history scan).
- The machine is shared (4 cores, 15 GB). Run ONE node process at a time, never in parallel. Run each commit
  in its own child process with a timeout, so one hang or crash does not lose the run.
- Work only under your own folder:
  /tmp/claude-0/-home-user-Orbis/a99ca81c-9750-554d-8faa-4222ad38b407/scratchpad/field/<your-name>/
  Copy fixtures there before changing them.
- Cloning public repos: `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 400 --single-branch <url> <dir>` with a
  10-minute timeout, one clone at a time. On HTTP 429, sleep 5 s and retry once.
- When you check Teslon against truth, write down the truth BEFORE you look at Teslon's answer.
