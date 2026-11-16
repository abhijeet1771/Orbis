# Field test: Teslon on two real "readable stack" apps (spring-boot-admin, jhipster-registry)

Author: field tester "readable". Date: 2026-11-15. Status: IN PROGRESS (updated after each step).
Working folder (scripts, raw results): /tmp/claude-0/-home-user-Orbis/a99ca81c-9750-554d-8faa-4222ad38b407/scratchpad/field/readable/

Apps under test (both use the stack Teslon claims to read: Java/Spring + Vue 3 / Angular, Maven, npm):
1. codecentric/spring-boot-admin (Spring Boot back end, Vue 3 front end) https://github.com/codecentric/spring-boot-admin
2. jhipster/jhipster-registry (Spring Cloud back end, Angular front end) https://github.com/jhipster/jhipster-registry

## Summary table

(filled at the end)

## Step A. Know the app (reference lists)

Clones (2026-11-15): `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 400 --single-branch`. SBA at master 54b010a4 (2026-11-15, very active, mostly Renovate dependency PRs). JHR at main 7f93c343 (2025-12-31; low activity since 2023, 1,212 commits reachable at depth 400 because of merges).
Line counts: `scripts/loc.sh` over `git ls-files` (raw/loc-*.txt).

| | spring-boot-admin (SBA) | jhipster-registry (JHR) |
|---|---|---|
| Java | 418 files, 43.6k lines (250 main, 168 test) | 90 files, 5.2k lines (52 main, 37 test) |
| Front end | Vue 3 + Vite: 169 .vue (23.6k lines) + 240 .ts (33.7k); 279 non-test UI files, 87 spec files | Angular 14: 177 .ts (7.8k lines) + 35 .html; 167 non-test files, 44 spec |
| Other | React docs site (7 tsx), e2e Playwright, 11 sample apps, MCP server module | central-config, Docker, k8s-less |
| Router style | NOT a routes array: every view registers itself with `viewRegistry.addView({path, name, parent, component: this})` inside its own `install()`, auto-discovered by `import.meta.glob` (views/index.ts:23); router built in viewRegistry.ts:75. Imports use the `@/` Vite alias (484 alias imports vs 80 relative) | Classic JHipster 7: `RouterModule.forRoot` with lazy `loadChildren` to `admin-routing.module` / `registry-routing.module`, each feature module does `RouterModule.forChild([xxxRoute])` with `export const xxxRoute: Route = { path: '', component: X }` in a separate `.route.ts` file |
| Controller style | Custom `@AdminController` stereotype (plain annotation, NOT meta-annotated with `@Controller`; registered by `AdminControllerHandlerMapping` with the admin context path). WebFlux and servlet variants | Plain `@RestController` + `@RequestMapping("/api")` |

Reference screens (read by hand; full list raw/ref-sba.txt, raw/ref-jhr.txt):
- SBA, 33 screens: `/` (redirect), `/applications/:selected?`, `/wallboard`, `/journal`, `/about`, `/mcp`, the instance shell `/instances/:instanceId` with 26 children (details, metrics, env, configprops, beans, conditions, scheduledtasks, quartz, loggers, logfile, jolokia, threaddump, heapdump, httptrace, httpexchanges, auditevents, sessions, caches, mappings, liquibase, flyway, startup, gateway, dependencies, sbom, custom-link/:url), and the server-rendered `/login`.
- JHR, 13 functional screens + 3 error screens: `/`, `/login`, `/admin/{docs,configuration,health,logs,metrics}`, `/registry/{applications,config,encryption,history,replicas,ssh}`, `/error`, `/accessdenied`, `/404` (+ `**`, navbar outlet).

Reference endpoints:
- SBA, 17 distinct method+path: UiController `GET /`, `/sba-settings.js`, `/variables.css`, `/login`; NotificationFilterController `GET/POST /notifications/filters`, `DELETE /notifications/filters/{id}`; ApplicationsController `GET/POST /applications`, `GET/DELETE /applications/{name}` (+SSE); InstancesController `POST/GET /instances`, `GET/DELETE /instances/{id}`, `GET /instances/{id}/health-groups`, `GET /instances/events` (+SSE); InstancesProxyController `ANY /instances/{instanceId}/actuator/**`, `ANY /applications/{applicationName}/actuator/**`. Plus 17 MCP tools (`@McpTool`), and background work: StatusUpdateTrigger/IntervalCheck polling, InfoUpdateTrigger, EndpointDetectionTrigger, RemindingNotifier, 18 event notifiers (Mail, Slack, Teams, ...), client registration scheduler, cloud InstanceDiscoveryListener.
- JHR, 12 own endpoints: `GET /api/account`, `GET/POST /api/authenticate`, `GET /api/auth-info`, `GET /api/config/sources`, `GET /api/eureka/{applications,lastn,replicas,status}`, `POST /api/logout`, `GET /api/ssh/public_key`, `GET /**/{path}` (client forward). Framework endpoints the UI uses: `/config/**` (Spring Cloud Config, incl. `/config/encrypt|decrypt`), `/eureka/**`, `/management/**` (actuator). Jobs: `EurekaWorkaroundConfiguration.onStartup` (@EventListener).

## Step B. Reader coverage

Runs: 4 commits per app that change app code (SBA 214da89, faf078d, f3daa75, 991a28b; JHR 4af2be1, c78cd8f, c3a41d0, 82874c7). Raw: raw/b-sba/*.json, raw/b-jhr/*.json. Union of every area id ever reported (screens, APIs, jobs, plus ids named in `unseen`):

| | Real screens | Screens Teslon knows | Real own endpoints | APIs Teslon knows | Jobs |
|---|---|---|---|---|---|
| SBA | 33 | **0 of 33**. It knows only `/custom`, `/customSub`, `custom`, which are the *sample* extension UI (spring-boot-admin-samples/spring-boot-admin-sample-custom-ui/src/index.js:50), not the product | 17 | **0 of 17** (no `api:` id in any run) | 8 client/cloud listener jobs seen; none of the server's polling triggers or notifiers |
| JHR | 13 + 3 error | **3 of 16**: only `/error`, `/accessdenied`, `/404`. All 13 functional screens (home, login, every admin and registry page) are invisible | 12 | **12 of 12**, plus **10 fake APIs** from test-only controllers in `src/test/java` (`/api/exception-translator-test/*` x7, `/api/test-cors`, `/test/test-cors`, `ANY /test`) | 1 of 1 (`EurekaWorkaroundConfiguration.onStartup`) |

Why (engine files):
1. **SBA screens: `component: this` and alias imports.** packages/core/src/engine/vue.ts:364-380 takes a route only when `component:` is an identifier or a lazy `import('./x')`. 25 of 26 SBA views register with `component: this` inside their own `install()`; `this` is not an identifier, so no route. The other three (`/instances/:instanceId` -> `InstanceShell`, `/mcp` -> `McpView`, iframe) import the component through the `@/` alias, and `resolveRel` (vue.ts:201) returns null for any spec not starting with `.`, so the route is dropped by the filter at vue.ts:591. Child views use `parent: 'instances'` (a name, not nesting), which no reader composes into `/instances/:instanceId/<child>`. The same `resolveRel` gap means 86% of SBA's imports (484 `@/` vs 80 relative) are not edges, so every changed component is reported "no screen this build can see imports or draws it".
2. **SBA endpoints: custom stereotype.** All SBA controllers carry `@AdminController` (spring-boot-admin-server/src/main/java/de/codecentric/boot/admin/server/web/AdminController.java), a plain annotation with no `@Controller` meta-annotation. Teslon finds no API in the whole server. Every Java change in the server (proxy, registry, notifiers) is reported as "reaches no API, job, AI tool or screen this build can see" and held as unclear. MCP `@McpTool` methods are not an area either.
3. **JHR screens: single `Route` constants.** packages/core/src/engine/angular.ts:390-428 (`routeArray`) reads object literals and spread arrays (`...errorRoute`, which is why the 3 error screens are found) but skips a plain identifier element, and the `const x: Routes = [...]` detector (angular.ts:459-463) only accepts arrays. JHipster 7 writes every screen as `export const configurationRoute: Route = {...}` + `RouterModule.forChild([configurationRoute])` (admin/configuration/configuration.module.ts:9, home/home.module.ts:10), so no feature screen exists for Teslon, even the eager home page. This is the generator's standard output, so it likely hits every JHipster 7 Angular app.
4. **JHR test controllers counted as product APIs.** `WebConfigurerTestController` and `ExceptionTranslatorTestController` live in src/test/java but appear as `api:` areas and are listed TEST whenever a config class changes (NOISE in every config PR).
5. **No skips possible in practice.** With 0 product screens on SBA and 3 of 16 on JHR, the "screens" Teslon can skip are not the app's screens. Every front-end file change on both apps lands in the ledger as `not-modelled` ("nothing followed these lines"), which makes `appEffect=unknown` and holds everything.

Also seen in Step B:
- **Speed.** SBA takes 128-153 s per commit (limit in this lab: 180 s); JHR 4-6 s. A CPU profile of SBA faf078d (raw/prof/summary.txt, `node --cpu-prof`) puts 120 s of 143 s in the independent checker, `certify` (packages/core/dist/engine/certify.js:937-938; source certify.ts:~660-668): for every pair of members in a front-end file it rebuilds the set of every line of every member, O(members^2 x lines). It does this although there were 0 skips to certify. Peak RSS 370-400 MB.
- A Jest snapshot file (`__snapshots__/health-details.spec.ts.snap`) is classified `other` and `not-modelled` instead of test-only, so a snapshot update alone makes a PR "unknown".

## Step C. Mass run

Budget cut by the coordinator: 60 commits per app (not 150). Commits: `git log --no-merges --first-parent -n 60` (what landed on the default branch; JHR's first-parent non-merge history reaches back to 2017 because most of its recent history is merge commits). Each commit runs in its own child process, `timeout 180`, base = parent. Driver: scripts/mass.sh, scripts/run1.mjs; summary: scripts/summ.mjs. Raw: raw/c-jhr/, raw/c-sba/.

### JHR (60 commits, raw/c-jhr/summary.txt)
| Metric | Value |
|---|---|
| Crashes | **2 of 60** (f41e6de "Upgrade to the latest Spring Cloud", 2017; a6bed82 "Release v2.6.0"): `RangeError: Maximum call stack size exceeded at visit (packages/core/dist/engine/vue.js:268)`. Those commits carry the old AngularJS app with vendored `bower_components` (angular.js 1.1 MB, highlight.pack.min.js 500 kB); the recursive TypeScript visitor in vue.ts blows the stack, and the run produces no report at all. |
| Timeouts | 0 (median 3.7 s, max 4.3 s; peak RSS median 318 MB, max 358 MB) |
| Failed citations | 0 |
| appEffect | yes 12, none 7, unknown 39 |
| "Nothing to test" (`b.none`) | 7/58 = 12% (README, Docker Hub button, copyright, workflow files: all correct on inspection) |
| Every screen unclear | 49/58 = 84% |
| Median share of screens skipped | 0%. Commits with at least one skip: 3/58, and those skips are only the 3 error pages |
| Confidence | High 19, Partial 39 |
| Skips demoted by the checker | 33 (always the 3 error pages) ; certified 3 |
| Top unseen reasons | "no screen this build can see imports or draws it" (86 notes), "no rule follows frontend changes like this" (44), "no rule follows dependencies changes like this" (36), "N changed files have lines nothing followed" (39) |

Note: the JHR "skips" can only ever be the 3 error pages, because those are the only screens Teslon can see (Step B). So the 3/58 "useful" figure overstates usefulness: no real feature screen was ever skipped or listed.

## Step D. Hand truth on hard commits

Budget cut: 6 commits per app. Truth files written before each Teslon answer was read: raw/d-jhr/truth.md, raw/d-sba/truth.md. Disclosure: JHR c78cd8f and SBA 214da89/faf078d had already been run in Step B; their truth was written from the diff (for 214da89/faf078d a quick truth was saved before that run).

### JHR (raw/d-jhr/)
| Commit | Kind | Truth (short) | Teslon | Classification |
|---|---|---|---|---|
| [c78cd8f](https://github.com/jhipster/jhipster-registry/commit/c78cd8f) security fix: git credentials leaked over /management/info | security + API contract + UI | /registry/config, home, navbar; GET /api/config/sources; /management/info | Partial; 22 APIs TEST (incl. /api/config/sources), 3 error pages unclear; the 3 changed front-end files only as "no screen this build can see imports or draws it" | **SILENT x3 as areas** (/registry/config, /, navbar: not listed, only their files named in unseen); **NOISE x10** (test-only controllers listed TEST); /management/info named only as "removed code reaches no API" (honest unseen) |
| [78196a0](https://github.com/jhipster/jhipster-registry/commit/78196a0) CORS for /config/** and /eureka/** | security config | only /config/** and /eureka/** for cross-origin callers; no /api or screen change | **High** confidence; 21 APIs TEST, 3 error pages SKIP | **SILENT x2** (/config/**, /eureka/**: framework endpoints are no area kind, and no unseen note says so, under "High" confidence); **NOISE x21** (every own /api listed, 10 of them test controllers) |
| [6bce269](https://github.com/jhipster/jhipster-registry/commit/6bce269) JWT secret optional in oauth2 profile | security / bean wiring | POST /api/authenticate gone under oauth2 profile; oauth2 startup no longer needs the secret | Partial; delta "**The service may not start: TokenProvider is no longer a bean (@Component removed), and UserJWTController needs it**"; 11 APIs TEST | **FALSE CLAIM**: TokenProvider is still a `@Bean` at JWTSecurityConfiguration.java:157-159 in the same `!oauth2` profile as the controller. `@Profile` not modelled, so the real effect (endpoint disappears under oauth2) is not stated. **NOISE x10** |
| [ec6dd9b](https://github.com/jhipster/jhipster-registry/commit/ec6dd9b) lambda to method reference | trivial refactor | no effect | Partial; 3 error pages unclear; "reaches no API, job..." | **HELD** (a precise "no effect" was possible) |
| [feefd72](https://github.com/jhipster/jhipster-registry/commit/feefd72) sync with JHipster 7.9.3 (89 files) | framework upgrade | everything | `screen:*` TEST, every API TEST, 6 deploy files watch | Correct. But a **false typed delta**: "JWTSecurityConfiguration: JSON field authenticationManagerBuilder is no longer sent or read" (a Spring config class read as a JSON DTO; shape.ts) |
| [5656a7e](https://github.com/jhipster/jhipster-registry/commit/5656a7e) drop on-disk logging, jib ownership extension | config + build | no log file, so /management/logfile 404; Docker image build | **High** confidence; 22 areas TEST because "now builds with jib-ownership-extension-maven removed"; 3 skips demoted | **NOISE x21** (a Jib *image-build* plugin extension treated as a runtime dependency of every API); **SILENT x1** (`logging.file.name` removal ledgered "followed" with no consequence named) |

JHR totals over 6: wrong skips 0; silent 6 (3 screens Teslon cannot see, 3 framework/config effects); noise 62 area listings (of which 30 are test-only controllers); held 1 commit; 2 false claims with verified citations (startup, JSON shape). "High" confidence was printed on the two commits with silent misses.

## Step E. History as an oracle (bug-introducing commits)

Budget cut: 4 cases per app. Introducer found with `git blame` on the lines the fix changed, at the fix's parent (scripts in the shell history; raw/e-jhr/cases.md, raw/e-sba/cases.md). Teslon run on the introducing commit (base = its parent).

### JHR
| # | Introducing commit | Fix | Area where the bug showed | Teslon on the introducer | Verdict |
|---|---|---|---|---|---|
| E1 | [65769e7](https://github.com/jhipster/jhipster-registry/commit/65769e7) 2019-12-30, Spring Boot 2.1.10 -> 2.2.2 (pom) | [0e0fefe](https://github.com/jhipster/jhipster-registry/commit/0e0fefe) "Fix health page" (health JSON key `details` -> `components`) | screen /admin/health | **High** confidence; 19 APIs TEST (dependency change), 3 error pages unclear; no word about any health screen or /management/health | **SILENT** (bug area unknown to Teslon; no unseen note; "High") |
| E2 | [e9997e9](https://github.com/jhipster/jhipster-registry/commit/e9997e9) 2019-12-30, "Strict Typescript option in HTML templates" (150 files) | [732c35d](https://github.com/jhipster/jhipster-registry/commit/732c35d) "fix encrypt response parsing" | screen /registry/encryption | `screen:*` TEST ("every screen"); encryption.service.ts named in unseen | **TEST** (only through the every-screen catch-all) |
| E3 | [d32d18f](https://github.com/jhipster/jhipster-registry/commit/d32d18f) 2019-11-09, "Sync with JHipster 6.4.1" (300 files) | [395a878](https://github.com/jhipster/jhipster-registry/commit/395a878) "fix for replicas display page" | screen /registry/replicas | `screen:*` TEST, all 23 APIs TEST | **TEST** (catch-all) |
| E4 | [0d547b8](https://github.com/jhipster/jhipster-registry/commit/0d547b8) 2020-01-26, OAuth2 `/api/**` authenticated() -> hasAuthority(ADMIN) | [1f2e482](https://github.com/jhipster/jhipster-registry/commit/1f2e482) "allow /api/account and /api/logout for any authenticated users" | GET /api/account, POST /api/logout (403 for non-admin) | **High**; GET /api/account and POST /api/logout TEST, but so are all 18 APIs (cases say "compare with the last release", no role/403 check) | **TEST** (undifferentiated: the bug API is 1 line among 18) |

JHR: 3 of 4 under TEST, 1 SILENT. None was sent to QA with a specific check: the two screen bugs were caught only by the "every screen" catch-all of a big commit, the API bug by "every API" of a security config change.

## Failures in full, with reproductions

(pending)

## Step F. Verdict

(pending)
