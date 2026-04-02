---
layout: home
hero:
  name: AEGIS
  text: Autonomous Threat Intelligence
  tagline: Research threats. Generate validated detection rules. Deliver reports through Discord and Telegram. Never miss a zero-day.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View Architecture
      link: /architecture

features:
  - icon: "\U0001F50D"
    title: Research on Demand
    details: Investigate any threat actor, CVE, or campaign. AEGIS follows primary sources, chases IOC repositories, and delivers structured reports as file attachments.
  - icon: "\U0001F6E1\uFE0F"
    title: Validated Detection Rules
    details: Sigma, YARA, and Snort rules validated with real CLI tools before delivery. Failed rules retry three times. Nothing is silently dropped.
  - icon: "\U0001F4E8"
    title: Daily Briefing
    details: Every morning at 8am — RSS and Reddit feeds ingested, filtered, deduplicated, researched. Batched intelligence briefing with reports attached.
  - icon: "\u26A1"
    title: Critical Alerts
    details: Headline scan every 2 hours. Zero-day disclosures, CVSS 9+ vulnerabilities, active exploitation — immediate alert with full analysis.
  - icon: "\U0001F504"
    title: Non-Blocking
    details: Research runs in isolated containers. Chat never hangs. Start new tasks while previous research completes in the background.
  - icon: "\U0001F4AC"
    title: Discord & Telegram
    details: First-class support for both. Reports as downloadable files. Thread-aware follow-ups that resolve context naturally.
---

<div class="how-it-works">

## How It Works

```
You: "Research Scattered Spider's latest campaign"

AEGIS: "On it — researching now."

  ┌──────────────────────────────────────────────┐
  │  Background Container                        │
  │                                              │
  │  → Web search for primary sources            │
  │  → Follow links to technical writeups        │
  │  → Extract IOCs, map TTPs to MITRE ATT&CK   │
  │  → Generate Sigma + YARA rules               │
  │  → Validate with sigma-cli and yarac         │
  │  → Compile structured report                 │
  └──────────────────────────────────────────────┘

AEGIS: attached scattered-spider-2026-04.md
       "Report ready — 7 sources, 3 Sigma rules, 1 YARA rule.
        All validated."

You: "What TTPs did they use?"
AEGIS: "T1566.001, T1078, T1021.001 — details in the report."
```

</div>

<div class="quickstart-section">

## Get Running

```bash
git clone https://github.com/ThomasPark20/Aegis.git
cd Aegis
claude
/setup
/add-discord
```

Five commands. Five minutes.

</div>
