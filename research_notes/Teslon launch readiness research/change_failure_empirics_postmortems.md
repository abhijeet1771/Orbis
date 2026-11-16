# Which changes cause production failures and escaped regressions, mapped onto Teslon's change atlas

Status: complete 2026-11-16. Searches: 26 web searches; direct fetches of sre.google and blog.acolyer.org failed (hosts not reachable), so most figures come from search-result quotations of primary sources. Tags: [S] verified in source fetched this session; [Sec] secondary source / search snippet; [Mem] from memory of the paper, not re-verified this session.

## 1. Empirical studies of failure causes by change type

### Takeaway
Across a decade of studies the same picture holds: most production failures are triggered by a change, and roughly half of change-triggered outages at large operators come from configuration and data pushes rather than code; among code faults, mishandled error paths dominate the catastrophic ones. Teslon models code and in-repo config well, but the most damaging trigger class in recent postmortems (runtime data/config pushed outside the repo, plus error-handling paths for bad input) is largely outside what a two-commit static reader sees.

### Cited Findings
Source-access note: in this session scholarly hosts and most blogs (sre.google, blog.acolyer.org) did not resolve, so paper figures come from web-search snippets of the paper PDFs, abstracts or reviews [Sec], or from memory of the paper [Mem]. Nothing below is tagged [S] unless the primary page text was seen in a search snippet quoting the primary source.

**Change as the trigger (Google)**
- "About 70% of outages are due to changes in a live system" (SRE book, 2016, intro; a Google slide deck attributes it to internal data 2011-2018) [Sec] — [O'Reilly, Tenets of SRE, 2016](https://oreilly.com/ideas/tenets-of-sre); [Google research PDF](https://storage.googleapis.com/gweb-research2023-media/pubtools/7800.pdf)
- SRE Workbook (2018) postmortem analysis of outage triggers: binary pushes 37%, configuration pushes 31% (then user-behaviour change, processing pipeline, service-provider change, capacity, hardware in single digits) [Sec; the 37/31 figures are from a search snippet; the smaller categories are Mem] — [SRE Workbook, Appendix C "Results of Postmortem Analysis", 2018](https://sre.google/workbook/postmortem-analysis/) (host blocked here; figure via [KodeKloud notes](https://notes.kodekloud.com/docs/Fundamentals-of-SRE/Managing-Complexity-Risk-and-Toil/Change-Management-for-Reliability/page))
- Inference for Teslon: config pushes are nearly as frequent a trigger as binary pushes at Google, but most of those config pushes are runtime configuration systems, not YAML in the app repo.

**Configuration errors**
- Yin et al., SOSP 2011: 546 real misconfigurations (309 from a commercial storage system at thousands of customers, 237 from CentOS, MySQL, Apache, OpenLDAP); "misconfigurations are among the dominant causes of system failures" [Sec] — [NetApp ATG publication page, 2011](https://www.netapp.com/atg/publications/publications-an-empirical-study-on-configuration-errors-in-commercial-and-open-source-systems-20115823). The often-quoted figures (misconfiguration = 27% of customer-support cases and about 31% of high-severity cases in the commercial system; 70-85% of misconfigurations are wrong parameter values; a notable share cause hangs, crashes or severe performance loss) are [Mem], NOT verified this session; one search noted a 27% figure in the slides refers to a different breakdown — treat these as unverified — [slides, sambuz](https://www.sambuz.com/doc/an-empirical-study-on-configuration-errors-in-commercial-presentation-739808)
- Xu et al., SOSP 2013 ("Do not blame users for misconfigurations"): many misconfigurations are caused by software that silently ignores or misinterprets settings; the paper reports a large share of parameters undocumented or unchecked [Mem; PDF exists] — [Xu et al. 2013 PDF](https://www.eecg.utoronto.ca/~yuan/papers/sosp13-misconfig.pdf)
- Tang et al. (Facebook), SOSP 2015 "Holistic Configuration Management": config is changed thousands of times per day; config changes outnumber code changes by orders of magnitude; ~89% of raw-config changes made by automation; ~50% of config updates touch one or two lines; ~8.7% touch more than 100 lines [Sec, from summaries] — [paper PDF mirror](https://web.eecs.utk.edu/~qcao1/cs560/papers/holistic.pdf); [Murat Demirbas review 2016](https://muratbuffalo.blogspot.it/2016/02/holistic-configuration-management-at.html). The paper also classifies config-caused incidents into (I) common errors such as typos, (II) subtle errors such as load-dependent ones, (III) valid config changes that expose latent code bugs [Mem]. The SEV percentage attributed to config could NOT be verified this session.
- Tang et al. also found that small changes dominate: half of config updates are one or two lines, which matches the "trivial-looking change" theme below [Sec].
- Rethinking misconfigurations, 2024 literature analysis (arXiv 2412.11121) revisits the area [Sec, existence only] — [arXiv 2024](https://arxiv.org/pdf/2412.11121)

**Cloud outages from public reports**
- Gunawi et al., SoCC 2016 ("Why Does the Cloud Stop Computing?"): 597 unplanned outages at 32 services, 2009-2015, from 1,247 news and postmortem reports; among outages with a stated root cause the top causes are UPGRADE, NETWORK and BUGS, then CONFIG and LOAD; only 40% of reports reveal a root cause, 24% a fix [Sec] — [paper PDF, Iowa State](https://www.ece.iastate.edu/%7Emai/docs/papers/2016_SoCC_COS.pdf); [Demirbas review 2016](https://muratbuffalo.blogspot.com/2016/11/why-does-cloud-stop-computing-lessons.html)
- Liu et al., HotOS 2019 ("What bugs cause production cloud incidents?", Microsoft Azure, 112 high-severity incidents): software bugs were the largest share, with data-format and timeout/fault-handling bugs prominent; the paper highlights that many incidents arise from cross-component data-format mismatches and from bugs in fault-handling code [Mem; no page fetched] — gap for exact numbers.
- Ghosh et al., SoCC 2022 ("How to Fight Production Incidents?", Microsoft, best paper): about 40% of incidents caused by code or configuration bugs, and ~80% of those were mitigated without a code/config fix (rollback, restart, flag flip); other categories include deployment delay 10.5%, manual effort 9.2%, external dependency 7.2% [Sec, from Microsoft Research summary and talk slides] — [Microsoft Research page, 2022](https://www.microsoft.com/en-us/research/?p=881646); [talk slides, Satarin 2023](https://asatarin.github.io/talks/2023-01-how-to-fight-incidents)
- Dogga et al., USENIX ATC 2023 (AutoARTS): 2,000+ Azure incidents, a taxonomy of 346 distinct root-cause categories [Sec] — [USENIX ATC 2023](https://www.usenix.org/conference/atc23/presentation/dogga)

**Error-handling code**
- Yuan et al., OSDI 2014: 198 user-reported failures in Cassandra, HBase, HDFS, Hadoop MapReduce, Redis; of 48 catastrophic failures, 92% came from incorrect handling of explicitly signalled non-fatal errors; 35% from three trivial patterns (empty handler, handler that only logs, TODO/FIXME in the handler); 58% could have been found by simple testing of error-handling code; the Aspirator checker found 143 new bugs [Sec, consistent across several summaries quoting the paper] — [Yuan et al. OSDI 2014 PDF](https://www.eecg.utoronto.ca/~stumm/Papers/Yuan-OSDI-14.pdf); [USENIX ;login: 2015](https://www.usenix.org/publications/login/feb15/yuan). Other figures from the same paper [Mem]: most failures need no more than three nodes to reproduce and 77% can be reproduced by a unit test.

### Inferences
- The changes that hurt most often are (1) configuration and data pushes, (2) upgrades (dependency/platform), (3) code changes on error/fault paths. Teslon's atlas covers in-repo config keys and dependency bumps as "precise" but has no row at all for "error-handling path changed" or for "runtime data the code consumes changed shape" (the Google 2025 and Cloudflare 2025 pattern).
- Ghosh 2022's "80% mitigated without a fix" means rollback/flag flips are the main recovery tools; a PR-impact tool should flag whether a change is behind a flag and is reversible (data migrations are not).

### Gaps
- Exact Yin 2011 shares, the Facebook SEV share, and Liu 2019 category numbers could not be verified (scholarly hosts blocked).
- No 2025-2026 peer-reviewed study of change-type failure shares was found in the searches used.


## 2. Bug-introducing change research (SZZ and after)

### Takeaway
Size and spread predict regressions (large changes are far riskier per change), but small changes are so numerous that they still produce many failures, and the most damaging production incidents in section 4 were small changes. Refactorings are not harmless: hierarchy-changing refactorings are among the most fault-inducing.

### Cited Findings
- Purushothaman and Perry, IEEE TSE 2005: nearly 10% of maintenance changes were one-line changes; a one-line change had under 4% probability of introducing a fault; changes of 500+ lines had nearly a 50% chance of at least one defect [Sec, abstract text quoted in search results] — [Perry paper PDF](https://users.ece.utexas.edu/~perry/work/papers/DP-03-small.pdf); summarised in [Kim et al. ICSE 2011](https://web.cs.ucla.edu/~miryung/Publications/icse11-refactoringbug.pdf)
- Bavota et al., SCAM 2012: 15,008 refactorings of 52 kinds in Ant, Xerces, ArgoUML, checked with SZZ; some kinds are rarely harmful, but hierarchy refactorings (e.g. pull up method) induce faults "very frequently"; the exact overall percentage was not visible in the snippets [Sec] — [Bavota et al. 2012 PDF](https://people.lu.usi.ch/bavotg/papers/scam2012.pdf)
- Kim et al., ICSE 2011: refactoring revisions are followed by bug fixes; Di Penta et al. (replication, FSE 2020) found 38% of refactoring actions were followed by bug-fixing activity [Sec] — [Kim ICSE 2011](https://web.cs.ucla.edu/~miryung/Publications/icse11-refactoringbug.pdf); [FSE 2020 replication](https://2020.esec-fse.org/details/fse-2020-papers/125/On-the-Relationship-between-Refactoring-Actions-and-Bugs-A-Differentiated-Replicatio); a 2025 longitudinal multi-project study revisits bug-proneness of refactored code [Sec, existence only] — [arXiv 2505.08005, 2025](https://arxiv.org/pdf/2505.08005)
- Tang et al. (Facebook) 2015: ~50% of config updates change one or two lines [Sec] — [paper mirror](https://web.eecs.utk.edu/~qcao1/cs560/papers/holistic.pdf)
- Just-in-time defect prediction (Kamei et al., IEEE TSE 2013) finds lines added, number of files/directories/subsystems touched (spread), developer experience and fix-vs-feature are the strongest change-level predictors [Mem, not re-verified] — gap for URL.
- Sliwerski, Zimmermann, Zeller (MSR 2005, the SZZ paper): larger fixes and fixes made on Fridays were more often fix-inducing in Mozilla/Eclipse [Mem].

### Inferences
- For Teslon: "trivial-looking" kinds (whitespace in strings, import lines, modifiers, one-character config values, comment-looking lines) are low-risk per change but high-volume, and Teslon currently calls some of them "no effect" wrongly (red-team F05, F06, F08, F09, F10, F21 in redteam_soundness.md). A wrong "nothing to test" on a one-line change is exactly the class of change that caused Cloudflare 2019, GCP 2025 and CrowdStrike 2024.
- The atlas has no row for "refactoring" as such (only reformat and override). Bavota's result argues for a dedicated hierarchy-refactoring probe set (pull-up, push-down, extract superclass, move method across classes).

### Gaps
- No verified study of "share of regressions from trivial-looking changes" was found; Purushothaman/Perry is the closest and is old (2005).
- No SZZ study specific to non-code files (YAML, SQL, Dockerfiles) was retrieved in this session.


## 3. Web, enterprise and microservice fault studies

### Takeaway
In web front ends most high-impact JavaScript faults involve the DOM; in microservices most faults sit in interactions between services (contracts, timeouts, ordering), not inside one service; ORM upgrades change query semantics silently.

### Cited Findings
- Ocariza et al., ESEM 2013: 317 bug reports from 12 apps; 65% of JavaScript faults are DOM-related and 80% of the highest-impact faults are DOM-related; the TSE 2017 extension (502 reports, 19 repos) restates the 80% [Sec] — [UBC summary](https://blogs.ubc.ca/karthik/?p=3608); [Vejovis ICSE 2014](https://people.ece.ubc.ca/amesbah/resources/papers/vejovis-icse14.pdf)
- Zhou et al., IEEE TSE 2021 (TrainTicket): industrial survey plus 22 replicated industrial faults; an aggregator reports the split as 13 interaction faults, 5 environment faults, 4 internal faults [Sec, split unverified] — [Zhou et al. NSF PAR copy](https://par.nsf.gov/servlets/purl/10357355); [Emergent Mind topic page](https://www.emergentmind.com/topics/trainticket-benchmark). A separate 2025 study found 51 faults in TrainTicket and proposed 11 new fault categories [Sec] — [SOSE 2025](https://conf.researchr.org/details/cisose-2025/sose-2025/2/Benchmarking-Component-and-Integration-Testing-in-Microservices-Test-Suites-and-Faul)
- Liu et al. HotOS 2019 (Azure): data-format changes were the most common software-bug cause of high-severity incidents at 21%; fault-handling bugs split roughly 35% ignored errors / 35% over-reaction / 30% bugs inside handlers [Sec, from acolyer summary via search] — [Microsoft Research page, 2019](https://www.microsoft.com/en-us/research/?p=610323); [acolyer review, 2019](https://blog.acolyer.org/2019/06/21/what-bugs-cause-cloud-production-incidents/)
- Hibernate 6: queries with no select clause and several FROM entities now return the root entity instead of Object[]; some users report left joins becoming inner joins; some NUMBER columns now map to Boolean/Integer/Long instead of BigDecimal (HHH-16927) [Sec] — [Thorben Janssen, Migrating to Hibernate 6](https://thorben-janssen.com/migrating-to-hibernate-6); [HHH-16927](https://hibernate.atlassian.net/browse/HHH-16927); [Hibernate discourse, left join](https://discourse.hibernate.org/t/hibernate-6-jointype-left-not-working/8087); [Hibernate 6.0 migration guide](https://docs.hibernate.org/orm/6.0/migration-guide/)
- Spring Framework 6.0 / Boot 3.0: trailing-slash matching deprecated and default switched to false: `/x/` now 404s where it used to match `/x` [Sec, migration guide text quoted in search] — [Spring Boot 3.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide); OpenRewrite ships recipes to restore it — [OpenRewrite](https://docs.openrewrite.org/recipes/java/spring/boot3/maintaintrailingslashurlmappings)
- Spring Framework 6.1 removed LocalVariableTableParameterNameDiscoverer, so @PathVariable/@RequestParam without explicit names fail at runtime unless code is compiled with `-parameters` [Mem; not found by search] — [Upgrading to Spring Framework 6.x wiki](https://github.com/spring-projects/spring-framework/wiki/Upgrading-to-Spring-Framework-6.x). Teslon's atlas row "Parameter names no longer compiled in" ✓ [u4-06] covers exactly this.
- Jakarta EE 9+ namespace (javax.* to jakarta.*) in Boot 3: libraries still on javax compile but fail at runtime or are silently not registered (e.g. javax servlet filters, javax.validation annotations ignored) [Mem] — [Spring Boot 3.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide). Note: a validation annotation that silently stops working is the most dangerous variant for QA, because nothing fails.
- ORM and lazy loading (N+1, LazyInitializationException with open-in-view off) appear repeatedly in practitioner literature [Mem]; no peer-reviewed frequency study was found in this session.

### Inferences
- Microservice evidence favours Teslon's investment in Feign/Kafka/gateway contracts, but the atlas still has ◐ on gateway routes and Feign service names, and no row for timeouts/retries/circuit breakers in HTTP clients, which the interaction-fault literature names as common.
- The atlas row "A Spring Boot or parent bump ✓ every module" gives reach, not guidance. QA needs the list of behaviour defaults that changed (trailing slash, parameter names, jakarta, Hibernate query semantics, Spring Security defaults). A precise tool would attach the migration-guide items that touch code actually present.

### Gaps
- No bug study of Spring, Angular or Vue enterprise applications with category frequencies was retrieved (scholarly hosts blocked).
- Angular and Vue major-migration breakages were not researched in this session for budget reasons (known items from memory: Vue 3 removed filters, `$listeners`, `.sync`; Angular standalone/zone changes) [Mem].


## 4. Public postmortems 2012-2026

### Takeaway
In 11 of the 12 incidents below the immediate trigger was not a code PR to an application repository: it was a data or config push, a manual command, or automation. But in at least four (CrowdStrike 2024, GCP 2025, Cloudflare Nov 2025, Azure AFD 2025) a latent defect had shipped earlier in an ordinary code change: missing error handling, a missing bounds check or a hard-coded limit. That earlier PR is where a PR-impact tool can help.

### Cited Findings (five lines each: change / why safe / blast radius / detection / lesson)

**Knight Capital, 1 Aug 2012** [Mem; SEC order 2013] — [SEC Release 34-70694, 2013](https://www.sec.gov/litigation/admin/2013/34-70694.pdf)
- Change: new RLP code deployed to 8 SMARS servers; one server was missed; the new code reused an old flag that, on the missed server, woke dead "Power Peg" code.
- Why safe: flag reuse looked like a config toggle; manual deploy with no review of the old code path.
- Blast: about USD 460 million loss in 45 minutes; firm sold.
- Detection: traders and alerts (emails before market open were not acted on).
- Lesson: flag repurposing and dead code behind flags must be a change kind; Teslon has no runtime-flag row.

**AWS S3 us-east-1, 28 Feb 2017** [Mem] — [AWS summary 2017](https://aws.amazon.com/message/41926/)
- Change: an operator ran an established playbook command with a typo that removed more index/placement servers than intended.
- Why safe: routine, documented debugging command.
- Blast: S3 and dependent AWS services in us-east-1 down about 4 hours; the status page itself depended on S3.
- Detection: immediate error spikes.
- Lesson: outside any repo; a PR tool can only flag tooling that lacks input limits (AWS added minimum-capacity checks).

**GitLab.com database, 31 Jan 2017** [Mem] — [GitLab postmortem 2017](https://about.gitlab.com/blog/2017/02/10/postmortem-of-database-outage-of-january-31/)
- Change: during replication trouble an engineer ran `rm -rf` on the primary's data directory, thinking it was the secondary.
- Why safe: a hand-run maintenance step on the "wrong" terminal.
- Blast: about 6 hours of production data lost (issues, merge requests, comments); 5 backup methods failed.
- Detection: noticed by the operator seconds later.
- Lesson: non-repo cause; for QA, data-restore and backup paths are "error-handling" code that is never tested.

**Cloudflare WAF, 2 Jul 2019** [Mem] — [Cloudflare blog 2019](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/)
- Change: a new WAF managed rule with a regex that backtracked catastrophically; deployed globally at once.
- Why safe: rules were treated as content/config, not code; the CPU-protection guard had been removed weeks earlier in a refactor.
- Blast: CPU exhaustion on every edge machine, global 502s for about 27 minutes.
- Detection: alerts within minutes.
- Lesson: a data file interpreted by code (regex, rules) is code; plus a refactor that removed a safety guard is a high-risk kind.

**Facebook/Meta, 4 Oct 2021** [Mem] — [Meta engineering 2021](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/)
- Change: a maintenance command meant to assess backbone capacity took down all backbone connections; an audit tool that should have blocked it had a bug.
- Why safe: routine maintenance with an automated safety check.
- Blast: Facebook, Instagram, WhatsApp down about 6 hours; DNS servers withdrew BGP routes; internal tools and badge access also down.
- Detection: immediate, but remote recovery impossible.
- Lesson: the guard (audit tool) was itself the faulty code; validators and safety checks deserve the hardest tests.

**Atlassian, 5 Apr 2022** [Sec] — [Atlassian PIR 2022](https://www.atlassian.com/engineering/post-incident-review-april-2022-outage)
- Change: a script to delete a deprecated app was given cloud site IDs instead of app IDs; the API accepted both without warning.
- Why safe: peer review checked which endpoint was called and how, not what the IDs referred to.
- Blast: 883 sites (775 customers) deleted in about 23 minutes; restoration took up to 14 days (8-18 April).
- Detection: customer reports.
- Lesson: data-fix scripts and their inputs are a change kind; an API that accepts two kinds of identifier is a contract smell.

**CrowdStrike Falcon, 19 Jul 2024** [Sec, official RCA] — [CrowdStrike Channel File 291 RCA, 6 Aug 2024](https://crowdstrike.com/wp-content/uploads/2024/08/Channel-File-291-Incident-Root-Cause-Analysis-08.06.2024.pdf)
- Change: a Rapid Response Content (channel file 291) update used a 21st input field; the sensor's integration code supplied only 20.
- Why safe: content updates, not code; the Content Validator passed it (it assumed 21 inputs); earlier instances never used field 21.
- Blast: out-of-bounds read, kernel crash on about 8.5 million Windows hosts [Mem for the 8.5 million figure, from Microsoft 2024].
- Detection: immediate boot loops worldwide.
- Lesson: an arity/shape mismatch between data and parser, plus a validator built on the same wrong assumption; bounds checks were added afterwards (25 Jul 2024).

**Google Cloud, 12 Jun 2025** [Sec, official report quoted] — [Google Cloud incident report 2025](https://status.cloud.google.com/incidents/ow5i3PPK96RduMcb1SsW); [The Register 2025](https://www.theregister.com/2025/06/16/google_cloud_outage_incident_report/)
- Change: on 29 May a new Service Control quota-policy check shipped; on 12 Jun a policy change with blank fields was written to Spanner and replicated globally within seconds.
- Why safe: the code had rolled out region by region two weeks earlier without incident; the path was dormant until a policy used it. The report: it "did not have appropriate error handling nor was it feature flag protected."
- Blast: null pointer, crash loop in every region; many Google Cloud and Workspace APIs failing about 7 hours (10:51-18:18 PT).
- Detection: within minutes; the red button took about 40 minutes and large regions recovered slowly (herd effect) [Mem for the timings].
- Lesson: the PR that added the code path is the testable change: new code on data from a globally replicated store, with no flag and no null handling.

**AWS us-east-1 DynamoDB, 19-20 Oct 2025** [Sec] — [AWS post-event summary 2025](https://aws.amazon.com/message/101925/); [InfoQ 2025](https://www.infoq.com/news/2025/11/aws-dynamodb-outage-postmortem)
- Change: no human change; a latent race between two DNS Enactors let an old plan overwrite a newer one, and cleanup then deleted it, leaving an empty DNS record for dynamodb.us-east-1.amazonaws.com.
- Why safe: long-running, automated, redundant system.
- Blast: DynamoDB errors 23:48-02:40 PDT, then EC2 launch and NLB failures; whole event until 14:20 PDT on 20 Oct.
- Detection: quick for DynamoDB; secondary effects lasted much longer.
- Lesson: concurrency in control-plane automation; not reachable by a PR diff unless the race was introduced in a recent change.

**Azure Front Door, 29 Oct 2025** [Sec, secondary summaries of Microsoft PIR YKYN-BWZ] — [ThousandEyes 2025](https://www.thousandeyes.com/blog/microsoft-azure-front-door-outage-analysis-october-29-2025); [Microsoft status history, YKYN-BWZ](https://azure.status.microsoft/en-us/status/history/)
- Change: "inadvertent tenant configuration change"; later summaries: valid customer config changes processed by two different control-plane build versions produced incompatible metadata, which hit a latent data-plane bug.
- Why safe: each change was valid on its own; safety validations did not catch the mixed-version case.
- Blast: AFD nodes failed to load; Azure, Microsoft 365 and customer sites affected about 15:41 UTC 29 Oct to 00:05 UTC 30 Oct.
- Detection: within minutes.
- Lesson: mixed-version compatibility (two builds of the same component reading/writing the same data) is a change kind the atlas does not list.

**Cloudflare, 18 Nov 2025** [Sec, Cloudflare blog quoted] — [Cloudflare blog 2025](https://blog.cloudflare.com/18-november-2025-outage/)
- Change: a ClickHouse permissions change made a metadata query return duplicate rows; the Bot Management feature file doubled and exceeded the proxy's hard-coded 200-feature limit.
- Why safe: a database permission change, nowhere near the proxy; the file regenerates every 5 minutes automatically.
- Blast: FL and FL2 proxies crashed or erred; global 5xx for several hours (main impact resolved 14:30 UTC).
- Detection: fast, but intermittent failure (good and bad files alternating) first looked like an attack.
- Lesson: hard limits on input size in code, and queries that assume a single schema/database, are change kinds; the earlier code PR that set the limit and unwrap-on-error is the testable one.

**Cloudflare BYOIP, 20 Feb 2026** [Sec] — [Cloudflare blog 2026](https://blog.cloudflare.com/cloudflare-outage-february-20-2026/)
- Change: a configuration change unintentionally withdrew about 1,100 BYOIP prefixes.
- Why safe: routine configuration work.
- Blast: customer prefixes unreachable; about 300 could not be restored from the dashboard because of a software bug that removed service configurations from edge servers.
- Detection: reverted before all customers were affected.
- Lesson: recovery paths (restore, re-advertise) are error-handling code with its own bugs.

Other 2026 incidents found (lower confidence): Lucidworks (Apr 2026) config template rendered syntactically invalid output in production [Sec] — [Lucidworks status](https://status.lucidworks.com/incidents/y736q9gr3nmc); Clerk (19 Feb 2026) Postgres auto-analyze flipped a query plan, no change involved [Sec] — [Clerk 2026](https://clerk.com/blog/2026-02-19-system-outage-postmortem). Several dev.to "2026 postmortems" (Slack/Istio, Meta/Kafka, Dropbox) could not be verified and are excluded.

**Framework-upgrade breakages QA teams met (short)**
| Upgrade | Change | Why it looked safe | What breaks | What a tester needs to be told | Source |
|---|---|---|---|---|---|
| Spring 6 / Boot 3 | Trailing-slash match default false | Compiles; all tests that use exact paths pass | `/x/` 404s; gateways and old clients that add slashes | List endpoints called with a trailing slash anywhere (front end, gateway, other services) | [Boot 3.0 guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide) [Sec] |
| Spring 6.1 | Parameter names need `-parameters` | Compiles | Unnamed @PathVariable/@RequestParam fail at request time | Endpoints with unnamed parameters (atlas ✓ u4-06) | [Spring 6.x wiki](https://github.com/spring-projects/spring-framework/wiki/Upgrading-to-Spring-Framework-6.x) [Mem] |
| Boot 3 | javax to jakarta | Many libraries ship both | Old javax filters/validators silently not applied | Every validation rule and filter from a javax-based library | [Boot 3.0 guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide) [Mem] |
| Hibernate 6 | Implicit select, join and type mapping changes | Same HQL text | Different result types, lost rows (left to inner join), Boolean instead of BigDecimal | Screens whose queries have no select clause or multi-entity FROM | [Janssen](https://thorben-janssen.com/migrating-to-hibernate-6), [HHH-16927](https://hibernate.atlassian.net/browse/HHH-16927) [Sec] |

### Inferences
- The most frequent recent pattern is "valid-looking data meets fragile parser": GCP 2025, Cloudflare 2019 and Nov 2025, CrowdStrike 2024, Azure AFD 2025. The data change is outside any PR; the fragile parser was a PR. A PR tool should mark as high-risk any PR that adds or changes code that reads externally supplied structured data (config service, feature file, DB metadata, policy store) without null/size/arity handling or a flag.
- Validators and safety guards (Facebook audit tool, CrowdStrike Content Validator, Cloudflare's removed CPU guard) failed in three of twelve. Changes to guard code deserve "test as if critical" status.

### Gaps
- Official text for Knight, S3, GitLab, Cloudflare 2019 and Facebook was not re-fetched (memory, well known); the AWS 2025 and Azure 2025 official documents were not fetched directly (secondary summaries agree).


## 5. Industry numbers

### Takeaway
Even the best teams ship a failing change about 1 in 20 deployments; the median team fails 10-20% of changes, low performers 40-64%. Roughly 70% of outages at Google followed a change, and configuration/change management is the top cause of IT and network outages in Uptime's 2025 survey.

### Cited Findings
| Metric | Figure | Source | Tag |
|---|---|---|---|
| DORA 2023 change failure rate by cluster | elite 5%, high 10%, medium 15%, low 64% | [Octopus DORA metrics page](https://octopus.com/devops/metrics/dora-metrics) (year not stated there; matches the 2023 report from memory) | [Sec]/[Mem] |
| DORA 2024 | elite under 5% (was under 15% four years earlier); elite 8x lower CFR than low; medium cluster had a lower CFR than high for the first time; cluster shares elite 19%, high 22%, medium 35%, low 25% | [DX newsletter 2024](https://newsletter.getdx.com/p/2024-dora-report); [RedMonk 2024](https://redmonk.com/rstephens/2024/11/26/dora2024/) | [Sec]. Exact 2024 values (high 20%, medium 10%, low 40%) are [Mem] |
| DORA 2025 ("State of AI-assisted Software Development") | ~5,000 responses, 90% use AI; AI adoption associated with more instability; only 2 of 7 team archetypes gain throughput without higher CFR; rework rate added as a metric | [RedMonk Dec 2025](https://redmonk.com/rstephens/2025/12/18/dora2025/); [Rob Bowley Oct 2025](https://blog.robbowley.net/2025/10/01/dora-2025-ai-assisted-dev-report-some-benefit-most-dont/) | [Sec]; a "+7.2% CFR" claim on blogs is unverified |
| Outages due to changes (Google) | ~70% | [O'Reilly, Tenets of SRE](https://oreilly.com/ideas/tenets-of-sre) | [Sec] |
| Outage triggers (Google, SRE Workbook) | binary push 37%, config push 31% | [SRE Workbook App. C](https://sre.google/workbook/postmortem-analysis/) via [KodeKloud](https://notes.kodekloud.com/docs/Fundamentals-of-SRE/Managing-Complexity-Risk-and-Toil/Change-Management-for-Reliability/page) | [Sec] |
| Uptime Institute 2025 | config/change management is the top cause of major network outages (50%), ahead of third-party network provider failure (34%); config/change management is 62% of causes of major IT/software outages; third parties (cloud, telco, colo) are about two-thirds of publicly reported outages over nine years; power still 54% of major downtime overall | [Network World 2025](https://www.networkworld.com/article/3980366/networking-errors-pose-threat-to-data-center-reliability.html); [ITWeb 2025](https://www.itweb.co.za/article/uptime-announces-annual-outage-analysis-report-2025/mYZRX79g6JXqOgA8); [HostNOC](https://hostnoc.com/?p=14146) | [Sec], survey percentages can sum over 100% (multiple causes) |
| Microsoft incidents | ~40% caused by code/config bugs; ~80% of those mitigated without a fix | [Microsoft Research 2022](https://www.microsoft.com/en-us/research/?p=881646) | [Sec] |
| Defect removal efficiency | US average about 85-90%, best-in-class above 95-99%; bad-fix injection about 7% of fixes (Capers Jones) | Capers Jones, *The Economics of Software Quality* (2011) and later papers | [Mem], not verified |
| Cost of poor software quality | USD 2.41 trillion in the US in 2022 (CISQ) | CISQ 2022 report | [Mem], not verified |

### Inferences
- With CFR of 10-20% at typical enterprises, a tool that wrongly says "skip" on even 1% of the risky change kinds will be noticed within weeks by test managers. The base rate argues for Teslon's "held, never silent" design, and against any silent "no effect" call (red-team F02, F03, F21).

### Gaps
- No reliable recent figure for "share of escaped defects that are regressions" was found in the searches used.
- The DORA 2024 primary PDF was not opened; per-cluster numbers other than elite are memory.


## 6. Cross-repository and non-repository causes

### Takeaway
Most large incidents are triggered by something a PR diff of one application repository never shows: runtime config/data pushes, manual operations, automation, providers. A PR tool can still catch the in-repo half: the code that consumes such inputs, and the in-repo descriptions of them (compose env, K8s, placeholders), which Teslon currently misses in places.

### Cited Findings
- Of the 12 postmortems in section 4, 11 had a non-PR immediate trigger (manual command: S3, GitLab, Facebook; script/data: Atlassian; content/config/data push: Cloudflare 2019, CrowdStrike, GCP, Azure, Cloudflare Nov 2025, Cloudflare Feb 2026; automation race: AWS 2025); only Knight began with a code deploy (and its failure was a missed server plus flag reuse) [own count from section 4 sources].
- In 4 of those 12 (CrowdStrike, GCP, Cloudflare Nov 2025, Azure AFD) the root cause includes a latent defect shipped earlier in a normal code change [own count from the official reports cited above].
- Google SRE Workbook triggers: config pushes 31% (many runtime, not repository files); "service provider change" a small single-digit share [Sec for 31%, Mem for the rest] — [SRE Workbook](https://sre.google/workbook/postmortem-analysis/)
- Microsoft SoCC 2022: external dependency 7.2% of incidents in their categorisation [Sec] — [talk slides](https://asatarin.github.io/talks/2023-01-how-to-fight-incidents)
- Liu et al. 2019: data-format changes between components are the top software-bug cause (21%) — by definition at least two components, often two repositories [Sec] — [Microsoft Research 2019](https://www.microsoft.com/en-us/research/?p=610323)
- Uptime 2025: third-party providers account for about two-thirds of publicly reported outages [Sec] — [ITWeb 2025](https://www.itweb.co.za/article/uptime-announces-annual-outage-analysis-report-2025/mYZRX79g6JXqOgA8)
- Schema drift: CloudKitchens reports ~80% of their database-related outages over a few years came from schema management, including production schemas modified by hand outside the migration tool [Sec, single company] — [CloudKitchens tech blog](https://techblog.cloudkitchens.com/p/nuance-preventing-schema-migrations)
- Teslon's own red team found wrong skips on in-repo descriptions of outside-the-code settings: docker-compose env vars that override Spring settings (F11), YAML placeholders (F12), a sourced setup script called "tooling" (F14), entrypoint losing +x called "only mode" (F17), front-end folders named charts/, deploy/, docker/ treated as deployment (F01) — [redteam_soundness.md, this folder, 2026-11-16](redteam_soundness.md)

### Inferences
- Rough estimate (inference, not measured): for severe incidents at large operators, more than half of immediate triggers lie outside the application repository; for ordinary enterprise regressions found by QA, the share is likely lower because most QA-found regressions come from the app's own code. No source measures the latter.
- Teslon should report an explicit "outside this PR" block: runtime flag services, config servers (Spring Cloud Config, Consul), other repos' contracts, hand-run SQL, shared libraries pulled by version range. The atlas lists none of these as kinds.

### Gaps
- No study measures what share of QA-escaped regressions in enterprise apps originate in another repository; this is the key unknown for Teslon's coverage claim.


## 7. Mapping onto the change atlas, and the twenty change kinds that deserve the hardest tests

### Takeaway
The atlas is strongest where the evidence is moderate (in-repo Java/Spring contracts, JSON fields, Kafka topics) and weakest where the evidence is heaviest: runtime config and data consumed by code, error-handling paths, upgrade behaviour changes, feature flags, mixed-version rollouts, schema migrations on real data, and deployment descriptors. Several rows marked ✓ are contradicted by Teslon's own red team (env overrides, placeholders, whitespace in strings, file-name rules, final classes).

### Cited Findings
Atlas = /home/user/teslon/research/CHANGE-ATLAS-2026-11-05.md (2026-11-05). Red team = redteam_soundness.md in this folder (2026-11-16). Status symbols as in the atlas: ✓ precise, ◐ held, ✗ gap; "none" = no row.

**(a) High-frequency or high-severity categories where the atlas says held, gap, or where its ✓ is contradicted**
| Rank | Empirical category | Evidence | Atlas rows | Atlas status | Comment |
|---|---|---|---|---|---|
| a1 | In-repo configuration overridden from outside the app config (compose/K8s env vars, -D flags, placeholders) | SRE config push 31%; Uptime 62%; Yin 2011 | Fam. 7 "placeholder or environment default ✓ [u1-09]"; Fam. 11 "Kubernetes, Compose ✓ DEPLOY" | ✓ claimed | Red team F11, F12: wrong skips, certified. Status should be ✗ |
| a2 | Framework/platform upgrade behaviour changes | Gunawi 2016 UPGRADE top cause; Spring 6/Boot 3, Hibernate 6 | Fam. 10 "Spring Boot or parent bump ✓ [x03] every module" | ✓ (reach only) | Reach = every module, so no wrong skip, but no specific checks; effectively held |
| a3 | Start-up failures from proxies and missing keys | red team F04, F13; atlas gap list | Fam. 2 "@Value with a key no setting defines ✗"; final class/method: none | ✗ / none | Wrong skips today |
| a4 | Gateway routes, Feign service names | Zhou 2021 interaction faults dominate | Fam. 6 ◐ [v3-03, v3-04, v4-05, v4-06] | ◐ | Held for every screen; safe but low value |
| a5 | Liquibase changeset edited in place | migration failures (CloudKitchens 80% of DB outages) | Fam. 2 ◐ [u4-05] | ◐ | |
| a6 | Terraform, nginx, other proxies | Uptime; Facebook 2021; Cloudflare 2026 | Fam. 11 ◐ | ◐ | said, not read |
| a7 | Schema/contract files (OpenAPI, protobuf, GraphQL) | Liu 2019 data format 21% | Fam. 15 ◐ | ◐ | |
| a8 | CORS and security filter defaults | Spring Security 6 changes [Mem] | Fam. 8 "CORS ✗" | ✗ | |
| a9 | "No effect" calls on trivial-looking edits | Purushothaman 2005; red team F05, F06, F08, F09, F10, F21, F02, F03, F14-F17 | Fam. 16 ✓; Fam. 1 "comment or layout ✓ G-comment" | ✓ claimed | Contradicted: silent misses. Status should be ✗ until fixed |
| a10 | Folder/file-name based classification | red team F01 (charts/, deploy/, docker/), F02/F03 (Security.*, Notice.*) | Fam. 11, 16 | ✓ claimed | Contradicted: wrong skip and silent |
| a11 | Performance-only (N+1, slow loop), and locks/table rewrites from migrations | Honeycomb enum rewrite; GitLab reverted migrations | Fam. 13 "N+1 ✗ out of scope"; Fam. 4 "index only ✓ nothing visible [d02]" | ✗ / ✓ | "Index only: nothing visible" is unsafe on large tables (lock, rewrite, timeouts): say "load/lock risk" instead |

**(b) Categories missing from the atlas (no row)**
| Rank | Missing kind | Evidence |
|---|---|---|
| b1 | Code that reads externally supplied structured data (config service, feature file, policy store, DB metadata) changes without null/size/arity handling | GCP 2025, Cloudflare Nov 2025, CrowdStrike 2024, Cloudflare 2019 |
| b2 | Error-handling, fallback and recovery paths (catch blocks, empty/logging-only handlers, retries on error, restore paths) | Yuan 2014 (92% of catastrophic failures; 35% trivial patterns); Liu 2019 (35/35/30 split); Cloudflare Feb 2026 recovery bug |
| b3 | Runtime feature flags (LaunchDarkly/Unleash/Togglz/home-grown), flag defaults, flag removal or reuse, code not behind a flag | Knight 2012; GCP 2025 "not feature flag protected"; Ghosh 2022 80% mitigated without fix |
| b4 | Mixed-version / rolling-deploy compatibility (old and new code, old and new schema, old consumers of new messages) | Azure AFD 2025 (two control-plane builds); expand/contract migrations |
| b5 | Hard-coded limits and capacity assumptions (array sizes, max features, page caps, payload limits) | Cloudflare Nov 2025 (200 features); CrowdStrike (21 fields) |
| b6 | HTTP client timeouts, retries, circuit breakers, connection pools (Resilience4j, Feign options, RestTemplate/WebClient) | Liu 2019 timing bugs; Zhou 2021 interaction faults |
| b7 | Validators, guards and safety checks themselves | Facebook 2021 audit tool; CrowdStrike Content Validator; Cloudflare 2019 removed CPU guard |
| b8 | Hand-run data-fix and maintenance scripts (SQL in scripts/, one-off jobs), and identifier-type confusion | Atlassian 2022; GitLab 2017 |
| b9 | Refactorings of the class hierarchy (pull up, push down, extract superclass, move method) | Bavota 2012; Kim 2011; Di Penta 2020 (38%) |
| b10 | Schema drift (production schema differs from migrations) and migrations on production-size data | CloudKitchens; GitLab reverted-migrations analysis |
| b11 | Transitive/BOM-managed Maven dependency changes and semver-violating minor/patch updates | Raemaekers; Ochoa 2022 (breaking changes widespread regardless of semver) |
| b12 | Changes in another repository or shared library the app consumes; third-party API changes | Liu 2019; Uptime two-thirds third-party; Ghosh 7.2% external |
| b13 | Logging changes as risk (volume, disk, PII, logging inside handlers) | Yuan 2014 "handler that only logs"; atlas treats log level as "nothing a user sees" [inference] |

**(c) Categories the atlas covers that the evidence suggests are rarer as production failure causes** (inference: no study gives their frequency, so this is a ranking by absence of evidence)
- Hostile text in the diff (Fam. 17), huge generated PRs, old base/merge/squash: matter for tool robustness, not for app failures.
- lombok.config, tsconfig-only, images and fonts, types-only changes: no incident or study in this session names them.
- Enum renames, DTO field renames, query-parameter renames inside one repo: real but usually caught by compile or by existing tests; the interaction-fault literature stresses cross-service versions of these, which the atlas marks ✓ only when both sides are in one repo.
- Time zones and day boundaries (Fam. 12): failures are frequent but mostly triggered by the calendar (DST, leap seconds), not by a change; worth keeping, not top priority [Mem].

### The twenty change kinds that deserve the hardest tests
Ranked by frequency x severity from sections 1-6. "Atlas" gives Teslon's status today; "Red team" notes contradictions found 2026-11-16.

| # | Change kind | Evidence (sections above) | Atlas status today |
|---|---|---|---|
| 1 | Code that consumes runtime config/data (feature files, policies, rules, content) changes, or such data changes shape/size | GCP 2025; Cloudflare 2019, Nov 2025; CrowdStrike 2024; SRE config push 31% | none (Fam. 7 covers only repo config files) |
| 2 | Error-handling, fallback and recovery code changes (catch, null handling, retries, restore) | Yuan 2014: 92% of catastrophic failures, 58% catchable by simple tests; Liu 2019; GCP 2025 null pointer | none as a kind; reach via "method body ✓", no error-path checks |
| 3 | Configuration values and their sources (keys, profiles, env overrides, placeholders, -D flags) | SRE 31%; Uptime 62%; Yin 2011; Facebook 2015 | ✓ claimed; red team F11, F12 wrong skips; @Value missing key ✗ |
| 4 | Framework/platform major upgrades with changed defaults (Spring 6/Boot 3 trailing slash, -parameters, jakarta, Hibernate 6, Spring Security) | Gunawi 2016 UPGRADE top cause; migration guides | ✓ reach "every module" [x03]; -parameters ✓ [u4-06]; other behaviour changes not itemised |
| 5 | Feature flags: runtime flag services, defaults, removal or reuse, new code not behind a flag | Knight 2012; GCP 2025 | @ConditionalOnProperty ✓ [j21, c04]; runtime flags: none |
| 6 | Database schema migrations (destructive, NOT NULL, unique, type narrowing, locks on large tables) | CloudKitchens ~80% of DB outages; Honeycomb; GitLab | NOT NULL ✓, unique ✓, column rename ✓, Flyway checksum ✓; Liquibase edit ◐; index/lock "✓ nothing visible" is unsafe; drift: none |
| 7 | Cross-service data-format and contract changes (JSON, Kafka, Feign, OpenAPI/protobuf) | Liu 2019 data format 21%; Zhou 2021 interaction faults | ✓ in-repo JSON/Kafka/Feign; OpenAPI/protobuf/GraphQL ◐; other repos: none |
| 8 | Mixed-version compatibility during rolling deploys (old/new code, schema, consumers) | Azure AFD 2025 | none |
| 9 | Deployment descriptors and IaC (compose, K8s, Helm, entrypoints, file modes, Terraform, nginx) | Uptime config/change; Facebook 2021; red team F01, F11, F14, F17 | Docker/K8s ✓ DEPLOY (contradicted by red team); Terraform/nginx ◐ |
| 10 | Dependency updates, including transitive and semver-violating minor/patch | Ochoa 2022; Raemaekers | runtime dep ✓ [x02]; npm lockfile ✓ [s21]; Maven transitive/BOM: none |
| 11 | Data migrations, backfills and hand-run data fixes | Atlassian 2022; GitLab 2017 | migration updating rows ✓ [u3-11]; seed ✓ [d03]; hand-run scripts: none |
| 12 | Hard-coded limits and input-size/arity assumptions | Cloudflare Nov 2025; CrowdStrike 2024 | none |
| 13 | Validators, guards and safety checks (including Bean Validation and security filters) | Facebook 2021; CrowdStrike; Cloudflare 2019 | Bean Validation ✓ [k-rule, h18]; generic guards/validators: none |
| 14 | Spring start-up and proxy rules (final classes/methods on proxied beans, missing beans, @Value keys) | red team F04, F13 | wiring ✓ [u4-01..04]; final class/method: none (wrong skip F13); @Value ✗ |
| 15 | HTTP client resilience settings (timeouts, retries, circuit breakers, pools) | Liu 2019 timing; Zhou 2021 | none (Kafka retries ✓ [k07, k20]) |
| 16 | Trivial-looking edits: whitespace inside strings, imports, modifiers, comment-like lines, unicode escapes, file-name rules | Purushothaman 2005; red team F02-F10, F21 | Fam. 16 and G-comment ✓ claimed; contradicted (silent) |
| 17 | Concurrency and ordering (thread pools, @Async, listener concurrency, automation races) | AWS Oct 2025; Gunawi 2016 BUGS | @Async/listener concurrency ✓ (reach); races themselves not modelled |
| 18 | Security configuration (auth header/scheme, CSRF, CORS, role rules) | high severity per incident [Mem] | matchers/CSRF/token ✓; CORS ✗ |
| 19 | Front-end DOM-interacting code and shared components/styles | Ocariza 2013: 65% DOM-related, 80% of highest impact | Angular/Vue ✓ (templates, styles, ::ng-deep [u4-15]); React/Svelte ◐; folder-name misclassification F01, F03 |
| 20 | Hierarchy refactorings (pull up/push down, move method, extract superclass) | Bavota 2012; Kim 2011; Di Penta 2020 | overload/override ✓ via class hierarchy; refactoring as a kind: none |

### Inferences
- The atlas over-states coverage in three ✓ rows (config sources, deployment descriptors, no-effect calls). Before launch these should be re-marked ✗ in the atlas until the red-team fixes land, because test managers will judge Teslon by its worst wrong skip, not its average.
- The highest-value additions are not new languages but new kinds in the stacks already read: error-path changes, runtime-data consumers, flags, mixed-version and migration-on-real-data risks. Each can be stated as an UNCLEAR with a concrete check ("this PR adds a reader of policy data with no null handling: test with blank fields") without breaking the no-wrong-skip promise.
- Items 1, 8 and 12 are mostly detectable statically (new parser of external data; unchecked indexing; constants used as limits); items 6 and 11 need data volume, so Teslon can only warn.

### Gaps
- Frequencies for the ranking are from large cloud operators; enterprise Java/Angular regression frequencies by change kind are not available in any source found. The ranking for enterprise QA is therefore partly inference.
- Teslon's real-world precision on these kinds is unmeasured (no real-team validation yet, per the team brief).
