# How Actioner Works

Four workflows, all through Discord or Telegram.

## Research

Send a message, get a finished report.

```
You: Research Scattered Spider's latest campaign

Actioner: On it — spinning up a research thread.
          ...
          Report ready. [attached: scattered-spider-2026-04-03.md]
```

Actioner creates a thread, investigates primary sources, extracts IOCs, maps MITRE ATT&CK TTPs, and generates validated detection rules. Send follow-ups while it works: a fast chat agent responds in seconds, a deep research agent keeps going in the background. Follow-ups become mandatory requirements the report must address before delivery.

[Full research pipeline →](./research-pipeline)

## Critical Alerts

RSS feeds scanned every 2 hours. Critical items get immediate, automatic research.

```
Thread: Critical: CVE-2026-1234 Active Exploitation
──────────────────────────────────────────────────
Actioner: A critical zero-day (CVE-2026-1234) in Apache Struts is
          under active exploitation. CISA has issued an emergency
          directive.

          [attached: 2026-04-02-critical-cve-2026-1234.md]
```

Most scans cost nothing: a lightweight script fetches RSS, and only wakes the agent when something genuinely critical appears. Non-critical items are saved for the daily briefing.

[How critical alerts work →](./critical-alerts)

## Daily Briefing

Everything from the last 24 hours, compiled and delivered at your configured time.

```
Thread: Daily Brief — 2026-04-02
────────────────────────────────
Actioner: Daily CTI Briefing — April 2, 2026

  - CVE-2026-1234: Critical RCE in Apache Struts (CVSS 9.8)
  - Scattered Spider: New social engineering campaign
  - BlackCat ransomware: Updated encryptor variant

  3 reports, 7 detection rules generated.

  [attached: 2026-04-02-daily-report.md]
```

[Daily briefing details →](./daily-briefing)

## Detection Rules

Every report includes Sigma, YARA, and Snort/Suricata rules, validated with real CLI tools before delivery.

```yaml
# Example: Sigma rule from a Scattered Spider report
title: Scattered Spider SIM Swap Credential Harvesting
status: experimental
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    CommandLine|contains:
      - 'comsvcs.dll'
      - 'MiniDump'
  condition: selection
```

Failed rules retry up to 3 times. Rules that still fail are marked `UNVALIDATED` with the error attached, never silently dropped.

[Detection rules details →](./detection-rules)

## Delivery

Reports over 500 words are attached as `.md` files with a short summary message. Short answers (follow-ups, status checks) stay inline. All summaries are saved to `groups/global/summaries/` on the host.

## Operations

Send `/status` in any channel for an instant system dashboard: uptime, active containers, connected channels, scheduled tasks, and recent runs. No container spin-up required.

[/status command →](./status)
