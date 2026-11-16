# Field test: Teslon on stacks it cannot read (or reads only in part)

Author: field tester "unread" (2026-11-15). Status: IN PROGRESS. Sections are filled as each repository finishes.

Promise under test: "never a wrong skip, never silent". Invariants I1 (no 'none'/High on unread runtime change),
I2 (no skip reachable from an unread changed file), I3 (no crash/hang), I4 (every unread file named with an actionable
reason), I5 (docs/CI/tooling/test kinds truly inert).

Working folder: /tmp/claude-0/-home-user-Orbis/a99ca81c-9750-554d-8faa-4222ad38b407/scratchpad/field/unread/

## 1. Summary table per repository

(filled as each repository finishes)

## 2. Confirmed violations (full)

(filled as found)

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

(more rows below as they are confirmed)

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
