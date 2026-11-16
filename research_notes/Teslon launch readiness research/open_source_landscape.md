# Open-source landscape for change impact analysis (Teslon launch readiness, 2026-11-16)

STATUS: in progress. Method note: the GitHub REST API and github.com HTML are blocked from this session's proxy (HTTP 403, checked 2026-11-16), so star counts could NOT be read from the API. Last-commit dates and licence files below were read directly with `git clone --depth 1 --filter=blob:none` of each repo on 2026-11-16 (script and raw output: /tmp/claude-0/-home-user-Orbis/a99ca81c-9750-554d-8faa-4222ad38b407/scratchpad/field/oss/meta.tsv). Star counts are given only where a web source showed them, else "n/v" (not verified).

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
