# Teslon engineering audit (enterprise readiness)

Auditor: engineering auditor. Date: 2026-11-15. Repo audited: /home/user/teslon (read-only), built dist used as-is.
Status: IN PROGRESS. Sections are appended as each area is finished.

## 1. Summary

(to be written at the end)

### Findings table

| ID | Area | Severity | Evidence | Fix | Effort |
|----|------|----------|----------|-----|--------|

## 2. Performance and scale

### 2.1 Method
- Driver: `run1.mjs` (scratchpad `field/engaudit/`) imports `impact()` from `/home/user/teslon/packages/core/dist/index.js`, one commit per child process, `timeout` per run, `node --max-old-space-size=8192`.
- `/usr/bin/time` is NOT installed on this machine (`ls /usr/bin/time` -> "No such file or directory"), so peak memory is `process.resourceUsage().maxRSS` of the node process (git child processes excluded) and CPU is node user+sys.
- Git calls counted with a PATH wrapper that logs each `git` invocation.
- The machine was shared with two other team members' node runs (seen in `ps`), so wall times are noisy; CPU time is the steadier number. One JHipster run took 54 s wall but 9.3 s CPU; re-run under `--cpu-prof` it took 7.9 s.
- Fixture cases: copy of the fixture, `git init`, base commit, then synthetic heads (small = 1 method + 1 route edit; medium = 10 classes; large = every class + every route + 40 TS files). Real repos: real commits picked at the 20th/60th/90th percentile of diff size.

### 2.2 Results (impact() only, dist build of 2026-11-15)

| Case | Repo size | Diff | impact() ms | CPU user+sys s | Peak RSS MB | git processes | Result |
|---|---|---|---|---|---|---|---|
| ShopFlow small | 112 files, 1.3k Java lines | 2 files | 1,650 | 2.5 | 204 | 192 | ok |
| ShopFlow medium | same | 10 files | 1,684 | 2.6 | 206 | 192 | ok |
| ShopFlow large | same | 88 files | 1,879 | 2.8 | 223 | 192 | ok |
| JHipster 5a3ca402 | 618 files | 2 files, +57,310 lines (lockfile) | 7,759 | 7.9 | 382 | 636 | ok |
| JHipster cf186b12 | 618 files | 28 files | 7,276 | 7.1 | 383 | 675 | ok |
| JHipster 85b179c5 | 618 files | 183 files | 7,919 (54,061 under contention) | 9.3-10.3 | 382-412 | 657 | ok |
| train-ticket a9b5b4fb | 2,829 files, 50.6k Java lines, 329k JS/HTML lines | 1 file (Jenkinsfile) | 20,825 | 15.5 | 466 | 1,488 | ok |
| train-ticket 90d3b185 | same | 9 files | 29,131 | 22.0 | 895 | 1,870 | ok |
| train-ticket c890dd8c | same | 110 files | 36,290 | 30.9 | 1,004 | 2,376 | ok |
| n8n b70e354d | 34,862 files, 26.8k TS/Vue/JS files | 4 files, +19/-3 | **killed at 1,200 s** | n/a | 867 at kill | 45,032 before kill | **timeout (exit 124), no report** |
| n8n 1b2def7e | same | 26 files | **killed** | n/a | n/a | 45,324 before kill | **timeout** |

(n8n large commit 9da0431a not run: the small one already does not finish. A teammate's separate n8n run, `field/unread`, was also still running after 12+ minutes when observed.)

### 2.3 Where the time goes (code + profile)
- **Cost is set by repository size, not by PR size.** A 1-file Jenkinsfile change on train-ticket costs 21 s and 466 MB; the same repo's 110-file change costs 36 s. `impact()` always parses both whole snapshots: `packages/core/src/engine/impact.ts:125-130` calls `snapshot()` twice, then `readSpring(B)`, `readSpring(H)`, `readFrontend(H)`, `readFrontend(B)`. `readSpring` parses every non-test `.java` file with `java-parser` (`spring.ts:226-232`); `readVue` parses every JS/TS/Vue file under any `src/`, `app/`, `scripts/`... directory with the TypeScript parser (`vue.ts:234`, `vue.ts:254`, `vue.ts:309`), which on n8n means the whole Node back end too. Files identical at base and head (same blob) are parsed twice; nothing is shared by blob id.
- **One `git` process per file read.** `snapshot.ts:36-47`: `read()` runs `git show <sha>:<path>` via `execFileSync` for every file (cached in a per-run Map). CPU profile of JHipster 85b179c5 (`node --cpu-prof`, 8,978 ms sampled): `spawnSync` 4,161 ms = **46% of all CPU**, plus `normalizeSpawnArguments` 331 ms; TypeScript 841 ms (9%), Chevrotain/java-parser ~1,040 ms (12%), GC 525 ms. A `git cat-file --batch` pipe would remove almost all of this.
- **No cache between runs, no incremental mode.** No on-disk cache, no blob-keyed parse cache; `grep -rn "cache" packages/core/src/engine/*.ts` finds only the in-memory per-snapshot Maps (`snapshot.ts:34-35`) and Spring `@Cacheable` rules.
- **Super-linear spots in the code** (confirmed by reading; their cost on the cases above is hidden by the parse floor):
  - `where.ts:725-733` `newConstantUnused`: for each changed `static final` line, builds `new RegExp` *inside* `H.files.some(...)` and scans the text of every Java/Kotlin/YAML/XML/JS/TS/Vue file: O(changed constants x repo files x file size).
  - `where.ts:736-744` `unused`: for each added class, regex over every Java/XML/YAML/properties file.
  - `where.ts:1536-1546`: for each changed asset (image, font, stylesheet), splits every front-end file into lines and runs `matchAll` per line: O(assets x files x lines).
  - `certify.ts:933`: for each changed CSV, reads and splits every XML/YAML/JSON/SQL file.
  - `impact.ts:423`: `readRequestPlans(H)` (a whole-tree scan of `.jmx/.http/.rest` files, `outside.ts:94-140`) is re-run inside the per-endpoint loop.
  - `where.ts:1667`, `certify.ts:817`: `new RegExp` built per file inside `filter` over all files.
- **Memory**: every file text read is kept for the whole run (`snapshot.ts:34`, Map without eviction) plus all ASTs/facts for both commits. train-ticket reached 1.0 GB; n8n 0.87 GB after only the reading phase.
- **Buffers**: `snapshot.ts:25` caps each git call at 256 MB (`maxBuffer: 1 << 28`); a diff larger than that throws (not tested at that size).

### 2.4 Extrapolation (assumptions stated)
Assumptions: cost per run ~ (files parsed at base + head) x (spawn ~5-10 ms + parse); diff size is second order; the measured anchors are train-ticket (2.8k files, ~380k lines incl. vendored JS) = 21-36 s / 0.5-1.0 GB, and n8n (35k files, ~27k TS/Vue) = >1,200 s.
- **1 M-line monorepo** (~8-15k source files): between the two anchors; expect several minutes to tens of minutes per PR and 1.5-3 GB, if it is mostly Java; n8n shows a TS-heavy repo of this order already does not finish in 20 minutes.
- **10 M-line monorepo** (~100k+ files): hours per PR on the current design; 100k+ `git show` processes per side; the in-memory text cache plus two full fact sets would likely pass the default V8 heap (about 2-4 GB) and crash without `--max-old-space-size`. Not runnable.
- **500 PRs/day**: on a train-ticket-sized repo, 500 x ~30 s CPU = ~4 runner-hours/day (fine). On an n8n-sized repo, 500 x >20 min = >170 runner-hours/day, and each PR's comment arrives after the reviewer has moved on. The Action also runs `npm ci && npm run build` of Teslon itself on every PR (`action.yml:77-82`), adding roughly a minute and a network dependency per run.
- **What falls over first**: time (process spawning + whole-repo parsing) on any repo above a few thousand files; then memory on very large repos; git operations themselves (diff, ls-tree) are cheap. The Action's `git fetch --unshallow` (`action.yml:101-104`) on a large monorepo is the next cost.

### 2.5 Grade
- P1 **Launch blocker** (for an enterprise claim): does not complete on a large real repo (n8n, 4-file PR, killed at 20 min); cost scales with repo size, not PR size.
- P2 High: one git process per file read (46% of CPU).
- P3 High: no cross-run cache or incremental mode; unchanged files parsed twice per run.
- P4 Medium: quadratic scans (where.ts:725-744, 1536-1546; certify.ts:933; impact.ts:423).
- P5 Medium: unbounded in-memory text cache; no file-size limit.

## 3. Robustness and determinism

(pending)

## 4. Security

(pending)

## 5. Product hygiene

(pending)

## 6. What is genuinely well built

(pending)

## 7. Enterprise-grade gap list, ranked

(pending)
