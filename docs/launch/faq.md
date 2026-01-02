# Orbis FAQ (Leadership & Teams)

**Is this replacing Allure?**  
For Playwright reporting, yes—Orbis is the default path. It adds Live Mode, trust/regressions, and release readiness. Teams can keep Allure in parallel during transition if needed.

**Does this slow down test execution?**  
Overhead is minimal: JSON writes plus attachment copies already produced by tests. No external DB.

**How reliable are the scores?**  
Trust and readiness are deterministic: they use history (pass/fail/flaky), regressions vs last run, and high-trust failures. Rationale is shown; no black box.

**What happens if data is missing?**  
If no history exists, trust defaults to a neutral middle. If no previous run, regressions are empty. Reports still render with what’s available.

**Can teams opt out?**  
Default is to use Orbis for Playwright suites. Opt-out is allowed with a stated reason (e.g., non-Playwright stack, temporary migration).

**Is Live Mode required?**  
No. Live is for long/critical suites. Static mode remains the source of record for sign-off.

**Where is the data stored?**  
Local `.orbisreport` folder (JSON + attachments). No external services or DB.

**What if the port is taken?**  
Use `ORBIS_PORT` or `--port`; Orbis auto-increments to find a free port.

