# Teslon engineering audit (enterprise readiness)

Auditor: engineering auditor. Date: 2026-11-15. Repo audited: /home/user/teslon (read-only), built dist used as-is.
Status: complete (2026-11-16). Scripts and raw outputs: /tmp/claude-0/-home-user-Orbis/a99ca81c-9750-554d-8faa-4222ad38b407/scratchpad/field/engaudit/ (run1.mjs, perf.sh, mkfx.sh, inj.mjs, top.mjs, out/perf.txt, out/odd-*.txt, prof/jh-85b179c5.cpuprofile).

## 1. Summary

**Verdict: not enterprise grade today.** The analysis is deterministic, the code is strictly typed, there is no shell-injection path, output escaping is careful, and CI tests the product's promise unusually well. But the engine re-reads and re-parses the **whole repository at both commits on every PR**, starting one `git` process per file. It does not finish on a large real repository: n8n (35k files) with a 4-file PR was killed after 20 minutes with no output. There is also no configuration, no reader plug-in seam, no published or signed release, and the Action builds Teslon from the npm registry on every run. Two correctness/security issues contradict the product's own promises: an unreadable changed line is treated as a blank line ("no app effect"), and report.html/report.json quote secret values from changed config lines, though SECURITY.md says they never do.

Counts: **1 Launch blocker, 8 High, 11 Medium, 5 Low** (25 findings). Measurements were taken 2026-11-15/16 on the shared 4-core machine; wall times are noisy, CPU times are steadier.

Key numbers (impact() only): ShopFlow fixture 1.7 s / 204 MB; JHipster 7-8 s CPU / 382 MB; train-ticket (2.8k files) 21-36 s / 0.47-1.0 GB, **21 s even for a 1-file Jenkinsfile change**; n8n (35k files) **>1,200 s, killed**, 45,032 `git show` processes before the kill. CPU profile: 46% of time is spent spawning git.

### Findings table

| ID | Area | Severity | Evidence | Fix | Effort |
|----|------|----------|----------|-----|--------|
| P1 | Performance | **Launch blocker** | n8n b70e354d (4 files): killed at 1,200 s, no report; cost tracks repo size (train-ticket 1-file PR = 21 s); `impact.ts:125-130` parses both whole snapshots | Parse only what the diff can reach (changed files + index of symbols), share facts by blob id, add a time budget that returns "Unclear" instead of nothing | L (weeks) |
| P2 | Performance | High | `snapshot.ts:36-47` one `git show` per file; profile: `spawnSync` 4,161 of 8,978 ms (46%) | One `git cat-file --batch` pipe per run | S (days) |
| P3 | Performance | High | no on-disk or blob-keyed cache; no incremental mode (grep) | Cache parsed facts by blob SHA across runs (Action cache) | M |
| P4 | Performance | Medium | super-linear scans: `where.ts:725-733`, `:736-744`, `:1536-1546`; `certify.ts:933`; `impact.ts:423`; per-file `new RegExp` at `where.ts:732`, `:1667`, `certify.ts:817` | Build one word index per snapshot; hoist regexes | S |
| P5 | Performance | Medium | text of every read file kept for the run (`snapshot.ts:34`); 1.0 GB on train-ticket | Size cap, evict text after parsing | S |
| R1 | Robustness | High | 6.3 MB generated Java + 900k-line properties: killed at 300 s | Per-file size limit and per-phase time budget; hold the file as Unclear | S |
| R2 | Robustness | High | quoted git paths mis-parsed (`snapshot.ts:108`, `:121-125`); `trivial((H.line(..) ?? '').trim())` (`where.ts:710`, `:726-727`, `:1332`) turns an unreadable line into "only blank lines, comments or imports changed"; reproduced with a TAB/quote file name | Parse `-z` diff output; treat null as "unread", never as blank; add a fuzz test | S |
| R3 | Robustness | Medium | timeouts give no partial result or progress (n8n) | Budget + partial report + progress on stderr | M |
| R4 | Robustness | Low | root commit / bad ref -> raw git error, exit 2; "Sad sad panda" parser text in unseen | Friendly messages; empty-tree base for root commits | S |
| R5 | Robustness | Low | exit codes 1/4/5 undocumented (`cli.ts:371`, `:630`, `:745`); `impact --out` silently ignored (`cli.ts:561`) | Document or unify; honour `--out` | S |
| R6 | Determinism | Low | report differs between runs only in `ms` | Move timing out of report.json | XS |
| S1 | Security | High | report.html: "line 24: app.api-key: sk_live_ABCDEF123456"; SECURITY.md says values are never included; artifact kept 30 days (`action.yml:117-123`) | Redact values of changed config keys (or all quotes of config lines) in every output; test it | S |
| S2 | Security / supply chain | High | Action runs `npm ci && npm run build` every run (`action.yml:77-82`); no tags/releases; `setup-node@v4`, `upload-artifact@v4` tag-pinned | Ship a prebuilt, bundled, versioned Action (`dist/` committed, SHA-pinned actions, release tags) | M |
| S3 | Security / supply chain | Medium | no SBOM, provenance or signatures; own packages lack `license`; `@teslon` scope unclaimed; sub-packages not private | Claim scope, add license fields, npm provenance, CycloneDX SBOM | S |
| S4 | Security | Medium | git lazy-fetches blobs on partial clones (observed "could not fetch ... from promisor remote"); guard test `invariants.test.mjs:171-181` is a thin regex | Run git with `GIT_NO_LAZY_FETCH=1`/`-c fetch...`, detect partial clones, widen the test | S |
| S5 | Security | Medium | README silent on `pull_request_target`; token sits in step env (`action.yml:90`) | Document "never pull_request_target"; scope token to the comment step | XS |
| S6 | Security | Low | Windows `cmd /c start` with `&` in URL (`cli.ts:669`); CSP `script-src 'unsafe-inline'` (`html.ts:713`); no Host check in UI server | Quote URL / use `rundll32`; hash-based CSP; Host check | S |
| H1 | Hygiene | High | no config file of any kind (grep) | `teslon.yml`: ignore paths, area names/owners, service map, risk levels, custom client wrappers | M |
| H2 | Maintainability | High | no reader interface (`impact.ts:127-130`, `frontend.ts:6-15`); `followChanges` ~1,240 lines (`where.ts:465-1704`), `certify()` ~1,000 lines, `impact()` ~650 lines | Define a Reader interface (facts in, deltas out); split where.ts by framework | L |
| H3 | Packaging | Medium | nothing published (`npm view` 404); v0.1.0, CHANGELOG only "Unreleased"; MIT license (`LICENSE`) | Release process; decide license model before launch | M |
| H4 | Output contract | Medium | `schema: 'teslon.impact/1'` is a TS type only (`model.ts:136`); no JSON Schema; JUnit only in legacy `analyze`; no SARIF | Publish JSON Schema + compatibility policy; add JUnit/SARIF/check-run outputs | M |
| H5 | Documentation | Medium | no limits, versions, troubleshooting; claims not backed (5.4) | Write them; correct SECURITY.md/README claims | S |
| H6 | Tests | Medium | no direct unit tests for where.ts, impact.ts, dataflow.ts, vue.ts, html.ts...; no perf, fuzz or cross-OS tests | Add a scale job (one large public repo), fuzz odd inputs, Windows/macOS runners | M |
| H7 | Observability | Medium | only `TESLON_CERT_DEBUG` (`certify.ts:1209`); no timing, progress or repro bundle | `--trace`, per-phase timings, `teslon bundle` for bug reports | S |
| H8 | Maintainability | Low | no lint/format config; 169 engine lines >300 chars (max 780); legacy engine shipped | ESLint + Prettier; move legacy out | S |

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

### 3.1 Determinism
Same input twice via `impact()`, JSON compared by md5 and then field by field:

| Case | md5 run 1 | md5 run 2 | Differing fields |
|---|---|---|---|
| ShopFlow small (36 KB JSON) | b4f573565fac | 67bb915f2227 | only `/ms` (1709 vs 1543) |
| ShopFlow large (305 KB) | 1274fd18d961 | 75ff2a8b63c5 | only `/ms` |
| JHipster cf186b12 (521 KB) | 128b8992a7ad | 489dbf6190d3 | only `/ms` (6443 vs 6911) |

Verdict: the analysis is deterministic; the report is not byte-identical only because it embeds its own run time (`ms`). Low: move timing to a separate `meta`/stderr so reports can be hashed, cached and diffed.

### 3.2 Odd inputs (scratch repo = ShopFlow copy, CLI `teslon impact base..head`, 300 s timeout each)

| Input | Exit | Time | What happened | Verdict |
|---|---|---|---|---|
| Empty diff (base = head) | 0 | 2 s | "No effect on the running app: 0 files" | correct |
| Root commit as head (`R^..R`) | 2 | 1 s | raw `git rev-parse ... ^^{commit}` "Needed a single revision" | handled, but no empty-tree fallback; message is a raw git error |
| Missing ref | 2 | 1 s | same raw git error | handled, message unfriendly |
| Binary only (PNG in resources) | 0 | 2 s | 9 areas Unclear, "lines nothing followed" | correct (not silent) |
| One 6.3 MB generated Java class (160k methods) + 900k-line properties file | **124 (killed)** | **>300 s** | no output | **hang**; no file-size guard |
| Unparseable Java (controller with syntax error) | 0 | 2 s | 6 test, 12 unclear; unseen says "could not be parsed: Sad sad panda, parsing errors detected in line: 11, column: 34!" | correct (held), but leaks the parser's joke message to users |
| CRLF conversion of a whole controller | 0 | 3 s | "No effect on the running app ... Nothing to test" | correct for Java (`diff -b`); note: would also hide a CR change inside a Java text block or a properties value |
| Submodule added | 0 | 3 s | 9 Unclear | correct (not silent) |
| 5,000-file diff (YAML) | 0 | 29 s | 9 Unclear, "5000 changed files have lines nothing followed" | correct, fine |
| File names with `"`, `$()`, backticks, `<img onerror>`, and a TAB | 0 | 3 s | ledger paths come out as `"b/catalog-service/.../$(touch PWNED)\`id\`;\"x\"<img ...>.yml"` with the quotes and `b/` kept; both files called **"no app effect (only blank lines, comments or imports changed)"**, though each holds a non-blank key | **wrong reason, fail-open** (see R2); no shell execution (`PWNED` not created) |
| Shallow clone, parent missing (train-ticket boundary 57b39201) | 2 | - | same as root commit | handled; the Action unshallows first (`action.yml:101-104`, with `|| true`) |

Also seen: the n8n timeouts of section 2 (no partial result, no progress output).

### 3.3 Fail-open patterns in error handling
- **Path parsing**: `snapshot.ts:108` takes the path from `/ b\/(.*)$/` and `snapshot.ts:121-125` strips `a/`/`b/` only when unquoted. Git C-quotes any path with `"`, `\`, TAB, newline or control characters even with `core.quotepath=off`, so these paths are kept with quotes and escapes, `H.read()` returns null, and:
- **A line that cannot be read counts as a blank line**: the engine tests lines with `trivial((H.line(path, n) ?? '').trim())` (e.g. `where.ts:710`, `where.ts:726-727`, `where.ts:1332`). `null` (file unreadable) becomes `''`, which is "trivial", which becomes "no app effect". This contradicts the documented contract in `snapshot.ts:6-9` ("a caller cannot mistake missing for empty"). Rare file names today, but the pattern is the dangerous part: any future read failure turns into a confident "nothing to test".
- 39 `catch` blocks in engine+CLI (grep). Most are deliberate and conservative (e.g. `certify.ts:996` unreadable package.json -> "the browser app's build changed"; `outside.ts:23` skip a non-JSON dashboard). Ones that turn failure into "no effect": `dataflow.ts:507` (a topic pattern that is not a valid regex -> "does not match", so that listener is not linked), `ngtypes.ts:132` (template parse failure -> no type-check block, i.e. no typed reads for that template), `where.ts:1804-1805` (unreadable package.json -> `{}` -> no dependency moves seen), `snapshot.ts:41-43` (`git show` failure -> null, then the blank-line rule above).
- **Exit codes**: README documents 0, 2, 3 (`README.md` "Exit codes"). Code also uses 1 (usage errors, `cli.ts:745` etc.), 4 (not a git repo / no merge base in the legacy path, `cli.ts:630`, `cli.ts:729`), 5 (legacy policy failure, `cli.ts:371`). Undocumented codes 1/4/5 and a timeout give no structured result.
- `teslon impact` ignores `--out`: the flag is parsed globally (`cli.ts:63`) but only the `pr` command writes files (`cli.ts:561-565`); `impact ... --out dir` silently prints text and writes nothing (observed: no `odd-*` folders created). README lists `--out` without saying it is `pr`-only.

### 3.4 Grade
- R1 **High**: hang on a large single file (no size or time budget, no partial result).
- R2 **High**: fail-open "unreadable line = blank line" plus quoted-path mis-parse gives a false "no app effect" reason. Contradicts the core promise "never a wrong skip, never silent".
- R3 Medium: no timeout/budget/progress; a timeout yields nothing, not "Unclear".
- R4 Low: raw git errors and the java-parser "Sad sad panda" text shown to users; no empty-tree fallback for root commits.
- R5 Low: exit codes 1/4/5 undocumented; `--out` ignored by `impact`.
- R6 Low: report embeds run time, so not byte-identical.

## 4. Security

### 4.1 Command execution
Every process launch in shipped code (`grep -rn child_process packages/*/src`):

| Site | Call | Inputs from outside |
|---|---|---|
| `core/src/engine/snapshot.ts:23` | `execFileSync('git', ['-C', repo, '-c', 'core.quotepath=off', ...args])` | ref (`${ref}^{commit}`), `${sha}:${path}` |
| `core/src/engine/pr-range.ts:32` | `execFileSync('git', ['-C', repo, ...args])` | head/base refs, `--base-sha` |
| `core/src/change/index.ts:45` | `execFileSync('git', ...)` (legacy engine) | refs |
| `cli/src/cli.ts:502`, `:549` | `execFileSync('git', [...])` incl. `git fetch origin +refs/heads/${baseBranch}:...` (`:535`) | base branch name from the GitHub API or `--base` |
| `cli/src/github.ts:25` | `git remote get-url origin` | none |
| `cli/src/cli.ts:667-671` | `spawn('cmd', ['/c','start','',url])` on Windows, `open`/`xdg-open` elsewhere (UI command) | URL with `encodeURIComponent`'d refs |

- All use argument arrays, no `shell: true`, no `exec`/`execSync`. A hostile file name (`$(touch PWNED)\`id\`;"x"<img ...>.yml`) went through the whole run: `PWNED` was not created (section 3.2). Branch names cannot start with `-` in git, and every ref is suffixed `^{commit}` before `rev-parse --verify`, so option injection through refs is not practical. **No shell-injection path found.**
- Low: on Windows, `cmd /c start "" <url>` (`cli.ts:669`) is a shell; the URL contains a literal `&` (`?head=..&base=..`), so `cmd` splits the line and runs `base=...` as a command (breaks the link; attacker control is limited to URL-encoded text). Only on the local `ui` command.
- The Action passes inputs through `env:` and quoted shell arrays (`action.yml:86-110`), not `${{ }}` inside `run:`, so PR titles/branch names do not reach the shell. Good practice, verified by reading.

### 4.2 Output injection
Test (`inj.mjs`): PR title/body/repo name/base set to `X</script><script>alert(1)</script> <img src=x onerror=alert(2)> [click](javascript:alert(3)) ![t](https://evil.example/p.png) @everyone <!-- hide --> ## H` plus the hostile file names; rendered with `renderComment`, `renderSummary`, `renderHtml`.
- Markdown: `esc()` (`markdown.ts:47-49`) escapes `\ \` * _ [ ]`, `<`, `>`, `|`, newlines and turns `@word` into code. Result: no raw `<script>`/`<img>`, no live link or image (brackets escaped: `\[click\](javascript:alert(3))`), `@everyone` became `` `@everyone` ``, no HTML comment. Evidence links URL-encode path segments (`markdown.ts:75`).
- report.html: all hostile text appears HTML-escaped (`&lt;img src=x onerror=...&gt;`); the embedded JSON island escapes `<` as `<` (`html.ts:704`), so `</script>` cannot close it (checked: no raw `</script><script>` in the island). CSP present: `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'` (`html.ts:713`). No `src`/`href` to any network host in the generated file; no `fetch`/XHR/dynamic import. `grep -c innerHTML html.ts ui/public/app.js` = 0/0.
- Verdict: **output injection is well handled.** Low: `script-src 'unsafe-inline'` (a nonce or hash would be stricter); plain URLs in a PR title still autolink on GitHub (unavoidable, harmless).

### 4.3 Secrets in outputs (contradicts SECURITY.md)
SECURITY.md: "It does not copy them, upload them, or include their values in its output - only the fact that a file changed." Test: added `app.api-key: sk_live_ABCDEF123456` and `spring.mail.password: hunter2SECRETvalue` to `billing-service/src/main/resources/application.yml`.
- comment.md: 0 hits; summary.md: 0 hits; **report.html: 1 hit**: `what billing-service/src/main/resources/application.yml changes (line 24: app.api-key: sk_live_ABCDEF123456)`. There is no redaction code (`grep -n "secret|password|redact|mask" html.ts markdown.ts` = nothing). The same unseen text is in report.json (it feeds the HTML).
- The Action uploads report.html and report.json as an artifact for 30 days (`action.yml:117-123`); on public repos artifacts are downloadable by any signed-in user. The secret was already in the diff, but the policy statement is false as written and an enterprise security review will test exactly this. **High.**
- Also: report.json carries `repo: opts.repo` (`impact.ts:764`), the runner's absolute path; harmless but noisy.

### 4.4 The GitHub Action
- Permissions: the example asks for `contents: read`, `pull-requests: write` (README "Set it up"). That is the minimum for a comment. Fine.
- Fork PRs: read-only token, comment fails, artifact and summary still written (README). The Action does not need secrets. Fine.
- `pull_request_target`: not used by the example; not documented as unsafe either. If a team switches to it to get comments on fork PRs (a common move), the Action would run `npm ci && npm run build` from `github.action_path` (Teslon's own code, fine) but would analyse attacker-controlled code with a write token in `env` (`GITHUB_TOKEN: ${{ inputs.token }}`, `action.yml:90`). Teslon only reads files and runs git, so direct code execution is unlikely; still, the README should say "do not use pull_request_target". Medium (documentation).
- Pinning: `actions/setup-node@v4` and `actions/upload-artifact@v4` by tag, not SHA (`action.yml:69`, `:117`); README tells users `uses: abhijeet1771/teslon@main` "pin a commit SHA in production". No release tags exist (`git tag | wc -l` = 0), so there is nothing stable to pin except a SHA. Medium.
- **The Action builds itself from source on every run**: `npm ci --no-audit --no-fund` then `npm run build` (`action.yml:77-82`). So every PR run downloads ~30 runtime + dev packages from the npm registry (integrity-checked by the lockfile, but `--no-audit`), needs registry access (fails on air-gapped/GHES runners without a mirror) and adds build time. No prebuilt `dist` is committed for the Action. Medium-High for enterprise.
- `git fetch --unshallow ... || true` (`action.yml:103`): a failure is ignored; the run then continues on a shallow clone (see 3.2 for what happens without the merge base).

### 4.5 Dependencies and supply chain
`npm ls --all --omit=dev` (run in /home/user/teslon, read-only): 30 runtime packages; direct: `@angular/compiler@21.2.26`, `@vue/compiler-dom@3.5.44`, `java-parser@3.0.1` (pulls chevrotain 11.0.3, lodash/lodash-es 4.18.1 via an override in root `package.json`), `typescript@5.9.3`, `@lezer/lr`, `@lezer/highlight`, `@prometheus-io/lezer-promql@0.315.1`.
- Licenses (from each package.json): MIT 15, Apache-2.0 9, BSD-2 1, BSD-3 1, 0BSD 1; **3 without a license field: `@teslon/cli`, `@teslon/core`, `@teslon/ui` themselves**. All third-party licenses are permissive and fine for commercial use.
- `npm audit --omit=dev`: `found 0 vulnerabilities` (2026-11-16). CI runs `npm audit --audit-level=high` (`ci.yml` job `audit`).
- Lockfile: yes (`package-lock.json`). SBOM: none. Signed releases / provenance / attestations: none (no releases, no tags, nothing published: `npm view @teslon/core version` -> 404). Install footprint: `node_modules` 45 MB (TypeScript is a runtime dependency).
- Risk note: the `@teslon` npm scope is not claimed (404), and the sub-packages are not `"private": true` (only the root is), so an accidental `npm publish -w` would publish them, and someone else could take the scope first.

### 4.6 "Offline" claim
- core: no `node:http/https/net/tls/dgram` import and no `fetch(` in `packages/core/src` (grep); enforced by `core/test/invariants.test.mjs:171-181`. That test's regex misses `require('https')`, dynamic `import('node:https')`, `node:dns`, and network done by a child process.
- **Network can still happen from core through git**: on a partial (blobless) clone, `git show <sha>:<path>` lazily fetches blobs from the remote. Observed directly: `git clone --shared` of the team's blobless clones failed with "could not fetch ... from promisor remote" (section 2). So "the engine makes no network calls" is only true on a full clone.
- CLI: `cli/src/github.ts:35` `fetch` to `GITHUB_API_URL` or `https://api.github.com` (or `https://<host>/api/v3` derived from `origin`) with the token, to read the PR and post the comment; `cli.ts:535` may `git fetch origin` the base branch. Matches SECURITY.md.
- UI server (`ui/src/server.ts:243`, legacy `teslon ui`): listens on 127.0.0.1/localhost only (`server.ts:41`, `:366`), body limit 64 KB, `nosniff`, no CORS header. I found no Host-header check (grep), so a DNS-rebinding page could talk to it while it runs. Low (local, opt-in, legacy).
- The Action: npm registry at every run (4.4) and the GitHub API.

### 4.7 Grade
- S1 **High**: secret values from changed config lines appear in report.html/report.json and the 30-day artifact, contrary to SECURITY.md.
- S2 High (enterprise): the Action needs the npm registry and builds on every run; no prebuilt, signed, versioned release; no tags; third-party actions pinned by tag.
- S3 Medium: no SBOM, no provenance, no license field on Teslon's own packages; `@teslon` scope unclaimed; sub-packages not private.
- S4 Medium: "offline" is false on partial clones (git lazy fetch); the network-guard test is regex-thin.
- S5 Medium: no guidance against `pull_request_target`.
- S6 Low: Windows `cmd /c start` with `&` in URL; CSP `unsafe-inline`; no Host check on the local UI server.
- No finding: shell injection, markdown/HTML injection, known CVEs.

## 5. Product hygiene

### 5.1 Packaging and license
- Versions: root `teslon@0.1.0` `"private": true`; `@teslon/core`, `@teslon/cli`, `@teslon/ui` all `0.1.0`, none private, none with a `license` field (`packages/*/package.json`). CHANGELOG has only `## Unreleased` (689 lines). No git tags.
- Published: nothing. `npm view @teslon/core version` -> npm 404 (2026-11-16). How a customer installs today: `git clone https://github.com/abhijeet1771/teslon && npm ci && npm run build` (README "Run it locally"), or the Action at `@main` / a SHA, which rebuilds from source on every run (`action.yml:77-82`).
- Runtime: Node >= 20 (`engines`); CI matrix Node 20 and 22 (`ci.yml`).
- License: MIT, "Copyright (c) 2026 Teslon contributors" (`LICENSE`). MIT lets anyone, including competitors, take, resell and fork the code; it gives the owner no lever for a commercial product except brand and service. If the plan is to sell, this is a business decision to make before launch (open core, BSL/ELv2, or proprietary + source-available). "Teslon contributors" with no CLA also means contributions cannot later be relicensed without consent. Medium (business, not engineering).

### 5.2 Configuration
- None. No config file is read: `grep -rnE "teslon\.(json|ya?ml)|\.teslonrc|ignorePaths|config file"` over `packages/cli/src` and the engine finds nothing. The only knobs are CLI flags (`--base`, `--base-sha`, `--link <url>=<path>` on `impact`, `--minutes-per-case`) and Action inputs (`pr`, `base`, `comment`, `minutes-per-case`, `working-directory`, `token`).
- Path heuristics are hard-coded, e.g. Vue file filter `vue.ts:234` (`src|static|scripts|app|webapp`, excludes `test|e2e|cypress|dist|build|target`), Spring modules from `src/main/resources/application.yml` (`spring.ts:203-208`).
- What an enterprise asks first: (1) ignore/include paths and generated code; (2) name areas/modules and map them to owners/teams; (3) a cross-repo service map (which repo serves which API, which front end calls it); (4) risk weights per area (payments > settings); (5) declare framework conventions the reader misses (custom HTTP client wrappers, base URLs, profiles); (6) a way to suppress or confirm a held area once. **High.**

### 5.3 Output contract
- report.json carries `schema: 'teslon.impact/1'` (`impact.ts:764`), typed by `ImpactReport` in `model.ts:136` and exported `.d.ts`. No JSON Schema file, no field-level documentation, no compatibility policy; `packages/core/src/schema/index.ts` belongs to the legacy engine. The CLI `pr --out` writes `{ meta, ...report }` (`cli.ts:564`), so the file differs from `impact --json`.
- Machine-readable outputs: JSON only for the impact path. JUnit exists only for the legacy `analyze` command (`cli.ts:224-232`, `--junit`); no SARIF, no CSV file (the cockpit has "Copy as CSV" in the browser), no check-run annotations. Action outputs are just four numbers (`action.yml:39-51`). Medium.

### 5.4 Documentation vs code
- Present: README (setup, flags, exit codes, how it decides, what it reads, measured), HOW-IT-WORKS.md, ROADMAP.md, SECURITY.md, a large research/ folder.
- Missing: troubleshooting (e.g. what to do with exit 2, timeouts, shallow clones), limits (repo size, file size, run time), supported framework versions (Spring Boot / Angular / Vue / Java versions are not stated; `grep -nE "Spring Boot [0-9]|Java [0-9]+|Supported versions" README.md HOW-IT-WORKS.md` = nothing), configuration (there is none), a report.json reference.
- Claims not backed, or only partly:
  - "The engine package makes no network calls" - false on partial clones (git lazy fetch, 4.6).
  - SECURITY.md "does not ... include their values in its output" - false for report.html/json (4.3).
  - "Runs on your runner; your code never leaves it" (action.yml description) - code does not leave, but the Action needs the npm registry every run (4.4).
  - Flag table lists `--out` generally; it only works with `pr` (3.3). Exit codes list 0/2/3; code also returns 1/4/5 (3.3).
  - "Vue (2 and 3)": probes cover Options API and `<script setup>` in Vue 3 (`bench/probes/catalog-shopflow.mjs:6`); I found no Vue 2-specific handling or test (`new Vue(`, `Vue.component`, vue-router 3) by grep. Partly backed.
  - "never silent" - contradicted by the unreadable-line-as-blank rule (3.3) and by timeouts that give no output (2.2).
  - Backed (checked): no network refs in report.html; CSP; GHES via `GITHUB_API_URL` (`github.ts:22`); fork PRs get no comment but an artifact; evidence re-check exits 3.

### 5.5 Tests of Teslon itself
- 21 test files, about 200 `test(` calls: core 18 files (largest: analyze 31, shopflow 18, invariants 16, engine 16, ast 16), cli 2 files (3 tests), ui 1 file (6). Tests import from `dist/` (e.g. `../dist/engine/snapshot.js`), so they need a build first.
- Engine files imported directly by a test: snapshot, spring, angular, certify, frontend, kinds, markdown, outside, vue-template. **No direct test import: where.ts (1,850 lines), impact.ts, dataflow.ts, shape.ts, vue.ts, html.ts, render.ts, ngtypes.ts, startup.ts, areas.ts, java.ts, pr-range.ts** - these are covered end to end through `impact()` on fixtures and the probe/gauntlet catalogs, not by unit tests.
- CI (`ci.yml`): unit tests on Node 20 and 22; proving ground (31 OrderDesk PRs); probe catalogs on OrderDesk and ShopFlow; skip-checker soundness scan; a grep that invariants I1-I4 are still asserted; `npm audit --audit-level=high`; the Action end-to-end on Teslon's own PR; the mutation gauntlet (javac, 60-minute timeout). This is strong for correctness on the two fixtures.
- Gaps: no performance or scale test, no test on a repo larger than JHipster, no fuzzing of odd inputs (quoted paths, huge files), no Windows/macOS runner, no test of report.json schema stability. Full-suite wall time not measured here (lab rule: no build; tests need `dist`, which exists, but I kept the shared machine free); the gauntlet job allows 60 minutes.

### 5.6 Maintainability
- TypeScript is strict: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` (`tsconfig.base.json`). 42 `any` uses in the engine (`grep -E ": any|as any"`). 0 TODO/FIXME/XXX/HACK in shipped source.
- No linter or formatter config (only `.editorconfig`; no eslint/prettier/biome files). 169 engine lines longer than 300 characters; the longest line in where.ts is 780 characters.
- Very large functions: `followChanges` in where.ts runs from line 465 to 1704 (**~1,240 lines**); `impact()` 122-770 (~650 lines); `certify()` 227-1228 (~1,000 lines).
- **No reader interface.** Readers are concrete functions wired by hand: `impact.ts:127-130` calls `readSpring` and `readFrontend`; `frontend.ts:6-15` merges `readVue` and `readAngular`. Framework knowledge is also spread through `where.ts` (annotation tables such as `where.ts:879`), `certify.ts` (its own regex rules, e.g. `certify.ts:104`, `:290-302`), and `dataflow.ts`. Adding React or Express means touching at least frontend.ts/spring-equivalent, where.ts, certify.ts (which must stay independent) and areas.ts, with no plugin seam. For a new engineer: weeks, and high regression risk, mitigated by the probe catalogs.
- Legacy engine still shipped (`teslon legacy`, `packages/core/src/{analyze,change,graph,profile,...}`, `docs/legacy-engine.md`): dead weight for buyers and a second attack surface.

### 5.7 Observability
- Logging: none in the engine. A debug env var exists only for the checker (`TESLON_CERT_DEBUG`, `certify.ts:1209`, `:1220`). `--evidence` prints every step of every chain (README), which is the best "why" tool.
- No timing breakdown per phase, no progress output (an n8n run prints nothing for 20 minutes), no `--trace`/`--verbose`.
- No "report a wrong answer" bundle: nothing packages base/head SHAs, the Teslon version, the ledger and the facts into a shareable repro (the run time `ms` is the only telemetry in report.json). Exit 3 asks users to "please report it" without a template. Medium.

### 5.8 Grade
- H1 **High**: no configuration at all.
- H2 High: no reader interface; 1,000+-line functions; adding a stack is costly.
- H3 Medium: no published, versioned, signed package or release; MIT license may not suit the commercial plan.
- H4 Medium: output contract is a TS type only; no JSON Schema, no SARIF/JUnit for the impact path.
- H5 Medium: documentation gaps (limits, versions, troubleshooting) and claims not backed (5.4).
- H6 Medium: unit tests miss the biggest engine files; no performance, fuzz or cross-OS tests.
- H7 Medium: no debug/trace/timing/progress; no repro bundle.
- H8 Low: no lint/format config; very long lines; legacy engine still shipped.

## 6. What is genuinely well built (with evidence)
- **Deterministic analysis**: three cases, two runs each, only the `ms` field differs (3.1).
- **No shell anywhere**: every process launch is `execFileSync`/`spawn` with argument arrays; the Action routes inputs through `env:`; hostile names did not execute (4.1, 3.2).
- **Output escaping is careful**: markdown `esc()` covers links, images, HTML, tables and @mentions; report.html escapes all text, protects the JSON island, has a tight CSP and zero network references (4.2).
- **Conservative on most odd inputs**: binary-only, submodule, unparseable Java and a 5,000-file diff all came back Unclear with a reason, not "safe"; empty diff is correctly "nothing" (3.2). Evidence re-check is wired to exit 3 (`cli.ts:760`).
- **Missing vs empty is modelled** at the snapshot layer (`snapshot.ts:6-9`, `read()` returns null) - the fail-open in 3.3 is in the callers, not the design.
- **Strict TypeScript** with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`; no TODOs left in shipped code (5.6).
- **CI that tests the promise, not just the code**: proving ground, probe catalogs, checker soundness, mutation gauntlet with a compiler oracle, an invariant-presence grep, `npm audit`, and the Action end to end (5.5).
- **Clean dependency picture**: 30 runtime packages, all permissive licenses, 0 known vulnerabilities, lockfile committed, lodash pinned forward by override (4.5).
- **Fast enough on small and mid-size repos**: ShopFlow ~1.7 s, JHipster ~7-8 s CPU, train-ticket 21-36 s (2.2).

## 7. Enterprise-grade gap list, ranked

1. **Scale (P1, P2, P3, P5, R1, R3).** Make cost follow the PR, not the repo: one `git cat-file --batch` pipe, a blob-keyed fact cache across runs, analysis limited to what the diff can reach, file-size limits, and a time budget that degrades to "Unclear" with a partial report. Until then, state a supported size (for example "up to ~3k files / ~100k lines of Java") and refuse larger repos loudly. Success test: a 4-file PR on n8n under 2 minutes; a 1-file PR on train-ticket under 5 s.
2. **Close the fail-open paths (R2).** Null must mean "unread" everywhere; parse diffs with `-z`; fuzz file names, encodings, huge files. This is the core promise.
3. **Secrets in outputs (S1).** Redact config values in every output and make SECURITY.md true; add a test with planted keys.
4. **A real release (S2, S3, H3).** Prebuilt and bundled Action with SHA-pinned dependencies, semver tags, npm packages with provenance, SBOM, license fields, claimed scope; no npm install at run time. Decide the license model.
5. **Configuration (H1).** Ignore paths, area names and owners, a cross-repo service map, risk levels, custom HTTP-client wrappers, "confirm once" for held areas.
6. **Extensibility (H2).** A Reader interface and a split of where.ts/certify.ts by framework, so React/Node/.NET readers can be added without editing 1,000-line functions.
7. **Output contract (H4).** Versioned JSON Schema with a compatibility policy; JUnit/SARIF/check-run annotations for CI gates.
8. **Observability and support (H7, R4, R5).** `--trace`, phase timings, progress, friendly errors, documented exit codes, a one-command repro bundle for "Teslon was wrong" reports.
9. **Documentation (H5, S5).** Limits, supported versions, troubleshooting, report.json reference, `pull_request_target` warning; correct the unbacked claims listed in 5.4.
10. **Test breadth (H6, S4).** A CI scale job on a large public repo, fuzzing, Windows/macOS, partial-clone behaviour, and unit tests for where.ts/impact.ts/dataflow.ts.
