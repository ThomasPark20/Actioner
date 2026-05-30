---
name: setup
description: "Set up or extend Actioner. Use for 'set up actioner', 'configure actioner', 'install the validation toolchain', 'connect a github repo for detections', 'schedule the daily routine', or 'add a chat channel'. A router, not a wall: the core already works after install — this offers optional capabilities one at a time and the user picks what they want."
---

# Actioner — Setup (progressive disclosure)

Actioner works the moment the plugin is installed: `/actioner:research <threat>` produces a report immediately. Everything else is an optional layer. This skill is a **router** — present the layers, let the user pick, then walk only the chosen one. Never force a multi-step gauntlet. If the user named a specific thing ("install the toolchain"), skip straight to that section.

## Open with the menu

> Actioner is installed and `/actioner:research` works right now. Want to add any of these? (Skip any — each can be added later just by asking.)
> - **Validation toolchain** — compile-check *and* convert every rule with the real tools (recommended)
> - **Save to GitHub** — keep detections in a repo, and feed private intel in
> - **Daily autonomy** — once a day, research qualifying feed items and commit detections (hands-off)
> - **Chat / mobile** — drive Actioner from your phone, Discord, Telegram, or iMessage
> - **Smoother approvals** — pre-allow exactly the tools research uses, so runs aren't approval-heavy (optional, transparent)

Use a multi-select question. Then dispatch to the matching section(s). Each degrades gracefully if skipped — say so, don't pressure.

---

## Validation toolchain (recommended)

Makes the validation gate real. Without it, rules are emitted with a structural check only and labeled `⚠️ uncompiled (structural check only)` — never passed off as compiled. **All four rule formats are compile-checked with equal rigor; the toolchain installs all four compilers.** Claude Code is the runtime, so **you (the agent) install these inline** — don't hand the user a list of commands to run. Assume Python and a system package manager (Homebrew/apt) are present; if a prerequisite is genuinely missing, say so.

Install and verify each:

- **Sigma + Splunk/CrowdStrike backends:** `pipx install sigma-cli` (or `pip install --user sigma-cli`), then add the backends — `pipx inject sigma-cli pysigma-backend-splunk pysigma-backend-crowdstrike` (or `pip install pysigma-backend-splunk pysigma-backend-crowdstrike`). Verify: `sigma version`, and `sigma list targets` shows **`splunk`** and **`log_scale`** (CrowdStrike LogScale — these power the portability check).
- **YARA:** `brew install yara` / `apt-get install -y yara`. Verify `yarac --version`.
- **Snort:** `brew install snort` / `apt-get install -y snort`. Verify `snort -V`. Locate a working config and record its path as `$SNORT_LUA` (try `/etc/snort/snort.lua`, then `"$(brew --prefix)/etc/snort/snort.lua"`, else `find "$(brew --prefix)" -name snort.lua 2>/dev/null | head -1`); sanity-check `snort -T -c "$SNORT_LUA"` exits 0. rule-gen uses `$SNORT_LUA` for compile checks.
- **Suricata:** `brew install suricata` / `apt-get install -y suricata`. Verify `suricata -V`.

Snort and Suricata are **required**, not optional — Actioner compile-checks network rules exactly like Sigma and YARA. The cloud routine installs the same set inline as its first step.

## Recommended permissions (optional — smoother, transparent approvals)

Research runs a few tools: it fetches public advisories, runs the rule compilers, and writes the report. By default Claude Code asks before each call, which gets repetitive. You can **pre-allow exactly what the pipeline needs — and nothing more** — so runs are hands-off. **Show the user this list and the reason for each, then write it only with their explicit OK. Never enable a bypass / "dangerously skip permissions" mode.**

Offer to add to the project's `.claude/settings.json` under `permissions.allow`:

| Permission | Why |
|---|---|
| `WebSearch`, `WebFetch` | fetch public threat-intel sources (read-only) |
| `Read`, `Grep`, `Glob` | read sources / prior reports; locate the snort config (read-only) |
| `Write`, `Edit` | write the report and the rule files |
| `Bash(sigma:*)` | Sigma compile + Splunk/CrowdStrike conversion |
| `Bash(yarac:*)` | YARA compile |
| `Bash(snort:*)` | Snort compile |
| `Bash(suricata:*)` | Suricata compile |

That is the **entire** surface — fetch advisories, run four open-source rule compilers, write detections to the repo. **No blanket `Bash`, no bypass mode** (rule-gen writes temp rule files with the Write tool, so the only shell commands are those four validators).

**Prefer not to pre-grant?** Skip this — the first research run prompts ~5 times (web fetch + the four compilers); choose **"always allow"** on each and you won't be asked again. Tell the user which prompts to expect and why, so nothing is a surprise. (The VS Code extension has no bypass mode, so this allowlist — or the one-time "always allow" — is the path to a hands-off run there.)

## Save to GitHub (repo sink)

Makes detections durable and doubles as the inbound path for private intel.

1. **Connect GitHub — and be precise about *how*.** There are two different GitHub hookups and conflating them is the #1 source of confusion:
   - The **claude.ai GitHub *connector*** (the MCP connector in the connectors list) is for chat-style tool calls. The **daily routine does NOT use it to clone/push.**
   - The **Claude Code GitHub *App* installation** is what the routine's cloud environment uses to `git clone` and commit. **This is the one that matters for the routine.** Install/configure it at <https://github.com/apps/claude/installations/select_target>.
   - **Private repos are fully supported** — private is *not* the blocker. The blocker is *scope*: under the App's **Repository access**, the target repo must be included (either "All repositories" or "Only select repositories" with the repo explicitly added), with **read & write** (contents + pull-requests). If it isn't scoped in, a routine run fails at launch with `github_repo_access_denied`.
2. Ask for the repo (`owner/name`) and confirm the layout: `rules/{sigma,yara,snort,suricata}/`, `summaries/`, `digests/`.
3. Record it as the default output location (sink) for `/actioner:research` and the commit target for the daily routine. **When a sink is set, runs also write standalone rule files; with no sink, output stays in the working directory.**
4. **"Commits as me" — set expectations.** The routine commits/opens PRs through the **GitHub App's** identity (token), co-attributed to you — it does **not** impersonate your personal account as if you pushed by hand. It *can* open PRs on a private repo once the App is scoped to it.
5. **Private intel (advanced):** internal sources can't be reached from the cloud (no localhost/LAN route). Instead, commit intel files into a private repo (or an `intel/` path) and reference them in `feeds.yaml` with `type: repo`. Note honestly: this needs something on the user's side to populate that repo — it is not "just add a URL."

## Daily autonomy (routine)

A once-a-day **full pipeline**, serverless on Anthropic's cloud — no laptop required. It does **not** just surface articles; it researches qualifying items and commits detections.

> **Two prerequisites before scheduling — verify these first, or the run fails at launch:**
> - **GitHub App scoped to the repo.** See "Save to GitHub" above. The routine clones/pushes via the **Claude GitHub App** (not the chat connector); the target repo — private is fine — must be in the App's repo-access list with read & write. Missing this is the `github_repo_access_denied` error.
> - **The Actioner plugin must be reachable in the cloud session.** The routine prompt calls the `ingest` skill and the `researcher`/`critic` subagents. A fresh cloud session has only the cloned repo and zero other context — **a plain sink repo does not carry the plugin.** Make the plugin available (e.g. install it from the marketplace the routine loads, or commit/vendor it into the cloned repo), or the run can't execute the pipeline. The shipped prompt includes a precondition check that **stops and writes a `digests/` note** if the plugin is absent, rather than faking the pipeline. **Always do a manual test run (`/schedule` → run now, or the routine's "Run" button) and check the first digest before trusting the schedule.**

1. Open claude.ai/code routines (or `/schedule` in the CLI) and create a daily routine.
2. Use the prompt at `${CLAUDE_PLUGIN_ROOT}/routine/actioner-daily.md`. The remote session starts cold, so **embed the prompt's full text inline** — don't reference the file path (the cloud agent can't read your local disk). Point out the **editable decision-criteria block** — that's what the user tunes to control what gets acted on (default: new vulns with active exploitation / public PoC, and supply-chain attacks).
3. Select the GitHub repo (the routine clones it; `rules/`, `summaries/`, and the daily `digests/` commit there).
4. The routine **installs its toolchain inline as step 1** — the same sigma-cli + Splunk/CrowdStrike backends + yara + snort + suricata — so cloud rule generation compile-checks and converts for real (cloud egress allows package managers).
5. **Schedule is fixed UTC.** A cron like `0 10 * * *` is 6 AM during EDT but drifts to 5 AM after the Nov EST switch — tell the user this so the drift isn't a surprise.
6. Mention the run cap (Pro allows 5 routine runs/day; 1×/day fits easily) and the 1h-minimum interval.

## Chat / mobile (optional surfaces)

All of these run a session on a machine (your laptop, or an always-on VPS); they're front-ends, not serverless.

- **Remote Control:** enable it in `/config` (or pair via the mobile app). Your phone becomes a window onto your local session — full toolchain present, so research + validation run for real from your phone. Research preview.
- **Channels:** native Claude Code Channels for Discord / Telegram / iMessage. Requires Claude Code v2.1.80+, the Bun runtime, and a claude.ai login. Needs a running session (laptop on, or a VPS). Research preview. This is the native replacement for the old self-hosted Discord/Telegram bot.

---

## Graceful degradation (state this, don't pressure)

- No toolchain → structural-only validation, applied **uniformly to all four formats**, clearly labeled.
- No GitHub → outputs stay in the working directory (no standalone rule files).
- No routine → on-demand only.
- No chat/mobile → terminal / IDE / phone via Remote Control.

A missing optional layer never hard-fails anything.
