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

(more rows below as they are confirmed)

## 4. Deep I2 checks (n8n, halo)

(pending)

## 5. Usefulness: the price of an unread stack

(pending)

## 6. What Teslon must do before it meets a stack it cannot read

(pending)

## Method and raw data

(pending)
