# Enterprise readiness and regulated-industry compliance for Teslon (as of 2026-11-16)

Status: complete (2026-11-16). About 28 web searches; most page fetches were blocked by the session network (faa.gov, blog.johner-institute.com, blog.jetbrains.com, survey.stackoverflow.co), so many claims rest on search summaries.

Tags: [S] = from a search-result summary (page not fetched); [F] = page fetched and read; [Sec] = secondary source/aggregator; [Mem] = from model background knowledge, not re-verified this session (treat as lead, verify before quoting). "How Teslon stands" column uses the teammate's engineering_audit.md (2026-11-15) plus my read of action.yml, package.json, SECURITY.md, research/ADOPTION.md.

## 1. Procurement and security review

### Takeaway
Enterprise buyers run every tool that touches source code through a third-party-risk process (SIG or CAIQ questionnaire, attestation reports, pen-test letter, vulnerability-disclosure policy) even when it is self-hosted: SonarSource holds SOC 2 Type II and ISO 27001:2022 that explicitly cover its self-managed SonarQube Server, which sets the bar Teslon will be compared with. Being offline removes most data-handling questions (residency, sub-processors, encryption at rest, breach notification) but not the questions about the vendor's own secure development, supply chain, vulnerability handling, and the honesty of its security claims, which today is where Teslon fails (secrets quoted in report.html contrary to SECURITY.md).

### Cited Findings
- SonarSource Trust Center: ISO 27001:2022 certification and SOC 2 Type II attestation "for all its products, including SonarQube Server" (self-managed); SOC 2 report released under NDA (e-signed) via a Security Profile; pen-test reports for SonarQube Server available there. SOC 2 Type II announced Feb 2025, criteria security + confidentiality + availability. [S] — [Sonar Trust Center](https://sonarsource.com/trust-center/); [Sonar press release 2025](https://www.sonarsource.com/company/press-releases/sonar-achieves-soc-2-type-ii-compliance/); [Sonar blog 2025](https://www.sonarsource.com/blog/sonar-earns-soc-2-type-ii-compliance/)
- Shared Assessments SIG is licensed (members/subscribers; a corporate licence reported at about $7,000/yr); updated yearly; SIG 2026 (released 2025-09-19 per one source) has 21 risk domains incl. a new Artificial Intelligence domain mapped to NIST AI RMF 1.0 and ISO/IEC 42001; SIG Lite for lower-risk vendors (~130-200 questions, sources conflict), SIG Core ~800-1,000+; finance and healthcare typically send SIG Core. CSA CAIQ v4 is free: 261 questions mapped to 197 CCM v4 control objectives in 17 domains; CSA released an AI Controls Matrix with an AI-CAIQ (reported June 2026). Mostly vendor blogs; question counts conflict. [S/Sec] — [Shared Assessments SIG](https://sharedassessments.org/sig/); [Mitratech: SIG 2026](https://mitratech.com/?p=101951); [ComplyDog CAIQ vs SIG](https://complydog.com/blog/caiq-vs-sig); [Skypher CAIQ guide 2026](https://blog.skypher.co/blog/caiq-questionnaire-guide-for-compliance-teams-in-2026)
- SIG 2026's AI domain and CSA's AI-CAIQ mean reviewers will now ask "does the product use AI/ML, on what data, with what human oversight" [Inf from the above]. Teslon's "no LLM in any decision" is a short, strong answer if it is true and testable (the engine's no-network test, SECURITY.md).
- Teslon today (repo read, 2026-11-16): SECURITY.md states no network calls from the engine, test-enforced; no telemetry; disclosure via private GitHub security advisory. It does not state supported versions, response times, a contact for non-GitHub reporters, safe-harbour wording or CVE handling. The teammate audit found report.html/report.json quote secret values from changed config lines, contradicting SECURITY.md's "does not ... include their values in its output" — [engineering_audit.md S1, 2026-11-15](engineering_audit.md); `SECURITY.md:17-22`.

Applicability of common enterprise asks to an offline CLI/Action with no SaaS (my classification; the asks themselves are standard questionnaire domains [Mem: SIG/CAIQ domain lists]):

| Ask | Applies to Teslon? | Why |
|---|---|---|
| Security questionnaire (SIG Lite / CAIQ / buyer's own) | **Yes, always** | Vendor-risk teams assess the vendor and the software, not just hosting. Expect a shortened "on-prem software" variant |
| SOC 2 Type II | **Partly**: often requested, rarely blocking for self-hosted tools at first sale; becomes expected as deal size grows | Covers the vendor's SDLC, change management and access to build/signing systems. Sonar shows a self-managed vendor can and does get one |
| ISO 27001 | Same as SOC 2; more common ask in EU | — |
| Penetration test | **Yes, adapted**: a third-party review of the CLI/Action (command injection, path traversal, output injection, token handling, artifact exposure) rather than a web-app pen test | Buyers ask for a letter of attestation |
| Vulnerability disclosure policy, security contact, patch SLA | **Yes, must** | Also a legal duty for EU commercial products under CRA Art. 14 from 2026-09-11 (see section 2) |
| SBOM, signed releases, provenance | **Yes, must** | See section 2 |
| SSO/SAML/SCIM, RBAC | **No** for CLI/Action (identity is the customer's GitHub). **Yes** if any server, dashboard or licence portal is added | Teslon's `packages/ui/src/server.ts` exists; if shipped as a shared service it re-opens these asks |
| Audit logs | **Partly**: runs are logged by the customer's CI; buyers in regulated domains want each report to record who triggered it, tool version, config hash, inputs (SHAs) | Needed for audit evidence (section 3) |
| Data residency, sub-processors, DPA, encryption at rest | **Mostly no**: nothing leaves the runner. Must be stated in writing and be true (secrets-in-output bug undermines it) | The artefact uploaded to GitHub (`action.yml:117-123`) is stored by GitHub, under the customer's existing GitHub terms |
| Support SLA, named support, escalation | **Yes** for paid tiers | Standard enterprise contract term [Mem] |
| Insurance (cyber/E&O), indemnity, export control, accessibility conformance report | **Yes** in large/public deals | Contract-stage asks [Mem] |

### Inferences
- The fastest credible answer pack for a code-reading, offline tool: (1) a one-page data-flow statement with a reproducible proof (no-network test, egress-blocked run), (2) a filled CAIQ-Lite or SIG Lite, (3) SBOM + signed provenance per release, (4) a VDP with SLA, (5) a third-party code review/pen-test letter of the CLI and Action, (6) an AI statement. SOC 2 can follow once there is revenue to justify it.
- The secrets-in-report bug is a deal-stopper class issue: reviewers test written claims, and a false claim in SECURITY.md costs more trust than a missing feature.

### Gaps
- Could not fetch trust centres of Snyk, Sourcegraph, JetBrains (TeamCity on-prem) or Teamscale to compare what self-hosted vendors publish; Sonar is the only verified comparator here.
- No survey data found on how often buyers waive SOC 2 for self-hosted tools.

## 2. Software supply chain and GitHub Actions hardening

### Takeaway
Since 2025 the supply-chain bar for anything that runs in a customer's CI has hardened from "good practice" into enforceable platform policy: GitHub lets enterprises block any action not pinned by full commit SHA (Aug 2025), workflow lockfiles are in preview (Oct 2026), npm revoked classic tokens and pushes trusted publishing with provenance (Dec 2025), and the EU CRA's vulnerability-reporting duty has applied since 11 Sep 2026. Teslon's Action today would be blocked outright by an enterprise that turns on GitHub's SHA-pinning policy only if users reference it by tag; worse, it pulls from the npm registry and compiles itself on every run, which is exactly the "mutable code fetched at run time" pattern the 2025 incidents exploited.

### Cited Findings
- tj-actions/changed-files (CVE-2025-30066, March 2025): attacker rewrote existing version tags (up to v45.0.7) to point at a malicious commit that dumped CI secrets into workflow logs; entry was via the related reviewdog compromise (CVE-2025-30154); guidance was rotate secrets exposed 2025-03-14/15 and pin third-party actions by full commit SHA. Vendors disagree on the exact start date (12 vs 14 March). [S] — [Wiz 2025](https://www.wiz.io/pt-br/blog/github-action-tj-actions-changed-files-supply-chain-attack-cve-2025-30066); [Orca 2025](https://orca.security/resources/blog/github-action-tj-actions-changed-files-compromised/); [SentinelOne CVE page](https://www.sentinelone.com/vulnerability-database/cve-2025-30066); [Socket 2025](https://socket.dev/blog/github-actions-supply-chain-attack-puts-thousands-of-projects-at-risk)
- GitHub changelog 2025-08-15: the "allowed actions" policy can now block specific actions and **enforce SHA pinning** at enterprise, organisation or repository level; workflows that reference actions by tag or branch then fail (reusable workflows reportedly still accept tags). [S] — [GitHub changelog 2025-08-15](https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/); [Classmethod 2025/26](https://dev.classmethod.jp/en/articles/github-actions-require-sha-pinning/)
- GitHub Actions **workflow dependency lockfiles**: public preview 2026-10-14 for GitHub Enterprise Cloud (incl. data residency); records the commit SHA each action reference resolved to (`.github/workflows/actions.lock`), with a "Require lockfile" policy in preview; GitHub notes locking does not vet the dependency. InfoQ (Nov 2026) reports GA on 2026-10-28, but GitHub docs still say preview: conflicting, treat GA as unverified. [S] — [GitHub changelog 2026-10-14](https://github.blog/changelog/2026-10-14-github-actions-workflow-lockfiles-in-public-preview/); [GitHub docs](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles); [InfoQ 2026-11](https://infoq.com/news/2026/11/github-actions-lockfiles-ga)
- Implication of the SHA-pinning policy for composite actions [Inf, from the policy wording]: the policy applies to every `uses:` the runner resolves, so a composite action that itself uses `actions/setup-node@v4` and `actions/upload-artifact@v4` by tag (Teslon `action.yml:69`, `:117`) is likely to fail in an org that enforces pinning, even when the customer pins Teslon by SHA. Verify on a test org before launch.
- `pull_request_target` hardening: from 2025-12-08 the workflow file and checkout commit come from the default branch (changelog 2025-11-07); in June 2026 `actions/checkout` began refusing risky PR-head checkouts under `pull_request_target`/`workflow_run` unless `allow-unsafe-pr-checkout` is set; per the 2026-11-02 changelog, `pull_request_target` will be **blocked by default from 2026-12-02** on public repos on Free, Team and Enterprise Cloud (not GHES). Teslon's README recommends `pull_request` with `contents: read` + `pull-requests: write` (`README.md:95-116`), so it is unaffected; good. [S] — [GitHub changelog 2025-11-07](https://github.blog/changelog/2025-11-07-actions-pull_request_target-and-environment-branch-protections-changes/); [GitHub changelog 2026-06-18](https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout); [GitHub changelog 2026-11-02](https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2); [GitHub docs](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)
- npm after the Shai-Hulud worm (Sept 2025): GitHub's plan limits publishing to 2FA local publishing, granular tokens with 7-day life, and **trusted publishing** (OIDC, launched 2025-07-31 for GitHub Actions and GitLab CI, emits provenance); classic npm tokens were revoked 2025-12-09. A May 2026 TanStack compromise reportedly published malicious versions through a legitimate trusted publisher, so provenance proves origin, not safety. [S/Sec] — [GitHub blog 2025](https://github.blog/security/npm/our-plan-for-a-more-secure-npm-supply-chain/); [The Hacker News 2025-09](https://thehackernews.com/2025/09/github-mandates-2fa-and-short-lived.html); [Chainguard](https://www.chainguard.dev/unchained/npm-update-to-harden-their-supply-chain-and-points-to-consider); [Socket](https://socket.dev/blog/package-maintainers-call-for-improvements-to-npm-security-plan)
- CISA "2025 Minimum Elements for an SBOM" (draft 2025-08-22, comments to 2025-10-03) adds component hash, license, tool name and generation context to the 2021 NTIA elements; CISA frames it as voluntary guidance; I could not confirm whether a final version has been issued by Nov 2026. [S] — [CISA 2025](https://www.cisa.gov/resources-tools/resources/2025-minimum-elements-software-bill-materials-sbom); [SC World 2025](https://www.scworld.com/news/cisa-releases-draft-changes-to-sbom-minimum-requirements-for-comment)
- EU Cyber Resilience Act (Regulation (EU) 2024/2847): Article 14 reporting of actively exploited vulnerabilities and severe incidents to CSIRTs/ENISA (early warning within 24 h) applies from **11 Sep 2026** to manufacturers of all in-scope products with digital elements, including ones already on the market; most other obligations (incl. the Annex I requirement to draw up an SBOM) apply from **11 Dec 2027**; Commission guidance published 2026-07-27. [S] — [McCann FitzGerald 2026](https://www.mccannfitzgerald.com/knowledge/data-privacy-and-cyber-risk/cyber-resilience-act-reporting-obligations-apply-from-11-september-2026); [Jones Day 2026-07](https://www.jonesday.com/de/insights/2026/07/eu-cyber-resilience-act-24hour-reporting-duties-start-september-11-2026); [Skadden 2026-09](https://www.skadden.com/insights/publications/2026/09/get-ready-reporting-faqs-and-checklist); Annex I SBOM duty [Mem: CRA Annex I Part II(1)]
- SLSA v1.0/v1.1 Build track: L1 provenance exists; L2 hosted build platform with signed provenance; L3 hardened build platform (isolated, non-forgeable provenance). GitHub's `actions/attest-build-provenance` and npm `--provenance` give roughly Build L2, L3 with reusable-workflow isolation. [Mem, slsa.dev/spec/v1.1/levels; not re-verified this session]
- OpenSSF Scorecard checks include Pinned-Dependencies, Token-Permissions, Dangerous-Workflow (pull_request_target with checkout of untrusted code), Signed-Releases, Branch-Protection, Code-Review, SAST, Security-Policy, Vulnerabilities, License, Maintained; OpenSSF Best Practices badge (passing/silver/gold) is self-certified. [Mem, github.com/ossf/scorecard docs/checks.md]

### Inferences
- For a tool whose pitch is "your code never leaves the runner", the Action itself is the attack surface a security reviewer will probe first. Teslon must ship as a prebuilt, bundled, tagged, immutable release with every inner `uses:` SHA-pinned and no `npm ci` at run time; otherwise Teslon's own dependency tree is fetched with the customer's `GITHUB_TOKEN` in the environment (`action.yml:96`), the same blast radius as tj-actions.
- The CRA matters if Teslon is placed on the EU market commercially (free open source supplied outside a commercial activity is largely exempt [Mem]). A paid product would owe the 24-hour reporting duty now and an SBOM plus vulnerability handling process by Dec 2027.

### Gaps
- Could not fetch slsa.dev, OpenSSF or GitHub Marketplace docs (network). Verified-creator badge rules for GitHub Marketplace not confirmed this session [Mem: verified creator requires org account, 2FA, domain verification and a GitHub review].
- Whether GitHub's SHA-pinning policy blocks tag references inside a SHA-pinned composite action needs a hands-on test.

## 3. Regulated industries: where change impact analysis is mandated and what the record needs

### Takeaway
Change impact analysis (CIA) is a hard, named requirement in the safety standards (IEC 62304, IEC 61508-3, ISO 26262-8, EN 50128/EN 50716, DO-178C via its change control and FAA practice) and a de-facto requirement in finance and payments (PCI DSS 6.5.1, DORA via RTS 2024/1774 Art. 17, SOX ITGC change management), where the auditor wants each change's documented impact, approval, testing and back-out. None of these regimes accepts a tool report on its own: the record must be owned and signed by a person, traceable to requirements and tests, retained under configuration control, and produced by a tool whose use is justified (tool qualification in safety domains; risk-based assurance under FDA CSA and GAMP 5). Teslon's file:line evidence and "held as unclear" behaviour fit these regimes well, but today it has no requirement or test-case IDs, no sign-off, no immutable retention, and no tool-qualification kit.

### Cited Findings

Where CIA or justified regression scope is required (hard requirement unless marked "practice"):

| Regime | Clause (where found) | What it requires of a change | Source |
|---|---|---|---|
| IEC 62304:2006+A1:2015 (medical device software) | 6.2 problem and modification analysis; 7.4 risk management of software changes; 9.7 verify problem resolution; 5.7/5.8 regression testing [clause titles from IEC ToC; body text not read] | Analyse each change request for impact on safety and on existing software; re-run risk analysis; choose regression scope from documented architecture and risk; record and approve | [IEC/ANSI preview ToC](https://webstore.ansi.org/preview-pages/IEC/preview_iec62304%7Bed1.1%7Den.pdf) [S]; [Johner Institute (not fetchable)](https://blog.johner-institute.com/iec-62304-medical-software/software-maintenance-iec-62304-and-compliance-testing/) [S] |
| FDA, US (devices) | QMSR (21 CFR 820 incorporating ISO 13485:2016 by reference) effective **2026-02-02**; ISO 13485 7.3.9 control of design changes [Mem]; GPSV 2002 s.5.2.7 and s.6 "regression analysis and testing" for changed software [Mem] | Design changes reviewed, verified/validated as appropriate, approved, records kept; FDA moved inspections from QSIT to Compliance Program 7382.850 on 2026-02-02 | [Uncountable 2026](https://www.uncountable.com/blog/fda-qmsr-is-now-effective-a-readiness-review-for-device-teams) [S]; [IntuitionLabs 2026](https://intuitionlabs.ai/articles/fda-qmsr-iso-13485-changes-2026) [S] |
| FDA CSA guidance | Final 2025-09-24; **reissued 2026-02-03** as "Computer Software Assurance for Production and Quality Management System Software" (supersedes Sept 2025 version; supersedes GPSV s.6 for production/QMS software) | Risk-based assurance of software used in production or the quality system; effort scales with process risk; unscripted/ad-hoc testing and vendor records acceptable for lower risk | [FDA PDF 2026](https://www.fda.gov/media/188844/download) [S]; [Hogan Lovells 2025](https://www.hoganlovells.com/en/publications/fda-finalizes-computer-software-assurance-guidance-for-production-and-quality-system-software) [S]; [NSF](https://www.nsf.org/life-science-regulatory-news/fda-final-guidance-computer-software-assurance-csa) [S] |
| GAMP 5 2nd ed. (ISPE, July 2022), pharma GxP | Change and configuration management; critical thinking; supplier involvement; tools that support SDLC activities treated as lower-risk "tools" with risk-based assurance [Mem] | Impact assessment of each change on GxP functions and data integrity, documented and approved | [Mem; ISPE site not fetched] |
| IEC 61508-3:2010 (functional safety) | 7.1.2.9 (a modification touching an earlier phase needs an impact analysis: which modules are impacted, which earlier lifecycle activities must be repeated); 7.5.2.6 (any change to the integrated system: impact analysis listing all impacted modules and re-verification needed); 7.8 software modification; 7.4.4 tool classes T1/T2/T3 [Mem] | Impact analysis determines affected modules and re-verification; assessors look for justification "by reference to the impact analysis records" and approval of all modifications | [exida blog](https://www.exida.com/Blog/so_whats_an_impact_analysis) [S]; [CASS IEC 61508-3 template v2.3, 2023](https://61508.org/wp-content/uploads/2023/12/CASS-508-SW-Software-v2.3.docx) [S]; [VDE ToC](https://www.vde-verlag.de/iec-normen/preview-pdf/info_iec61508-3%7Bed2.0%7Db.pdf) [S] |
| ISO 26262-8:2018 (automotive) | Clause 8 change management (impact analysis of a change request on work products and safety, decision, implementation, verification) [Mem for content]; Clause 11 confidence in software tools: TCL from Tool Impact (TI) x Tool error Detection (TD), 11.4.5; qualification methods by TCL and ASIL, 11.4.6 | A tool that could fail to flag an affected item has TI2; unless its errors are caught downstream with high probability (TD1) it needs TCL2/3 qualification | [DIN ToC](https://www.din.de/de/mitwirken/normenausschuesse/naautomobil/veroeffentlichungen/wdc-beuth:din21:148148259/toc-1859962/download) [S]; [Synopsys WP](https://www.synopsys.com/content/dam/synopsys/solutions/documents/automotive-tool-confidence-iso-26262-wp.pdf) [S]; [Reactis safety manual](https://reactive-systems.com/reactis-safety-manual/tool-classification.html) [S] |
| Automotive SPICE 4.0 (2023) | SUP.10 change request management (analyse and assess impact of change requests) [Mem] | Practice/assessment model required by OEMs in supplier contracts | [Mem] |
| DO-178C (RTCA 2011), airborne | 7.2.4 change control, 7.2.5 change review [secondary]; DO-178C does not explicitly mention "regression testing" (common practice); FAA Order 8110.49 Chg 2 chapter 11 ("Oversight of software change impact analyses") was removed; **8110.49A (2018)** has no CIA chapter; CIA practice now in **AC 00-69 (2017)** as "best practices", not guidance: CIA identifies the released baseline, the changes, the impact and the DO-178C activities needed for each affected item | Change impact analysis per change to approved software; tools whose output is not verified need DO-330 qualification (TQL by criteria and DAL) [Mem] | [FAA AC 00-69 (not fetchable)](https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_00-69.pdf) [S]; [FAA Order 8110.49A](https://www.faa.gov/documentLibrary/media/Order/FAA_Order_8110.49A.pdf) [S]; [Parasoft](https://parasoft.com/learning-center/do-178c/regression-testing) [S]; [Wikipedia AC 00-69](https://en.wikipedia.org/wiki/AC_00-69) [Sec] |
| EN 50716:2023 (rail; supersedes EN 50128 and EN 50657) | Keeps EN 50128 numbering; modification and change control (EN 50128 clause 9.2 maintenance, 6.6 modification and change control [Mem]); tools in 6.7 (T1/T2/T3 classes [Mem]); prA1:2026 amendment in progress | Impact analysis per change, re-verification/re-validation decided from it | [LDRA](https://ldra.com/en-5012x/) [S]; [Genorma](https://genorma.com/en/standards/en-50716-2023) [S] |
| PCI DSS v4.0.1 (v4.0 retired 2024-12-31) | Req. 6.5.1 changes to system components in production | Documented reason and description, documented security impact, documented approval by authorised parties, testing that the change does not adversely affect security, back-out procedures; 6.5.2 confirm requirements after significant change [Mem]; assessor traces recent changes to records | [WithPCI 6.5.1](https://withpci.pages.dev/requirements/6/6.5/6.5.1) [S]; [Ampcus 2025](https://www.ampcuscyber.com/blogs/pci-dss-requirement-6/) [Sec]; [Cloudaware v4.0.1 mapping](https://ce.prod.cloudaware.com/frameworks/pci-dss-v4.0.1/06/05/01/) [S] |
| EU DORA (Reg. 2022/2554), applies since 2025-01-17 | Art. 9(4)(e) ICT change management; RTS (EU) 2024/1774 Art. 17 ICT change management (Arts 15-17 project and change management). Note: DORA Art. 17 itself is incident management | Documented, approved change procedures with segregation of duties and record-keeping; risk assessment of each change; testing; emergency-change handling [Mem for details] | [Springlex RTS Art 17](https://www.springlex.eu/en/packages/dora/rts-rmf-regulation/article-17/) [S]; [MFSA](https://www.mfsa.mt/?p=62149) [S]; [AFM](https://afm.nl/en/sector/themas/europese-wet--en-regelgeving/dora/risicobeheer) [S] |
| NIS2 (Dir. 2022/2555), transposition deadline 2024-10-17 | Art. 21(2)(e) security in acquisition, development and maintenance, incl. vulnerability handling; Implementing Reg. (EU) 2024/2690 (Oct 2024) adds change management for digital-infrastructure entities [Mem] | Change management procedures and testing for covered entities | [Mem] |
| SOX 404 ITGC (US listed companies) | PCAOB AS 2201; change management ITGC | Per production change: request, independent approval, test evidence, rollback plan, segregation (developers do not approve or deploy their own changes); auditors sample change tickets [practice, not statute text] | [Secureframe](https://secureframe.com/blog/sox-itgc) [Sec]; [CloudEagle](https://www.cloudeagle.ai/blogs/itgc-controls-explained-types-examples-and-how-to-test-them) [Sec] |
| ISO/IEC/IEEE 29119-2/-3 (2021) | Test process and documentation: test plan with risk-based scope, test completion report [Mem] | Not mandated by law; often cited in contracts and public tenders | [Mem] |

What makes a CIA record audit-ready (synthesis across the rows above; requirements cited in the table, structure is my inference):
1. Identity: change request / ticket ID, PR, base and head commit SHAs, released baseline it builds on (AC 00-69; PCI 6.5.1).
2. Description and reason for change (PCI 6.5.1).
3. Impacted items: modules/units, interfaces, requirements, hazards/risk controls, and test cases, each traceable (IEC 61508-3 7.5.2.6; IEC 62304 7.4).
4. Activities to repeat: which verification and regression tests, and why the rest is not repeated (IEC 61508-3 7.1.2.9; AC 00-69).
5. Security / safety impact statement (PCI 6.5.1; IEC 62304 7.4).
6. Approval by an authorised, independent person, with date (PCI 6.5.1; SOX; DORA segregation of duties).
7. Evidence of tests executed and results, plus back-out plan (PCI 6.5.1; SOX).
8. Retention under configuration control, tamper-evident (QMSR/ISO 13485 4.2.5 records [Mem]; Part 11 for e-records and e-signatures in FDA-regulated settings [Mem]).
9. Tool justification: tool version, configuration, known limitations, and a qualification or assurance record (ISO 26262-8 cl.11; DO-330; IEC 61508-3 7.4.4; FDA CSA risk-based).

### Inferences
- Teslon's design matches the "impact analysis determines which modules are impacted and which activities must be repeated" wording of IEC 61508-3 almost literally, and its "held as unclear, never silent" rule is exactly what lowers Tool Impact / raises Tool error Detection in an ISO 26262 TCL argument. That is a genuine differentiator versus ML test-selection tools, whose misses are silent.
- But regulated buyers will classify Teslon as a tool that can fail to flag an affected item (TI2 in ISO 26262 terms). Until there is a qualification kit (tool safety manual, known-limitations list, validation test suite customers can rerun, version pinning, an error-reporting process), safety-domain customers can only use it as advisory input with a human still doing the CIA. The 434 compiler-proven mutants and truth-first probes are a good seed for such a kit.
- The cheapest audit-evidence wins: put change-request ID, requirement IDs and test-case IDs into report.json (via config mapping or commit-message parsing), add a sign-off block (who accepted the skips, when), emit a stable, hashed PDF/HTML report with tool version and config hash, and document retention (the Action's 30-day artifact, `action.yml:123`, is far short of regulated retention periods; device records must cover at least the device lifetime and not less than 2 years [Mem, 21 CFR 820]).
- Finance (PCI, SOX, DORA) is the larger and less tool-qualification-heavy market: auditors want per-change impact, approval and test evidence, which a Teslon report attached to the PR plus a reviewer sign-off could supply.

### Gaps
- Could not read normative text of IEC 62304, ISO 26262-8 clause 8, EN 50716 6.7, DO-178C 7.2, RTS 2024/1774 Art. 17 or PCI DSS 6.5.1 (paywalled or hosts blocked); clause numbers marked [Mem] must be checked before quoting to customers.
- GAMP 5 2nd ed. and Automotive SPICE content is from memory only.
- No source found on any regulator explicitly accepting a static-analysis CIA tool's output as sole evidence.

## 4. Integrations a QA organisation expects (ranked)

### Takeaway
GitHub Actions is the single most-used CI in organisations, but only at about 41%, and 41% of organisations run two or more CI tools; GitLab CI (34%) and Jenkins (31%) are close behind, and Azure DevOps is a solid fourth. A GitHub-only Action therefore reaches well under half of enterprise pipelines; the CLI plus standard output formats (JUnit XML, SARIF, a JSON schema) is what makes Teslon usable everywhere else. Test-management integration (Jira-based Xray/Zephyr, TestRail, qTest) is what test leads and managers will ask for, but no reliable usage-share survey exists for that category.

### Cited Findings
- JetBrains State of CI/CD (survey published Oct 2025): organisational use GitHub Actions 41%, GitLab CI 34%, Jenkins 31%, Azure DevOps Server 14%; personal use GitHub Actions 62%, GitLab CI 24%, Jenkins 14%; 32% of organisations use two CI tools and 9% three or more, more common in larger companies, largely due to slow Jenkins-to-Actions migrations and keeping on-prem Jenkins for heavy builds; 73% use no AI in CI/CD. A JetBrains State of CI/CD 2026 report was published Oct 2026 but I could not read its figures. [S] — [JetBrains TeamCity blog 2025-10](https://blog.jetbrains.com/teamcity/2025/10/the-state-of-cicd/); [@IT coverage 2025-10-14](https://atmarkit.itmedia.co.jp/ait/articles/2510/14/news037.html); [JetBrains State of CI/CD 2026 page](https://www.jetbrains.com/pages/state-of-cicd2026/); [JetBrains 2026 report post](https://blog.jetbrains.com/teamcity/2026/10/state-of-cicd-2026-report/)
- A secondary review of the JetBrains Developer Ecosystem 2025 gives lower organisational figures (GitHub Actions 33%, Jenkins 28%, GitLab CI 19%) and says 55% of developers regularly use CI/CD tools: different survey, unverified. [Sec] — [review of DevEco 2025](https://politic-analysis.pages.dev/jetbrains/2026/03/25/Best%20CICD%20Tools%20for%202026%20What%20the%20Data%20Actually%20Shows/)
- Stack Overflow Developer Survey 2025, documentation and collaboration tools: GitHub 81%, Jira 46%, GitLab 36% (as reported by IT Brief; unclear whether usage or desire); GitHub overtook Jira as most desired collaboration tool. [S/Sec] — [IT Brief 2025](https://itbrief.co.uk/story/developers-adopt-ai-tools-but-trust-issues-persist-survey-finds); [Stack Overflow survey 2025](https://survey.stackoverflow.co/2025/technology/)
- Test management: no credible usage-share survey found. PeerSpot "mindshare" (engagement on its site, not adoption, Sept-Oct 2025): Tricentis qTest 14.6%, OpenText ALM/AQM 12.7%, TestRail 10.5%, Zephyr Enterprise 7.2%, Adaptavist/SmartBear Zephyr Scale (TM4J) 2.8%. A BrowserStack vendor survey says 65% of organisations are dissatisfied with their test-management tool. [Sec] — [PeerSpot comparison](https://www.peerspot.com/products/comparisons/adaptavist-test-management-for-jira_vs_testrail_vs_tricentis-tosca); [PeerSpot TM4J](https://peerspot.com/products/adaptavist-test-management-for-jira-reviews); [BrowserStack guide 2026](https://www.browserstack.com/guide/test-management-tool-buyer-guide)
- Chat: Microsoft held 45.6% of the worldwide unified-communications-and-collaboration market in 2024 (IDC via Rework); Teams leads mid-market and enterprise, Slack leads small and tech companies (G2 research); aggregator estimates of enterprise messaging share (Teams ~37%, Slack ~13%) are weak. [Sec] — [Rework guide citing IDC](https://resources.rework.com/guides/choosing-software/slack-vs-teams-which-to-choose); [G2 research](https://research.g2.com/insights/slack-versus-microsoft-teams-comparison); [SQ Magazine](https://sqmagazine.co.uk/slack-vs-microsoft-teams-statistics)
- Formats: JUnit XML is the de-facto cross-tool test-result format (vendor claim, but consistent with every CI's native support [Mem: Jenkins junit plugin, GitLab `artifacts:reports:junit`, Azure PublishTestResults, CircleCI store_test_results]); CTRF is an open JSON test-report schema with reporters for Playwright, Jest/Vitest, pytest, Mocha, Newman, .NET and a Jenkins plugin, but is still pre-1.0 (Microsoft's CTRF extension marked experimental). [S] — [CTRF org](https://github.com/ctrf-io); [Jenkins CTRF plugin](https://plugins.origin.jenkins.io/ctrf-json/); [NuGet Microsoft CTRF ext.](https://www.nuget.org/packages/Microsoft.Testing.Extensions.CtrfReport); [Gaffer JUnit guide](https://gaffer-marketing.pages.dev/blog/junit-xml-format-guide)
- SARIF 2.1.0 (OASIS) is what GitHub code scanning ingests via `upload-sarif`; code scanning on private repos requires GitHub Code Security (GHAS) licences [Mem; not re-verified]. SARIF is aimed at "results with locations", which fits Teslon's file:line evidence better than JUnit.
- Teslon today: GitHub only (Action, PR comment, GHES via `GITHUB_API_URL`, README); the CLI runs `impact base..head` on any git repo; outputs markdown, summary, report.json, report.html; JUnit only in the legacy `analyze` path, no SARIF, no JSON Schema (audit H4); no GitLab/Bitbucket/Azure/Gerrit, Jira/Xray/TestRail, Slack/Teams code (`grep -rniE "gitlab|bitbucket|azure|gerrit|jira|xray|testrail|slack|teams" packages/cli/src README.md` = no hits, run 2026-11-16).

Proposed ranking for build order (inference from the data above):

| Rank | Integration | Evidence for rank |
|---|---|---|
| 1 | GitHub (cloud + GHES) PR comment + Actions | 41% org CI, 81% dev collaboration; already built |
| 2 | Formats: JSON Schema, JUnit XML, SARIF, markdown | Unlocks every CI without bespoke code |
| 3 | GitLab (MR note + CI component) | 34% org CI; GitLab 36% collaboration |
| 4 | Jira (link areas to issues; post to issue) and Jira-based test management (Xray, Zephyr Scale) | Jira 46%; QA leads live there [Inf] |
| 5 | Jenkins (plugin or documented pipeline step) | 31% org CI, heavy in regulated on-prem estates |
| 6 | Azure DevOps (Repos PR thread + Pipelines task; Azure Test Plans) | 14% org CI (server) plus cloud; strong in Microsoft-centric enterprises |
| 7 | TestRail, qTest (create a test run from the "test" list) | PeerSpot mindshare top-3; no hard adoption data |
| 8 | Microsoft Teams, then Slack notifications | Teams leads enterprise |
| 9 | Bitbucket (Cloud + Data Center), Gerrit | No share data found; Gerrit matters in automotive/telecom [Mem] |
| 10 | TeamCity, CircleCI, Allure, CTRF | Smaller shares; CTRF pre-1.0 |

### Inferences
- "Runs only as a GitHub Action" caps the addressable enterprise base; the cheapest widening is a documented CLI recipe per CI plus JUnit/SARIF output, not per-vendor plugins.
- For test managers the killer integration is not chat but "create a test run in Xray/TestRail from the TEST list and record SKIP reasons", because that becomes their audit trail.

### Gaps
- No independent adoption survey for test-management tools, Bitbucket, Gerrit, or Allure/CTRF; the World Quality Report 2025-26 and GitLab DevSecOps survey could not be read this session.

## 5. Scale, performance and architecture realities

### Takeaway
Developers stay engaged with a check that finishes in about 5-7 minutes and start task-switching beyond about 15; a PR-impact check that runs alongside builds should aim for well under the build time, i.e. seconds to a few minutes, with cost proportional to the diff. Teslon today scales with repository size and did not finish a 4-file PR on n8n (35k files) in 20 minutes (teammate audit), so it cannot honestly be sold to large-repo enterprises yet. Reliable survey data on monorepo vs polyrepo share and on cross-repo architectures is thin; what exists says multi-repo and feature-flag use are the norm, which single-repo static analysis must declare as "unseen".

### Cited Findings
- Honeycomb engineering: builds under ~6-7 minutes keep developers watching; 15 minutes caused task-switching. VirtusLab maturity guide treats CI over 15 minutes as a warning sign. GetDX research: developers decide to switch tasks based on how long they expect a build to take. Wikimedia's 2026 developer survey: 46% satisfied with CI queue time. ICSE 2025: median timeout build 19.7 min, >5x a normal build. [S] — [Honeycomb blog](https://www.honeycomb.io/blog/most-important-developer-productivity-metric); [VirtusLab CI > 15 minutes](https://visdom-maturity-matrix.virtuslab.com/guides/delivery/ci-15-minutes); [GetDX newsletter](https://newsletter.getdx.com/p/build-times-and-developer-productivity); [Wikimedia 2026 survey](https://www.mediawiki.org/wiki/Developer_Satisfaction_Survey/2026/Continuous_integration); [ICSE 2025 timeout builds](https://conf.researchr.org/details/icse-2025/icse-2025-journal-first-papers/43/Characterizing-Timeout-Builds-in-Continuous-Integration)
- Teslon measured (teammate, 2026-11-15): cost follows repository size, one git process per file, whole repo parsed at both commits; n8n 4-file PR killed at 20 min; the Action does `git fetch --unshallow` (`action.yml:101-104`). [engineering_audit.md sections 2.2-2.5](engineering_audit.md)
- Monorepo share: a blog claims 63% of companies with 50+ developers use monorepos but names no survey: unverified. Faros benchmarked PR cycle time across 320 teams by repo style but gives no adoption split. Block migrated 450 JVM repos into a monorepo (InfoQ 2026-06). [Sec] — [byteiota 2026](https://byteiota.com/monorepo-vs-polyrepo-2026-63-enterprise-adoption/); [Faros](https://www.faros.ai/blog/monorepo-vs-polyrepo-benchmark-data); [InfoQ 2026-06](https://infoq.com/news/2026/06/block-450-jvm-monorepo-migration)
- Feature flags: LaunchDarkly/LeadDev State of Feature Management 2024 (July 2024, 496 responses, vendor-run): 71% use flags for on/off releases, 54% progressive delivery, 50% experimentation; only 7% do not use feature flags. [S, vendor survey] — [LeadDev/LaunchDarkly 2024 PDF](https://zephroriginm8r5syklryh.leaddev.com/sites/default/files/2024-09/LDEV-StateofFeatureManagement-Report-2024__LDMO___2.pdf)
- Multi-tool reality: 41% of organisations run two or more CI tools (JetBrains 2025, section 4), a proxy for heterogeneous estates. [S]

### Inferences
- Enterprise definition of done for performance: p95 under 2 minutes for a typical PR on a 10k-50k-file repo, a hard time budget that degrades to "Unclear" with a partial report rather than hanging, a blob-keyed cache across runs, partial/shallow-clone support, and a published supported-size statement.
- With ~93% of surveyed teams using feature flags (vendor data) and polyrepo microservices common, a large share of real PRs will have impact outside the repository (flag defaults in a flag service, config repos, consumers in other repos, mobile clients). Teslon's "unseen" list is the right mechanism; enterprise readiness needs a configurable service map so that cross-repo consumers become named, not just "unclear".

### Gaps
- No credible 2025-26 survey of monorepo vs polyrepo share, API gateway use, config-server use, mobile-client share or generated-code share was found within budget (CNCF, Postman State of the API, Octoverse not readable here).
- No published enterprise norms for PR volume per repo per day; Teslon's throughput need is therefore an estimate.

## 6. Accuracy governance

### Takeaway
Enterprises accept advisory tools that can be wrong through four mechanisms: a staged rollout (shadow/simulation mode, then advisory, then gating), measured and published error rates on their own code, a human who owns the decision, and contract language that disclaims reliance. No industry standard sets a false-negative SLO for test-impact tools; the closest formal frameworks are bank model-risk guidance (SR 11-7, replaced in April 2026 by SR 26-2 / OCC 2026-13) and safety-tool qualification (ISO 26262-8 cl.11, DO-330), both of which ask for validation evidence, known limitations and ongoing monitoring rather than a promise of zero error. Teslon's "never a wrong skip" is a stronger claim than any comparable vendor makes, so it must be backed by a measured miss rate on real customer code with a stated confidence bound.

### Cited Findings
- US bank model-risk guidance: on 2026-04-17 the OCC, Federal Reserve and FDIC issued revised principles-based guidance (Fed SR 26-2, OCC Bulletin 2026-13, FDIC FIL-15-2026) that supersedes SR 11-7 (2011) and OCC 2011-12; generative and agentic AI are explicitly out of scope pending an RFI; one source gives a 2027 effective date (unconfirmed). [S] — [Orrick 2026-04](https://www.orrick.com/en/Insights/2026/04/Agencies-Overhaul-Model-Risk-Management-Guidance-for-Banks-Heres-What-Changed); [Davis Polk 2026](https://www.davispolk.com/index%2ephp/insights/client-update/visual-memo-key-changes-under-federal-banking-agencies-revised-model-risk); [Protiviti 2026-05](https://www.protiviti.com/sites/default/files/2026-05/insights-paper-mrm-guidance-changes-protiviti-na.pdf); [EY](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-us/insights/banking-capital-markets/documents/ey-model-risk-management-guidance.pdf)
- SR 11-7's core practices (conceptual soundness review, ongoing monitoring, outcomes analysis/back-testing, effective challenge, documented limitations) remain the template bank risk teams apply to any decision tool. [Mem, SR 11-7 text]. A deterministic static analyser is probably not a "model" under the bank definition (quantitative estimates from statistical/mathematical theory) [Inf], but bank tool-risk teams will still ask for the same evidence.
- ISO 26262-8 clause 11: tool confidence from Tool Impact x Tool error Detection; qualification method depends on TCL and ASIL. [S] — [Synopsys WP](https://www.synopsys.com/content/dam/synopsys/solutions/documents/automotive-tool-confidence-iso-26262-wp.pdf)
- Shadow-mode precedent in the same product category: Gradle Develocity Predictive Test Selection offers a simulation that compares real results with what the selection would have done, before enabling, and three risk profiles (Conservative/Standard/Fast). [Sec, via teammate commercial_landscape.md] — [Develocity PTS manual 2026.2](https://docs.gradle.com/develocity/2026.2/using-develocity/predictive-test-selection/)
- Teslon's licence is MIT (`LICENSE`, audit 5.1): "AS IS", no warranty, no liability: adequate legally for free use, but an enterprise contract will instead want a limited warranty (e.g. conformance to documentation), a liability cap, and an explicit statement that skip advice does not replace the customer's test decision [Mem: standard enterprise software terms].
- Teslon's own evidence today: ~1,000 tests, 55 live PRs, 120 historical commits on two OSS apps, all on fixtures or OSS; "NOT yet validated on a real team's code" (team brief). No "report a wrong answer" bundle exists (audit 5.7).

### Inferences
- Concrete accuracy governance Teslon should ship: (1) shadow mode as the default for the first N PRs (comment says what it would skip, nobody acts on it), with a built-in "was this skip right?" capture; (2) an outcome log: every escaped defect traced back to whether Teslon marked its area skip, test or unclear; (3) published miss rate with a confidence bound: with zero wrong skips observed in n independent skip decisions, the 95% upper bound on the wrong-skip rate is about 3/n (rule of three), so claiming "<0.1% wrong skips at 95%" needs ~3,000 independent checked skips on real code; (4) a policy knob: advisory vs gate, and "skip requires human confirmation" for regulated repos; (5) a versioned known-limitations list per release.
- "100% without mistakes" is not a claim regulators or MRM teams accept in any regime found; they accept bounded, monitored error with human ownership. The marketing claim should be "never silent; every skip is machine-proved or held", plus the measured rate.

### Gaps
- No published false-negative SLOs from any test-impact vendor were found (Launchable/CloudBees, SeaLights, Develocity publish selection-rate and time-saved claims, not miss rates).
- Did not find case law or public incidents about liability for a wrong test-selection recommendation.

## 7. Commercial and licensing models

### Takeaway
Pricing for adjacent tools is covered in the teammate's commercial_landscape.md (per-committer or per-seat, roughly $8-60 per user per month, enterprise quote-only). The licensing decision is more urgent than price: Teslon is MIT today, which lets anyone fork and resell it; the common patterns for a commercial developer tool are open core (free engine, paid enterprise features), source-available licences (BSL, ELv2, FSL), or proprietary binaries.

### Cited Findings
- Adjacent price points (from teammate notes, sources there): Datadog Test Optimization ~$20/committer/month annual; Code Coverage $8/committer/month; Appsurify $29-59/seat/month (conflicting); AI PR reviewers $15-40/dev/month; Develocity and SeaLights quote-only. — [commercial_landscape.md section 1-2](commercial_landscape.md)
- Teslon licence: MIT, "Teslon contributors", no CLA; own packages lack a `license` field. — [engineering_audit.md 5.1](engineering_audit.md)
- Open-core and source-available precedents [Mem, not re-verified this session]: SonarQube Community Build (LGPL) vs paid Developer/Enterprise/Data Center editions (enterprise adds portfolio/governance reports, security reports, branch/PR analysis in Developer+, HA in Data Center); GitLab CE (MIT) vs EE tiers; HashiCorp moved to BSL 1.1 (Aug 2023); Elastic moved to SSPL/ELv2 (2021) then added AGPL (2024); Sentry's Functional Source License (2023) converts to Apache/MIT after two years.
- What "enterprise edition" typically adds [Mem, cross-vendor pattern]: central policy/config management, SSO/SCIM and RBAC for any server component, audit logs, compliance reports (PDF, retention, sign-off), multi-repo/portfolio views, priority support with SLA, LTS releases, air-gapped install bundles, indemnity.

### Inferences
- For Teslon the natural split: free and open engine and CLI (trust through inspectability, matches "evidence you can re-read"); paid: cross-repo service map, audit-ready report pack (sign-off, requirement/test IDs, retention, qualification kit), test-management integrations, LTS + support SLA. Decide licence and CLA before the first external contribution.

### Gaps
- No vendor price list for test-impact tools aimed at QA (rather than developers) found; buyer is likely the QA budget holder, whose benchmarks are test-management seat prices, not checked here.

## 8. Accessibility and localisation

### Takeaway
Public-sector and large EU buyers require conformance with EN 301 549 (which now references WCAG 2.2 AA in v4.1.1, 2026, though its harmonised status in the Official Journal is unconfirmed) and US federal buyers require Section 508 (WCAG 2.0 AA by reference) with an Accessibility Conformance Report (VPAT). A developer tool's HTML report and PR comment are ICT in scope. Teslon's report.html shows some accessibility work but no audit or ACR, and is English only.

### Cited Findings
- EN 301 549 V4.1.1 moves the web baseline from WCAG 2.1 to WCAG 2.2 Level A/AA (six new A/AA criteria; drops 4.1.1 Parsing); one source gives publication 2026-09-02, others say OJEU citation expected around Oct 2026 and that v3.2.1 remains the legal presumption-of-conformity baseline until cited: conflicting. Public bodies write EN 301 549 into tenders and evaluation criteria. [S] — [NDA Ireland](https://nda.ie/news/en301549-published); [DWT 2026-09](https://www.dwt.com/insights/2026/09/european-accessibility-act-ict-standards-update); [BrowserStack](https://www.browserstack.com/blog/what-en-301-549-v4-1-1-means-for-your-accessibility-strategy/); [European Commission WAD standards page](https://digital-strategy.ec.europa.eu/en/policies/web-accessibility-directive-standards-and-harmonisation)
- European Accessibility Act obligations applied from 2025-06-28 (single vendor source in results; consistent with Directive (EU) 2019/882 [Mem]). Developer B2B tools are mostly outside the EAA product list [Mem], but public procurement under Directive 2014/24/EU requires accessibility criteria [Mem]. [S] — [AccessiWay](https://www.accessiway.com/legal-guidance/en-301-549)
- US Section 508 (revised 2017) incorporates WCAG 2.0 AA; buyers request a VPAT/ACR [Mem].
- Teslon today: `packages/core/src/engine/html.ts` has `lang="en"`, 11 `aria-label`, 8 `aria-hidden`, 6 `aria-pressed`, 2 `aria-live`, focus styles and a `prefers-color-scheme` rule (grep counts, 2026-11-16); no accessibility audit, no ACR, no localisation layer.

### Inferences
- Should-level for enterprise, must-level for public sector: a WCAG 2.2 AA audit of report.html and the PR comment (states test/skip/unclear must not rely on colour alone; tables need headers; keyboard operable), and a published ACR. Localisation (German, French, Japanese) is a could, driven by automotive and rail buyers [Inf].

### Gaps
- OJEU citation status of EN 301 549 v4.1.1 not verified.

## 9. Deliverables: checklist, regulated-industry opportunity, ten reviewer questions

### Takeaway
Against an enterprise definition of done for an offline CLI + GitHub Action, Teslon meets the data-handling and design items (offline engine, no telemetry, deterministic, least-privilege trigger documented, careful escaping) but misses most release, supply-chain, configuration, scale, integration and audit-evidence items; two items are worse than missing because they contradict published claims (secrets in report.html; "never silent" while an unreadable changed line becomes "no app effect", per the audit). Verdict: not enterprise grade today; roughly 12 must items open.

### Cited Findings

(1) Enterprise-grade definition of done. Level: M = must before an enterprise launch, S = should within first enterprise deals, C = could/differentiator. Basis: H = hard requirement (law, standard clause or platform enforcement), P = common practice/buyer expectation. Status: from engineering_audit.md (2026-11-15, "audit") and my repo read (2026-11-16). Sources are in sections 1-8.

| # | Item | Lvl | Basis | Why (section / source) | Teslon today |
|---|---|---|---|---|---|
| A. Security claims and data handling |||||
| 1 | Written data-flow statement: what is read, what leaves the runner (only git-host API calls with customer token), no telemetry | M | P | First questionnaire question (s.1) | **Met** in SECURITY.md; engine no-network test |
| 2 | Every security claim true and tested; redact secret values from all outputs and artefacts | M | P | Reviewers test claims (s.1) | **Fails**: report.html/json quote `sk_live_...` (audit S1) |
| 3 | Vulnerability disclosure policy: contact, supported versions, response/fix SLA, CVE/GHSA process, safe harbour | M | H (EU CRA Art.14 for commercial EU products from 2026-09-11) / P | s.1, s.2 | **Partial**: private advisory only, no SLA or versions |
| 4 | Fail closed: any read/parse failure on a changed file becomes "unclear", never "no effect" | M | P (core promise; ISO 26262 TD argument) | s.3, s.6 | **Fails** per audit (unreadable changed line treated as blank) |
| 5 | AI statement (no ML/LLM in decisions), testable | S | P (SIG 2026 AI domain; AI-CAIQ) | s.1 | **Met in design**, not yet stated as a formal attestation |
| 6 | Third-party security review / pen-test letter of CLI + Action | S | P | s.1 (Sonar publishes pen-test reports) | **Missing** |
| 7 | SOC 2 Type II / ISO 27001 of the vendor | C (S once selling to banks) | P | s.1 | **Missing** (no company process evidenced) |
| B. Release and supply chain |||||
| 8 | Versioned, immutable releases (semver tags, changelog, release notes) | M | P | s.2 | **Missing**: v0.1.0, 0 tags, "Unreleased" (audit H3) |
| 9 | Prebuilt, bundled Action: no `npm ci`/build at run time, no registry fetch on customer runner | M | P (tj-actions lesson) | s.2 | **Fails**: `action.yml:77-82` builds every run |
| 10 | Every inner `uses:` pinned by full SHA; works under GitHub "require SHA pinning" policy and lockfiles | M | H (platform policy, Aug 2025; lockfiles preview Oct 2026) | s.2 | **Fails**: `setup-node@v4`, `upload-artifact@v4` (`action.yml:69,117`); README says `@main` |
| 11 | SBOM per release (CycloneDX or SPDX) with CISA 2025 elements (hash, licence, tool, context) | M | H for EU commercial from 2027-12-11 (CRA Annex I); P now | s.2 | **Missing** |
| 12 | Signed provenance (npm trusted publishing `--provenance`, GitHub artifact attestations / Sigstore), target SLSA Build L2, L3 later | M | P (npm push since 2025) | s.2 | **Missing** |
| 13 | Licence fields, claimed npm scope, third-party licence report | M | P | s.2 | **Partial**: deps permissive, own packages no licence field, `@teslon` unclaimed (audit S3) |
| 14 | OpenSSF Scorecard run in CI and published; Best Practices badge | S | P | s.2 | **Missing** (CI also tag-pins its own actions) |
| 15 | Least-privilege token documented; no `pull_request_target`; fork PRs safe | M | H-ish (GitHub blocks `pull_request_target` by default from 2026-12-02 on public repos) | s.2 | **Met**: README uses `pull_request`, `contents: read`, `pull-requests: write`; fork PRs read-only |
| 16 | Reproducible build | C | P | s.2 | Unknown / not tested |
| 17 | Air-gapped install bundle (no internet on runner) | S | P (regulated/defence) | s.1 | **Fails**: needs npm registry at run time |
| 18 | GitHub Marketplace listing, verified creator | C | P | s.2 | **Missing** |
| C. Product hygiene for enterprises |||||
| 19 | Configuration file (ignore paths, area names/owners, service map, risk levels, custom clients) | M | P | s.5 | **Missing** (audit H1) |
| 20 | Stated support matrix (languages, framework versions, OS, repo-size limits) | M | P | s.5 | **Missing** (audit 5.4) |
| 21 | Scale: cost proportional to diff; p95 < ~2 min on 10k-50k-file repos; time budget degrading to "unclear"; cache | M | P (CI wait thresholds 5-15 min) | s.5 | **Fails**: n8n 4-file PR >20 min (audit P1) |
| 22 | Stable output contract: published JSON Schema + compatibility policy | M | P | s.4 | **Partial**: TS type only (audit H4) |
| 23 | JUnit XML and SARIF outputs; check-run annotations | S | P | s.4 | **Missing** for impact path |
| 24 | CLI recipes for GitLab CI, Jenkins, Azure Pipelines; then native MR/PR comments | S | P (59% of orgs not primarily on Actions) | s.4 | **Missing** (GitHub only; CLI generic) |
| 25 | Test-management integration (Xray/Zephyr, TestRail, qTest): create run from TEST list, record SKIP reasons | S | P | s.4 | **Missing** |
| 26 | Chat notifications (Teams, Slack) | C | P | s.4 | **Missing** |
| 27 | Diagnostics bundle for wrong answers (SHAs, version, config hash, ledger) | S | P | s.6 | **Missing** (audit 5.7) |
| 28 | LTS release line and support SLA | S | P | s.1, s.7 | **Missing** |
| D. Accuracy governance |||||
| 29 | Shadow/advisory mode and gate mode as explicit settings | M | P (Develocity simulation precedent) | s.6 | **Partial**: advisory by nature; no shadow capture or gate policy |
| 30 | Published, measured wrong-skip rate on real customer code with confidence bound; known-limitations list per version | M | P (MRM, tool qualification) | s.6 | **Missing**: fixtures + 2 OSS apps only |
| 31 | Contract terms: limited warranty, liability cap, human-ownership clause | S | P | s.6, s.7 | MIT "AS IS" only |
| E. Audit evidence (regulated buyers) |||||
| 32 | Report records tool version, config hash, base/head SHAs, run ID, timestamp; tamper-evident hash | S (M for regulated) | H in safety/GxP record rules | s.3 | **Partial**: SHAs yes; no config, no hash |
| 33 | Traceability fields: change-request ID, requirement IDs, test-case IDs per area | S (M for regulated) | H (IEC 62304 7.4, IEC 61508-3 7.5.2.6, PCI 6.5.1) | s.3 | **Missing** |
| 34 | Sign-off block: who accepted skips/unclears, when, role | S (M for regulated) | H (PCI 6.5.1 approval; SOX/DORA segregation) | s.3 | **Missing** |
| 35 | Retention guidance beyond 30-day artefact; export (PDF/archival HTML) | S | H (record retention rules) | s.3 | **Partial**: 30-day artefact (`action.yml:123`) |
| 36 | Tool qualification kit: tool safety manual, use cases, validation suite customer can rerun, error reporting, TCL/TQL rationale | C (M for automotive/avionics/rail/medical) | H (ISO 26262-8 cl.11; DO-330; IEC 61508-3 7.4.4; EN 50716 6.7) | s.3 | **Missing**; mutants and probes are a strong seed |
| F. Accessibility and localisation |||||
| 37 | WCAG 2.2 AA audit of report.html/PR comment; ACR/VPAT | S (M for public sector) | H in public procurement (EN 301 549, Section 508) | s.8 | **Partial**: ARIA present, no audit/ACR |
| 38 | Localisation of report strings | C | P | s.8 | **Missing** (English only) |

(2) Regulated-industry opportunity and what it requires (summary of section 3):
- Where CIA is mandated: medical devices (IEC 62304 6.2/7.4; FDA QMSR since 2026-02-02 via ISO 13485 design-change control), functional safety (IEC 61508-3 7.1.2.9, 7.5.2.6, 7.8), automotive (ISO 26262-8 clause 8; ASPICE SUP.10), avionics (DO-178C change control 7.2.4-7.2.5; FAA AC 00-69 CIA best practices), rail (EN 50716:2023, replacing EN 50128), payments (PCI DSS v4.0.1 6.5.1), EU finance (DORA Art. 9(4)(e) + RTS 2024/1774 Art. 17), US listed companies (SOX ITGC change management). Pharma GxP tools fall under GAMP 5 2nd ed. and FDA CSA (reissued 2026-02-03): risk-based assurance, so a QA-advisory tool is low-to-medium risk and needs lighter validation than device software.
- The opportunity: these regimes already force teams to write an impact analysis per change by hand; Teslon's per-area evidence, "repeat these, not those, because" structure and held-unclear rule map directly onto the IEC 61508-3 wording ("which modules are impacted, which activities must be repeated"). No competitor in the teammate's landscape offers machine-proved skips; ML test-selection tools have silent misses, which is the opposite of what an assessor wants.
- What it requires before it can be audit evidence: traceability IDs (change request, requirements, test cases), named human sign-off, immutable retention, tool version/config recorded, a tool qualification or assurance package, and validation on customer-like code. Without these Teslon is "input to the engineer's CIA", not the CIA record. Safety domains also need language coverage Teslon lacks (C/C++, Ada, embedded, MATLAB/Simulink); its current Java/Spring + Angular/Vue reach fits finance, insurance, pharma QMS and medtech back-office/SaMD web stacks first.
- Best first regulated segment (inference): banking/payments and insurance (Java/Spring dominant [Mem], PCI/SOX/DORA want per-change impact+approval+test evidence, no tool qualification standard), then SaMD/medtech web software under IEC 62304, then automotive/rail only after a qualification kit and C/C++ support.

(3) The ten things an enterprise security reviewer will ask first (and Teslon's honest answer today):

| # | Question | Teslon answer today |
|---|---|---|
| 1 | Does any code, metadata or telemetry leave our runner? Prove it. | No (SECURITY.md, engine no-network test); only git-host API calls with our token. Offer an egress-blocked demo run. |
| 2 | Does the output ever contain secrets or source excerpts, and where is it stored and for how long? | **Yes, currently**: secret values appear in report.html/json; artefact kept 30 days. Must fix before launch. |
| 3 | What permissions does the Action need, and does it use `pull_request_target`? | `contents: read`, `pull-requests: write`; uses `pull_request`; fork PRs read-only. Good. |
| 4 | How do we pin it, and does it pull anything at run time? | No tags; README says `@main`; runs `npm ci` + build from the registry each run; inner actions tag-pinned. Fails org SHA-pinning policy. |
| 5 | Where is the SBOM, and are releases signed with provenance? | None. |
| 6 | Who maintains it, how do you handle vulnerabilities, and what is your patch SLA? | Private GitHub advisory only; no SLA, no supported-version policy; maintainer base not stated. |
| 7 | Does it use AI/ML or send prompts to a model provider? | No AI in decisions; nothing sent. Strong answer; put it in writing. |
| 8 | What third-party dependencies and licences ship, and what is your own licence? | ~30 permissive deps, 0 known vulns (audit); MIT; own packages lack licence fields. |
| 9 | Has it been independently tested (pen test / code review) and do you hold SOC 2 or ISO 27001? | No. |
| 10 | What happens when it is wrong, how would we know, and who is liable? | Holds "unclear" by design, but no measured miss rate on real code, no shadow mode capture, no wrong-answer bundle; MIT disclaims all liability. |

### Inferences
- The must list splits into two weeks of release engineering (items 8-13, 2, 10) and a longer product track (scale, config, measured accuracy, audit evidence). The release-engineering items are cheap and remove the most common hard "no" from security reviewers.

### Gaps
- Many standard clauses are from memory or secondary summaries because standards are paywalled and several hosts (faa.gov, johner-institute, survey.stackoverflow.co, blog.jetbrains.com) were not reachable from this session; they are tagged [Mem] or [S] and should be checked before external use.
