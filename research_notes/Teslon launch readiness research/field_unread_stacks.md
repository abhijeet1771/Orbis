# Field test: Teslon on stacks it cannot read (or reads only in part)

Author: field tester "unread" (2026-11-15). Status: IN PROGRESS. Sections are filled as each repository finishes.

Promise under test: "never a wrong skip, never silent". Invariants I1 (no 'none'/High on unread runtime change),
I2 (no skip reachable from an unread changed file), I3 (no crash/hang), I4 (every unread file named with an actionable
reason), I5 (docs/CI/tooling/test kinds truly inert).

Working folder: /tmp/claude-0/-home-user-Orbis/a99ca81c-9750-554d-8faa-4222ad38b407/scratchpad/field/unread/

## 1. Summary table per repository

Last 20 non-merge commits each (coordinator cut from 40 to 20 for budget), base = parent, 180 s timeout, one process at a time.
"Held entirely" = no area to test or skip and at least one unclear. "Some precise answer" = at least one area to test or skip.
"Zero areas" = the brief has 0 test, 0 skip, 0 unclear (only the ledger/unseen text says anything).

| Repo | Stack | Commits run | Crash / timeout | I1 | I2 | I4 | I5 | Held entirely | Some precise answer | Zero areas |
|---|---|---|---|---|---|---|---|---|---|---|
| halo | Spring WebFlux functional routes (Java) + Vue 3 | 20 + 1 targeted | **21 / 21 crash** (V5) | n/a (no answer) | not testable (crash) | - | K9 (License.java = docs) | - | 0 % | - |
| n8n | Node/TS back end + Vue 3 | 2 attempted | **2 / 2 timeout** (180 s, then 1,200 s) (V6) | n/a | not testable | - | K3, K8, K10, K11, K12 | - | 0 % | - |
| eShop | .NET 10 / Blazor / Aspire | 20 | 0 | 0 strict ('none' only on a README commit), but V7 | 0 skips | V7 (no stack named) | K-none new | 0 % | 5 % (1/20, screen:* from a CSS file) | **90 % (18/20)** |
| train-ticket | Spring (read) + AngularJS static UI + Python/Node/Go services | 20 + 2 | 0 | 0 in history; V3 synthetic | 0 (no skip ever given) | 4785de2, fa8d9ef wrong file reasons | K1, K7 (fa8d9ef) | 0 % | 65 % (13/20; tests only, never a skip) | 25 % (5/20) |
| saleor-dashboard | React | (see below) | | V2 | | | K2/V4 | | | |
| microservices-demo | Go/C#/Python/Node | 1 targeted | 0 | **V1** | - | V1 | K4, K6 | | | |

Per-repository detail follows in section 1a.

### 1a. Per-repository notes

**halo (V5).** Every one of the 20 history commits and the Dockerfile-only 3ec858d exits with the same uncaught
`SyntaxError: Invalid regular expression ... "[" ... PHYSICAL_KEY_CODES` from certify.js:941, including 8211556 which touches only
`SECURITY.md` and an issue form. The trigger is a file that has existed since 2026-08-14 (`ui/packages/editor/src/utils/keyboard.ts:48`
`"[": ["BracketLeft"]`), so Teslon has not produced a single halo report for three months of history. Fail-closed in the sense that no
wrong skip is shown, but the Action would fail every PR. The I2 deep check on halo (truth in `field/unread/truth/halo_deep.md`: e6da398
disable-user -> /users, /users/:name; 1c678e7 generic PUT/PATCH -> every edit screen; d7bf329 stats -> dashboard; 8f40bb6 theme
endpoint -> theme screens) could not be run: no answer exists to compare. Static note for when the crash is fixed: halo screens call the
back end through the generated `consoleApiClient.*`/`coreApiClient.*` (e.g. `UserList.vue:161 consoleApiClient.user.disableUser`), which
the Vue reader neither records as a call nor as opaque (vue.ts:197 `OPAQUE_CALL` lists `useQuery` but not API-client objects); a screen
that does not also use `useQuery` would read as "calls no API" and be skippable whenever every changed line counts as followed.

**n8n (V6).** No answer in 20 minutes for a 7-file commit. I2 deep check (truth in `truth/n8n_deep.md`: 00d090c6, e11a2596, a71a1164,
1b530a9f) not runnable. By the code, a back-end `.ts` file is kind `frontend` (kinds.ts:38) and, unreached by any screen, is pushed to
unseen as "no screen this build can see imports or draws it" (where.ts ~1462) and stays not-modelled, so all screens would be held, not
skipped; the reason text would mislead (it is a Node back end, not a front-end file).

**eShop (V7).** No crash; 18 of 20 commits change C#/Razor/.csproj, the ledger marks those files `not-modelled` and appEffect is
`unknown`, confidence Partial. But Teslon knows no screen, API or job in a .NET app, so the brief has **zero areas**: test 0, skip 0,
unclear 0. The held state lives only in the ledger. Every unseen note says "no rule in this build follows other changes like this ...";
none says "C#/.NET is not read". Only b4a4087 (README) got 'none'/High, correctly.

**train-ticket.** No crash, no skip in any commit (the AngularJS UI is detected as unread, so no screen is ever skipped), 13/20 with
concrete Java test areas. Wrong file-level reasons inside bigger commits: 4785de2 calls `ts-avatar-service/requirements.txt`
documentation; fa8d9ef ("Reconstruction") calls `AdminOrderService.java` "only blank lines, comments or imports changed" while the only
change is `import adminorder.entity.*;` -> `import edu.fudan.common.entity.*;`, which swaps every entity class the service uses (K7).
b9030d1 (`hack/clean-image.sh`, tooling) -> 'none' is correct (a local image-cleanup script). 921a440 and 60af219 (`hack/*.sh`,
Makefile) hold correctly but with zero areas.

## 2. Confirmed violations (full)

Command for every row: `env -u GITHUB_TOKEN -u GH_TOKEN node field/unread/bin/child.mjs <repo> <sha>^ <sha>` (wraps `impact()` + `brief()`),
raw output in `field/unread/out/<repo>/<sha>.json`. Truth written first in `field/unread/truth/targeted.md`.

### V1 (I1, I5) microservices-demo e3da442: a Python dependency bump answered "nothing to test", confidence High
- Commit (real, 2026-08-11): "chore(deps): bump cryptography in /src/shoppingassistantservice (#3471)"; only change
  `src/shoppingassistantservice/requirements.txt`: `cryptography==46.0.5` -> `cryptography==50.0.0` (four major versions).
- Teslon: `appEffect: 'none'`, summary "No effect on the running app: 1 file (docs).", brief test 0 / skip 0 / unclear 0, `none: true`,
  confidence **High** ("No changed file reaches the running app: 1 file (docs)."). Ledger: `requirements.txt  no-runtime-effect  docs
  "documentation: the running app does not read it"`. `r.unseen` empty.
- Truth: `src/shoppingassistantservice/Dockerfile:27-28` copies it and runs `pip install -r requirements.txt`; the service behind the
  frontend's `/assistant` page (`src/frontend/main.go:158`) runs on the new library. A wrong "nothing to test" with High confidence and
  no unseen note: the exact failure the promise forbids.
- Cause: kinds.ts:15 `if (/\.(md|mdx|txt|rst|adoc)$/i.test(f) && !served) return 'docs';` then kinds.ts:45 `noAppEffect('docs')`.
  The confidence comes from areas.ts:214 (High whenever appEffect is 'none'). Python is not even detected as an unread stack, so nothing
  lowers it.
- Fix: classify dependency manifests by name before the extension rule (`requirements*.txt`, `constraints*.txt`, `Pipfile*`,
  `pyproject.toml`, `poetry.lock`, `go.mod/go.sum`, `Cargo.*`, `Gemfile*`, `composer.*`, `*.csproj`, `packages.lock.json`,
  `Directory.Packages.props`, `CMakeLists.txt`, `mix.exs`) as `dependencies` with no rule = not-modelled; and make 'docs' an allowlist
  (README/CHANGELOG/LICENSE files, `docs/`), not "any .txt".

### V2 (I1, I5) saleor-dashboard cc89355: the fix for a crashing screen answered "nothing to test"
- Commit (real): "fix: restore the useState import on Create voucher (#7067)"; only change `+import { useState } from "react";` in
  `src/discounts/views/VoucherCreate/VoucherCreate.tsx`.
- Teslon: `appEffect: 'none'`, "No effect on the running app: 1 file (frontend).", `none: true`, 0/0/0. Ledger: `no-runtime-effect`
  "only blank lines, comments or imports changed". Confidence Partial only because a React front end exists in the repo
  ("The React front end is not read ..."); the PR comment still prints "Nothing to test in the app" (render.ts:51).
- Truth: without the import the view throws `ReferenceError: useState is not defined` when it renders; the commit repairs the Create
  voucher screen. Must be "test Create voucher".
- Cause: impact.ts:569 `meaningful()` treats any line starting with `import ` (and `package `, `#`, `//`, `*`) as not code; where.ts:54
  `trivial()` does the same. In a stack Teslon cannot read, it still decided the change was inert.
- Fix: never drop `import`/`package`/`#` lines from the "real lines" count. At most, mark an import as followed when the reader proves
  the imported name is unused in both commits; for unread languages, never.

### V3 (I1, I5) train-ticket synthetic 44118c5: requirements.txt pin answered "nothing to test"
- Synthetic (local copy): `ts-voucher-service/requirements.txt` `tornado` -> `tornado==5.1.1`; the service Dockerfile line 10 runs
  `pip install --no-cache-dir -r requirements.txt`.
- Teslon: `appEffect: 'none'`, 0/0/0, ledger docs "documentation: the running app does not read it". Confidence Partial only because of the
  AngularJS note. Same cause and fix as V1.

### V4 (I1, I5) saleor-dashboard synthetic 67cc88b: the deploy workflow's build-time API URL answered "nothing to test"
- Synthetic: `.github/workflows/deploy-cloud.yaml` `EXTENSIONS_API_URL` `.../api/v1/extensions` -> `.../api/v2/extensions`. That workflow
  builds (`pnpm run build`, line 93) and ships the bundle with this env (lines 37-49).
- Teslon: `appEffect: 'none'`, ledger `ci` "CI pipeline: it changes how the project is checked, not what the app does".
- Cause: kinds.ts:18 `^\.github/` -> ci, kinds.ts:46. Fix: a workflow that builds or deploys the artifact (`docker build`/`push`,
  `npm run build` followed by an upload/deploy step, `kubectl`, `helm`, `terraform apply`, `env:` keys read by the build) is `deploy`, not `ci`;
  at least, any `env:` change in such a workflow is held.

### V6 (I3) n8n: one commit does not finish in 20 minutes
- `timeout 180 node child.mjs repos/n8n 51f8cf62^ 51f8cf62` killed at 180 s; then `timeout 1200 ... 251c44bc^ 251c44bc` killed at
  1,200 s (`real 20m0.09s, user 16m49s, sys 2m47s, exit 124`). n8n at depth 80: 34,862 tracked files.
- Cause: snapshot.ts:36-45 spawns one `git show <sha>:<path>` per file read, per side; the readers read every candidate file of both
  commits, so a 35k-file monorepo means tens of thousands of process spawns before any rule runs.
- Effect: on n8n, the 20-commit history run and the I2 deep check are impossible within any sane CI budget; a GitHub Action job
  would sit for 20+ minutes per PR (if it finishes at all). Not silent (the process is killed), but useless.
- Fix: read blobs through one `git cat-file --batch` process (or `git archive` once per side), read only files reachable from the change
  plus the route/manifest files, and add a time budget that ends with "held: did not finish reading" rather than nothing.

### V5 (I3) halo 3ec858d: crash (uncaught SyntaxError) on a Dockerfile-only commit
- Teslon: process exits 1: `SyntaxError: Invalid regular expression: /(^|[^\w$.])"["(?![\w$])|\b(this|PHYSICAL_KEY_CODES)\."["(?![\w$])/:
  Unmatched ')'` at `dist/engine/certify.js:941` (source certify.ts:666).
- Cause: a member name taken from `ui/packages/editor/src/utils/keyboard.ts` (an object key `"["`) is put into a RegExp unescaped; only `$` is
  escaped. Any commit whose certification walks that file crashes; the commit content is irrelevant.
- Fix: escape the full RegExp metacharacter set (`s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`), and wrap `certify()` so an exception holds
  every area with an unseen note instead of killing the run.


## 3. Misclassification findings for kinds.ts

Static hunt first (a Python port of `fileKind`, kinds.ts:8-40, run over `git ls-files` of each clone; script
`field/unread/py/kinds.py` + `py/inert_scan.py`, output `field/unread/out/inert_scan.txt`). Each item is then
confirmed by running Teslon where marked.

| # | Path (repo) | kinds.ts says | Truth | Rule (kinds.ts line) |
|---|---|---|---|---|
| K1 | `ts-voucher-service/requirements.txt`, `ts-avatar-service/requirements.txt` (train-ticket) | docs: "documentation: the running app does not read it" | Python dependency manifest; `pip install -r` in the service image decides what runs | line 15: any `*.txt` outside a served folder is docs |
| K2 | `.github/workflows/deploy-cloud.yaml` (saleor-dashboard) | ci: "changes how the project is checked, not what the app does" | builds and ships the dashboard; sets build-time `API_URL`, `APP_MOUNT_URI`, `STATIC_URL`, `EXTENSIONS_API_URL`, `CLOUD_API_URL` that are baked into the bundle (lines 37-49) | line 18: everything under `.github/` is CI |
| K3 | `packages/@n8n/cli/skills/n8n-cli/SKILL.md` (n8n) | docs | shipped in the npm package (`"files": ["bin","dist","skills"]`) and read at run time by `n8n-cli skill install` (`packages/@n8n/cli/src/commands/skill/install.ts:33-39`) | line 15: `*.md` is docs |

| K4 | `src/{agent,chatbot,mcp,load-generator}/requirements.txt` (otel-demo); `src/{emailservice,recommendationservice,shoppingassistantservice}/requirements.txt` (microservices-demo) | docs | each service's Dockerfile runs `pip install -r requirements.txt` (e.g. gcp-demo `src/shoppingassistantservice/Dockerfile:27-28`, otel `src/agent/Dockerfile:14-16`) | line 15 |
| K5 | `src/currency/CMakeLists.txt` (otel-demo, C++ currency service) | docs | the C++ build of a running service | line 15 |
| K6 | `.github/release-cluster/frontend-ingress.yaml`, `managed-cert.yaml`, `.github/terraform/main.tf` (microservices-demo) | ci | Kubernetes Ingress / managed certificate / Terraform of the live demo cluster | line 18 |
| K7 | any import-only or `#`-only edit of a runtime file (all repos) | ledger `no-runtime-effect`, reason "only blank lines, comments or imports changed" | an import is code: a side-effect import registers a controller (`packages/cli/src/public-api/v1/controllers/index.ts` in n8n a44a347a registers the new DELETE endpoint only through `import './agents.public.controller'`), a missing import crashes a screen (saleor cc89355), a `package` line moves a class into component scan (train-ticket 9eb7915) | impact.ts:569 `meaningful()` drops lines that start with `import `, `package `, `#`, `//`, `*`; where.ts:54 `trivial()` the same |

Real commits that hit K4 alone (requirements.txt is the only changed file): microservices-demo e3da442 (cryptography 46.0.5 -> 50.0.0) and
0359b90 (pyasn1). Commits that hit K4 with requirements.in beside it: otel-demo 7a07d9f, b427585, 3598ba9, b752faf, ab744b2, bc22a44.

| K8 | `packages/cli/src/license.ts` (n8n, 663 lines, `export class License implements LicenseProvider`, every enterprise feature gate `isLicensed()` at line 318) | docs | the licence service of the back end | line 13: basename `LICENSE(\.\w+)?` case-insensitive, so `license.ts` is "documentation" |
| K9 | `api/src/main/java/run/halo/app/infra/model/License.java` (halo; used by `Plugin.java`, `Theme.java` specs, shown at `ui/console-src/modules/system/plugins/components/tabs/Detail.vue:301`), `ui/packages/api-client/src/models/license.ts` | docs | a model class serialised in the Plugin and Theme APIs | line 13 |
| K10 | `packages/frontend/@n8n/design-system/src/components/N8nNotice/Notice.vue`, `packages/frontend/editor-ui/src/app/constants/notice.ts` (n8n) | docs | a Vue component used across the editor; app constants | line 13: `NOTICE` |
| K11 | `packages/modules/insights/frontend/src/components/charts/*.vue` (6 files, n8n Insights dashboard) | deploy | Vue components of a screen | line 21: any folder named `charts/` is a Helm chart |
| K12 | `packages/nodes-base/nodes/Jira/__schema__/v1.0.0/issue/changelog.json` (n8n) | docs | node output schema shipped with the node | line 13: `CHANGELOG` |
| K13 | `utilities/tools.descartes.teastore.dockerbase/ssl/generate_cert.sh` (TeaStore) | tooling (word "generate") | makes the certificate the image imports (Dockerfile:43 says re-run it and rebuild) | line 30 |

K8 confirmed on the engine with a synthetic commit on halo License.java (see V6 below when run).

## 4. Deep I2 checks (n8n, halo)

(pending)

## 5. Usefulness: the price of an unread stack

(pending)

## 6. What Teslon must do before it meets a stack it cannot read

(pending)

## Method and raw data

- Engine: `/home/user/teslon/packages/core/dist/index.js`, read-only, `impact()` + `brief()`; one commit per child process
  (`field/unread/bin/child.mjs`), base = parent, `timeout 180` (n8n: see I3), run strictly one at a time
  (`bin/batch.sh`, `bin/one.sh`). Raw JSON per commit: `field/unread/out/<repo>/<sha>.json`, changed files `<sha>.files`.
- Fresh clones in `field/unread/repos/` (the shared clones under `scratchpad/repos/` are empty depth-1 shells): n8n (depth 80),
  halo (depth 300), saleor-dashboard, eShop, train-ticket, TeaStore, mixit (Kotlin + Spring WebFlux functional routes + Mustache;
  chosen as the Kotlin app with a web front end in the same repo), opentelemetry-demo, microservices-demo.
- Synthetic commits (only where history had no clean case) in `field/unread/synth/` (local copies; the real clones are untouched).
- Truth was written before reading Teslon's answer: `field/unread/truth/*.md`.
- Auto-flags (`py/analyze.py`): NONE_WITH_SRC (appEffect 'none' with source files outside test/docs folders), NOTHING_WITH_SRC (no area
  to test and none unclear), HIGH_WITH_UNREAD, SKIP_WITH_UNREAD (screen/widget skipped while unread files changed), LEDGER_MISSING,
  NOTMODELLED_UNNAMED (a not-modelled file absent from r.unseen), INERT_SRC (a source file the ledger calls test-only/no-runtime-effect).
