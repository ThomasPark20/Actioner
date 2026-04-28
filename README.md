<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/public/actioner-wordmark-white-2x.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/public/actioner-wordmark-dark-2x.png">
  <img alt="Actioner" src="docs/public/actioner-wordmark-dark-2x.png" width="360">
</picture>

**Threat intelligence that works for you.**

[Documentation](https://thomaspark20.github.io/Aegis/) · [Getting Started](https://thomaspark20.github.io/Aegis/guide/getting-started) · [Architecture](https://thomaspark20.github.io/Aegis/architecture)

</div>

---

<p align="center"><em>You know I'm not getting up at midnight to write detections for another supply chain vuln.</em></p>

## See It Work

Actioner lives in your Discord or Telegram. Ask it about a threat, or let it watch RSS feeds on its own. Either way, you get a researched report and detection rules that actually compile. Everything is configurable through chat: add feeds, change your briefing time, connect new channels, all just by asking.

```
You: Research Scattered Spider's latest campaign

Actioner: On it — spinning up a research thread.

  [Thread: Research: Scattered Spider]
  Searching primary sources...
  Extracting IOCs — 12 IPs, 8 domains, 3 hashes
  Mapping TTPs to MITRE ATT&CK
  Generating Sigma rules — validating with sigma-cli
  Generating YARA rules — validating with yarac

  Report ready. [attached: scattered-spider-2026-04-03.md]

You: Are any of them on FBI most wanted?
Actioner (chat): Good question, yes, several members have been
  indicted. Added to research requirements.

You: Also focus on their SIM swapping TTPs
Actioner (chat): Added to requirements. The research agent will
  cover this before delivering the report.

Actioner (research): Updated report. All requirements satisfied.
  [attached: scattered-spider-2026-04-03-v2.md]
```

## Get Running

```bash
git clone https://github.com/ThomasPark20/Aegis.git
cd Aegis
claude
/setup
```

Setup walks you through everything: dependencies, Docker, API credentials, Discord/Telegram bot creation, and feed configuration.

## What Happens Next

Once it's running, you have four workflows. **Research on demand**: message Actioner about any threat and get a full report with IOCs, MITRE mappings, and validated detection rules. While research runs in the background, a fast chat agent handles your follow-ups in seconds. Every follow-up becomes a mandatory requirement the report must satisfy before delivery.

**Automated monitoring**: RSS feeds (11 included by default) are scanned every 2 hours. Critical items (zero-days, active exploitation, CISA advisories) get their own research thread immediately. Everything else compiles into a daily executive briefing delivered at your configured time.

## Prerequisites

Git, Node.js 22+, Docker, [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and an Anthropic API key or Claude Pro/Max subscription. Full setup guide in the [docs](https://thomaspark20.github.io/Aegis/guide/prerequisites).

## Built on NanoClaw

Actioner is built on [NanoClaw](https://github.com/qwibitai/nanoclaw), an open-source personal Claude assistant framework.

## License

MIT
