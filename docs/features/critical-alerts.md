# Critical Alerts

<Wordmark /> scans all RSS feeds every 2 hours. Critical items get immediate research in dedicated threads.

## Example

```
Thread: Critical: CVE-2026-1234 Active Exploitation
──────────────────────────────────────────────────
Actioner: A critical zero-day vulnerability (CVE-2026-1234) in Apache
       Struts is under active exploitation. CISA has issued an
       emergency directive.

       [attached: 2026-04-02-critical-cve-2026-1234.md]

You: "Generate detection rules"
Actioner: "Here are 2 Sigma rules targeting the exploitation TTPs..."
```

## How It Works

A lightweight script runs first (zero tokens):

1. Fetches all RSS feeds from `feeds.yaml` (11 CTI sources)
2. Parses entries, deduplicates against existing summaries
3. Classifies articles as critical or non-critical

**Critical keywords:** APT, CVE, active exploitation, zero-day, ransomware, data breach, CISA advisory, emergency directive, RCE

**If nothing critical:** `{wakeAgent: false}`. No agent invocation. Zero cost.

**If critical items found:** Agent wakes up and creates a research thread for each critical topic, running the full [research pipeline](./research-pipeline).

## Cost

Most scans cost nothing. Just a Node.js script fetching RSS feeds. You only pay for agent tokens when something genuinely critical appears.

## Non-Critical Items

New non-critical articles are saved for the [daily briefing](./daily-briefing). They don't trigger immediate research.

## Deduplication

Before creating a thread, <Wordmark /> checks:
- Existing summaries for the same topic/CVE
- Active research threads with similar names
- Duplicate articles from multiple feeds about the same event

One topic, one thread.
