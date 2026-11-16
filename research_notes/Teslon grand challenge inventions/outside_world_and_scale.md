# Outside the repository, file classification, and scale (inventor: systems lens)

2026-11-16. Challenges C6 (world outside the repository), C7 (cost proportional to the change), and safe file
classification. Work directory: `/tmp/claude-0/-home-user-Orbis/a99ca81c-9750-554d-8faa-4222ad38b407/scratchpad/inventors/systems/`.

Status: IN PROGRESS. Notes are saved after each invention.

## Summary table

| # | Invention | Challenge | Status | Headline result |
|---|---|---|---|---|
| I1 | Build-observed inventory with negative probes | file classification, C1 | in progress | |
| I2 | World-assumption ledger discharged at deploy time | C6 | in progress | |
| I3 | Merkle fact cache keyed by git blob and tree hash | C7 | in progress | |

## I1. Build-observed inventory with negative probes (draft, experiment run)

Idea: run the real build (and, later, the image build and app start) under `strace -f` once per base commit.
Record three sets of repository paths: files READ, paths PROBED and not found (ENOENT, a negative dependency),
and directories LISTED (getdents64, a glob dependency). A changed path in any set is code, whatever its name.
"Inert" is allowed only when no traced step saw the path and every traced step succeeded.

Experiment (ShopFlow frontend, `npm run build` = vue-tsc -b && vite build, traced in 12.5 s):
- inventory: 85 files read, 80 negative probes, 12 listed folders.
- E14 `Notice.vue`: CODE (read by the build). Teslon called it documentation.
- E01 OrderDesk `dashboard/charts/sales-chart.ts`: CODE (read by `ng build`). Teslon called it deployment.
  (The OrderDesk fixture does not type-check at base, TS2345; the classifier therefore refuses every INERT verdict
  for that repo, which is the fail-closed rule working.)
- Synthetic PR with 6 changes, each verified by a fresh rebuild and a hash of `dist/`:
  README.md + docs/notes.md -> INERT, rebuild byte-identical (f0f79115 = base);
  added `src/api/http.mjs` -> CODE via a negative probe; the rebuild FAILS because Vite resolves `./http`
  to `.mjs` before `.ts` (a shadowing file that no import graph would see);
  `Notice.vue` -> CODE, dist changes; added `.postcssrc.json` -> CODE (probed), dist unchanged (safe over-approximation).
- Side finding: vue-tsc -b writes `.js` files beside the `.ts` sources, and a second Vite build then resolves
  `./http` to the emitted `http.js`. The trace shows this; a reader of source would not.

## I2. World-assumption ledger: settings resolved by the framework's own resolver, discharged at deploy time (draft, experiment run)

Idea, in four parts:
1. **Render the deployment with the deploy tool itself** (`docker compose config --format json`; the same for
   `helm template`, `kustomize build`, `kubectl get -o json`), so `.env` files, interpolation, `extends` and
   profiles come from the tool, not from a hand-written reader.
2. **Resolve every configuration key with the framework's own resolver** at base and at head, under that
   environment (a 40-line Java program around Spring Boot's `SystemEnvironmentPropertySource`,
   `YamlPropertySourceLoader` and `ConfigurationPropertySources.attach`). Relaxed binding (`BILLING_TAX_RATE` to
   `billing.tax-rate`) and `${...}` placeholders are then not modelled by Teslon at all; they are executed by the
   code that will run in production. Only keys whose *effective value* differs are changes.
3. **Canary binding for environment variables**: set each changed variable to a sentinel and re-resolve; the keys
   whose value becomes the sentinel are the keys it binds. A variable that binds nothing becomes one short
   question ("env LOG_FORMAT changed for billing-service and no known key binds it. Which code reads it?").
4. **Framework keys are carried by beans derived from the framework's bytecode**: the configuration metadata in
   `spring-boot-autoconfigure.jar` maps `spring.mail.host` to `MailProperties`; `javap` over that package finds
   `JavaMailSenderImpl mailSender(MailProperties, ...)`; its interface `JavaMailSender` is what application code
   injects. If no application class names a carrier (DataSource used only through JPA), the key affects
   *all areas of the service* (fail closed).
5. **Deploy-time discharge**: every area that a skip certificate covers carries the fingerprints
   (SHA-256 of the effective value) of all keys it can read. At deploy time `deploycheck.py` re-resolves those keys
   under the environment the deployment really provides and revokes each skip whose fingerprint differs.

Results (prototype `bin/worlddiff.py`, `bin/deploycheck.py`, `worldres/ResolveKeys.java`):
- **E56** (compose sets `BILLING_TAX_RATE: "0.07"`, `BILLING_PROVIDER: fake`): changed effective keys
  `billing.tax-rate` 0.19 -> 0.07 and `billing.provider` stripe -> fake; affected includes
  `job:OrderPlacedConsumer.onOrderPlaced` (the truth), plus `OrderCancelledConsumer` and three `InvoiceController`
  routes (over-approximation by type references; the provider beans are reached through their interface
  `PaymentProvider`). Teslon: certified wrong skip.
- **E73** (`spring.mail.host: ${orderdesk.smtp-host}`): `spring.mail.host` changes through the placeholder,
  carried by `JavaMailSender`; affected = `job:NotificationService.onOrderPlaced`, `job:StockAlertJob.alert`,
  exactly the truth. No question asked: `orderdesk.smtp-host` is explained as reaching code only through the placeholder.
  Teslon: two certified wrong skips.
- **Negative control** (compose adds `BILLING_TAX_RATE: "0.19"`, equal to the YAML default, and `LOG_FORMAT: json`):
  0 changed keys, so nothing is affected by the tax variable (the canary shows it binds `billing.tax-rate`, value
  unchanged), and exactly one question for `LOG_FORMAT`.
- **Deploy-time revocation**: for a README-only PR (0 changed keys, 9 assumptions recorded), a deployment
  environment identical to the repository passes 9/9; a production environment that sets `BILLING_TAX_RATE=0.07`
  outside the repository fails 1/9 and revokes the skips of the five billing areas, naming the key and value.
- **Falsification found during the run**: the first version derived carriers for `spring.datasource.url`
  (HikariDataSource, DataSource) but found no application class naming them (JPA uses them indirectly) and so
  listed *no* areas: an unsound empty set. Fixed to fail closed (`*all areas of billing-service`). A test:
  change `SPRING_DATASOURCE_URL` in compose; the fixed tool reports all areas.

## I3. Change-proportional facts: blob-keyed local facts plus probe-keyed resolution (draft, experiment run)

Idea: split every fact into two kinds and cache each by exactly what it depends on.
- **Local facts** (here: the import specifiers of a file) are a pure function of the file's bytes, so they are cached
  by git blob SHA forever, across branches, repositories and runs.
- **Resolution facts** (specifier -> file) depend on which paths exist. Each one records the ordered list of candidate
  paths it probed (`./endpoints`, `./endpoints.ts`, `./endpoints.tsx`, ..., `./endpoints/index.ts`). An index from
  probed path to resolution says which resolutions a PR's added or deleted paths can change. This is I1's negative
  dependency, used for incrementality.
- The reverse index (file -> importers) is updated by delta; the PR query is a reverse closure from the changed files.
- All blob reads go through one `git cat-file --batch` process (no process per file).
- **Equality oracle**: the incremental state must equal a from-scratch computation. Run it in CI on a sample of PRs,
  and fall back to from-scratch on any mismatch.

Results on n8n (34,833 files; the audited 4-file PR b70e354d that Teslon did not finish in 1,200 s after 45,032
`git show` processes):
- Cold index of the whole base commit: **11.6 s, 26,954 blob reads, 149 MB RSS**, one git process.
- Warm PR query for b70e354d: **0.85 s wall** (0.52 s of that is loading a 31 MB pickle), **4 blob reads**,
  reverse closure 63 files. (One `git show` costs about 3.3 ms here, so 45,032 of them is about 150 s of spawning alone.)
- **Soundness check**: incremental == from-scratch on **15 of 15** consecutive real n8n commit pairs (3 to 135
  changed paths; incremental 51-270 ms against 9-11 s from scratch).
- **Falsification of the negative-dependency rule**: a synthetic commit that adds `endpoints.ts` beside an existing
  `endpoints/index.ts` (imported as `./endpoints`). With probe-keyed invalidation: 1 resolution recomputed, EQUAL.
  With the rule removed (ablation): **EQUAL=False**, the stale index still points `./endpoints` at `endpoints/index.ts`.
  A blob-hash cache alone (the bazel-diff / Nx idea named in the readiness report) is therefore not sound.
- Scope limits: the fact model here is import edges for JS/TS only (relative, `@/` alias, workspace packages);
  external packages are left to the lockfile. Train-ticket (Java) was not re-run.
