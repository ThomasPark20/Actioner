# Research Pipeline

Ask <Wordmark /> to research any topic:

```
"Research Scattered Spider latest activity"
"Research CVE-2026-1234"
"Research teampcp"
```

<Wordmark /> researches the **exact term** you give it. "teampcp" stays "teampcp," it won't substitute what it thinks you meant. If the exact term yields nothing, it asks for clarification.

## What Happens

1. <Wordmark /> creates a **Discord thread** named "Research: [Topic]"
2. A research agent starts working in that thread
3. Main channel stays clean
4. When done, the report is attached as a `.md` file in the thread

## Pipeline Steps

The research agent runs inside an isolated Docker container:

1. Web search for primary sources (vendor reports, advisories, OSINT)
2. Follow links to technical writeups, IOC repos, PDFs
3. Extract IOCs (IPs, domains, hashes, URLs) and defang them
4. Map TTPs to MITRE ATT&CK techniques
5. Generate detection rules (Sigma, YARA, Snort/Suricata)
6. Validate every rule with CLI tools
7. Compile structured topic summary
8. Deliver via `send_file` in the thread

## Follow-ups and Steering

While the research agent works, you can interact in the thread. A fast **chat agent** responds immediately:

```
Thread: Research: Scattered Spider
────────────────────────────────
Actioner: Researching now...

You: "Are they the same as ShinyHunters?"
Actioner (chat): "No, Scattered Spider (UNC3944) and ShinyHunters are
              different groups. ShinyHunters focuses on data breaches..."

You: "Focus on the IOCs, skip attribution"
Actioner (chat): "Got it, added to the research requirements: focus
              analysis on IOCs rather than attribution."

You: "Also check Volt Typhoon overlap"
Actioner (chat): "Added to requirements: investigate potential Volt
              Typhoon overlap. The research agent will cover this
              before delivering the report."

Actioner (research): Report ready. [attached .md]
```

## Dual-Agent Model

Each research thread runs two agents concurrently:

| Agent | What It Does | Response Time |
|-------|-------------|---------------|
| **Research agent** | Deep investigation, web research, IOC extraction, rule generation | Minutes |
| **Chat agent** | Answers questions, acknowledges steering, reports progress | Seconds |

The chat agent has access to the research workspace, so it can report on progress. It adds user directives to `requirements.md`, a checklist the research agent must satisfy before delivering.

## Requirements Contract

Follow-up messages become mandatory checklist items. The research agent checks every item in `requirements.md` before delivering the final report. It's a contract, not a suggestion: the report won't ship until all requirements are addressed.

## Thread Lifecycle

| State | What's Happening |
|-------|-----------------|
| **Active** | Research agent working, chat agent responds to follow-ups |
| **Idle** | 10 minutes of no activity triggers soft-expiry |
| **Expired** | Group unregistered, but folder and session preserved on disk |
| **Re-activated** | Send a message to bring it back with full context |

Expired threads are soft-deleted, not destroyed. The group folder, session data, and research files stay on disk. Message an expired thread and <Wordmark /> re-activates it with all prior context.

## Telegram

Telegram doesn't support threads. Reports are sent as regular messages with `.md` file attachments in the chat.
