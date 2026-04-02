# Skill: Ingest

RSS feed ingestion, filtering, deduplication, and topic grouping for CTI articles.

## When to Use

Use this skill during the **passive mode** daily scheduled run to pull fresh threat intelligence from configured RSS feeds. This is the first step in the pipeline — everything downstream (research, IOC extraction, rule generation) depends on clean, deduplicated, topic-grouped article lists.

## Step 1: Read Feed Configuration

Read `feeds.yaml` from the project root. It contains all configured RSS/Atom feed sources:

```yaml
feeds:
  - name: BleepingComputer
    url: https://www.bleepingcomputer.com/feed/
  - name: The Record
    url: https://therecord.media/feed
  # ... more feeds
```

Iterate over every entry under `feeds:`. Each entry has a `name` (human label) and `url` (RSS/Atom endpoint).

## Step 2: Fetch RSS/Atom Feeds

For each feed in `feeds.yaml`:

1. Fetch the RSS/Atom XML using web fetch tools
2. Parse each entry and extract:
   - **Title** — the article headline
   - **URL** — the canonical link to the article
   - **Snippet** — the `<description>` or `<summary>` field (first ~200 chars of body text)
   - **Published date** — the `<pubDate>` or `<updated>` timestamp
   - **Source name** — from the `name` field in feeds.yaml

### Error Handling

- If a feed fails to fetch (timeout, 404, DNS failure, malformed XML): **log the error and skip that feed**. Do not block the entire run because one feed is down.
- Log format: `[WARN] Failed to fetch feed: {name} ({url}) — {error}`
- Continue processing all remaining feeds.

## Step 3: Filter Noise

Before adding an article to the working list, evaluate its title and snippet against the filtering criteria below. The goal is to skip articles that will never produce actionable threat intelligence.

### SKIP these (noise) — specific examples:

| Pattern | Why it's noise |
|---------|---------------|
| "Top 10 ways to..." / "5 best practices for..." | Listicle, no technical indicators |
| "How to secure your..." / "Guide to cybersecurity..." | Generic advice, not incident-specific |
| "[Vendor] announces new product..." / "[Company] launches..." | Marketing / PR |
| "Join us at [conference]..." / "We're hiring..." | Job postings, events |
| "[Vendor] named a Leader in Gartner..." | Analyst relations PR |
| "Patch Tuesday roundup" (without specific CVE analysis) | Aggregation without depth |
| "Cybersecurity tips for small businesses" | Generic consumer advice |
| "Interview with [CISO/executive]" | Opinion/career content |

### KEEP these (actionable) — specific examples:

| Pattern | Why it's actionable |
|---------|-------------------|
| "APT group X targets Y sector..." | Threat actor campaign — IOCs and TTPs likely |
| "New malware variant [name] discovered..." | Malware analysis — file indicators, C2 patterns |
| "CVE-2026-XXXXX actively exploited..." | Vulnerability disclosure — detection rules needed |
| "Data breach at [organization]..." | Incident report — attack vectors, IOCs |
| "[Vendor] reports new ransomware campaign..." | Technical analysis from primary source |
| "CISA advisory on [threat]..." | Government advisory — authoritative IOCs |
| "Threat actor exploits [software] vulnerability" | Active exploitation — urgent detection need |
| "Analysis of [malware] C2 infrastructure" | Deep technical — network indicators |

### Decision logic:

1. Check the title first — most noise is obvious from the headline alone
2. If the title is ambiguous, check the snippet for technical indicators (CVE IDs, malware names, IP addresses, domain names, hash values, MITRE technique references)
3. When in doubt, **keep it** — false negatives (missing a real threat) are worse than false positives (processing a low-value article)

## Step 4: Deduplicate by URL

Before adding any article to the working list, check if it has already been processed in a previous run:

```bash
grep -rl "ARTICLE_URL" ./summaries/
```

If the URL appears in any existing summary file (typically in the `## Sources` section), **skip it** — this article has already been ingested and summarized.

This deduplication is URL-based only. Content-level dedup (same story covered by multiple outlets) is handled in Step 5 during topic grouping.

## Step 5: Group by Topic

After filtering and dedup, group the remaining articles by shared topic. Articles should be clustered when they cover the **same underlying event, campaign, or threat**.

### Grouping signals (use title + snippet content):

- **Shared threat actor name** — e.g., multiple articles mentioning "Volt Typhoon" or "Scattered Spider"
- **Shared campaign name** — e.g., "Operation PhantomPulse" appearing in several articles
- **Shared CVE ID** — e.g., multiple outlets covering CVE-2026-12345
- **Shared malware family** — e.g., several articles analyzing "Lumma Stealer"
- **Shared incident** — e.g., articles about the same data breach at a named organization
- **Shared event** — e.g., multiple articles about the same CISA advisory or coordinated disclosure

### Grouping rules:

1. Articles from different outlets covering the same story → **one topic group** (e.g., BleepingComputer and The Record both covering the same APT campaign)
2. Articles covering different aspects of the same threat → **one topic group** (e.g., a malware analysis + a campaign report about the same threat actor using that malware)
3. Unrelated articles → **separate topic groups** (even if from the same feed)
4. Single articles on unique topics → **their own topic group** (a group of one is fine)

## Step 6: Build the Investigation Scratch File

Write all collected and grouped articles into an `investigation.md` scratch file. This is an ephemeral working document that gets overwritten each run.

### Format:

```markdown
# Investigation Scratch — YYYY-MM-DD

## Collected Articles

### [1] {Source Name} — "{Article Title}"
URL: {article_url}
Published: {date}
Excerpt: {first ~200 chars of snippet}
Notes: {any observations — e.g., "References Cisco Talos report for technical details. FOLLOW: https://..."}

### [2] {Source Name} — "{Article Title}"
URL: {article_url}
Published: {date}
Excerpt: {snippet}
Notes: {observations}

...

## Topic Grouping

### Topic A: {Descriptive Topic Name}
Articles: [1], [2]
Follow-up links to fetch: {any primary sources, IOC repos, or technical reports referenced in the articles}

### Topic B: {Descriptive Topic Name}
Articles: [3]
Follow-up links to fetch: {links to chase}
```

### Key notes on the scratch file:

- Include **Notes** for each article flagging links that should be followed (primary sources, IOC lists, PDF reports, GitHub repos)
- Topic names should be descriptive and specific (e.g., "Volt Typhoon Water Sector Campaign" not just "APT Activity")
- List follow-up links explicitly under each topic — the Research skill will use these
- Sort articles by publish date (newest first) within each topic group

## Output

The final output of the ingest skill is:

1. **`investigation.md`** — the scratch file with all collected articles organized by topic
2. **A combined article list** — sorted by publish date, deduplicated by URL, grouped by topic

This output feeds directly into the **Research skill**, which will follow the identified links, chase primary sources, and produce finished topic summaries.

## Summary of the Pipeline

```
feeds.yaml → Fetch RSS → Filter noise → Dedup by URL → Group by topic → investigation.md
```

Each step reduces the volume: raw feed entries → actionable articles → unique articles → topic clusters. The goal is to hand the Research skill a clean, organized set of topics with clear leads to follow.
