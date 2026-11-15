# Red team: Teslon soundness (2026-11-15)

Author: red-team agent. Goal: make Teslon give a WRONG answer and prove it with a reproduction.
Engine under test: /home/user/teslon/packages/core/dist (built, read-only). Fixtures copied to
/tmp/claude-0/-home-user-Orbis/a99ca81c-9750-554d-8faa-4222ad38b407/scratchpad/field/redteam/

Status: IN PROGRESS (file is updated after every few experiments). Experiments run so far: 24.

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

## 5. Overfitting findings

(pending)

## 6. What must be fixed before launch (ranked)

(pending)
