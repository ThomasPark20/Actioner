# Actioner — Daily Autonomous Pipeline (routine prompt)

Paste this as the prompt for a once-daily Claude Code Routine. The routine clones two repos at runtime: your **detections sink** (a GitHub repo you connect, where rules + digests are committed and deduplicated across days) and the **public Actioner toolkit repo** (where the pipeline's instructions live). It runs the **full pipeline**: scan feeds → triage → for each qualifying item, research the threat, generate + validate + critic-gate detections, and commit them. You review the committed detections and digest afterward.

> ## Before you schedule — two prerequisites
>
> **1. ⚠️ Set the environment's network Access level to `Full` (or `Custom` + feed domains).** The #1 silent failure. A routine's environment defaults to **`Trusted`** = allowlisted domains only (package registries, GitHub, cloud SDKs), so the egress proxy **403s every CTI feed** — triage sees ~1 feed and the run looks fine on almost no data. No UA/TLS/proxy trick fixes an egress allowlist. Set it in the **environment editor** (not the routine form): `Full` (any domain) or `Custom` (defaults + your feed domains). Miss it and the digest's coverage line reads near-zero — the `Trusted`-egress signature.
>
> **2. GitHub access is via the Claude GitHub *App*, not the chat connector.** The cloud routine clones and pushes the **sink repo** using the [Claude GitHub App](https://github.com/apps/claude/installations/select_target) — installing the claude.ai GitHub *connector* is not enough. Your sink repo **(private is fully supported)** must be in the App's **Repository access** list with **read & write**. If it isn't scoped in, the run aborts with `github_repo_access_denied`. Commits/PRs are authored through the App's identity (co-attributed to you), not your personal account directly. *(The toolkit repo is public, so it needs no scoping.)*
>
> **Always do a manual test run and read the first `digests/` entry before trusting the daily schedule.** Note too that the cron is fixed UTC — `0 10 * * *` is 6 AM EDT but 5 AM after the November EST switch.

---

## Step 0 — Bootstrap the toolkit (clone the public Actioner repo)

The pipeline's logic lives in instruction files, not in a pre-installed plugin. Fetch them first:

```bash
git clone --depth 1 https://github.com/ThomasPark20/Actioner /tmp/actioner
```

You will execute the pipeline by **reading and following the instruction files** under `/tmp/actioner` — you do **not** need the Actioner plugin registered as a Claude Code component. Treat `/tmp/actioner` as the read-only toolkit root; any relative paths inside those files (e.g. `templates/`) resolve against it. Key files:

- **Feeds:** `/tmp/actioner/feeds.yaml`
- **Triage instructions:** `/tmp/actioner/skills/ingest/SKILL.md`
- **Research / IOC / rule-gen instructions:** `/tmp/actioner/skills/research/SKILL.md`, `.../ioc-extract/SKILL.md`, `.../rule-gen/SKILL.md`
- **Templates:** `/tmp/actioner/templates/`
- **The `researcher` and `critic` roles:** `/tmp/actioner/agents/researcher.md` and `/tmp/actioner/agents/critic.md`. Run **each as a separate `Task` (general-purpose) subagent**, passing that file's full body as the subagent's operating instructions. This preserves the isolated-context draft→critic→revise separation the pipeline depends on (the orchestrator must not collapse all three into one context).

**The detections SINK is the routine's cloned `sources` repo (the working directory), NOT `/tmp/actioner`.** All commits — `rules/`, `summaries/`, `digests/` — go to the sink repo.

If the clone fails (network/repo issue), STOP: write `digests/YYYY-MM-DD.md` in the sink repo noting the toolkit could not be fetched, commit it, and exit. **Do not improvise the pipeline** — a faked run is worse than a skipped one.

## Step 0.5 — Preflight the write path (fail fast, before any expensive work)

The push to the sink is the **only** step that can't be retried into success and that the entire run is staked on — so prove it works *now*, not after a full research pass. Note: the sink push goes through a **separate git-auth proxy, independent of the network Access level** — "feeds reached" says nothing about whether push works. And Routines restrict pushes to **`claude/`-prefixed branches** by default. So work on such a branch and test the push immediately, in the sink repo (the working directory):

```bash
git config user.name "actioner"; git config user.email "actioner@actioner.invalid"  # .invalid TLD never maps to a real GitHub account — keeps a stranger off your contributors list
git checkout -b claude/actioner-$(date -u +%F) 2>/dev/null || git checkout claude/actioner-$(date -u +%F)
git commit --allow-empty -m "actioner: preflight $(date -u +%F)" -q
git push -u origin HEAD 2>&1 | tee /tmp/push-preflight.log   # MUST succeed
```

If the push fails, **STOP — do not run the pipeline** (don't burn the run's budget on artifacts that can't be persisted). Diagnose from the error / `x-deny-reason` header and, on any branch you *can* push, leave a `digests/` note with the cause + fix:
- **branch denied** → enable **"Allow unrestricted branch pushes"** on the routine, or stay on the `claude/` branch + PR (the default flow here).
- **401/403 / scope** → the connected account lacks **write** on the sink (authorize the GitHub App on it), or lacks **`workflow`** scope if anything is written under `.github/`.
- **5xx on the git-auth proxy** → genuine infra; check status.claude.com and re-run later (this one *can* recover by waiting; the others can't).

All subsequent commits go on this `claude/…` branch.

## Step 1 — Install the validation toolchain (inline)

So cloud rule generation compile-checks and converts for real (cloud egress allows package managers):

```bash
pipx install sigma-cli || pip install --user sigma-cli
pipx inject sigma-cli pysigma-backend-splunk pysigma-backend-crowdstrike \
  || pip install --user pysigma-backend-splunk pysigma-backend-crowdstrike
( apt-get update && apt-get install -y yara snort suricata ) || brew install yara snort suricata
```

Verify `sigma list targets` shows `splunk` + `log_scale` (CrowdStrike LogScale), and `yarac --version` / `snort -V` / `suricata -V` succeed. Record the snort config path as `$SNORT_LUA`. If a tool genuinely can't be installed, continue — rules it would have checked are labeled `⚠️ uncompiled (structural check only)`, never dropped.

## Step 2 — Triage feeds (ingest)

Follow `/tmp/actioner/skills/ingest/SKILL.md`: read `/tmp/actioner/feeds.yaml`, fetch each feed's RSS/Atom via **web_fetch** (this needs the environment's network Access level set to `Full` — see prerequisites; under `Trusted` most feeds 403), filter noise, apply the **decision criteria** below, and deduplicate against `digests/` and `summaries/` in the sink repo — those are **dedup history only, never a topic source**; topics come only from freshly-fetched feed items. Report feed coverage (reachable/total) in the digest. Result: the **qualifying set**.

## Step 3 — Research + gate each qualifying item

You are the orchestrator (subagents can't nest). For each item in the qualifying set, run the full chain — each role as its own `Task` subagent seeded with the corresponding `agents/*.md` body:

1. **`researcher` (DRAFT)** — seed with `/tmp/actioner/agents/researcher.md`: investigate, run the viability gate, generate **PoC/advisory-specific** detections (default altitude), validate (compile + Splunk/CrowdStrike convert). Output location = the sink repo.
2. **`critic`** — seed with `/tmp/actioner/agents/critic.md`: production-readiness gate — per-rule confidence + keep/fix/drop.
3. **`researcher` (REVISE)** — apply the verdict, re-validate changed rules, finalize. Write standalone rule files (`rules/{sigma,yara,snort,suricata}/<slug>.*`) **and** the summary (`summaries/<slug>.md`) into the sink repo.
4. **Commit** the report + rule files. If the viability gate found no production-ready detection, record that one-liner in the summary and move on — don't commit an empty or broad rule.

## Step 4 — Commit the digest

Write `digests/YYYY-MM-DD.md` in the sink repo and commit it:

```markdown
# Actioner Daily — YYYY-MM-DD

**N items researched, M detections committed** from F feeds.

| Source | Title | Outcome | Confidence | Link |
|--------|-------|---------|------------|------|
| Cisco Talos | New 0-day in <product>, exploited ITW | 3 rules committed | high | [Read](https://…) |
| The Record | Malicious npm package <name> | no production-ready detection (generic) | — | [Read](https://…) |
```

If nothing qualified, commit a one-line `No qualifying items today. F feeds scanned.`

## Step 4.5 — Push the branch and open a PR

All commits are on the `claude/actioner-<date>` branch from Step 0.5. Push it and open a PR to the default branch — this is the platform-native flow (the write path the proxy is built around); **do not push to `master`/`main` directly** unless the routine has "Allow unrestricted branch pushes" on.

```bash
git push origin HEAD
gh pr create --fill --base "$(git remote show origin | sed -n 's/.*HEAD branch: //p')" --head "$(git branch --show-current)" 2>&1 || \
  echo "PR open failed — branch is pushed; open the PR manually or merge it."
```

The pushed branch + PR is the durable result the user reviews. (If `gh` isn't available, the pushed `claude/…` branch alone is enough — the user merges it.)

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
