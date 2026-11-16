# Outside the repository, file classification, and scale (inventor: systems lens)

2026-11-16. Challenges C6 (the world outside the repository), C7 (cost proportional to the change), and the safe
classification of files. All prototypes and outputs are in
`/tmp/claude-0/-home-user-Orbis/a99ca81c-9750-554d-8faa-4222ad38b407/scratchpad/inventors/systems/`
(scripts in `bin/`, the Spring resolver in `worldres/`). Teslon itself was not touched.

Tags: [S] = seen in a search-result summary, [Mem] = from memory, not re-checked. Note: the brief named E17 as a
misclassified file, but `exps.mjs` has no E17; the misclassified-file cases used are E01 and E14 (E16 is held by Teslon).

## Summary table

| # | Invention | Challenge | Status | Headline result |
|---|---|---|---|---|
| I1 | **Build-observed inventory with negative probes**: a file is code if the real build read it, looked for it and missed, or listed its folder | File classification (wall 4), C1 | **Proven by experiment** (small) | Flags E01 and E14 as code (Teslon: "deployment", "documentation"). On a 6-change synthetic PR, every INERT verdict was confirmed by a byte-identical rebuild; an added `http.mjs` that no import graph sees was caught by a negative probe and does break the build. |
| I2 | **World-assumption ledger**: settings resolved by the framework's own resolver under the deploy tool's own rendering, canary binding for env vars, bytecode-derived carriers, and skip certificates re-checked at deploy time | C6 | **Proven by experiment** (on the red-team cases) | E56 and E73, both certified wrong skips in Teslon, now report exactly the truth's areas (E56 plus 4 over-approximated areas). A no-op env change gives 0 changed keys. A setting changed outside the repo revokes 5 skips at deploy time. |
| I3 | **Change-proportional facts**: local facts cached by git blob SHA, resolution facts invalidated by the paths they probed, one `git cat-file --batch` reader, and an equality oracle | C7 | **Proven by experiment** on n8n | n8n 4-file PR (Teslon: killed at 1,200 s): **0.85 s warm, 4 blob reads**; cold full index 11.6 s. Incremental == from-scratch on 15/15 real commit pairs; removing the probe rule breaks equality on a shadowing file. |
| I4 | **Observed key lookups** through language preloads (a Node `process.env` Proxy, a JVM agent on `System.getenv`, a Python `os.environ` wrapper) | C6 where no framework resolver exists | **Idea, partly shown** | The naive Node version works but over-reports: copying the environment to a child process "reads" all 246 names. It needs to tell enumeration apart from named lookup. |

---

## I1. Build-observed inventory with negative probes

### Mechanism
1. Once per base commit (and cached by tree hash), run the project's **real** build commands from a clean checkout
   under `strace -f -y` (`bin/observe.py`): the frontend build, the backend build, `docker build`, and the app's start-up
   if it can start. Trace `open*`, `stat*`, `access`, `readlink*`, `execve`, `getdents64` and `chdir`.
2. Keep only paths inside the repository and record three sets:
   - **read**: opened, stat'ed or executed successfully;
   - **probe**: looked up and not found (ENOENT/ENOTDIR). This is a **negative dependency**: creating that file changes the build;
   - **listed**: folders whose entries were enumerated. This is a **glob dependency**: adding a file there can change the build.
3. Classify each changed path of the PR (`bin/classify.py`), never by name:
   - **CODE** if it is in *read*, in *probe*, or (when added) inside a *listed* folder of any traced step;
   - **INERT** only if no traced step saw it in any way **and every traced step succeeded**, and the path is not
     packed into a shipped artifact (a jar, `dist/` or image layer listing);
   - otherwise **CANNOT DECIDE**, naming the failed step.
4. Optional exact backstop for an INERT verdict: rebuild with only the inert files changed, and require
   byte-identical artifacts. This is trivial compiler equivalence (Papadakis et al. 2015 [Mem]) lifted from mutants to files.

### Why it is new
- Syscall-level file dependencies for **test selection** exist. RTSLinux (Celik et al. 2017) intercepts system calls
  to get per-test file dependencies, and ProST uses kernel probes [S]. Build engines track observed reads and
  **absent-path probes** for cache correctness: BuildXL reruns a step if a file it probed later appears [S]. Fabricate,
  memoize and Rattle trace builds [Mem].
- What has not been shipped, as far as these searches show: using the build's observed-access set,
  **including absent probes and listings**, to replace name/folder rules when deciding whether a changed repository file
  can affect the running app, with a fail-closed rule for failed builds and an artifact-equality backstop. The point is
  not tracing itself. The point is that classification becomes a **fact of the build**, which removes wall 4's whole
  class of errors (`requirements.txt`, `charts/`, `Notice.vue`, `security.ts`).

### Soundness argument
Claim: if a changed file is classified INERT, then the artifacts of the traced steps are unchanged by it.
Assumptions:
- (A1) The traced commands are the ones that produce the deployed artifacts, with caches disabled.
- (A2) Every tool's output is a deterministic function of the bytes it read, the outcome of its probes and its folder
  listings, plus things outside the repository (which I2 covers).
- (A3) The running system sees the repository only through those artifacts: it does not mount the source tree.
- (A4) strace sees every access. It cannot see accesses done by a daemon (docker build's context is sent to dockerd)
  or through mmap of an already-open folder; such steps need their own inventory, here the build context after `.dockerignore`.

Under A1-A3, a file that was not read, not probed and not in a listed folder cannot influence any output byte.
Hence the artifacts, and therefore the behaviour, are unchanged. The CODE direction needs no assumption: it only
over-approximates.

### How it would fail, and the test
- **Lazy run-time reads** (a template read only when a page is first opened, a file read only under one profile) are
  missed by a build-plus-start trace. They are covered by A3 only if the file is not shipped. If it is shipped, it is
  in the artifact listing and therefore CODE. Test: put a runtime-read file under `src/main/resources` and check that the
  jar listing marks it CODE.
- **Non-hermetic builds** (network fetches, time stamps) break A2. Test: build the base twice and compare artifacts.
  Here the Vite `dist/` hash was identical across a traced run and three fresh rebuilds (`f0f79115...`).
- **Failed builds**: the OrderDesk fixture does not type-check at base (TS2345 in a form component). The inventory
  still proves CODE for what was read, but INERT is refused for the whole repository. That is the correct, fail-closed outcome.
- **Builds that write into the source tree**: `vue-tsc -b` writes `.js` files beside the `.ts` sources, and a second
  Vite build then resolves `./http` to the emitted `http.js`. The trace shows this; an analysis of the source alone would not.

### Experiment (run)
ShopFlow frontend (`npm run build` = `vue-tsc -b && vite build`), traced in 12.5 s: 85 files read, 80 probes, 12 folders listed.

| Change | Verdict | Rebuild check (fresh worktree, hash of `dist/`) |
|---|---|---|
| E14 `components/Notice.vue` (Teslon: documentation, silent) | CODE, read | dist changes (6245...) |
| README.md, new docs/notes.md | INERT | byte-identical to base |
| new `src/api/http.mjs` | CODE, negative probe (Vite tries `.mjs` before `.ts`) | **build fails**: the new file shadows `http.ts` |
| new `frontend/.postcssrc.json` | CODE, negative probe | identical (`{}` config); a safe over-approximation |
| new `src/views/Unused.vue` | CODE, listed folder (vue-tsc globs `src/**`) | not rebuilt |
| E01 OrderDesk `dashboard/charts/sales-chart.ts` (Teslon: deployment, certified wrong skip) | CODE, read by `ng build` (traced in 19 s) | n/a (the base does not compile) |

Commands: `bin/observe.py <repo> inv.json -- <build cmd>`, `bin/classify.py <repo> <base> <head> inv.json`, `bin/buildat.sh`.

### Cheapest experiment that would kill it
Run I1 on the 7 field repositories and all 60 red-team PRs. For every INERT verdict, rebuild and compare artifacts.
One INERT file whose rebuild differs kills the soundness claim; A1-A4 then say which assumption was wrong.
The cost is one traced build per base commit (12-20 s here). Rebuilds are only needed for the falsification run, not in production.

---

## I2. World-assumption ledger

### Mechanism
1. **Render the deployment with the deploy tool itself.** `docker compose config --format json` handles `.env`,
   interpolation, `extends` and profiles; the same applies to `helm template`, `kustomize build` and `kubectl get -o json`.
   Map compose services to modules by build context, then by image name, then by service name. If no mapping is
   found, ask one question ("Which service runs module X?").
2. **Resolve every key with the framework's own resolver**, at base and at head, under the rendered environment
   (`worldres/ResolveKeys.java`, 40 lines around Spring Boot's `SystemEnvironmentPropertySource`,
   `YamlPropertySourceLoader` and `ConfigurationPropertySources.attach`). Relaxed binding and `${...}` placeholders are
   executed by the code that runs in production, not modelled. A change is a key whose **effective value** differs.
   The key set is every key in the config files plus every key named by code (`@Value`, `@ConditionalOnProperty`,
   `@ConfigurationProperties` prefix plus record components, `getProperty("...")`). A non-literal `getProperty(x)`
   becomes a question.
3. **Canary binding**: set each changed environment variable to a sentinel and resolve again. The keys whose value
   becomes the sentinel are exactly the keys it binds, as the framework sees it. A variable that binds nothing becomes
   one question: "env LOG_FORMAT changed for billing-service and no known key binds it. Which code reads it?"
4. **Carriers of framework keys, from the framework's bytecode.** The metadata in `spring-boot-autoconfigure.jar` maps
   `spring.mail.host` to `MailProperties`. `javap` over that package finds `JavaMailSenderImpl mailSender(MailProperties, ...)`,
   and its interface `JavaMailSender` is what application code injects. Readers lead to areas through a reverse
   type-reference closure, including interface-to-implementation hops for dependency injection. **If no application
   class names a carrier, the key affects all areas of the service** (fail closed).
5. **Deploy-time discharge.** For every key that any area can read, the ledger stores a SHA-256 of its effective value
   at head. At deploy time `bin/deploycheck.py` resolves those keys again with the same resolver, under the environment
   the deployment really provides (rendered compose or Helm, or the running pod's env). It revokes every skip whose
   fingerprint differs and names the key. This covers settings in other repositories, Kubernetes ConfigMaps and
   config servers without modelling them: the analysis does not need to know them, it only needs to notice that they differ.

### Why it is new
- Configuration-aware selection exists. uRTS (ICSE 2023) selects regular tests and configuration tests from code and
  configuration dependencies collected at run time [S]. Ctest (OSDI 2020) runs tests against production configuration
  values before deployment [S]. MICROSCOPE (ICSE 2025) encodes code, configuration files and frameworks as Datalog rules
  to find affected microservice interfaces [S]. Pact's `can-i-deploy` checks contract verification against what is
  deployed [Mem]. Actuator `/env` gives a runtime snapshot [S].
- What these searches found no instance of:
  - (a) diffing **effective values** computed by the framework's own binder under the deploy tool's own rendering,
    instead of modelling binding rules (MICROSCOPE models them);
  - (b) **canary binding** to tie an environment variable to keys without knowing the binding rules;
  - (c) deriving framework-key carriers from the framework's compiled `@Bean` signatures;
  - (d) a static skip certificate that carries **world fingerprints** and is revoked at deploy time.

  The combination makes C6's "assumption checked automatically at deploy time" a concrete, small checker.

### Soundness argument
Claim: an area marked not affected by configuration is not affected under the deployed environment, if the deploy check passes.
Assumptions:
- (B1) Every configuration read by the area goes through the framework's environment (keys found literally, or questions raised).
- (B2) The resolver used is the deployed framework's resolver, at the same version.
- (B3) The deploy check sees the deployment's real environment.
- (B4) Reader-to-area reachability over-approximates, through the type-reference closure plus the all-areas fallback.

Under B1-B3, equal fingerprints for every key an area can read mean the area receives identical configuration in the
analysed world and the deployed world; code equivalence is then I1's or the code analysis's job. The fail-closed
fallbacks (all areas, a question) cover what B4 cannot see.

### How it would fail, and the test
- A **reader the key scan does not see**: `@Value` built from a constant (`"${" + KEY + "}"`), Kotlin, `Environment`
  passed to a library, or `@ConfigurationProperties` on a `@Bean` method. Test: add each shape to the red-team set.
  Mitigation: I4's observed lookups, or treat any unexplained changed key as a question (done).
- **Profiles**: the prototype loads `application.yml` and `application.properties` but not profile files or
  `spring.config.import`. Test: E-case with `application-prod.yml`. Fix: run Boot's `ConfigDataEnvironment` (start an
  empty `SpringApplication` with `web=NONE` and no sources) instead of loading files by hand.
- **Falsification found during the run**: the first version derived carriers for `spring.datasource.url`
  (HikariDataSource, DataSource) but found no application class naming them, because JPA uses them indirectly. It
  therefore listed *no* affected areas, an unsound empty set. It was fixed to fail closed: changing `SPRING_DATASOURCE_URL`
  in compose now reports `*all areas of billing-service`.

### Experiment (run)

| Case | Teslon | Ledger |
|---|---|---|
| E56: compose adds `BILLING_TAX_RATE: "0.07"`, `BILLING_PROVIDER: fake` | certified wrong skip of `job:OrderPlacedConsumer.onOrderPlaced` | `billing.tax-rate` 0.19 -> 0.07 and `billing.provider` stripe -> fake (the canary shows each variable's binding); affected: `job:OrderPlacedConsumer.onOrderPlaced` (the truth), plus `OrderCancelledConsumer` and 3 `InvoiceController` routes; 0 questions |
| E73: `spring.mail.host: ${orderdesk.smtp-host}`, value changes | 2 certified wrong skips | `spring.mail.host` changes through the placeholder, carried by `JavaMailSender`; affected = `job:NotificationService.onOrderPlaced`, `job:StockAlertJob.alert` (exactly the truth); 0 questions |
| Negative control: compose adds `BILLING_TAX_RATE: "0.19"` (= the YAML default) and `LOG_FORMAT: json` | n/a | 0 changed keys, nothing affected; 1 question (LOG_FORMAT) |
| `SPRING_DATASOURCE_URL` host changes | n/a | all areas of billing-service (after the fix) |
| README-only PR, then deployed with `BILLING_TAX_RATE=0.07` set outside the repository | would skip billing | deploy check: 9 assumptions; a deployment equal to the repository passes 9/9; the production environment fails 1/9 and revokes the skips of the 5 billing areas, naming the key and value |

Cost: 2-4 JVM starts of about 0.5 s each per module.
Commands: `bin/worlddiff.py <repo> <base> <head> <module>`, `bin/deploycheck.py ledger.json <repo> env-file`.

### Cheapest experiment that would kill it
Write 30 more configuration-shaped red-team PRs across profiles, constant-built keys, Kotlin, `@Bean`-level
`@ConfigurationProperties`, K8s `envFrom`, and Helm values. For each one, write down the truth before running.
Any wrong "not affected" with no question raised kills B1 as stated.

---

## I3. Change-proportional facts: blob-keyed local facts plus probe-keyed resolution

### Mechanism
1. Split every fact into a **local fact**, a pure function of one file's bytes (here: import specifiers; for Java:
   declared members, annotations, referenced names), and a **resolution fact** (specifier to file, name to declaration),
   which depends on which paths exist.
2. Cache local facts by **git blob SHA**, forever, across branches, repositories and runs. Read all blobs through
   **one** `git cat-file --batch` process.
3. Each resolution records the **ordered list of candidate paths it probed**. An index from probed path to resolution
   says exactly which resolutions a PR's added or deleted paths can change. This is I1's negative dependency, reused for
   incrementality. Workspace-level inputs (`package.json` names, `tsconfig` paths) are fingerprinted, and any change to
   them forces a full rebuild of resolution.
4. Update the reverse index by delta. The PR query is a reverse closure from the changed files.
5. **Equality oracle**: in CI, on a sample of PRs (or nightly), compare the incremental state with a from-scratch
   computation. On a mismatch, fall back to from-scratch and file a bug. That turns "the cache is sound" into a claim
   checked continuously.
6. Next step, not built: keep the state in an on-disk key-value store keyed by path, so that loading is also
   proportional. Today a 31 MB pickle loads in 0.5 s.

### Why it is new
- Content-hash caching is standard: Bazel and Nx input hashing, bazel-diff, linters' file-hash caches [S][Mem].
  BuildXL tracks absent probes for build steps [S].
- The search found no analysis cache that invalidates **resolution facts by the absent paths they probed** [S, negative
  result]. The run below shows that without this a blob-hash cache is **unsound**: the readiness report's own proposal,
  "cache facts by blob SHA", silently produces a stale graph when a PR adds a shadowing file. Pairing it with a
  continuously checked equality oracle is also, as far as I found, not shipped in impact-analysis tools.

### Soundness argument
Claim: incremental(base -> head) = full(head).
Assumptions:
- (C1) Local facts depend only on blob bytes (true by construction: the function is given only the bytes).
- (C2) A resolution depends only on the existence of its probed candidates, in order, and on the fingerprinted workspace inputs.
- (C3) diff-tree reports every added, deleted and modified path.

A resolution whose candidates did not change existence returns the same first-existing candidate, so it is unchanged.
All others are recomputed. The equality oracle tests C2 empirically for each resolver (the Node, TypeScript `paths`,
Java package and Python import rules each need their own probe list).

### How it would fail, and the test
- A resolver that depends on something other than probed paths: `tsconfig` `paths`, `package.json` `exports` maps,
  case-insensitive file systems, or symlinks. Test: PRs that edit `tsconfig.json`/`exports`; the oracle must flag any
  miss. The prototype forces a full rebuild when `package.json` names change; `tsconfig` is not yet fingerprinted.
- **Measured falsification**: a synthetic commit adds `endpoints.ts` next to `endpoints/index.ts`, which is imported
  as `./endpoints`. With probe invalidation, 1 resolution is recomputed and the result is EQUAL. With the rule removed,
  the result is **EQUAL=False**.

### Experiment (run) on n8n (34,833 files)
- Teslon on the 4-file PR b70e354d: killed at 1,200 s after 45,032 `git show` processes.
  One `git show` costs about 3.3 ms here, so the spawning alone is about 150 s.
- Prototype (`bin/factcache.py`):
  - cold full index: **11.6 s**, 26,954 blob reads, 149 MB RSS;
  - warm PR query: **0.85 s wall** (0.52 s of it loading the cache), **4 blob reads**, reverse closure of 63 files.
- Equality: **15/15** consecutive real commit pairs EQUAL (3-135 changed paths; incremental 51-270 ms against 9-11 s from scratch).
- Limits: the fact model is JS/TS import edges only (relative, `@/` alias, workspace packages). It is a cost and
  soundness demonstrator for Teslon's own fact pipeline, not a replacement for it. Train-ticket was not re-run.

### Cheapest experiment that would kill it
Run the oracle over all 39 n8n pairs plus 200 jhipster and train-ticket pairs, with a Java resolver. One mismatch
that the probe or fingerprint rules do not explain kills C2 for that resolver.

---

## I4. Observed key lookups through language preloads (idea, partly shown)

Mechanism: during the traced start-up and the test run, record which environment and property **names** the process
looks up (never values), using:
- a Node `--require` preload that replaces `process.env` with a Proxy;
- a JVM agent that wraps `System.getenv(String)` and the map `System.getenv()` returns;
- a Python `sitecustomize` that wraps `os.environ`.

Inside a framework-agnostic I2, a changed variable that is never looked up by name would be inert for that process.

Shown: `bin/envtrace.cjs` on the ShopFlow Vite build records 246 names. **Failure found:** most of them come from
copying the whole environment to child processes (each copy "gets" every key), so naive get-tracing over-reports.
A working version must record enumeration separately: "the environment was enumerated by X". After an enumeration the
result degrades to "all keys" for that process, and tracing must continue in the child.
Prior art: uRTS and Ctest instrument configuration APIs (Hadoop `Configuration.get`) [S]. Doing it at the language
environment layer, with no framework knowledge, is the new part. It is not yet proven.

---

## What I would build first, and why

1. **I1, the build-observed inventory, inside Teslon's file classifier**, replacing `kinds.ts` name and folder rules
   and the line-prefix filters for the "is this code?" question. It removes the whole class of wall-4 errors
   (E01, E02, E03, E14, the `requirements.txt` case) with one mechanism that knows no framework. It costs one traced
   build per base commit, cached by tree hash, which a customer's CI already runs. It also yields negative
   dependencies for free, which I3 needs. Ship it with the fail-closed rule: a failed build means no INERT verdicts.
2. **I3's two-level cache with the equality oracle**, because the launch-readiness blocker "n8n gives no answer" is
   binary, and the measured 0.85 s against more than 1,200 s shows the cost structure is the problem, not the
   analysis. Port Teslon's per-file readers to "local facts by blob SHA" first (the largest win), then add probe-keyed resolution.
3. **I2's ledger**, starting with the deploy-time check. It is the smallest component (about 40 lines plus the
   resolver) and the only one that covers settings living in other repositories and clusters. Then replace Teslon's
   hand-written setting model with the framework-resolver diff, which fixes E56 and E73 without new rules, and add
   Boot's real `ConfigDataEnvironment` for profiles.

Sources consulted [S]:
- [BuildXL sandboxing spec](https://github.com/microsoft/BuildXL/blob/Public-LKG-buildxl.0.1.0-20190719.7/Documentation/Specs/Sandboxing.md)
- [RTSLinux slides (Celik et al.)](https://users.ece.utexas.edu/~gligoric/slides/CelikETAL17RTSLinux.pdf)
- [uRTS, ICSE 2023](https://conf.researchr.org/details/icse-2023/icse-2023-technical-track/59/Test-Selection-for-Unified-Regression-Testing)
- [Ctest, OSDI 2020](https://www.usenix.org/conference/osdi20/presentation/sun)
- [MICROSCOPE, ICSE 2025](https://qingkaishi.github.io/public_pdfs/ICSE25.pdf)
- [Spring relaxed binding wiki](https://github-redirect.dependabot.com/spring-projects/spring-boot/wiki/Relaxed-Binding-2.0)
- [Multi-language RTS in CI (TUM)](https://mediatum.ub.tum.de/doc/1656311/document.pdf)
