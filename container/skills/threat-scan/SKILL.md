---
name: threat-scan
description: 2-hour threat intelligence scan — reads full articles from RSS feeds, triages with LLM judgment, proactively searches for emerging threats, and kicks off research for anything significant.
---

# /threat-scan — 2-Hour Threat Intelligence Cycle

This skill runs every 2 hours as a scheduled task. It replaces simple keyword matching with your actual judgment as a CTI analyst.

You have two jobs:

1. **Feed triage** — Pull RSS feeds, read the actual articles, decide what's worth researching
2. **Proactive hunt** — Search the web for emerging threats the feeds might not have caught yet

---

## Part 1: Feed Triage

### Step 1: Fetch RSS feeds

Read `../global/feeds.yaml` and fetch all RSS/Atom feeds. For each feed, extract article entries (title, URL, published date, snippet).

### Step 2: Deduplicate

For each article URL, check if it's already been processed:

```bash
grep -rl "ARTICLE_URL" ../global/summaries/
```

If the URL appears in any existing summary — skip it. Already covered.

### Step 3: Read and triage new articles

For every new (non-duplicate) article, **actually read the article**:

1. Open the article URL with `agent-browser open <url>`
2. Get the page content with `agent-browser snapshot` or `agent-browser get text` on the main content area
3. Read enough of the article to understand what it's about (you don't need to extract every detail — that's the research skill's job)

Then make a judgment call. Ask yourself:

- **Is this a real threat, vulnerability, or incident?** Keep it.
- **Does this describe attacker TTPs, malware, or infrastructure?** Keep it.
- **Is this a CVE with active exploitation or high severity?** Keep it — and flag it as urgent.
- **Is this a supply-chain compromise, zero-day, or mass-exploitation event?** Keep it — flag as CRITICAL.
- **Is this just vendor marketing, a listicle, career advice, or a product launch?** Skip it.
- **Is this a generic "how to secure your org" article with no specific threat intel?** Skip it.

You are a CTI analyst. Use your judgment. The keyword list is dead — you decide what matters.

### Step 4: Batch for research

Group the kept articles by topic (same threat actor, campaign, CVE, malware family, or incident). Write results to `investigation.md`:

```markdown
# Threat Scan — YYYY-MM-DD HH:MM UTC

## Triaged Articles

### [1] {Source} — "{Title}"
URL: {url}
Published: {date}
Assessment: {why you kept this — 1 sentence}
Urgency: [CRITICAL | HIGH | NORMAL]

### [2] ...

## Topic Groups

### Topic A: {Descriptive Name}
Articles: [1], [3]
Urgency: CRITICAL
Notes: {what makes this interesting, links to chase}

### Topic B: {Descriptive Name}
Articles: [2]
Urgency: NORMAL
Notes: {context}

## Skipped (for the record)
- "{Title}" ({Source}) — {why skipped, 3-5 words}
- ...
```

---

## Part 2: Proactive Threat Hunt

After processing feeds, **actively search** for threats the RSS feeds may have missed. This is critical — feeds are slow, and time-sensitive threats (supply-chain attacks, actively exploited zero-days) often surface on Reddit, social media, and vendor advisories before the big blogs write about them.

### Search strategy

Run **targeted, specific searches**. Do NOT search for vague terms like "latest cybersecurity news" or "new supply chain attack." Instead:

**Category 1: Emerging vulnerabilities & exploitation**
- Search for recently published CVEs with proof-of-concept or active exploitation
- Check CISA KEV (Known Exploited Vulnerabilities) catalog for new additions
- Search for "[software name] vulnerability 2026" for major platforms (Exchange, Confluence, Ivanti, Fortinet, Palo Alto, Cisco, VMware, etc.)
- Look for "proof of concept" or "exploit" alongside recent CVE IDs you've seen in feeds

**Category 2: Supply-chain & package compromise**
- Search Reddit r/cybersecurity, r/netsec for posts about compromised packages, backdoors, or supply-chain incidents
- Search for "[package manager] malicious package" (npm, PyPI, Maven, NuGet, crates.io)
- Check for GitHub Security Advisories on widely-used dependencies
- Search for "typosquatting" or "dependency confusion" incidents

**Category 3: Active campaigns & threat actor moves**
- Check what threat actors you've already covered in `../global/summaries/` — search for new activity from those actors
  ```bash
  grep -rh "Threat Actor:" ../global/summaries/ | sort -u
  ```
- Search for those actor names + "2026" or "new campaign" or "targets"
- Search r/cybersecurity for high-engagement posts (sort by hot/top) about breaches, ransomware, or APT activity

**Category 4: Time-sensitive incidents**
- Search for "data breach" or "ransomware attack" in the last 24 hours
- Look for CISA/CERT advisories or emergency directives published today
- Check for critical infrastructure targeting (water, energy, healthcare, telecom)

### How to search

Use web search tools with specific, targeted queries. Examples:

```
"CISA KEV" new additions April 2026
site:reddit.com/r/cybersecurity supply chain compromise
site:reddit.com/r/netsec zero day
"actively exploited" CVE-2026
npm malicious package 2026
PyPI backdoor 2026
[known threat actor] new campaign 2026
critical vulnerability Fortinet OR Ivanti OR "Palo Alto" 2026
```

For Reddit specifically, use `agent-browser` to read the actual posts and comments — the discussion often has more context than the linked article.

### Dedup against existing coverage

Before flagging anything from your searches, check if you've already covered it:

```bash
grep -ril "<topic or CVE>" ../global/summaries/
```

Only flag genuinely new findings.

---

## Part 3: Output & Handoff

After both feed triage and proactive hunting:

1. **Merge results** — Combine feed articles and search findings into the `investigation.md` topic groups
2. **Prioritize** — Order topics by urgency. CRITICAL items (active exploitation, supply-chain compromise, zero-days) go first.
3. **Kick off research** — For each topic group, proceed to the `/research` skill workflow. Follow links to primary sources, extract IOCs/TTPs, produce topic summaries with detection rules.
4. **Report skips** — Log what you intentionally skipped and why (in the Skipped section). This creates an audit trail.

### Wake-up criteria for immediate research threads

If you find something CRITICAL during the scan:
- Active zero-day exploitation
- Supply-chain compromise affecting widely-used packages
- Mass-exploitation campaign (e.g., Ivanti/Fortinet/Exchange chain)
- Ransomware hitting critical infrastructure

Start researching it immediately — don't wait for the daily report cycle.

---

## What NOT to do

- **Don't keyword match.** Read the article. Think about it. Decide.
- **Don't skip the proactive search.** RSS feeds are necessary but not sufficient. The search step catches what feeds miss.
- **Don't search for vague terms.** "Latest supply chain attack" returns garbage. Be specific: name the package manager, the software, the threat actor.
- **Don't process articles you've already covered.** Always dedup first.
- **Don't read every word of every article during triage.** Skim enough to decide (headline, first few paragraphs, conclusion). Deep reading is the research skill's job.
- **Don't generate rules during triage.** That's the rule-gen skill's job after research.
