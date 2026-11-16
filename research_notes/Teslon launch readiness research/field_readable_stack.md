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

(pending)

## Step D. Hand truth on hard commits

(pending)

## Step E. History as an oracle (bug-introducing commits)

(pending)

## Failures in full, with reproductions

(pending)

## Step F. Verdict

(pending)
