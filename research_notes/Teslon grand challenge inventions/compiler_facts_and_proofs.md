# Compiler facts and proofs: inventions for C1, C2, C3

2026-11-16. Lens: compilers, languages and proof. All code and outputs:
`/tmp/claude-0/-home-user-Orbis/a99ca81c-9750-554d-8faa-4222ad38b407/scratchpad/inventors/compiler/`
(cf.mjs class-file reader, mk.mjs case builder, eqv.mjs I1, suite1.mjs, batch1.mjs; out-*.json results).

Status: complete for this round.

| Invention | Challenge | Status | Headline result |
|---|---|---|---|
| I1 Observation-ledger bytecode equivalence with alpha witnesses | C3 | **proven by experiment (small)** | 43 OrderDesk red-team cases (21 change Java): 0 effect cases called "same" (E07 E09 E18 E19 E44 all CHANGED); the 3 noise cases (local rename, import reorder, CRLF) proven equivalent. 5 of 6 common refactors proven (the private rename needs its witness; extract-local is missed); 4/4 adversarial "refactors" (param rename, field reorder, `\u000a`, rename to a reflected name) refused. Found and fixed an unsoundness that any raw-attribute comparison has. |
| I2 Body/shape linker seal: a ~280-line checker that re-derives non-impact from the class files themselves | C2 (+C1) | **proven by experiment (small, one app)** | 22 compiled red-team cases + 5 adversarial cases: 0 wrong skips after one rule was added (adversarial X3 broke the first version, as designed); 47% of API/job areas proven NOT AFFECTED (156/329); E44 and E07 flagged as start-up changes with no Spring model. |
| I3 Read the program as the framework lowers it (TS emit, Vue's template compiler, Spring AOT) | C1 (+C3, start-up witness) | **partly shown** (Vue and TS: proven on 13 cases; Spring AOT: run on E07/E44 only; Angular compiler not installed) | E08, E98 and 5 more front-end red-team cases CHANGED, 3 noise edits SAME; plain `tsc` emit would wrongly call an Angular DI type change "same"; Spring AOT turns E44 into a build-time witness ("Cannot subclass final class OrderService") and E07 into a precise one (the pre-generated transaction proxy no longer overrides `create`). |
| I4 Value-graph canonical form for bytecode | C3 | idea only | Closes the P6 gap (extract/inline local) by hashing per-method SSA value graphs instead of instruction text. |

---

## I1. Observation-ledger bytecode equivalence, with alpha-renaming witnesses (C3)

### Mechanism
1. Compile B and H with the project's real flags (here `javac -parameters -g`, as spring-boot-starter-parent does).
2. Read every class file with a small independent reader (`cf.mjs`, ~170 lines, no ASM, no javap) and print a
   **canonical text** in which every constant-pool index is replaced by the value it names (so constant-pool order,
   which no program can observe, disappears), and every instruction, switch table and exception range is decoded.
3. Each class-file element is either **kept** or **erased under a named assumption**, from a closed ledger:

| Element | Fate | Assumption / observer |
|---|---|---|
| LineNumberTable, SourceFile | erased | **L**: stack traces are not part of obs_A |
| LocalVariableTable / TypeTable | erased | **V**: only debuggers read local names (Spring 6.1+ no longer does) |
| StackMapTable | erased | **J**: verifier frames, a function of the code for javac output |
| MethodParameters | **kept** | Spring binds `@RequestParam`/`@PathVariable` by it; Jackson creators |
| member order (fields, methods) | **kept** | `getDeclaredFields` order = Jackson JSON key order, JPA DDL column order; Spring reads `@Bean` methods in class-file order (ASM) |
| annotations, flags, Signature, everything else | kept | framework reflection |
| constant-pool order | erased | unobservable by the JVM spec (no assumption) |

4. Verdict per class: SAME-BYTES, SAME-CANON (no assumption), SAME-UNDER{L,V,J}, or CHANGED with the shape/method
   bodies that differ. A pair of programs is EQUIVALENT only if every class is SAME-*; the certificate is the list of
   assumptions used.
5. **Alpha-renaming witness.** A refactor that renames a private method changes many bytes. The producer supplies a
   witness `owner.old=new`; the checker applies it to B (declaration in owner, references in every class, so
   nestmates are covered) and re-checks byte-for-byte canonical equality. It accepts the witness only if: the method
   is private, has no annotations, the class has no `$deserializeLambda$` (serialised lambdas record the impl name),
   `new` is not already declared, and **neither name occurs as a string constant anywhere in the program**
   (reflection by name). A wrong witness can only make the check fail, never pass.

### Why it is new [S]
- Ekstazi's "smart checksum" already hashes bytecode without debug info (Gligoric et al. ISSTA 2015 [S]); trivial
  compiler equivalence (Papadakis 2015) compares compiler output; DALEQ (arXiv 2508.01530, 2025 [S]) normalises
  bytecode into Datalog facts with proofs, for *rebuild* equivalence, and does only label-style renaming.
- Not found: (a) a ledger that ties each erased element to the **observer** that could see it, with the finding
  that two things a normaliser naturally strips are observable in Spring apps: MethodParameters (rename a
  parameter, break an HTTP API) and member order (reorder fields, change the JSON); (b) checker-verified
  alpha-renaming witnesses with reflection side conditions; (c) the published warning below.

### Soundness argument
Claim: if every class is SAME-* under assumption set A, then for every input, P_B and P_H have the same
observable behaviour, given A and given that the JVM and libraries are the same.
Why: the canonical text is an injective function of every kept element (each CP index is replaced by its full
value, recursively; unknown attributes are compared as raw bytes **bound to a digest of the whole constant pool**).
Two classes with equal canonical text therefore differ only in erased elements. The JVM spec gives no way for
running code to read constant-pool order; L, V, J name the only observers of the other erased elements. Renaming:
private methods are reachable only via the class's (and nestmates') own constant pools, which the witness rewrites,
or via reflection by name, which the string-constant side condition excludes (plus assumption L for stack traces).
**Trusted base:** javac (same version on both sides), the JVM spec, cf.mjs (~170 lines) + eqv.mjs (~70 lines),
and assumptions L, V, J. Not trusted: the producer, any reader of source text.

**Unsoundness found and fixed during the experiment.** The first prototype compared unknown attributes as raw bytes.
A local-variable rename (E90) keeps the same constant-pool *index* while the Utf8 *content* at that index changes, so
raw bytes were equal and the tool said "same, no assumption". That verdict was right by luck (the local name is
unobservable), but the same pattern makes any raw-byte comparison unsound for attributes that hold CP indices (e.g.
an annotation whose value string changes in place). Any "normalise and diff" tool must resolve indices or bind raw
bytes to the whole pool.

### How it would fail, and the adversarial tests
- An erased element turns out observable (e.g. an app that returns stack traces in HTTP 500 bodies breaks L). The
  ledger makes this a named, checkable assumption (grep for `printStackTrace` into a response, or a
  `server.error.include-stacktrace` setting) rather than a hidden one.
- Reflection by a name computed at run time (string concatenation) defeats the string side condition. Mitigation:
  refuse renames in classes that call `getDeclaredMethod`/`getMethod` with non-constant arguments, or treat
  them as assumption R.
- Different javac versions on B and H: pin and record the compiler identity in the certificate.

### Experiments run (truth written first)
1. **All 43 OrderDesk red-team cases** (`batch1.mjs`, 80 s total, ~3.5 s per javac run): every case with a real
   effect that touched Java was CHANGED: E03 E04 E07(shape: ACC_FINAL on method) E09(body: `Gold` from another package)
   E18(`iconst_1`->`iconst_2`) E19(`"0.95"`->`"0.90"`) E21 E31 E32 E33 E34 E36 E37 E44(shape: final class) E45(shape:
   transient) E47 E50 E51 E52. **0 effect cases called "same".** The three noise cases E90 (local rename), E92
   (import reorder), E93 (CRLF) were all proven EQUIVALENT. (E61, a Latin-1 source, did not compile under
   `-encoding UTF-8` and needs the build's real encoding; the remaining cases changed no Java.)
2. **Precision/adversarial suite** (`suite1.mjs`):

| Case | Truth | Result |
|---|---|---|
| P1 comment block (line numbers shift) | same | EQUIVALENT under {L} |
| P2 reformat stream chain | same | EQUIVALENT under {L} |
| P3 rename local `sum`->`total` | same | EQUIVALENT under {V,J} |
| P4 rename private helper, with witness | same | EQUIVALENT under {L,J} |
| P4n same edit, no witness | same | CHANGED (miss, expected) |
| P5 imports swapped + unused import | same | EQUIVALENT under {L} |
| P6 introduce a `final` local | same | CHANGED (miss: needs dataflow canonical form) |
| A1 rename `@RequestParam` param `day`->`date` | **differs** (`?day=` now 400) | CHANGED (MethodParameters) |
| A2 swap two entity fields | **differs** (JSON key order) | CHANGED (member order) |
| A3 `// \u000a sum = sum.add(ONE);` | **differs** | CHANGED (`getstatic BigDecimal.ONE`) |
| A4 rename helper to a name present as a string | **differs** (reflection risk) | witness REFUSED |

3. A2's observability was confirmed by running Jackson 2.19.2 (from the fixture's classpath): same getters, fields in
   two orders, gives `{"name":"n","email":"e"}` vs `{"email":"e","name":"n"}` (`jk/Order1.java`).

### Cheapest experiment that kills it
Run it over every commit of 3 real Java repos where both sides compile, and run each repo's tests on every
EQUIVALENT verdict with a mutation of only the erased elements; any test difference kills the ledger entry. The
precision figure to watch is the share of real "refactor" commits proven EQUIVALENT (P6-style edits are the gap;
the next step is a dataflow canonical form: bytecode -> SSA value graph, which makes extract/inline-variable equal).

---

## I2. The body/shape linker seal (C2, with C1 facts)

### Mechanism
A checker K that takes only the two sets of compiled classes and the producer's routing claims, and decides per
area "NOT AFFECTED" or "AFFECTED, because <path>". It reads no source and no producer facts; it re-derives every
edge from the bytes javac wrote (`seal.mjs` + `cf.mjs`, ~280 lines).

1. **Delta, split by who can read it.** Each class splits into its **shape** (flags, supertypes, fields, method
   signatures, annotations, MethodParameters: everything a framework reads at boot without running code) and its
   **bodies** (one per method: code that runs only when invoked). Canonical forms from I1, so comment, import and
   local-name edits are not deltas at all.
2. **Managed** = the class carries a class-level runtime annotation, or extends/implements a library type. This is
   the only "framework knowledge" and it is one structural test, not a reader per framework.
3. **Rule G (global, start-up).** A shape change in a managed class, a body change in a managed class's `<init>` or
   `<clinit>`, or a body change in an annotated method of a managed class that is neither a declared entry nor
   dispatched by an app parameter type, is felt at start-up: every area is AFFECTED. (This is what E44 and E07 need:
   `final` on a proxied bean changes its shape.)
4. **Linker edges.** C -> D when D's name appears anywhere in C's constant pool (instructions, descriptors,
   generic Signatures, annotation values, and string constants equal to D's dotted or slashed name, which covers
   `Class.forName("...")`). Plus CHA: C -> every app subtype of C.
5. **Ambient roots, without a framework model** ("the orphan rule"). A managed class with code that **no app class
   references and no area declares** must be called by the framework (filters, advice, config, SpEL-named beans), so
   it is a root of every area. So is any managed class with a library supertype (the framework can call it on any
   request). Orphans whose every annotated method takes an app type are not ambient: rule 6 covers them.
6. **Type-dispatch edges.** If type T is reached and a managed class X has an annotated method whose *parameters*
   name T, then X is reached (event listeners, message handlers, exception handlers are dispatched by parameter type).
7. Area A is NOT AFFECTED iff no rule-G change exists and closure(entries(A) + ambient) contains no changed class.
   The verdict prints the path, e.g. `OrderResource(entry) -> OrderService -> OrderPlacedEvent -> NotificationService(dispatch)`.

**Certificate** = (hash of B classes, hash of H classes, routing claims R: area -> entry `Class#method`). K needs
nothing else; it recomputes everything, so a lying producer can only cause refusals. This answers wall 5 ("a checker
that shares the producer's eyes"): K's facts are the compiler's bytes, not the producer's graph.

### Why it is new [S]
Class-level static RTS from constant-pool dependencies is STARTS (Legunsen et al. 2016). Shi et al. (OOPSLA 2019)
showed reflection makes it unsafe and proposed string and "border" analyses [S]. DIRTS (ICST 2023) adds DI edges by
modelling Spring, Guice and CDI annotations, one framework at a time [S]. Not found anywhere: the **body/shape
split with "managed shape = start-up"**, the **orphan rule** (the framework's entry points are exactly the managed
classes the app never names), **type-dispatch edges from annotated parameter types**, and packaging the whole as
a small independent **checker over compiler output** for a certificate (de Bruijn style) instead of a selector.

### Soundness argument
Claim: if K says NOT AFFECTED for A, then no code that differs between B and H runs while A is exercised, and the
start-up of the app is unchanged, under these assumptions:
- **JVM linking:** code can name a class only through its constant pool or reflection; javac output is complete.
- **Reflection:** reflective targets are named by a string constant (caught by rule 4), are managed beans the app
  never names (rule 5), or flow as objects whose type is in the closure (Jackson, Bean Validation read the shapes of
  objects they are handed; those types are named in the descriptors and Signatures of the code that hands them over).
- **Frameworks read shapes at boot and run bodies only by calling methods**: constructors, static init and annotated
  methods (rule G) or methods of ambient/dispatched classes.
- **R:** each declared entry method is entered only through its own area.
- **Out of scope here, flagged as CANNOT DECIDE:** any non-class input change (YAML, properties, Liquibase,
  front end), dependency changes, and run-time computed reflection strings.
Trusted base: javac, the JVM spec, cf.mjs + seal.mjs (~280 lines), the assumptions above.

### How it would fail, and the adversarial tests (`suite2.mjs`; truth written first)
| Case | Attack | Result |
|---|---|---|
| X1 | `@EventListener` body in a bean that *is* referenced elsewhere (so not an orphan) | AFFECTED via `OrderPlacedEvent -> NotificationService(dispatch)` |
| X3 | `@Bean Clock` factory body in a `@Configuration` that another class references | **First version: WRONG SKIP.** The bean is injected by the JDK type `Clock`, so no app edge exists. Fixed by rule G's third clause (framework-entered annotated bodies); now AFFECTED (start-up). |
| X4 | class reached only through `Class.forName("com.orderdesk.service.Hidden")` | AFFECTED via the string constant |
| X5 | orphan `@Component` implementing an app interface | AFFECTED (ambient; precise path via CHA exists too) |
| X6 | same impl, but referenced elsewhere (not an orphan) | AFFECTED via `Rule -> HalfUp(subtype)` (CHA) |

Known open holes (each a next adversarial test): bean names in SpEL strings for a *referenced* bean
(`@PreAuthorize("@guard.ok()")` on a bean that is also injected somewhere: rule 5 no longer applies); reflective
names built at run time; AOP pointcuts written as strings that select app methods by pattern (an `@Aspect` is ambient
because it is an orphan, but the advised methods change behaviour by *matching*, which is an edge from the aspect to
the advised class that K does not draw; it is safe only because the aspect body runs in the advised area and the
aspect is ambient); `META-INF/spring.factories` and `services` files (should be read as string sources; not done).

### Experiments run
- **22 red-team cases with compiled Java** (`batch2.mjs`): **0 wrong skips**; 156 of 329 area verdicts NOT AFFECTED
  (47%). E44 (final class) and E07 (final method) are rule G "start-up" verdicts, the class E44 needed. E18 skips 14
  of 15 areas and flags only the stock job. E90/E92/E93 (noise) skip 15 of 15.
- Precision cost of being framework-agnostic: E31 (Jackson serializer), E33 (converter), E36, E37 are 0/15 because
  those classes are ambient (library supertypes). That is correct: they run on every request of their kind.
- Granularity is class level (all four `/api/orders` endpoints go together). Method-level closure from the decoded
  invoke instructions is the obvious next step.

### Cheapest experiment that kills it
Run K on 30 real Spring PRs from jhipster-registry and spring-petclinic with the per-request JaCoCo truth that
Teslon's field kit already produces. Any request whose coverage touches a changed method in an area K certified
kills a rule. Also mutate: for each class, flip one constant in one method body, and check K never certifies an area
whose integration test then fails.

---

## I3. Read the program as the framework lowers it (C1)

### Mechanism
Frameworks hide behaviour from a source reader, but almost every modern framework ships its own compiler that
**lowers the magic into ordinary code**, because it must, for speed or for native images:
- Vue's template compiler turns `<form @submit.prevent="save">` into `onSubmit: withModifiers(_ctx.save, ["prevent"])`;
- Angular's AOT compiler turns templates into `ɵɵlistener`/`ɵɵtextInterpolate` calls and DI into `ɵfac` factories;
- TypeScript's emit decides which imports survive (type-only ones are erased) and, with decorator metadata, what DI sees;
- **Spring AOT** (`SpringApplicationAotProcessor`, shipped in spring-boot.jar) turns the bean graph into Java
  (`new OrderService(args.get(0), ...)`), pre-generates the CGLIB proxies as class files, and writes
  `reflect-config.json`, the framework's own list of every class it will touch reflectively.

So the universal fact source is not a reader per framework but **one reader per lowered language** (JVM bytecode,
JavaScript), applied to the framework's own output. Facts and "nothing changed" verdicts both come from it:
I1/I2 run unchanged on the lowered program; the JS module import list plays the role of the constant pool.

### Why it is new [S]
Spring documents AOT output for GraalVM native images only; the search found no use of it for call graphs or change
impact [S]. For Vue, existing call-graph tools (e.g. vize_croquis) read templates and source, not compiled render
functions [S]; no tool was found that analyses Angular Ivy output for impact [S]. Volar/vue-tsc and Angular's
type-check blocks lower templates for *type checking* [Mem]; using the *runtime* lowering as the fact source for
impact, and as the input to an equivalence checker, was not found.

### Soundness argument
Claim: if the lowered programs of B and H are equal (after I1-style canonicalisation), the running app is the same,
given that the deployed artefact is built by the same framework compiler with the same options. This reduces trust
in "nothing changed" to trust in the framework's compiler, which the app already trusts to run at all. Lowering must
be the framework's real one, with the project's real options; the experiment below shows what goes wrong otherwise.
Trusted base: the framework compilers (javac, tsc, @vue/compiler-dom, Spring AOT), the canonical printers, the
project's build options. Assumption: the AOT run's environment (profiles, properties) is the deployed one; Spring
AOT freezes `@Profile`/`@Conditional` at build time, which C6 must state.

### How it would fail, and the adversarial test
- **Wrong lowering.** A6 (Angular DI): `constructor(private api: ApiA)` -> `ApiB` is a pure type change to plain
  `tsc`, so its emit is identical and "compile and compare" calls it the same: **unsound**, since Angular injects a
  different service. With decorator metadata (the lowering Angular-style DI depends on), the emit differs
  (`design:paramtypes [ApiA]` vs `[ApiB]`). Angular's own compiler would emit `ɵɵinject(ApiB)`. Rule: compare the
  framework's lowering, never a generic one.
- Frameworks that resolve at run time with no AOT mode (classic Spring without AOT, Django, Rails) give no lowered
  form: CANNOT DECIDE, or fall back to I2's rules.
- Lowering that is not injective on behaviour (whitespace condensed by Vue's compiler is equal by Vue's own
  semantics, which is the point; but a custom directive reading raw attributes would break it).

### Experiments run (`suite3.mjs`, `lower.mjs`; Spring AOT in `aot/`)
| Case | Truth | Lowered comparison |
|---|---|---|
| E01 E02 E08 E16 E25 E26 E98 (red team, front end) | differs | all CHANGED; E08 shows `from "app/core/config/api"` -> `"api-v2"`, E98 shows `` `Bearer ${t}` `` -> `` `Bearer  ${t}` `` |
| N1 comment + blank lines in http.ts | same | SAME |
| N2 new exported interface (type only) | same | SAME |
| N3 Vue template attributes reflowed | same | SAME |
| A5 Vue `@submit.prevent` -> `@submit` | differs | CHANGED (render function) |
| A6 Angular DI type change | differs | CHANGED with metadata; **SAME with plain tsc (unsound)** |

Facts from one lowered Vue file (ProductEditView.vue) with a 6-line regex reader: `onSubmit -> save`,
`shows form.name`, imports `vue, vue-router, ../api/products, ../stores/toast`. No Vue-specific reader was written.

**Spring AOT on OrderDesk** (one JVM run, ~8 s): emits 21 app `__BeanDefinitions.java` files with constructor wiring
as plain calls, pre-built `OrderService$$SpringCGLIB$$0.class` (the transactional proxy), and a reflect-config.json
naming every app class it touches (36 `com.orderdesk` entries, generated proxies included).
- **E44** (`final class OrderService`): AOT processing **fails at build time**: `Cannot subclass final class
  com.orderdesk.service.OrderService`. This is a deterministic, offline **start-up witness**, exactly what Teslon
  missed ("8 screens and 3 jobs skipped").
- **E07** (`final` on `create`): AOT succeeds, but I1 on the lowered classes reports `OrderService$$SpringCGLIB$$0`
  CHANGED; javap confirms the B proxy overrides `create(CreateOrderRequest)` and the H proxy does not. The witness is
  precise: "the transactional proxy no longer intercepts create: it runs on the proxy instance with null fields".

### Cheapest experiment that kills it
For 20 real Spring Boot PRs, run AOT at B and H and compare (a) the bean-graph sources, (b) the proxy classes,
(c) reflect-config. Kill condition: a PR whose app behaviour changed in an integration test while all three lowered
outputs plus app classes were I1-equal. For the front end: build Vue/Angular apps with their real CLI at B and H and
compare the emitted chunks module by module (name-mangling must be disabled or canonicalised first).

---

## I4. Value-graph canonical form for bytecode (C3, idea only)

**Mechanism.** Replace I1's instruction text per method with a hash of its **value graph**: symbolically execute the
JVM stack machine per basic block, turning each store/load of a local into an edge from the value's definition
(SSA), so local slot numbers, extra temporaries (P6: `final BigDecimal q = ...`), and the order of independent pure
computations disappear. Effects (calls, field writes, throws, monitor ops) stay as a totally ordered chain; only pure
nodes float. Equality of two graphs is checked by hashing in topological order with effect-chain positions.
**Why new:** DALEQ normalises bytecode facts in Datalog but does not build value graphs [S]; translation validation
uses value graphs inside compilers (Tristan, Govereau, Morrisett, PLDI 2011 [Mem]) but has not been applied to "did
this PR change behaviour" for JVM apps, as far as the search shows. **Soundness:** two methods with equal value graphs
and equal effect chains compute the same results and effects in the same order (standard SSA semantics); the trusted
base is the symbolic executor (~300 lines) plus I1's reader. **Failure:** a node wrongly treated as pure (a call
assumed side-effect free) would let a reordering through, so only JVM primitives, constants, and arithmetic other
than division count as pure (division can throw); every call is an effect. **Cheapest experiment:** P6 and 50
extract/inline-variable refactorings mined from RefactoringMiner on 3 repos; truth = their test suites; success = most
proven equal with zero equal-but-different on 434 gauntlet mutants.

---

## The seven red-team cases, side by side

| Case | Teslon | I1 (compiled-output equivalence) | I2 (seal) | I3 (framework lowering) |
|---|---|---|---|---|
| E07 final method on a proxied bean | silent | CHANGED (shape: method flag) | start-up: all areas | AOT proxy loses `create` override (precise witness) |
| E08 TS import re-pointed | silent | n/a | n/a | CHANGED (emitted import path) |
| E09 Java import swap, same simple name | silent | CHANGED (body: `discount/v2/Gold.FACTOR`) | POST /api/orders via OrderService -> PricingService | n/a |
| E18 `* 1` -> `* 2` on a continuation line | silent | CHANGED (`iconst_1`->`iconst_2`) | only the stock job (14/15 skipped) | n/a |
| E19 `/* gold */ ...0.95` -> `0.90` | silent | CHANGED (`ldc "0.95"`->`"0.90"`) | /api/orders, daily-sales report | n/a |
| E98 `Bearer  ` (two spaces) | silent | n/a | n/a | CHANGED (template literal) |
| E44 final class on a proxied bean | wrong skip of 8 screens + 3 jobs | CHANGED (shape: class flag) | start-up: all areas | **AOT build fails: "Cannot subclass final class"** |

All seven flagged; none needed a rule written for that case.

---

## What I would build first, and why

1. **I1 + I2 as Teslon's new "nothing changed" and skip checker for JVM code (2-3 weeks).** They replace the two
   things that failed: the text-based "only comments/imports changed" shortcut (wrong on E07-E19) and the checker
   that "shares the producer's eyes". Both take only javac output, are ~350 lines together, and were 0-wrong on
   every case here. Ship I1 first: it is pure upside (it only ever turns a "same" into "changed" or proves a "same"
   from bytes), needs nothing but `javac` on the CI runner Teslon already requires, and kills the whole class of
   comment/whitespace/import shortcuts. Then I2 as the certificate kernel, with its assumptions R/L/V/J printed.
2. **Spring AOT as the start-up oracle (1 week).** Running `SpringApplicationAotProcessor` at B and H is one JVM run
   each (~8 s here), offline, deterministic, and it is the only cheap way found to get a *witness* for the start-up
   class (E44) and proxy-semantics changes (E07) without booting a database. Its reflect-config.json is also the
   framework-certified reflective closure to cross-check I2's orphan/ambient rule against: any class it lists that
   I2 neither reaches nor treats as ambient is a bug report against I2.
3. **I3 for the front end next**, using each framework's real compiler with the project's options (A6 shows why).
4. **Then measure** on the jhipster-registry and petclinic PR sets with JaCoCo per-request truth, before claiming any
   rate. The experiments here are on one small app with adversarial cases written by the same author as the checker;
   they show the failure classes are closed, not that the wrong-skip rate is low.

## Prior-art searches used (6 of 12)
Ekstazi smart checksum [S]; DALEQ bytecode equivalence with Datalog proofs, arXiv 2508.01530 [S]; reflection-aware
static RTS (Shi et al. OOPSLA 2019) and DIRTS (ICST 2023) [S]; Spring AOT docs (native images only) [S]; Vue/Angular
compiled-output analysis (none found; vize_croquis reads source) [S].
