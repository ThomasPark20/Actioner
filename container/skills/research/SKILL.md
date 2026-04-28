# Skill: Research

Web research and primary source chasing for threat intelligence topics.

## When to Use

Use this skill after the Ingest skill has produced an `investigation.md` with collected articles and topic groupings (passive mode), or when a user requests on-demand research via chat (active mode).

---

## Source Priority Hierarchy

Always prefer sources in this order:

1. **Primary technical sources** — vendor threat research blogs, technical writeups, IOC repositories (GitHub), STIX bundles, PDF reports from the investigating team (e.g., Cisco Talos, Mandiant, CrowdStrike, Unit42, Microsoft MSTIC)
2. **Vendor advisories** — CISA advisories, vendor security bulletins, CVE entries, NVD records
3. **News coverage** — BleepingComputer, The Record, Krebs on Security, SecurityWeek — use for context and lead discovery, but always chase the primary source they cite

If BleepingComputer covers a Mandiant report, the Mandiant report is what you want for IOC extraction and TTP mapping. The news article is a pointer, not the source.

---

## When to Follow Links

You MUST follow links when any of these conditions are met:

- **IOC lists at external URLs** — article says "IOCs are available at [link]" or "indicators listed in [appendix/github/pastebin]"
- **"Full technical analysis" references** — article references a "full technical analysis", "detailed report", or "deep dive" hosted elsewhere
- **Vendor blog links to PDFs/GitHub** — a vendor blog links to a PDF report, GitHub repository with YARA rules, STIX bundles, or IOC lists
- **News articles citing primary research** — a news article cites a primary research source (e.g., BleepingComputer citing a Cisco Talos report → go get the Talos report)
- **CISA/CERT advisories** — any reference to a government advisory (CISA, CERT, NCSC) — these often contain IOCs and mitigation guidance

### Examples

| Article Says | Action |
|---|---|
| "Full IOC list available at https://github.com/vendor/iocs/campaign.csv" | Fetch the CSV. Extract all IOCs from it. |
| "According to a report by Cisco Talos [link]" | Follow the Talos link. Read the full technical report. Use Talos as primary source. |
| "CISA has issued advisory AA24-XXX [link]" | Fetch the CISA advisory. Extract IOCs, TTPs, and mitigations. |
| "Technical details in our PDF report [link]" | Fetch the PDF. Extract text. Prioritize it — PDFs are often the richest source. |
| "Related YARA rules on our GitHub [link]" | Fetch the GitHub page. Capture the YARA rules for reference in the summary. |

---

## PDF Fetching and Text Extraction

When a link points to a PDF report:

1. Fetch the PDF using web tools
2. Extract text content from the PDF
3. PDFs from threat research teams are often the richest source of IOCs and TTPs — prioritize them
4. Look for appendices, IOC tables, and MITRE ATT&CK mappings within the PDF
5. If the PDF is too large to process entirely, focus on: executive summary, IOC sections, TTP sections, and detection recommendations
6. If PDF extraction fails, log the URL and note in the summary that a PDF source was referenced but could not be extracted

---

## Passive Mode Workflow

During scheduled daily runs, after the Ingest skill has produced `investigation.md`:

1. **Read investigation.md** — review the topic groupings and follow-up links identified during ingestion
2. **For each topic group:**
   a. **Dedup check** — grep `./summaries/` for the topic name, threat actor, campaign, or CVE. If a summary already covers this topic, check whether the new articles add significant new information. If not, skip.
   b. **Follow leads** — fetch all URLs marked as "FOLLOW:" in the investigation.md notes. These are primary sources, IOC repos, PDF reports, and advisories identified during ingestion.
   c. **Chase primary sources** — if news articles cite vendor reports or technical analyses, follow those links. Always go one level deeper than the news coverage.
   d. **Collect and organize** — gather IOCs, TTPs, behavioral details, MITRE ATT&CK techniques, and timeline events from all sources
   e. **Produce topic summary** — write a finished summary using the template at `./templates/topic-summary.md`. Include all sources with attribution.
   f. **Hand off to Rule Generator** — the completed summary is ready for the Rule Generator Agent to process

---

## Active Mode Workflow

When a user requests research via chat (e.g., "Research latest Volt Typhoon activity"):

1. **Check existing summaries first** — grep `./summaries/` for the topic, threat actor, campaign name, or CVE
   - If matching summaries exist, read them to understand what is already known
   - Note gaps or areas where information may be outdated
2. **Search the web** — use web search tools to find new information on the topic, focusing on recent dates
3. **Follow primary sources** — apply the same link-following rules as passive mode. Chase technical reports, IOC repos, advisories.
4. **Incorporate existing + new findings** — produce a summary that builds on existing knowledge:
   - If updating an existing topic: reference the prior summary, add new findings, update IOCs and TTPs
   - If this is a new topic: produce a fresh summary from the template
   - DON'T duplicate what's already covered — reference past summaries or update them
5. **Hand off to Rule Generator** — completed summary is ready for rule generation

---

## Deduplication

Before researching any topic:

1. `grep -ril "<topic_name>" ./summaries/` — search for the topic across all existing summaries (case-insensitive, recursive)
2. Also search for alternate names: threat actor aliases, campaign names, associated CVEs
3. If a matching summary exists:
   - **Read it** to understand current coverage
   - Determine if new articles provide significantly new information (new IOCs, new TTPs, new targets, timeline updates)
   - If yes: research the new information and update or create a supplementary summary referencing the original
   - If no: skip this topic — it's already covered
4. For URL-level dedup: grep `./summaries/*.md` for each source URL before processing. If a summary already cites that URL in its Sources section, don't re-process it.

---

## Handling Unreachable Sources

When a source cannot be fetched (404, timeout, access denied, paywall):

- **Log and skip** — note the unreachable URL in the investigation scratch file
- **Don't block the summary** — produce the summary with available sources. Note in the Sources section that a source was referenced but unreachable
- **Format:** Add a note like `[Source unavailable — 404 at time of fetch]` next to the URL
- **Try alternatives** — if the primary source is down, check if the content is cached, archived, or summarized in secondary sources
- **Never fabricate content** — if a critical source is unreachable and no alternatives exist, state what is unknown rather than guessing

---

## Source Attribution — Mandatory Markdown Links

All sources in the `## Sources` section of a topic summary MUST be markdown links with URLs. Format: `- [Source Name](URL) — brief description`.

- Every source MUST be a markdown link `[Name](URL)`. A source without a URL is a bug.
- Never use plain-text source names without URLs (wrong: `Cisco Talos Blog — analysis`)
- Never use bare URLs without descriptive names (wrong: `https://blog.talosintelligence.com/example`)
- Correct: `- [Cisco Talos Blog](https://blog.talosintelligence.com/example) — primary technical analysis`

---

## Output

The research skill produces input for the topic summary template. For each researched topic, gather:

- Executive summary of the threat/campaign/event
- Timeline of events with dates
- Technical analysis: attack chain, C2 infrastructure, platform-specific details
- IOCs: IPs, domains, URLs, hashes, file paths, registry keys (all defanged)
- TTPs: MITRE ATT&CK technique mappings with observed behaviors
- Impact assessment
- Detection and remediation recommendations
- All source URLs with attribution as markdown links [Name](URL)

This information feeds directly into the topic summary template at `./templates/topic-summary.md`.
