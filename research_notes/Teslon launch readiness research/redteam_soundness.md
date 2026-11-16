# Red team: Teslon soundness (2026-11-15)

Author: red-team agent. Goal: make Teslon give a WRONG answer and prove it with a reproduction.
Engine under test: /home/user/teslon/packages/core/dist (built, read-only). Fixtures copied to
/tmp/claude-0/-home-user-Orbis/a99ca81c-9750-554d-8faa-4222ad38b407/scratchpad/field/redteam/

Status: IN PROGRESS (file is updated after every few experiments). Experiments run so far: 50.

## 1. Summary of confirmed failures

| ID | Class | Severity | One line |
|----|-------|----------|----------|
| F01 (E01) | WRONG SKIP | Critical | Any front-end file under a folder named `charts/` (also `deploy/`, `docker/`, `helm/`, `k8s/`...) is classed as a deployment file; the dashboard screen that draws it is skipped with confidence High |
| F02 (E03) | SILENT | Critical | A Java class named `Security.java` / `Notice.java` / `License.java` / `Changelog.java` ... is "documentation": appEffect none |
| F03 (E14) | SILENT | Critical | Same rule on the front end: `Notice.vue`, `Changelog.vue`, `License.vue`, `security.ts` outside a "served" folder are documentation |
| F04 (E07) | SILENT + false claim | Critical | Method modifiers are not part of a method's definition: `public final` on a @Transactional bean method (NPE through the CGLIB proxy) is reported as "only comments or layout changed ... the code is the same, token for token" |
| F05 (E08) | SILENT | Critical | A TypeScript import line change is "only blank lines, comments or imports": switching `API` to another module (`/api/v2`) gives appEffect none |
| F06 (E09) | SILENT | Critical | Same for Java: swapping `import ...discount.Gold` for `import ...discount.v2.Gold` (same simple name) gives appEffect none |
| F08 (E18) | SILENT | High | A Java line that starts with `*` (break-before-operator continuation, Google style) is a "comment line": changing `* 1` to `* 2` gives appEffect none |
| F09 (E19) | SILENT | High | A Java line that starts with an inline `/* ... */` comment followed by code is a comment line: the gold discount change gives appEffect none |
| F10 (E21) | SILENT | Medium (adversarial) | `// ... \u000a code` : javac decodes the unicode newline, so the rest of the "comment" runs; Teslon says "only comments or layout changed" |
| F11 (E56) | WRONG SKIP | Critical | An environment variable in docker-compose that overrides a Spring setting (`BILLING_TAX_RATE`, `BILLING_PROVIDER: fake`) is not followed: the billing Kafka job and the invoice screens are skipped, confidence High |
| F12 (E73) | WRONG SKIP | Critical | A YAML placeholder (`spring.mail.host: ${orderdesk.smtp-host}`) is not a reader: changing `orderdesk.smtp-host` is "nothing in this repository reads it"; both mail-sending jobs skipped, certified, confidence High |
| F13 (E44) | WRONG SKIP | Critical | `public final class OrderService` (a @Transactional bean) stops the Spring context from starting; Teslon lists the order screens only and skips 8 other screens and 3 jobs, certified |
| F14 (E40) | SILENT | High | `scripts/setup-env.sh`, sourced by `docker-entrypoint.sh`, is "tooling" because its name contains the word "setup"; switching the container's Spring profile gives appEffect none |
| F15 (E41) | SILENT | High | Anything under top-level `docs/` is documentation, even when angular.json ships `docs/help` as app assets; a served help page change gives appEffect none |
| F16 (E42) | SILENT | High | A `.md`/`.txt` file outside a "served" folder is documentation, even when a Vue view imports it with Vite `?raw`; the home screen text change gives appEffect none |
| F17 (E60) | SILENT | High | A mode-only change (entrypoint loses +x) is "only the file mode changed": appEffect none, although the container can no longer exec it |
| F18 (E61) | SILENT + false claim | Medium | Sources are decoded as UTF-8; in an ISO-8859-1 Java file a change of one non-ASCII byte (`£` to `¥`) decodes to the same U+FFFD and is reported as "only comments or layout changed" |
| F19 (E45) | FALSE EVIDENCE (caught) + false claim (not caught) | Medium | `transient` keyword on an entity field is read as `@Transient`: the citation quote "Transient" does not re-check (caught: confidence "Not proven"), and the claim "JSON field note is no longer sent or read" is wrong (Jackson still uses the getter); nothing catches that |
| F20 (E63) | CRASH | Low | A base that is a tree (empty tree for a root commit) throws a raw git stack trace from `snapshot.js` instead of a report |
| F07 (E06) | SILENT | Medium | `.gitattributes` (`*.sh text eol=crlf`) is tooling; it breaks the container entrypoint on a Linux image |

## 2. Soundness risk register (from reading the code)

(pending)

## 3. Confirmed failures in full

(pending)

## 4. Attempts that held

- E02 `security.ts` under `src/main/webapp/` (Angular guard helper): followed, /reports listed. Held only because `webapp/` counts as "served"; the same name outside a served folder is F03.
- E04 Java class in a `db/` package: classed `data`, not followed, every screen held UNCLEAR (safe, imprecise; the API itself is absent from the brief).
- E10 `server.servlet.context-path` added: every screen and API listed (test).
- E13 Vite `.env.production` key read in a non-component module (`api/http.ts`): every screen held UNCLEAR.
- E16 TS constants file under `app/i18n/`: classed `i18n`, not followed, every screen held.
- E20 global `styles.scss` rule whose line starts with `#` (ID selector): every screen listed (but the ledger reason wrongly says "only blank lines, comments or imports changed").
- E22 YAML anchor value changed (alias under `orderdesk.low-stock-threshold`): not followed, every screen held; the job is not named anywhere (weak but not silent).
- E23 `application.properties` beside `application.yml`: the stock-alert job listed.
- E24 `spring.profiles.active: prod` added in application.yml: every screen and API listed, jobs held.
- E25 Angular `environment.prod.ts` swapped in by `fileReplacements`: every screen held.
- E31 custom Jackson `StdSerializer` registered through a `SimpleModule` bean: not followed, every screen held (no API named).
- E32 `@JsonNaming(SnakeCaseStrategy)` on a DTO: said ("custom JSON"), the screens that use it listed.
- E33 JPA `AttributeConverter` changed: not followed, every screen held.
- E26 Angular `APP_INITIALIZER` factory in its own file: every screen listed.
- E28 Vue base components auto-registered with `import.meta.glob` + `app.component(name, mod.default)`: every screen held.
- E28b `app.component('BaseCard', ...)` used as `<base-card>`: every screen held.
- E29 `<component :is>` with `defineAsyncComponent(() => import(\`../widgets/${name}.vue\`))`: every screen held.
- E34 JPA `@EntityListeners` listener `@PrePersist` changed: every screen held.
- E36 `HandlerInterceptor` registered in a `WebMvcConfigurer`: every screen and API listed.
- E37 `@ControllerAdvice` + `@InitBinder`: every screen and API listed.
- E38 `ValidationMessages.properties` / E39 `messages.properties`: not followed, every screen held.
- E47 two classes named `Money` in different packages: the right one followed, POST /api/orders listed, no wrong skip.
- E50 endpoint inherited from an abstract base controller: the engine would have skipped `/customers` and `/orders/new`; the independent checker refused both and held them. Held, but only thanks to the checker.
- E51 interface default method: followed, POST /api/orders listed.
- E52 static import of a constant: not followed, every screen held.
- E62 empty PR: "no effect", no areas.
- E70 router instance named `nav` (guard regex expects `*router`): router file not followed, every screen held.
- E71 navigation guard function in `router/guards.ts`: every screen held.
- E74 Vue `<template src="./ProductsView.html">`: every screen held.

## 5. Overfitting findings

(pending)

## 6. What must be fixed before launch (ranked)

(pending)
