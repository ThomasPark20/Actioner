# Actioner — Daily Autonomous Pipeline (routine prompt)

Paste this as the prompt for a once-daily Claude Code Routine. Connect a GitHub repo (the routine clones it) so detections and digests are committed and deduplicated across days. The routine runs the **full pipeline**: scan feeds → triage → for each qualifying item, research the threat, generate + validate + critic-gate detections, and commit them. You review the committed detections and digest afterward.

> ## Before you schedule — two prerequisites (skip these and the run fails at launch)
>
> **1. GitHub access is via the Claude GitHub *App*, not the chat connector.** The cloud routine clones and pushes using the [Claude GitHub App](https://github.com/apps/claude/installations/select_target) — installing the claude.ai GitHub *connector* is not enough. Your target repo **(private is fully supported)** must be in the App's **Repository access** list with **read & write**. If it isn't scoped in, the run aborts with `github_repo_access_denied`. Commits/PRs are authored through the App's identity (co-attributed to you), not your personal account directly.
>
> **2. The Actioner plugin must be reachable in the cloud session.** This prompt calls the `ingest` skill and the `researcher`/`critic` subagents. A fresh cloud session has only the cloned repo — **a plain sink repo does not carry the plugin.** Make the plugin available in that environment (install from the marketplace the routine loads, or vendor it into the cloned repo) before relying on the schedule. Step 0 below stops cleanly if it's absent.
>
> **Always do a manual test run and read the first `digests/` entry before trusting the daily schedule.** Note too that the cron is fixed UTC — `0 10 * * *` is 6 AM EDT but 5 AM after the November EST switch.

---

## Step 0 — Precondition check

This pipeline depends on the Actioner plugin's `ingest` skill and the `researcher`/`critic` subagents. If those are **not** available in this session, STOP: write a `digests/YYYY-MM-DD.md` note saying the Actioner plugin is not present in the cloud environment and the run cannot proceed, commit it, and exit. **Do not improvise the pipeline** — a faked run is worse than a skipped one.

## Step 1 — Install the toolchain (inline)

So cloud rule generation compile-checks and converts for real (cloud egress allows package managers):

```bash
pipx install sigma-cli || pip install --user sigma-cli
pipx inject sigma-cli pysigma-backend-splunk pysigma-backend-crowdstrike \
  || pip install --user pysigma-backend-splunk pysigma-backend-crowdstrike
( apt-get update && apt-get install -y yara snort suricata ) || brew install yara snort suricata
```

Verify `sigma list targets` shows `splunk` + `log_scale` (CrowdStrike LogScale), and `yarac --version` / `snort -V` / `suricata -V` succeed. Record the snort config path as `$SNORT_LUA`. If a tool genuinely can't be installed, continue — rules it would have checked are labeled `⚠️ uncompiled (structural check only)`, never dropped.

## Step 2 — Triage feeds (ingest)

Use the `ingest` skill: read `feeds.yaml`, fetch every feed (public via web_fetch; `type: repo` from the connected repo), filter noise, apply the **decision criteria** below, and deduplicate against `digests/` and `summaries/` in the repo. Result: the **qualifying set**.

## Step 3 — Research + gate each qualifying item

You are the orchestrator (subagents can't nest). For each item in the qualifying set, run the full chain:

1. **`researcher` (DRAFT):** investigate, run the viability gate, generate **PoC/advisory-specific** detections (default altitude), validate (compile + Splunk/CrowdStrike convert). Output location = this repo.
2. **`critic`:** production-readiness gate — per-rule confidence + keep/fix/drop.
3. **`researcher` (REVISE):** apply the verdict, re-validate changed rules, finalize. The repo is a sink, so write standalone rule files (`rules/{sigma,yara,snort,suricata}/<slug>.*`) **and** the summary (`summaries/<slug>.md`).
4. **Commit** the report + rule files. If the viability gate found no production-ready detection, record that one-liner in the summary and move on — don't commit an empty or broad rule.

## Step 4 — Commit the digest

Write `digests/YYYY-MM-DD.md` and commit it:

```markdown
# Actioner Daily — YYYY-MM-DD

**N items researched, M detections committed** from F feeds.

| Source | Title | Outcome | Confidence | Link |
|--------|-------|---------|------------|------|
| Cisco Talos | New 0-day in <product>, exploited ITW | 3 rules committed | high | [Read](https://…) |
| The Record | Malicious npm package <name> | no production-ready detection (generic) | — | [Read](https://…) |
```

If nothing qualified, commit a one-line `No qualifying items today. F feeds scanned.`

## Step 5 — Optional notification

If a notification channel is configured, post a one-line summary (N researched, M committed, link to the digest).

---

## Decision criteria  ✏️ EDIT THIS BLOCK

> This is the one part meant to be edited. It defines what's worth **researching and committing a detection for** (not just surfacing). Change it to match what *you* want acted on. Everything above is mechanics; this is judgment.

**Research an item only if it describes a real, newly-disclosed threat that warrants a near-term detection and is likely to yield a production-ready (PoC/advisory-specific) rule.** Specifically:

- A **new vulnerability** (CVE or pre-CVE 0-day) in widely-deployed software, especially with active exploitation in the wild or a public PoC/exploit available.
- A **software supply-chain attack** — malicious/compromised package (npm/PyPI/etc.), poisoned dependency or build pipeline, stolen signing key, or a trojanized update.

Exclude, even if technical:

- Vulnerabilities already patched and quiet, with no active exploitation and no public exploit.
- Threat-actor profiles, geopolitical/strategic analysis, and incident retrospectives with no fresh, actionable indicators.
- **Generic advisories with no concrete artifacts** — the viability gate would produce no rule anyway, so don't spend the research tokens.
- Anything that does not call for a detection in the near term.

When an item is a borderline match, keep it — the viability gate and the critic will drop it later if it can't yield a production-ready rule.

---

## Notes

- **Cost:** each qualifying item runs research + critic + revise. The decision criteria are your cost control — tighten them if a daily run does more than you want.
- **Run cap:** Pro allows 5 routine runs/day; 1×/day fits comfortably. Minimum interval is 1 hour.
