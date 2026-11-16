# Open-source landscape for change impact analysis (Teslon launch readiness, 2026-11-16)

STATUS: complete (2026-11-16). Method note: the GitHub REST API and github.com HTML are blocked from this session's proxy (HTTP 403, checked 2026-11-16), so star counts could NOT be read from the API. Last-commit dates and licence files below were read directly with `git clone --depth 1 --filter=blob:none` of each repo on 2026-11-16 (script and raw output: /tmp/claude-0/-home-user-Orbis/a99ca81c-9750-554d-8faa-4222ad38b407/scratchpad/field/oss/meta.tsv). Star counts are given only where a web source showed them, else "n/v" (not verified).

(Sections are appended category by category.)

## Q1. Direct peers: PR / change impact tools (including small repos and 2025-2026 AI "blast radius" tools)

### Takeaway
No open-source peer does what Teslon does (screen + API + job, with a proved SKIP and file:line evidence re-read at head). The closest technical peer is seachicken/inga (Java + Kotlin + TypeScript, Spring and RestTemplate links, real language servers for type resolution). The 2025-2026 crop of AI "blast radius" MCP servers are tree-sitter call graphs for coding agents: useful as idea sources, never as oracles, and the two most-starred ones carry licences (PolyForm Noncommercial, BSL) that block commercial reuse.

### Cited Findings
| Project | Method | Last commit (git, read 2026-11-16) | Licence | Gets right | Stops at | Verdict |
|---|---|---|---|---|---|---|
| [seachicken/inga](https://github.com/seachicken/inga) | Common Lisp core; per-language AST parsers (Java, Kotlin, TypeScript) plus a TypeScript language-server client; Spring plugin reads `@RequestMapping` family, `RestTemplate` calls and Spring properties to link services; a JVM dependency loader resolves types from jars (dirs `analyzer/`, `ast-parser/`, `language-client/`, `plugin/spring/` in the clone); output = entry points reached by changed lines of `git diff --unified=0`; IntelliJ plugin and GitHub Action | 2026-03-28 | MIT | Java+Kotlin+TS in one tool; cross-service links via RestTemplate; type resolution from real jars, not names | No proof of "unaffected"; entry points only (no screens/fields/values); Lisp codebase is hard to adopt; activity slowing (last commit March 2026) | **Borrow the idea** (Kotlin + Spring cross-service model); **use as a weak oracle** for Kotlin/TS entry points |
| [naeemdadi/impact-analysis](https://github.com/naeemdadi/impact-analysis) | GitHub App; deterministic JS/TS dependency graph decides reachability; adapters for Next.js, React Router, Remix, Express, tRPC; module-role policy; "Bounded GPT-5.6 interpretation" writes guidance but "cannot add routes, invent dependencies" (README) | 2026-07-28 | MIT | Same evidence-first philosophy; role policy for shared UI; separates product guidance from technical evidence | Import graph only (file level); no skip proof; LLM in the loop; hosted app (code leaves the runner) | **Borrow the idea** (React/Next/Remix/Express route adapters as a spec checklist; role policy) |
| [bubablue/next-affected](https://github.com/bubablue/next-affected) | Next.js pages affected by changed files via the import graph, tsconfig path aliases, Git range (README) | 2026-11-14 (repo clone from Oct showed 2026-03-18; active again) | MIT | Tiny, focused, Next.js conventions incl. monorepos | File-level imports; no data/API layer; no runtime truth | **Oracle (weak, independent)** for Next.js screen sets; borrow the convention table |
| [seita1996/react-router-endpoint-diff](https://github.com/seita1996/react-router-endpoint-diff) | Diff of React Router route trees between two commits | 2026-04-23 | MIT | Route-tree diff, not file diff | React Router only; no reachability from shared code | **Oracle** for "which routes were added/removed/changed" in a React Router app |
| [Easlkad/impact](https://github.com/Easlkad/impact) | Go: changed functions -> transitive callers with call path -> packages, `net/http` endpoints, goroutine workers, tests; risk + separate confidence score; single CLI, JSON/Markdown (README) | 2026-10-05 | **No LICENSE file at repo root** (cannot be reused) | Very close in spirit to Teslon's CLI for Go; explains every hop | Go only; no skip proof; licence absent = all rights reserved | **Borrow the idea** only (Go endpoint + worker model) |
| [tirth8205/code-review-graph](https://github.com/tirth8205/code-review-graph) | Tree-sitter persistent graph; blast radius = callers, dependents, tests of a change, for AI review ([listing](https://hublens.pages.dev/en/tirth8205-code-review-graph/)) | 2026-11-12 (a directory page said "archived 2026-04-24"; the git history shows commits after that, so the claim is stale or wrong) | MIT | Incremental persistent graph; tests-affected list | Tree-sitter name matching (no types); built for LLM context, no soundness claim | **Borrow the idea** (persistent incremental graph store) |
| [optave/codegraph](https://github.com/optave/codegraph) | MCP server; `diff-impact` = changed functions, callers, blast radius, enriched with git co-change ([listing](https://glama.ai/mcp/servers/optave/ops-codegraph-tool)) | 2026-09-06 | Apache-2.0 | Co-change enrichment (Teslon already has co-change) | Name-based graph | **Ignore** (nothing Teslon lacks) |
| [vk0dev/code-impact-mcp](https://github.com/vk0dev/code-impact-mcp) | TS/JS dependency graph, blast radius, pre-commit gate for agents; created April 2026 ([listing](https://awesome.ecosyste.ms/projects/github.com%2Fvk0dev%2Fcode-impact-mcp)) | 2026-09-13 | MIT | Gate semantics | File graph | **Ignore** |
| [Anandb71/arbor](https://github.com/Anandb71/arbor) | Graph MCP with `analyze_impact` (callers + transitive deps) ([listing](https://glama.ai/mcp/servers/Anandb71/arbor)) | 2026-10-31 | MIT | - | Name-based | **Ignore** |
| [abhigyanpatwari/GitNexus](https://github.com/abhigyanpatwari/GitNexus) | Code knowledge graph with impact queries for agents | 2026-11-15 | **PolyForm Noncommercial** (LICENSE file) | - | Commercial use forbidden | **Ignore (licence blocks)** |
| [depwire/depwire](https://github.com/depwire/depwire) | Dependency graph MCP, blast radius ([listing](https://mcpservers.org/servers/depwire/depwire)) | 2026-11-10 | **Business Source License** | - | Commercial production use restricted until change date | **Ignore (licence blocks)** |

### Inferences
- The 2026 MCP tools validate demand for "blast radius" but compete on agent context, not on proof. None publishes a precision/recall or false-negative figure; Teslon's "never a wrong skip" plus an independent checker is still unoccupied ground.
- inga is the only peer that already reads Kotlin and links Spring services via `RestTemplate`; its design (real parsers + jar-backed type resolution) is exactly the "compiler facts, not names" step Teslon needs.
- Small single-framework tools (next-affected, react-router-endpoint-diff) are valuable precisely because they are independent of Teslon's code: they can be run as differential oracles on React/Next.js PRs once Teslon reads React.

### Gaps
- Star counts for every repo: GitHub API and github.com were blocked (403) from this session; not verified.
- I did not run inga on Teslon's fixtures (no time budget; it needs Docker images for Java and TS analyzers).

## Q2. Monorepo "affected" tooling and test-selection flags: what their model misses

### Takeaway
Every mainstream "affected" tool selects at file or project granularity from declared inputs or the import graph, and every one of them documents a fallback or a human-declared escape hatch. None maps a change to a screen or a field. They are good models for Teslon's *file-to-input* layer (which today classifies files by name and folder) and good weak oracles, but they never prove a skip.

### Cited Findings
| Tool | Model | Last commit | Licence | What it misses for QA | Verdict |
|---|---|---|---|---|---|
| [Nx](https://github.com/nrwl/nx) `affected` | Git changed files -> every task whose declared **inputs** include a changed file; "Nx selects a task when your change touches one of its inputs, not by the task hierarchy"; `--explain` prints why (docs file `astro-docs/.../features/CI Features/affected.mdoc` in the repo) | 2026-11-13 | MIT | Nx 24 needs a hand comment `@nx-depends-on` at the top of each e2e file to say which projects it exercises (`kb/skip-unaffected-e2e-tests.mdoc`): even Nx cannot derive e2e scope; sync generators that change files during a run do not update the selection | **Borrow the idea**: "named inputs" per area + `--explain`; replaces folder-name classification with "who reads this file" |
| [Turborepo](https://github.com/vercel/turborepo) `--affected` | Package graph + task inputs hashing | 2026-11-13 | MIT | Package granularity | **Ignore** (Nx model is richer) |
| [bazel-diff](https://github.com/Tinder/bazel-diff) | Hashes every Bazel target (sources + deps) at two commits, diffs the hashes | 2026-11-15 | BSD-3 (LICENSE text) | Only for Bazel builds; target level | **Borrow the idea**: per-unit content hashes at both commits = exact, cheap "unchanged" proof and the basis of incremental runs |
| [Pants](https://github.com/pantsbuild/pants) `--changed-since --changed-dependents=transitive` | Dependency inference per file | 2026-11-15 | Apache-2.0 | File/target granularity | Ignore |
| [Rush](https://github.com/microsoft/rushstack) / [moon](https://github.com/moonrepo/moon) | Project graph + input globs | 2026-11-12 / 2026-11-13 | MIT / MIT | Project level | Ignore |
| [Jest](https://github.com/jestjs/jest) `--findRelatedTests` | Static import graph (haste map) | 2026-11-11 | MIT | Static imports only | Weak oracle for TS unit-level |
| [Vitest](https://github.com/vitest-dev/vitest) `--changed` / `--since-last-run` | `--changed`: tests whose import graph contains a changed file. `--since-last-run`: **records at run time every file each test loaded, including dynamic imports, mocks, setup and snapshot files**; docs warn it cannot see a file no test loaded last run and mtimes set in the past by checkout (`docs/guide/recipes/affected-tests.md`) | 2026-11-13 | MIT | Unit tests only, no UI | **Oracle**: the recorded per-test file set is a free *runtime* dependency record for TS front ends |
| [Playwright](https://github.com/microsoft/playwright) `--only-changed [ref]` | "Only run test files that have been changed between 'HEAD' and 'ref'" (`docs/src/test-cli-js.md`); the import-graph behaviour is described as a heuristic in an earlier PRIOR-ART source | 2026-11-14 | Apache-2.0 | Spec files and their imports only, not the app code the page renders | Output target (list existing specs that visit affected screens), not an oracle |
| [Chromatic TurboSnap](https://github.com/chromaui/chromatic-cli) | Traces the Storybook bundler's module graph (`preview-stats.json`) from changed git files to story files; result is `bailed` or `traced`; **bails** (re-tests everything) when a change reaches `.storybook/preview.*`, preview-annotation modules ("Their direct importers apply to every story"), configured static dirs, or when `node_modules` is missing in the stats (`node-src/lib/turbosnap/getDependentStoryFiles.ts`, lines 90-122, 236-292) | 2026-11-15 | MIT (CLI) | Component stories only; docs site chromatic.com was not reachable from this session | **Borrow the idea**: an explicit, named "bail" list = Teslon's UNCLEAR-with-reason; global roots (preview, global CSS, static dirs) treated as "every screen" |

### Inferences
- The coordinator's weakness "classifying files by name and folder" is exactly what Nx replaced with declared inputs. Teslon can do better without config: derive "who reads this file" from the build's own facts (package.json `files/main/exports/bin`, Maven resource roots, Dockerfile `COPY`, Vite/Angular config), and fall back to UNCLEAR, never to a folder-name guess. The n8n `SKILL.md` case (a `*.md` read at run time, field_unread_stacks.md K3) is precisely a file that a name rule calls docs and an input rule would catch via `"files": ["skills"]`.
- bazel-diff's content-hash-per-unit and Nx's input hashing point to the fix for full re-parsing: hash every file blob at base and head (git already stores blob SHAs), reuse cached facts for identical blobs, parse only changed blobs plus their reverse-dependency closure.

### Gaps
- Chromatic's public TurboSnap docs page (chromatic.com) could not be fetched (host not allowed); the findings above come from the CLI source instead.

## Q3. Java analysis frameworks: cost to adopt, licence, Spring awareness

### Takeaway
Teslon's Java reader today is the npm `java-parser` CST (packages/core/package.json: `"java-parser": "^3.0.1"`, plus `typescript`, `@angular/compiler`, `@vue/compiler-dom`), i.e. tokens and syntax, not types. The cheapest route to compiler-grade Java (and Kotlin) facts that also gives the checker an independent reader is a javac/kotlinc-plugin index (scip-java, Apache-2.0). Whole-program frameworks (SootUp, WALA, OPAL, Tai-e, Doop) give real call graphs but need compiled bytecode plus the full classpath and Spring modelling of their own; only Doop's JackEE work and CodeQL ship serious Spring models, and CodeQL cannot be used commercially on private code.

### Cited Findings
| Framework | Gives | Spring awareness | Last commit | Licence (read from repo) | Adoption cost | Verdict |
|---|---|---|---|---|---|---|
| [scip-java](https://github.com/sourcegraph/scip-java) | Compiler-emitted symbols, definitions, references for Java and Kotlin (README: "Java and Kotlin indexer for SCIP"); Maven/Gradle integration | None (pure symbols); Spring layer stays Teslon's | 2026-11-16 | Apache-2.0 | Needs a compiling build on the runner (JDK, dependency download); offline only if the runner has a Maven/Gradle cache | **Adopt** (as fact source + independent checker reader) |
| [JavaParser](https://github.com/javaparser/javaparser) + symbol solver | AST + type resolution against source and jars | None | 2026-11-15 | Apache-2.0 or LGPL (user's choice, LICENSE) | Low; JVM process | Borrow / fallback when no build |
| [Spoon](https://github.com/INRIA/spoon) | Typed AST and model of Java source, with classpath | None | 2026-11-14 | CeCILL-C or MIT (both licence files present) | Low-medium; JVM | Alternative to JavaParser; MIT option is clean |
| [Eclipse JDT / jdt.ls](https://github.com/eclipse-jdtls/eclipse.jdt.ls) | Full compiler, bindings, call hierarchy via LSP | Only through Spring Tools (below) | 2026-11-12 | EPL-2.0 | Heavy (Eclipse workspace, Maven/Gradle import) | Use indirectly via Spring Tools |
| [OpenRewrite](https://github.com/openrewrite/rewrite) LST | Type-attributed lossless trees for Java, Kotlin, Maven, Gradle, YAML, properties | Many Spring recipes (author knowledge, n/v) | 2026-11-15 | Root Apache-2.0, **but `rewrite-javascript`, `rewrite-python`, `rewrite-csharp`, `rewrite-go`, `rewrite-android` carry the Moderne Source Available License**, which forbids "Offering products or services whose value derives from the Software" (`rewrite-javascript/LICENSE.md`) | Medium (needs build classpath) | **Borrow** for Java/Maven/Gradle only (Apache modules); **licence blocks** the JS/Python/C#/Go modules for Teslon |
| [SootUp](https://github.com/soot-oss/SootUp) | Jimple IR, CHA/RTA call graphs from bytecode | None built in | 2026-11-13 | LGPL-2.1 | Needs compiled classes + classpath | Ignore pre-launch |
| [WALA](https://github.com/wala/WALA) | IR, pointer analysis, call graphs (Java, JS) | None | 2026-11-16 | EPL-2.0 | Heavy | Ignore |
| [OPAL](https://github.com/opalj/opal) | Bytecode analysis, configurable call graphs | None | 2026-07-02 | BSD-2 | Scala/JVM, heavy | Ignore |
| [Tai-e](https://github.com/pascal-lab/Tai-e) | Pointer analysis, taint, call graphs | Not verified | 2026-10-29 | **LGPL-3.0** (COPYING + COPYING.LESSER) | Heavy | Oracle candidate for call-graph soundness research only |
| [Doop](https://github.com/plast-lab/doop) | Datalog points-to; JackEE extension models Java EE / Spring entry points and beans ([PLDI 2020 JackEE paper](https://dl.acm.org/doi/10.1145/3385412.3386026)) | **Yes** (JackEE) | 2026-10-14 | UPL-style permissive (LICENSE "Version 1 ... permission is hereby granted") | Very heavy (Soufflé, bytecode) | **Borrow the idea** (JackEE's list of Spring entry-point and injection rules as a checklist) |
| [ArchUnit](https://github.com/TNG/ArchUnit) | Bytecode import of classes, dependencies, annotations | Annotation-level only | 2026-11-12 | Apache-2.0 | Low (library) but needs compiled classes | Oracle for class-level dependency edges |
| [jQAssistant Spring plugin](https://github.com/jQAssistant/jqa-spring-plugin) | Neo4j graph of Spring components, injection | Yes | **2023-03-03** (stale) | **GPL-3.0** | Neo4j, stale | **Ignore** (licence + stale) |
| [Joern](https://github.com/joernio/joern) | Code property graph; frontends `javasrc2cpg`, `kotlin2cpg`, `jssrc2cpg`, `pysrc2cpg`, `csharpsrc2cpg`, `gosrc2cpg` and more (repo dir `joern-cli/frontends`) | No Spring model verified | 2026-11-15 | Apache-2.0 | Heavy JVM; not compiler-exact (source frontends with partial type recovery) | **Oracle** (independent multi-language call edges) |
| [CodeQL](https://github.com/github/codeql) | Best-in-class framework models incl. Spring, data flow | Yes | 2026-11-15 | Queries MIT, but the CLI's [terms](https://github.com/github/codeql-cli-binaries) say it "may not be used for any" purpose "in connection with any codebase that is not an Open Source Codebase", apart from academic research | Medium | **Licence blocks** commercial use on private repos: use only as an oracle on open-source benchmark apps, and as a model checklist |
| [Semgrep CE](https://github.com/semgrep/semgrep) / [Opengrep](https://github.com/opengrep/opengrep) | Pattern matching; CE is single-file, cross-file and inter-file taint are Pro only ([Semgrep docs](https://docs.semgrep.dev/semgrep-pro-vs-oss)) | Rules only | 2026-11-10 / 2026-11-13 | LGPL-2.1 (engine); registry rules under the [Semgrep Rules License v1.0](https://github.com/semgrep/semgrep-rules) | Low | Ignore for facts (single-file pattern matching is what Teslon must move away from) |

### Inferences
- "Comparing code by tokens instead of compiler output" is the java-parser CST. scip-java runs inside javac/kotlinc, so it is compiler output by construction; it costs a successful build on the runner. When the build does not compile, Teslon should hold areas as UNCLEAR, which matches its promise.
- None of the free frameworks give type-resolved call graphs *with* Spring awareness out of the box. Spring semantics (beans, proxies, request mappings, events) will remain Teslon's own layer; the gain is that this layer would sit on resolved symbols instead of names.

### Gaps
- Whether Tai-e or OPAL ship any Spring entry-point model was not verified.
- OpenRewrite's Spring recipe coverage and the exact licence of every recipe module were not checked.

## Q4. Spring-specific fact sources

### Takeaway
The Spring Tools language server now has a headless, delta-cached **Spring metamodel index** (beans, injection points, request mappings, AOT processors, bean registrars) and exposes it through an embedded MCP server. It is the only maintained, Spring-team-built source of Spring facts independent of Teslon's code. It is EPL-1.0, so run it as a separate process.

### Cited Findings
- [spring-projects/spring-tools](https://github.com/spring-projects/spring-tools) (last commit 2026-11-13, EPL-1.0) contains `SpringMetamodelIndex.java`, `Bean.java`, `InjectionPoint.java`, `AotProcessorElement.java`, `BeanRegistrarElement.java`, and on-disk caches `IndexCacheOnDisc.java` and `IndexCacheOnDiscDeltaBased.java`; and an embedded MCP server under `headless-services/spring-boot-language-server/.../boot/mcp/` with `RequestMappingMcpTools.java` (tools filtered by project and HTTP method), `ComponentAnalysisMcpTools.java`, `SpringIndexAccess.java`. The README says "The Spring Tools Language Server agent plugin provides Spring-aware MCP tools and skills for Claude Code, GitHub Copilot CLI and Codex".
- jQAssistant Spring plugin: GPL-3.0, last commit 2023-03-03 ([repo](https://github.com/jQAssistant/jqa-spring-plugin)).
- smart-doc (Apache-2.0, last commit 2026-11-15) generates OpenAPI from Java source and Javadoc without running the app ([repo](https://github.com/smart-doc-group/smart-doc)); earlier PRIOR-ART listed it as untested.

### Inferences
- Spring Tools' index can be the **independent checker's** Spring reader: Teslon's engine finds endpoints and beans its own way; the checker asks the Spring team's indexer for the same facts at both commits and refuses a skip when they disagree. That attacks "a checker that shares the engine's readers" directly for Spring.
- Spring Boot Actuator `/mappings` and `/beans` at runtime (both commits, booted in the bench) is the strongest runtime truth for endpoint and bean inventories; it is a lab oracle, not a runner feature.

### Gaps
- I did not run the Spring Tools server headless outside an editor; whether its index can be driven by a plain CLI without an LSP client was not tested.
- Spring AOT output (`target/spring-aot/`) as a fact source was not investigated in this session.

## Q5. Front-end fact sources (React, Next.js, Angular, Vue, Node/NestJS)

### Takeaway
Teslon already depends on the TypeScript compiler (`typescript ^5.5.0`), `@angular/compiler` and `@vue/compiler-dom`. React, Next.js, Express and NestJS readers can be built on the TypeScript **TypeChecker** it already ships, with no new heavy dependency; Next.js and React Router publish their own route models that serve as independent oracles.

### Cited Findings
| Project | Gives | Last commit | Licence | Verdict |
|---|---|---|---|---|
| TypeScript compiler API (already a Teslon dependency, packages/core/package.json) | Program, TypeChecker, symbol resolution across files, JSX | n/a | Apache-2.0 [Mem] | **Adopt more deeply** (TypeChecker for React/Node readers) |
| [ts-morph](https://github.com/dsherret/ts-morph) | Ergonomic wrapper over the TS compiler API | 2026-08-21 | MIT | Optional convenience; not needed |
| [vuejs/language-tools](https://github.com/vuejs/language-tools) (Volar, vue-tsc) | Type-checked SFC templates via virtual TS code | 2026-11-12 | MIT | **Borrow**: vue-tsc's generated TS gives typed template-to-script edges; oracle for Teslon's Vue template reader |
| [angular/angular](https://github.com/angular/angular) compiler-cli / language service | Template type-check (`ngtsc`), component metadata | 2026-11-13 | MIT | Teslon uses `@angular/compiler`; the type-check program is the next step [Mem] |
| Next.js build manifests | `pages-manifest.json`, `app-paths-manifest.json`, `app-path-routes-manifest.json`, `routes-manifest.json` (constants in [next.js](https://github.com/vercel/next.js) `packages/next/src/shared/lib/constants.ts` lines 87-99) | 2026-11-04 (clone) | MIT | **Oracle** for the screen inventory (needs a build; lab only) |
| React Router v7 route config (`routes.ts`) and data routers | Declarative route tree [Mem] | n/v | MIT [Mem] | Read statically; react-router-endpoint-diff as oracle |
| [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) | Resolved import graph (TS paths, webpack aliases), JSON output | 2026-11-12 | MIT | **Oracle** for import closure (independent resolver) |
| [madge](https://github.com/pahen/madge) | Import graph | 2024-08-05 (stale) | MIT | Ignore |
| [knip](https://github.com/webpro-nl/knip) | Entry files and unused files/exports from framework plugins (100+ plugins) [Mem] | 2026-11-13 | ISC | **Borrow the idea**: its plugin list of framework entry points is a ready catalogue of "which config file makes which file live" (answers name-based classification) |
| [skott](https://github.com/antoine-coulon/skott) | Import graph + unused files | 2026-09-11 | MIT (package.json) | Ignore |
| [nestjs/nest](https://github.com/nestjs/nest) | Decorators `@Controller`, `@Get` etc. define endpoints | 2026-11-13 | MIT | Read via TS compiler decorators |

### Inferences
- React + Next + NestJS + Express readers on the TypeChecker remove "no React/Node readers" for the largest market share at the lowest cost; the same Program also provides compiler-resolved symbol identities, replacing token comparison for TS.
- knip's plugin table is the closest existing answer to "which files are live because a config names them", the TS-side cure for folder-name classification.

### Gaps
- React Router CLI route export (`react-router routes --json`) and Angular `ngtsc` programmatic use were not re-verified this session [Mem].

## Q6. Multi-language code intelligence: fastest compiler-grade path for React, Kotlin, Node/NestJS, Python, .NET

### Takeaway
SCIP is the one format with maintained, compiler-backed indexers for every target stack: scip-java (Java, Scala, Kotlin), scip-typescript (TS/JS), scip-python (pyright-based), scip-dotnet (Roslyn, C#/VB). One SCIP reader in Teslon gives definitions and references for all of them, run at base and head. Framework semantics (routes, beans, DI) stay Teslon's job.

### Cited Findings
| Infra | Coverage (from README) | Last commit | Licence | Verdict |
|---|---|---|---|---|
| [SCIP](https://github.com/sourcegraph/scip) (now `scip-code/scip`) | Indexers listed: scip-java (Java, Scala, Kotlin), scip-typescript (TS, JS), rust-analyzer, scip-clang, scip-ruby, scip-python, scip-dotnet (C#, VB), scip-dart, scip-php | 2026-11-10 | Apache-2.0 | **Adopt** the format + reader |
| [scip-typescript](https://github.com/sourcegraph/scip-typescript) | TS/JS via the TS compiler | 2026-11-12 | Apache-2.0 | Adopt (or use the TS API directly) |
| [scip-python](https://github.com/sourcegraph/scip-python) | Python via pyright | 2026-11-11 | MIT | Adopt for Python |
| [scip-dotnet](https://github.com/sourcegraph/scip-dotnet) | C#/VB via Roslyn | 2026-11-11 | Apache-2.0 | Adopt for .NET (later) |
| [Kythe](https://github.com/kythe/kythe) | Cross-language graph; build-integrated | 2026-09-18 | Apache-2.0 | Ignore (heavy, Bazel-centric) |
| [Glean](https://github.com/facebookincubator/Glean) | Fact DB with incremental derivation | 2026-11-15 | BSD | Borrow the idea (facts keyed by unit, incremental) |
| [stack-graphs](https://github.com/github/stack-graphs) | Incremental name resolution without a build | 2025-09-09 (no commits for 14 months) | Apache-2.0 / MIT | Ignore (inactive) |
| [tree-sitter](https://github.com/tree-sitter/tree-sitter) / [ast-grep](https://github.com/ast-grep/ast-grep) | Fast incremental syntax trees / structural rules, many languages | 2026-11-15 / 2026-11-15 | MIT / MIT | Use for **detection and fallback** only (syntax, not types) |
| [Kotlin LSP](https://github.com/Kotlin/kotlin-lsp) | Official JetBrains LSP based on IntelliJ's Kotlin plugin; Gradle and Maven support; "currently in the Alpha state"; repo is a read-only mirror | 2026-11-13 | Apache-2.0 | Oracle candidate for Kotlin; not a pre-launch dependency (alpha) |
| [fwcd/kotlin-language-server](https://github.com/fwcd/kotlin-language-server) | Community Kotlin LSP | 2025-06-02 | MIT | Ignore (superseded) |
| [multilspy](https://github.com/microsoft/multilspy) | Python client that drives many language servers (jdtls, pyright, gopls, etc.) | 2026-10-13 | MIT | Borrow the idea (if LSPs are used as oracles) |
| [Serena](https://github.com/oraios/serena) (SolidLSP) | LSP-driven symbol tools for agents | 2026-11-15 | Per component: SolidLSP MIT, rest per LICENSES (LICENSE file) | Ignore |
| [pyright](https://github.com/microsoft/pyright), [Roslyn](https://github.com/dotnet/roslyn), [gopls](https://github.com/golang/tools) | Compiler-grade analysers | 2026-11-13 / 2026-11-16 / 2026-11-13 | MIT / MIT / BSD-3 | Used through SCIP (Python, .NET); gopls/`go/packages` directly for Go |

### Inferences
- Fastest compiler-grade path per stack: React/Node/NestJS -> TS TypeChecker already in Teslon (weeks); Kotlin -> scip-java's Kotlin support (needs a compiling Gradle/Maven build); Python -> scip-python; .NET -> scip-dotnet; Go -> `golang.org/x/tools/go/packages` + `callgraph` [Mem].
- SCIP indexes are per-document, so they also enable incremental work (re-index only changed documents for TS; Java needs the build) [inference].

### Gaps
- Indexing time of scip-java/scip-typescript on an n8n-sized repo was not measured.

## Q7. Contract and schema diff tools

### Cited Findings
| Tool | Last commit | Licence | Verdict |
|---|---|---|---|
| [oasdiff](https://github.com/oasdiff/oasdiff) (OpenAPI breaking-change checks) | 2026-11-14 | Apache-2.0 | **Adopt** as API-delta oracle + vocabulary |
| [openapi-diff](https://github.com/OpenAPITools/openapi-diff) | 2026-11-14 | Apache-2.0 | Second OpenAPI oracle |
| [Optic](https://github.com/opticdev/optic) | 2025-08-10 (quiet) | MIT | Ignore |
| [pact-jvm](https://github.com/pact-foundation/pact-jvm) | 2026-11-04 | Apache-2.0 | Read pacts as consumer facts when present |
| [Spring Cloud Contract](https://github.com/spring-cloud/spring-cloud-contract) | 2026-07-06 | Apache-2.0 | Read contracts as consumer facts when present |
| [buf](https://github.com/bufbuild/buf) `breaking` | 2026-11-13 | Apache-2.0 | Adopt when gRPC/protobuf is read |
| [graphql-inspector](https://github.com/graphql-hive/graphql-inspector) | 2026-11-13 | MIT | Adopt when GraphQL is read |
| [japicmp](https://github.com/siom79/japicmp) / [revapi](https://github.com/revapi/revapi) | 2026-11-04 / 2025-11-08 | Apache-2.0 / Apache-2.0 | Evidence for dependency bumps (API changed => TEST); a clean report can never prove SKIP (behaviour changes without API change, e.g. the chaos-monkey 405 case in PRIOR-ART) |
| [Atlas](https://github.com/ariga/atlas) | 2026-11-15 | Apache-2.0 (repo; some Atlas features are commercial [Mem]) | Oracle for destructive schema changes |
| [Squawk](https://github.com/sbdchd/squawk) | 2026-11-16 | Apache-2.0 / MIT | Oracle for Postgres locking migrations |
| [pgroll](https://github.com/xataio/pgroll) | 2026-11-02 | Apache-2.0 | Ignore |
| [Liquibase](https://github.com/liquibase/liquibase) `diff` | 2026-11-13 | **FSL-1.1-ALv2** (Functional Source License, LICENSE.txt): not open source until the Apache change date; competing-use restriction | **Flag**: do not embed Liquibase; Teslon's own Liquibase XML reader is the right call |

## Q8. Open test-impact tools as runtime oracles

### Takeaway
Yes: per-test or per-request coverage recorded while running the app's tests is the only independent *runtime* oracle for Teslon's SKIP claims. A SKIP is falsified when any recorded test or request that touches changed code maps to a skipped area.

### Cited Findings
| Tool | Kind | Last commit | Licence | Verdict |
|---|---|---|---|---|
| [teamscale-jacoco-agent](https://github.com/cqse/teamscale-jacoco-agent) ("Teamscale Java Profiler") | JVM agent on JaCoCo, testwise coverage | 2026-11-15 | Apache-2.0 | **Oracle (adopt in the lab)**: per-test / per-request Java coverage |
| [Ekstazi](https://github.com/gliga/ekstazi) | Dynamic class-level RTS ([ISSTA 2015](https://dl.acm.org/doi/10.1145/2771783.2771784)) | 2026-01-30 | Apache-2.0 | Oracle for Java unit level |
| [STARTS](https://github.com/TestingResearchIllinois/starts) | Static class-firewall RTS | 2024-06-30 | MIT-style | Independent static oracle |
| [Drill4J](https://github.com/Drill4J/drill4j) | Java + JS agents, test-to-code mapping | 2024-09-02 (slowing) | Apache-2.0 | Watch only |
| [pytest-testmon](https://github.com/tarpas/pytest-testmon) | Python per-test coverage selection | 2026-11-02 | MIT | Oracle for Python once read |
| [Skippy](https://github.com/Skippy-io/skippy) | JVM TIA (JUnit 5) | 2025-09-17 | Apache-2.0 | Ignore |
| [rtscheck](https://github.com/EngineeringSoftware/rtscheck) | Differential testing of RTS tools | 2022-11-26 | MIT | **Borrow the idea**: compare tools against each other to find unsafe selections |
| Vitest `--since-last-run` | Runtime per-test loaded-files record | 2026-11-13 | MIT | Oracle for TS (see Q2) |
| Microsoft TIA (Azure DevOps) | Closed source [Mem] | - | - | Ignore |

## Q9. Diff and refactoring tooling

| Tool | Last commit | Licence | Verdict |
|---|---|---|---|
| [GumTree](https://github.com/GumTreeDiff/gumtree) | 2026-11-13 | **LGPL-3.0** (run as separate process) | **Borrow/adopt as process**: AST edit scripts so moves/renames/format-only changes are not token deltas |
| [RefactoringMiner](https://github.com/tsantalis/RefactoringMiner) | 2026-11-13 | MIT | **Adopt** (Java, also Python/Kotlin support [Mem]): detects pure refactorings => evidence for "behaviour-preserving" (still needs a checker before SKIP) |
| [difftastic](https://github.com/Wilfred/difftastic) | 2026-11-15 | MIT | Ignore (display tool) |

## Q10. Microservice graph extractors (all already cloned earlier)

| Tool | Last commit | Licence | Verdict |
|---|---|---|---|
| [cloudhubs/prophet](https://github.com/cloudhubs/prophet), [cloudhubs/rad](https://github.com/cloudhubs/rad) | 2023-08-31 / 2021-09-02 | Apache-2.0 / none at root | Ignore (stale research prototypes); RAD's REST-call matching is a reference only |
| [clowee/MicroDepGraph](https://github.com/clowee/MicroDepGraph) | 2021-11-24 | none at root | Ignore |
| [tuhh-softsec/code2DFD](https://github.com/tuhh-softsec/code2DFD) | 2024-10-27 | Apache-2.0 | Oracle: its labelled dataflow diagrams of open microservice apps are external truth for service edges |
| [bakdata/streams-explorer](https://github.com/bakdata/streams-explorer) | 2026-11-11 | MIT | Borrow idea for Kafka topology display |
| [ExpediaGroup/jarviz](https://github.com/ExpediaGroup/jarviz) | 2022-05-16 | Apache-2.0 | Ignore (stale) |
| [ContextMapper/context-map-discovery](https://github.com/ContextMapper/context-map-discovery) | 2024-08-29 | Apache-2.0 | Ignore |

## Q11. Benchmarks and corpora with real changes and known bugs

| Corpus | Content | Last commit | Licence | UI / screen-level truth? |
|---|---|---|---|---|
| [Defects4J](https://github.com/rjust/defects4j) | 854 active bugs from 17 Java libraries (jfreechart, commons-*, gson, jackson, jsoup, mockito, joda-time, closure-compiler) with triggering tests (README table) | 2026-04-07 | MIT-style | **No** (libraries). Truth for method -> failing test |
| [GitBug-Java](https://github.com/gitbugactions/gitbug-java) | Reproducible recent Java bugs (MSR 2024) | 2025-08-19 | MIT | No (mostly libraries) [Mem] |
| [BugsJS](https://github.com/BugsJS/bug-dataset) | JS bugs incl. Express, server-side projects [Mem] | 2019-11-27 | MIT | API-level only |
| [Bears](https://github.com/bears-bugs/bears-benchmark) | Java Maven CI bugs | 2024-03-04 | GPL-3.0 (data use fine; do not embed code) | No |
| [BugSwarm](https://github.com/BugSwarm/bugswarm) | Fail/pass CI pairs, Java and Python | 2026-03-05 | BSD | No |
| [RegMiner](https://github.com/SongXueZhi/RegMiner) | Mined regression bugs (Java) | 2024-11-16 | Apache-2.0 | No; but regressions = "change that broke X" truth |
| [SWE-bench](https://github.com/SWE-bench/SWE-bench) Multimodal | 617 tasks from 17 JS libraries for web UI, diagramming, charts, maps; each has at least one image ([arXiv 2410.03859](https://arxiv.org/html/2410.03859)) | 2026-09-02 | MIT | **Partly**: visual, user-facing behaviour with images (libraries, not apps) |
| [SWE-PolyBench](https://github.com/amazon-science/SWE-PolyBench) | 2,110 tasks, 21 repos: Java 165, JS 1,017, TS 729, Python 199 ([arXiv 2504.08703](https://arxiv.org/html/2504.08703v1)) | 2026-06-16 | MIT | Some front-end repos [Mem] |
| [Multi-SWE-bench](https://github.com/multi-swe-bench/multi-swe-bench) | 7 languages incl. Java and TypeScript; mini (400) and flash (300) subsets (README) | 2025-12-18 | Apache-2.0 | Some TS front ends [Mem] |
| [train-ticket](https://github.com/FudanSELab/train-ticket) + fault-replicate | 41 Spring microservices with UI; 22 replicated industrial faults [Mem] | 2022-11-01 / 2018-12-10 | Apache-2.0 | **Yes** (UI + services), but old Spring |

Inference: only train-ticket's faults and SWE-bench Multimodal give user-visible truth; for screen-level truth on modern stacks Teslon must make its own (mutants + Playwright on real apps: spring-petclinic, jhipster-sample-app, saleor-dashboard, realworld, eShop, opentelemetry-demo).

## Q12. Synthesis: catalogue verdicts, Top 10 adoptions, oracles

### Catalogue verdict summary (by category)
| Category | Adopt | Borrow the idea | Oracle | Ignore / licence-blocked |
|---|---|---|---|---|
| Peers | - | inga, naeemdadi/impact-analysis, Easlkad/impact, code-review-graph | next-affected, react-router-endpoint-diff, inga | optave/codegraph, code-impact-mcp, arbor; **GitNexus (PolyForm NC), depwire (BSL)** |
| Monorepo/test flags | - | Nx inputs + `--explain`, bazel-diff hashing, TurboSnap bail list | Vitest `--since-last-run`, Jest `--findRelatedTests` | Turborepo, Pants, Rush, moon |
| Java frameworks | scip-java | Doop/JackEE rules, OpenRewrite (Java modules) | Joern, ArchUnit, CodeQL (OSS benchmark apps only) | SootUp, WALA, OPAL, Tai-e (pre-launch); **jQAssistant Spring (GPL, stale)**; **OpenRewrite JS/Python/C#/Go (MSAL)** |
| Spring facts | - | - | Spring Tools metamodel index, Actuator `/mappings` `/beans`, smart-doc | - |
| Front end | TS TypeChecker (existing dep), vue-tsc | knip plugin catalogue | dependency-cruiser, Next.js manifests | madge, skott |
| Code intelligence | SCIP format; scip-typescript, scip-python, scip-dotnet (later) | Glean | Kotlin LSP (alpha), Joern | Kythe, stack-graphs (inactive) |
| Contracts/schema | oasdiff | japicmp/revapi (TEST evidence only) | openapi-diff, Squawk, Atlas, buf, graphql-inspector | **Liquibase diff (FSL)**, Optic, pgroll |
| Test impact | - | rtscheck differential method | teamscale-jacoco-agent, Ekstazi, STARTS, pytest-testmon | Skippy, Drill4J (watch) |
| Diff | RefactoringMiner (MIT) | GumTree (LGPL, as process) | - | difftastic |
| Microservices | - | streams-explorer | Code2DFD dataset | prophet, RAD, MicroDepGraph, jarviz, context-map-discovery |

### Top 10 things to adopt before launch (ranked by how much of the five known weaknesses each removes)
Weaknesses: W1 file classification by name/folder; W2 token comparison instead of compiler output; W3 checker shares the engine's readers; W4 no React/Kotlin/Node readers; W5 full re-parse every run (n8n > 20 min).

| # | Adopt | Removes | Effort (estimate, 1 engineer) | Risk removed / licence |
|---|---|---|---|---|
| 1 | **Blob-hash incremental fact cache**: key every file's facts by its git blob SHA (free from `git ls-tree`), reuse for unchanged blobs, parse only changed blobs plus their reverse-dependency closure; persist across runs in the Action cache (ideas: bazel-diff, Nx input hashing, Spring Tools `IndexCacheOnDiscDeltaBased`, Glean) | W5 (fully), helps all | 1-2 weeks | Removes "no answer on large repos" (n8n). Own code, no licence issue |
| 2 | **TypeScript TypeChecker-based readers for React, Next.js, React Router, Express, NestJS** on the already-shipped `typescript` dependency; symbol identity from the checker, not tokens | W4 (React, Node), W2 for TS | 4-6 weeks | Removes the biggest market gap; Apache-2.0 |
| 3 | **scip-java** (Java + Kotlin via javac/kotlinc plugin) as the compiler fact source for symbols and references at base and head; if the build fails, hold as UNCLEAR | W2 (Java), W4 (Kotlin), enables #4 | 4-6 weeks | Removes name-based call edges; Apache-2.0; needs JDK + build cache on runner |
| 4 | **Independent checker on different readers**: certify skips from SCIP/TypeChecker facts (and the Spring Tools index for Spring facts) instead of the engine's own CST readers | W3 | 2-4 weeks after #2/#3 | Removes common-mode failure (same bug in engine and checker). Spring Tools is EPL-1.0: run as separate process |
| 5 | **Build-fact file classification**: "who reads this file" from package.json `files/main/exports/bin`, Maven resources, Dockerfile `COPY`, Vite/Angular config, knip's framework-plugin entry list; unknown => UNCLEAR, never "docs" by extension | W1 | 2 weeks | Removes the n8n `SKILL.md` and saleor deploy-workflow class of wrong "nothing to test" |
| 6 | **oasdiff** at both commits on a generated spec (springdoc/smart-doc at build, or Teslon's own endpoint model exported as OpenAPI) | W2 for API shape, W3 | 1-2 weeks | Independent API-delta oracle with 250+ checks; Apache-2.0 |
| 7 | **RefactoringMiner** (MIT) + **GumTree** (LGPL, separate process) to classify edits as rename/move/extract/format-only | W2 | 2 weeks | Fewer false TEST on refactors; refactor detection is *evidence*, still checked before any SKIP |
| 8 | **scip-python** (MIT) for FastAPI/Django/Flask endpoints | W4 (Python) | 3-4 weeks | Removes the train-ticket/microservices-demo `requirements.txt` wrong-answer class (field_unread_stacks V1, V3) once read |
| 9 | **Gradle model** via scip-java's Gradle integration / Gradle tooling API [Mem] (OpenRewrite `rewrite-gradle` is Apache-2.0) | W1/W4 (Gradle is detected, held today) | 2-3 weeks | Kotlin/Android/most new Spring projects use Gradle |
| 10 | **japicmp** (Apache-2.0) on dependency bumps: binary API diff of old vs new jar, mapped to call sites | W2 for dependency bumps | 1 week | Turns "bump = everything unclear" into "these call sites use changed API" (TEST evidence only; never a SKIP proof) |

### Independent oracles and external truth sets Teslon should test against
**Runtime oracles (falsify SKIP):**
1. Per-request Java coverage with [teamscale-jacoco-agent](https://github.com/cqse/teamscale-jacoco-agent) (Apache-2.0) while Playwright drives every screen at head: any changed line covered by a request from a skipped screen = wrong skip.
2. Browser JS coverage per page (Playwright V8 coverage [Mem]) for Angular/Vue/React screens.
3. Spring Actuator `/mappings` and `/beans` at both commits: endpoint and bean inventories vs Teslon's.
4. Vitest `--since-last-run` dependency records and Ekstazi (Apache-2.0) for unit-level dependencies.
**Static differential oracles (must agree or explain):**
5. Spring Tools metamodel index (beans, injection points, request mappings).
6. dependency-cruiser (import closure), next-affected (Next.js pages), react-router-endpoint-diff (routes), Next.js build manifests.
7. oasdiff / openapi-diff (API deltas); Squawk / Atlas (schema deltas); buf / graphql-inspector when those stacks are read.
8. Joern (multi-language call edges) and, on open-source benchmark apps only, CodeQL (licence forbids private code).
9. inga (Java/Kotlin/TS entry points) as a peer cross-check; disagreements are triage leads, not truth.
**External truth sets:**
10. Defects4J (854 bugs) and GitBug-Java: change -> failing test truth for Java call-graph reachability (library level, no UI).
11. RegMiner regressions and BugSwarm fail/pass pairs: "this change broke that" truth.
12. SWE-PolyBench (Java 165, JS 1,017, TS 729, Python 199) and Multi-SWE-bench (7 languages): real fix PRs with tests for the new React/Node/Python readers.
13. SWE-bench Multimodal (617 visual JS tasks): the only large set with user-visible (image) truth.
14. train-ticket + fault-replicate: the only microservice + UI fault set (old, but screen-level truth is possible).
15. Code2DFD's labelled microservice dataflow models: truth for service-to-service edges.
Method borrowed from [rtscheck](https://github.com/EngineeringSoftware/rtscheck): run Teslon against several of these tools on the same commits and treat every disagreement as a defect candidate.

### Gaps
- Star counts were not verifiable (GitHub API and github.com blocked from this session); all "last commit" dates are verified by git on 2026-11-16.
- Items tagged [Mem] come from the researcher's prior knowledge and were not re-checked this session.
- No adopted tool was run on Teslon's fixtures; effort estimates are judgement, not measurement.
