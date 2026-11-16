# Red team: Teslon soundness (2026-11-15/16)

Goal: make Teslon give a WRONG answer and prove it with a reproduction. Engine under test: the built
`/home/user/teslon/packages/core/dist` (read-only), on copies of the fixtures OrderDesk (Spring + Angular) and
ShopFlow (4 Spring services, Kafka, Vue 3). Status: DONE. **60 adversarial PRs run; 22 confirmed failures.**

Reproductions (all in `/tmp/claude-0/-home-user-Orbis/a99ca81c-9750-554d-8faa-4222ad38b407/scratchpad/field/redteam/`):
- `exps.mjs`: every experiment: fixture, extra realistic base code, the PR edit, and the truth, written before the run.
- `lib.mjs` (copy fixture, `git init`, commit), `one.mjs <ID>` (runs `impact` + `brief`, scores against the truth),
  `run.sh <ID>...` (one node process at a time, 300 s timeout each), `peek.mjs <ID>` (prints the checker's facts).
- Outputs: `out/<ID>.json` (full brief, ledger, deltas, unseen) and `out/<ID>.log`. Repos stay in `w/<ID>` (`git diff HEAD~1`).
- Re-run any case: `cd <folder> && ./run.sh E01` (it runs `env -u GITHUB_TOKEN -u GH_TOKEN node one.mjs E01`).

Method note: every truth is a plain Spring / Angular / Vue / git / Docker fact. Where the base needed code the fixture
lacks (a `charts/` folder, a `Security.java` helper), that code was committed into the base first, so the PR is one
small realistic edit. Fact vs inference: "Teslon said X" is measured (quoted from `out/`); "the app does Y" is
framework behaviour as documented, not run (no app was started).

## 1. Summary of confirmed failures

| ID (exp) | Class | Severity | One line |
|---|---|---|---|
| F01 (E01) | WRONG SKIP | Critical | A front-end file in a folder named `charts/` (or `deploy/`, `docker/`, `helm/`, `k8s/`, `deployment/`) is a "deployment file": the dashboard that draws it is skipped, certified, confidence High |
| F11 (E56) | WRONG SKIP | Critical | A docker-compose env var that overrides a Spring setting (`BILLING_TAX_RATE`, `BILLING_PROVIDER: fake`) is not followed: billing Kafka job and invoice screens skipped, certified |
| F12 (E73) | WRONG SKIP | Critical | YAML placeholder `spring.mail.host: ${orderdesk.smtp-host}` is not a reader: changing `orderdesk.smtp-host` is "nothing in this repository reads it"; both mail jobs skipped, certified |
| F13 (E44) | WRONG SKIP | Critical | `public final class OrderService` (a @Transactional bean): the Spring context cannot build its CGLIB proxy and does not start; Teslon skips 8 other screens and 3 jobs, certified |
| F02 (E03) | SILENT | Critical | A Java class named `Security.java` (also `Notice`, `License`, `Changelog`, `Authors`, `Readme`, `Contributing` + any one extension) is "documentation": appEffect none |
| F03 (E14) | SILENT | Critical | Same rule on the front end: `components/Notice.vue` outside a "served" folder is documentation |
| F04 (E07) | SILENT + false claim | Critical | Method modifiers are not part of a method: `public final Order create(...)` on a proxied bean (NPE on every order) is "only comments or layout changed ... token for token" |
| F05 (E08) | SILENT | Critical | A TypeScript import-line change is ignored: `import { API } from '.../api'` to `'.../api-v2'` (`/api/v2`) gives appEffect none |
| F06 (E09) | SILENT | Critical | Same for Java: `import ...discount.Gold` to `import ...discount.v2.Gold` (same simple name, other value) gives appEffect none |
| F21 (E98) | SILENT | Critical | `git diff -b` hides changes in the amount of whitespace inside strings: `` `Bearer ${t}` `` to `` `Bearer  ${t}` `` (every call 401) is "only whitespace moved" |
| F08 (E18) | SILENT | High | A Java line that starts with `*` (Google-style break before an operator) counts as a comment: `* 1` to `* 2` gives appEffect none |
| F09 (E19) | SILENT | High | A Java line that starts with an inline `/* gold */` comment then code counts as a comment: discount change gives appEffect none |
| F14 (E40) | SILENT | High | `scripts/setup-env.sh`, sourced by the container entrypoint, is "tooling" because its name has the word `setup`; switching the container's profile gives appEffect none |
| F15 (E41) | SILENT | High | Everything under top-level `docs/` is documentation, even when angular.json ships `docs/help` as app assets |
| F16 (E42) | SILENT | High | A `.md`/`.txt` outside a "served" folder is documentation, even when a Vue view imports it with Vite `?raw` |
| F17 (E60) | SILENT | High | Mode-only change (entrypoint loses +x): "only the file mode changed", appEffect none; the container cannot start |
| F07 (E06) | SILENT | Medium | `.gitattributes` (`*.sh text eol=crlf`) is tooling; it breaks `#!/bin/sh` entrypoints in a Linux image |
| F10 (E21) | SILENT | Medium (adversarial) | `// note \u000a order.setNote("");` : javac decodes the unicode newline, the rest runs; Teslon: "only comments or layout changed" |
| F18 (E61) | SILENT + false claim | Medium | Files are decoded as UTF-8; in an ISO-8859-1 Java file `"£"` to `"¥"` both decode to U+FFFD: "only comments or layout changed" |
| F19 (E45) | FALSE EVIDENCE (caught) + false claim (not caught) | Medium | The `transient` keyword is read as `@Transient`: quote "Transient" fails re-check (caught, confidence "Not proven"); the claim "JSON field note is no longer sent or read" is wrong (Jackson still uses the getter) and nothing catches it |
| F20 (E63) | CRASH | Low | A base that is a tree (empty tree, for a root commit) throws a raw git stack trace from `snapshot.js` |
| F22 (E90, E94, E95) | NOISE | Low | Renaming a local variable (2 test + 5 unclear), re-wrapping an Angular tag (1 test) and reflowing a TS call (10 test) all list areas |

Counts by class: WRONG SKIP 4, SILENT 15, FALSE EVIDENCE/claim 1 (+2 false "token for token" claims inside SILENT cases),
CRASH 1, NOISE 1 (3 cases). Every WRONG SKIP was **certified by the independent checker** and shown with confidence
High; every SILENT case had confidence High and `r.verification.failed` empty.

## 2. Soundness risk register (from the code)

The single most important structural finding: **the independent checker only re-checks skips**
(`impact.ts:694-697`: `toCertify` = surfaces with tier `skip`). When the ledger decides a file has no runtime effect,
`triage.appEffect` is `none`, no areas exist, and the checker never runs. So every "no effect" decision is
un-checked. And for the decisions it does check, it **shares the same inputs**: `fileKind` (`certify.ts:6, 808-809`),
the same Java facts (`JMethod` without modifiers, `certify.ts:202`), the same front-end readers, and the same
setting-reader model (Java annotations and strings only).

| # | Where | What can produce a wrong skip / silence | Shared by checker? | Proven by |
|---|---|---|---|---|
| R1 | `kinds.ts:21` | `(k8s|kubernetes|helm|charts|deploy|deployment|docker)/` anywhere in a path = deploy; code there gets a "Deployment" area and its screens are skipped | yes (`certify.ts:810-823` only looks for profile changes) | F01 |
| R2 | `kinds.ts:13` (+ `:12` served list) | file NAME `LICENSE|NOTICE|CHANGELOG|CODEOWNERS|AUTHORS|CONTRIBUTING|SECURITY|README` + one extension, case-insensitive, = docs unless under public/static/assets/webapp/resources/... | yes (`certify.ts:809`) | F02, F03 |
| R3 | `kinds.ts:14-15` | top-level `docs/` and any `.md/.txt/.rst/.adoc` outside served folders = docs | yes | F15, F16 |
| R4 | `kinds.ts:19` | `.gitattributes`, `.mvn/` (`maven.config` can switch Maven profiles), `.nvmrc`, `eslint*/prettier*/renovate*` names = tooling | yes | F07 |
| R5 | `kinds.ts:24-31` | a script whose name has a word like setup/install/build/generate/dev = tooling, whoever calls it | yes | F14 |
| R6 | `kinds.ts:10` | any path segment `test/ tests/ e2e/` (also inside `src/main`) = test | yes | not run (a `com.acme.test` production package or a lab app's `tests/` feature would vanish) |
| R7 | `kinds.ts:33, 35` | `i18n/`, `locale(s)/` folders and any `db/` folder override `.ts`/`.java` kinds | partly | E16, E04 held (unfollowed); safe today only because nothing claims them |
| R8 | `noAppEffect` `kinds.ts:43-49` + `impact.ts:556-558` | docs/ci/tooling/test kinds are "no runtime effect" with no content check | yes | F02-F07, F14-F16 |
| R9 | `impact.ts:571` `meaningful()` and `where.ts:54` `trivial()` | lines starting `import`, `*`, `/*`, `#`, `//`, `<!--` are not code; a file whose changed lines are all such is "no runtime effect" | checker marks import lines (`certify.ts:850-861`) but never runs (R0) | F05, F06, F08, F09 |
| R10 | `java.ts:42-50`, `where.ts:617`, `java.ts:383`, `certify.ts:202` | a method's definition = return type, annotations, params, body; **modifiers are left out** (final, static, private, synchronized) | yes (same `JMethod`) | F04 |
| R11 | `snapshot.ts:84-96`, `impact.ts:581` | for "whitespace-free" languages, hunks that vanish under `git diff -b` are dropped; `-b` also ignores whitespace inside string/template literals, `<pre>`, Java text blocks | engine-only decision, makes appEffect none | F21 |
| R12 | `snapshot.ts:24` (utf8), `java.ts:80` tokenizer | non-UTF-8 sources collapse to U+FFFD; unicode escapes in comments are not pre-processed as javac does | yes (same tokenizer) | F18, F10 |
| R13 | `impact.ts:582` | a mode-only change has no lines, so it is "only the file mode changed" | engine-only | F17 |
| R14 | `where.ts:958-966` | a key under the app's own `@ConfigurationProperties` prefix that no Java string names is "nothing reads it"; YAML values `${...}` are not searched | yes: `certify.ts:360-419` collects setting readers from Java only | F12 |
| R15 | `certify.ts:810-823`, `where.ts:1634-1639` | deployment files only matter through `SPRING_PROFILES_ACTIVE`; env vars that bind to settings (relaxed binding), JAVA_OPTS `-D`, command args are ignored | yes | F11 |
| R16 | `startup.ts` | start-up failure rules cover moved beans, missing beans, derived queries, Flyway; not a final class/method that must be proxied (@Transactional, @Async, @Cacheable, @Configuration) | yes | F13 |
| R17 | `certify.ts:109` `INERT_SETTING` | `logging|management|info|springdoc|...` with no reader = changes nothing a user sees. `management.endpoints.web.exposure.include` can remove the health endpoint a K8s liveness probe needs (pods restart-loop) | checker only; the engine lists every endpoint for `management.*`, so not exploitable today | not run |
| R18 | `certify.ts` "content" edges (doc: CERTIFICATE "relies") | rows, DTO fields and topic payloads are relied on, not proven: about 43% of real impact rests on the engine alone | by design | E86b shows the checker holding jobs when the producer shape is unknown |
| R19 | depth limits: `where.ts:506` (`depth < 2` service-to-service hops), `where.ts:1205/1403/1439/1564` (`d > 8` with a shared `seen` set: a node first met deep is later refused when met shallow), `impact.ts:60, 162, 455`, `dataflow.ts:127, 430, 561`, `shape.ts:114` (`depth < 3`), `angular.ts:91, 132, 583`, `vue.ts:213` | a truncated walk returns "not reached" rather than "unknown" | the checker's own walks have limits too (`certify.ts:323, 328, 453, 562`) | not run (needs 3+ chained services or 9+ nested components) |
| R20 | `vue.ts:388` | `app.component('tag', Ident)` only with a string literal and an identifier; `vue.ts:391` guards only on `*router.beforeEach` | no | E28, E28b, E70 held (unfollowed), so safe today |
| R21 | `angular.ts:440-441` | only `@Component` tag selectors map templates to files; attribute directives and NgModule declarations are invisible | no | not run (standalone fixture imports everything by TS import) |

## 3. Confirmed failures in full

Command for every case: `cd /tmp/claude-0/-home-user-Orbis/a99ca81c-9750-554d-8faa-4222ad38b407/scratchpad/field/redteam && ./run.sh <EXP>`. The full edit is in `exps.mjs` under the experiment key.

### F01 (E01) WRONG SKIP: a `charts/` folder is "deployment"
- Base: `src/main/webapp/app/dashboard/charts/sales-chart.ts` (standalone `app-sales-chart`), imported and drawn by `dashboard.ts`/`dashboard.html`.
- PR: `- .reduce((a, b) => a + b, 0));` / `+ .reduce((a, b) => a + b, 0) / 100);` in `sales-chart.ts`.
- Teslon: `appEffect=yes T1 S15 U0 conf=High`; `L ...charts/sales-chart.ts followed deploy`; `A test deploy:src/main/webapp/app/dashboard/charts/sales-chart.ts`; `A skip screen:/ :: runs none of the changed code and calls no changed API`.
- Truth: the dashboard shows a total 100 times too small. `screen:/` must be test.
- Root cause: `kinds.ts:21`; engine handles it as a deploy area (`where.ts:1634-1639`); the checker's deploy branch (`certify.ts:810-823`) ignores everything but profiles, so it certifies.
- Fix: classify by content and by being imported, not by folder name; a file that any read module imports is code. Anchor deploy folders to the repo root or to non-code extensions only.

### F02 (E03) and F03 (E14) SILENT: a class or component with a "docs" name
- E03 PR: base adds `web/rest/Security.java` (`visible(Customer)`) used by `CustomerResource.list()`; PR changes its condition. Teslon: `appEffect=none T0 S0 U0 conf=High`, `L .../Security.java no-runtime-effect docs documentation: the running app does not read it`.
- E14 PR: base adds `frontend/src/components/Notice.vue` drawn by `HomeView.vue`; PR changes its text. Teslon: `appEffect=none`, `docs`.
- Truth: GET /api/customers and the customer list change (E03); the home screen text changes (E14).
- Root cause: `kinds.ts:13` (name regex, `/i`, `(\.\w+)?$` matches `Security.java`, `Notice.vue`, `License.vue`, `Changelog.vue`, `security.ts`), protected only by the "served" folder list `kinds.ts:12`; `noAppEffect` `kinds.ts:43-49`; `impact.ts:556-558`; the checker skips docs too (`certify.ts:809`).
- Fix: docs-by-name only for extensions that cannot be code (`.md .txt .rst .adoc`, no extension), and never for a file any reader parsed or any module imports.

### F04 (E07) SILENT with a false claim: method modifiers ignored
- PR: `- public Order create(CreateOrderRequest request) {` / `+ public final Order create(CreateOrderRequest request) {` in OrderDesk `OrderService` (class is `@Transactional`).
- Teslon: `appEffect=none`; ledger: "only comments or layout changed in OrderService.create(): the code is the same, token for token".
- Truth: Spring Boot proxies the bean with CGLIB; a final method cannot be overridden, so the call runs on the proxy instance whose injected fields are null: NullPointerException on every order create. POST /api/orders and /orders/new are broken. The claim "token for token" is false (a token was added).
- Root cause: `JMethod` has no modifiers (`java.ts:42-50`); `sig()` in `where.ts:617` and `java.ts:383`; checker's `methodDef` `certify.ts:202`.
- Fix: put modifiers (and type parameters, throws) in `JMethod` and in both signatures; better, make "same tokens" compare the whole token stream of the member span.

### F05 (E08) and F06 (E09) SILENT: import-line changes
- E08 PR: `order.service.ts`: `import { API } from 'app/core/config/api';` to `'app/core/config/api-v2'` (`export const API = '/api/v2'`). Teslon: `appEffect=none`, "only blank lines, comments or imports changed". Truth: every order call goes to `/api/v2`: order list, detail, create and the dashboard break.
- E09 PR: `PricingService.java`: `import com.orderdesk.service.discount.Gold;` to `...discount.v2.Gold;` (FACTOR 0.95 vs 0.90). Teslon: `appEffect=none`. Truth: gold customers' totals change (POST /api/orders).
- Root cause: `impact.ts:571` `meaningful()` drops `import|package` lines; `where.ts:54` `trivial()`. The checker would mark the type changed (`certify.ts:850-861`) but never runs because no skip candidates exist.
- Fix: an import change is a change of what a name binds to: resolve the old and new target and follow the members the file uses from it. Run the checker's Δ also on "no effect" files and refuse "none" when its Δ is not empty.

### F08 (E18) and F09 (E19) SILENT: code lines that look like comments
- E18 PR: base `int threshold = properties.lowStockThreshold()` / `            * 1;`; PR `* 1` to `* 2` in `StockAlertJob`. Teslon `appEffect=none` "only blank lines, comments or imports changed". Truth: the job alerts on twice the stock level.
- E19 PR: `/* gold */ sum = sum.multiply(new BigDecimal("0.95"));` to `"0.90"`. Teslon `appEffect=none`. Truth: POST /api/orders totals change.
- Root cause: `impact.ts:571` and `where.ts:54` test the first characters of the line (`*`, `/*`), not tokens.
- Fix: decide "comment" from the tokenizer (Java already has a real CST; TS has the TS scanner), never by line prefix.

### F11 (E56) WRONG SKIP: environment variables in docker-compose
- Base: `billing-service` service in `docker-compose.yml`. PR adds `BILLING_TAX_RATE: "0.07"` and `BILLING_PROVIDER: fake`.
- Teslon: `T1 S15 U0 conf=High`; `A test deploy:docker-compose.yml`; `A skip job:OrderPlacedConsumer.onOrderPlaced :: @KafkaListener: runs none of the changed code`; invoice screens skipped.
- Truth: Spring relaxed binding maps them to `billing.tax-rate` (read by `InvoiceFactory` via `@Value`) and `billing.provider` (switches `@ConditionalOnProperty` payment providers to the fake one): every invoice in that deployment has 7% tax and no real charge.
- Root cause: `certify.ts:810-823` and the engine deploy handler only follow `SPRING_PROFILES_ACTIVE`.
- Fix: map env vars (relaxed binding), `-D` flags and `--key=value` args in compose/K8s/Dockerfile to setting keys and treat them like a config change of that module.

### F12 (E73) WRONG SKIP: YAML placeholders
- Base: `spring.mail.host: ${orderdesk.smtp-host}`, `orderdesk.smtp-host: smtp.internal.example`. PR: value to `smtp.blocked.example`.
- Teslon: delta "orderdesk.smtp-host ...: nothing in this repository reads it"; `A skip job:NotificationService.onOrderPlaced :: @EventListener: runs none of the changed code`; `A skip job:StockAlertJob.alert`; checker Δ `{set:1}`, certified, no unknowns.
- Truth: all mail goes to another host; both jobs send mail.
- Root cause: `where.ts:958-966` searches only Java files for the key; `certify.ts:360-419` collects setting readers only from Java annotations and strings.
- Fix: parse `${...}` in every config value (and in `@Value` defaults) as a reader edge from the referencing key; an own-prefix key is "unread" only when no config value references it.

### F13 (E44) WRONG SKIP: final class that must be proxied
- PR: `public class OrderService {` to `public final class OrderService {`.
- Teslon: `T8 S11 U0 conf=High`: order screens and APIs listed; customers, products, reports screens and all 3 jobs skipped.
- Truth: Spring cannot generate the CGLIB subclass for the @Transactional bean; the context fails to start; every API is down.
- Root cause: `startup.ts` has no rule for final classes or methods on beans that need proxies (@Transactional, @Async, @Cacheable, @Validated, `@Configuration` with bean methods); the checker learns start-up risks from the same rules.
- Fix: add the rule (class or method `final`/`private` where a proxy annotation applies: class fails to start, method silently loses the advice or NPEs), and read class/method modifiers at all (F04).

### F14 (E40), F15 (E41), F16 (E42), F07 (E06) SILENT: other path rules
- E40: base `docker-entrypoint.sh` sources `/app/scripts/setup-env.sh`; PR changes `SPRING_PROFILES_ACTIVE=prod` to `staging` there. Teslon: `tooling ... the app does not change`, appEffect none. Root cause `kinds.ts:24-31` (word `setup`).
- E41: `docs/help/shipping.html` shipped by angular.json `assets` and linked from the navbar; PR edits it. Teslon: `docs`, appEffect none. Root cause `kinds.ts:14`.
- E42: `frontend/src/legal/terms.md` imported `?raw` by `HomeView.vue`; PR edits it. Teslon: `docs`, appEffect none. Root cause `kinds.ts:15`.
- E06: `.gitattributes` `*.sh text eol=crlf`. Teslon: tooling, appEffect none. Truth: the entrypoint is checked out with CRLF on the Linux build runner and the container fails with `/bin/sh^M`. Root cause `kinds.ts:19`.
- Fix (all): before calling any file "no effect", search the repo for references to it (imports including `?raw`, build config `assets`, Dockerfile `COPY`, scripts that source or call it); referenced files are held, not dropped.

### F17 (E60) SILENT: mode change
- PR: `chmod 644 docker-entrypoint.sh` (was 755). Teslon: `deploy ... only the file mode changed`, appEffect none. Truth: `exec` of the entrypoint fails, the container does not start.
- Root cause: `impact.ts:582` (a file with no lines and `!real.length` gets "no-runtime-effect").
- Fix: a mode change on a script, entrypoint or anything under deploy is a deploy change (hold or list the deploy area).

### F21 (E98) SILENT: whitespace inside a string
- PR: `frontend/src/api/http.ts`: `` `Bearer ${t}` `` to `` `Bearer  ${t}` ``. Teslon: `frontend ... only whitespace moved (indentation, line breaks)`, appEffect none.
- Truth: Spring Security's bearer-token resolver expects exactly `Bearer <token>`; every authenticated call is refused: every screen is broken.
- Root cause: `snapshot.ts:84-96` uses `git diff -b` for "whitespace-free" languages; `-b` treats any run of spaces as equal, inside literals too; `impact.ts:581`.
- Fix: drop a hunk only when the language tokenizer says the token streams are equal (strings compared exactly).

### F10 (E21), F18 (E61) SILENT: tokenizer differs from javac
- E21 PR adds `// keep the note as typed \u000a order.setNote("");` in `OrderService.create`. javac turns `\u000a` into a newline before lexing, so `order.setNote("")` runs. Teslon: "only comments or layout changed".
- E61: `NotificationService.java` stored as ISO-8859-1 (common with `project.build.sourceEncoding=ISO-8859-1`); `"New order (£) "` to `"(¥)"`. Both bytes decode to U+FFFD (`snapshot.ts:24`), so the token streams are equal: "only comments or layout changed".
- Fix: pre-process unicode escapes like JLS 3.3; read the source encoding from the build file or compare raw bytes when decoding is lossy, and never claim "same code" when U+FFFD appears on a changed line.

### F19 (E45) FALSE EVIDENCE / false claim
- PR: `private String note;` to `private transient String note;` on the `Order` entity.
- Teslon: hop "No longer stored" at `Order.java:35`, quote `Transient`, `verified: false` (caught: confidence "Not proven", areas listed). Delta "Order: JSON field "note" is no longer sent or read".
- Truth: JPA no longer persists it (right). Jackson with default `PROPAGATE_TRANSIENT_MARKER=false` still serialises it through `getNote()`, so the JSON claim is false. That wrong claim passed: the verifier checks only that a quote is on the line, not that the line supports the claim. This is the general pattern of the WRONG SKIPs too: their proofs cite real lines (the `@KafkaListener` line) that re-check, under a false conclusion.
- Fix: model the keyword separately from the annotation; for Jackson, a transient field with an accessor is still a property.

### F20 (E63) CRASH
- `impact({ base: '4b825dc642cb6eb9a060e54bf8d69288fbee4904' /* empty tree */, head })` throws `git rev-parse --verify ...^{commit}` from `snapshot.js:10`. Fix: support a root commit (diff against the empty tree) and return a report with an error, not an exception.

### F22 (E90, E94, E95) NOISE
- Renaming a local variable `sum` to `total` in `PricingService.orderTotal`: `T2 U5`. Re-wrapping `<app-status-badge [status]=...>` across lines: `T1`. `axios.create({...})` reflowed to one line: `T10`. Low severity (safe side), but the noise lands on testers' time. Fix: compare normalized token streams (alpha-renaming locals for Java, TS AST print for front-end members, template AST for HTML).

## 4. Attempts that held

- E02 `security.ts` under `src/main/webapp/`: followed (only because `webapp/` is a "served" folder).
- E04 Java class in a `db/` package: classed `data`, unfollowed, all screens held (API absent).
- E10 `server.servlet.context-path` added: every screen and API listed.
- E13 Vite `.env.production` key read in `api/http.ts`: every screen held.
- E16 TS constants in `app/i18n/`: classed `i18n`, every screen held.
- E20 global `styles.scss` rule whose line starts with `#`: every screen listed (ledger reason wrong: "only blank lines, comments or imports").
- E22 YAML anchor value changed: every screen held (the job is not named anywhere).
- E23 `application.properties` beside `application.yml`: job listed.
- E24 `spring.profiles.active: prod` added: every screen listed, jobs held.
- E25 Angular `environment.prod.ts` via `fileReplacements`: every screen held.
- E26 Angular `APP_INITIALIZER` factory in its own file: every screen listed.
- E28 Vue `import.meta.glob` auto-registration; E28b PascalCase registration used kebab-case; E29 `<component :is>` + dynamic `import()` template: every screen held.
- E31 custom Jackson serializer module; E33 JPA `AttributeConverter`; E34 `@EntityListeners`: unfollowed, every screen held.
- E32 `@JsonNaming(SnakeCase)` on a DTO: said, screens listed.
- E36 `HandlerInterceptor` via `WebMvcConfigurer`; E37 `@ControllerAdvice @InitBinder`: every screen and API listed.
- E38 `ValidationMessages.properties`, E39 `messages.properties`: every screen held.
- E47 two `Money` classes in different packages: right one followed.
- E50 endpoint inherited from an abstract base controller: engine would have skipped `/customers` and `/orders/new`; the checker refused both. Held only thanks to the checker.
- E51 interface default method: followed.
- E52 static import constant: every screen held.
- E62 empty PR: no effect, no areas.
- E70 router named `nav`; E71 guard function in `router/guards.ts`; E74 Vue `<template src>`: every screen held.
- E86a Kafka message total changed (control): consumer jobs listed; E86b same with `new ProducerRecord<>(...)`: jobs held by the checker.
- E87 Kafka listener topic from a property: job listed.
- E91 YAML comment, E92 Java imports reordered, E93 CRLF-only Java file: correctly "no effect".

Pattern: whenever Teslon admits it cannot follow a file, it holds everything (safe, imprecise). Every failure came
from a place where it actively decides "no effect" or "not read by anyone": path and name rules, line-prefix
filters, `git diff -b`, a token comparison that leaves tokens out, and reader models (settings, deploy files,
start-up) that the checker shares.

## 5. Overfitting findings

- No fixture names in engine logic (grep for orderdesk, shopflow, petclinic, jhipster, `jhi-`, domain words: only the
  `PROVING` text in `areas.ts:85`).
- Rules shaped by fixture cases, with the variant that breaks or weakens them:
  - Deploy profile rule (from gauntlet u4-08, K8s turning on `prod`): only `SPRING_PROFILES_ACTIVE`; a direct env-var override of a setting is missed (F11).
  - `ownPrefix` "nothing reads it" (fits `orderdesk.*` read through a record): misses `${...}` references in YAML (F12).
  - Start-up rules (u4-01..04, one per gauntlet case): a final proxied class is not covered (F13).
  - Comment-only rule (from the 199 comment mutants, which only inserted `//` comments): blind to modifiers, imports, lines starting with `*` or `/*`, unicode escapes, encodings (F04-F10, F18).
  - `served` folder list in `kinds.ts:12` happens to cover OrderDesk (`webapp/`) but not a typical Vite `frontend/src/` layout, which is why ShopFlow-style apps hit F03/F16.
  - Vue guard regex `^\w*router\.(beforeEach...)` (`vue.ts:391`) matches ShopFlow's `router`; `nav.beforeEach` is not a guard (E70, held only because the file was unfollowed).
  - `app.component('x', Ident)` only (`vue.ts:388`); glob registration and kebab-case use are unmodelled (E28/E28b, held).
  - `INERT_SETTING` (`certify.ts:109`) and `CLIENT_KEYS`: hand lists of setting prefixes.

## 6. What must be fixed before launch (ranked)

1. **Never decide "no effect" without the checker.** Run the checker's own Δ on every changed file, including those the
   ledger calls docs/tooling/whitespace/comment-only, and refuse `appEffect: none` when its Δ is not empty
   (`impact.ts:556-596`, `impact.ts:694-697`). This alone turns F02-F10, F14-F18, F21 from SILENT into held.
2. **Replace path/name classification with reference-based classification** (`kinds.ts:10-35`): a file that is imported,
   copied, sourced, served or parsed by any reader is code. Anchor deploy folders to the root and to non-code files
   (fixes F01, F02, F03, F14, F15, F16, R6, R7).
3. **Compare definitions by full token streams from real tokenizers**: modifiers and type parameters in `JMethod`
   (`java.ts:42-50`, `where.ts:617`, `certify.ts:202`); imports resolved to targets; comment detection by tokens, not line
   prefixes (`impact.ts:571`, `where.ts:54`); no `git diff -b` inside literals (`snapshot.ts:84-96`); JLS unicode-escape
   pre-processing and source-encoding awareness (fixes F04-F06, F08-F10, F18, F21).
4. **Model where settings come from**: `${...}` placeholders in config values, env vars by relaxed binding, `-D` flags
   and args in compose/K8s/Dockerfile (`where.ts:958-966`, `certify.ts:360-419`, `certify.ts:810-823`) (fixes F11, F12).
5. **Start-up rule for proxies**: final or private class/method under @Transactional/@Async/@Cacheable/@Validated/
   @Configuration (`startup.ts`) (fixes F13).
6. **Deploy-level changes**: mode changes, `.gitattributes`, entrypoints and the scripts they call are deploy changes (F07, F17).
7. **Verifier**: today it checks that a quote is on the cited line, not that the line supports the claim (F19, and the
   proofs of every wrong skip re-check). At minimum, a skip proof should be re-derived from facts the engine did not
   produce. Also: return an error report instead of throwing (F20).
8. **Launch claim**: until 1-5 land, "never a wrong skip, never silent" is false on ordinary code: 4 certified wrong
   skips and 15 silent PRs in 60 attempts, each a one-line change a developer could make. Add all 22 reproductions to
   the gauntlet as regression cases.
