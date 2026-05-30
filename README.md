<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/public/actioner-wordmark-white-2x.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/public/actioner-wordmark-dark-2x.png">
  <img alt="Actioner" src="docs/public/actioner-wordmark-dark-2x.png" width="360">
</picture>

**Actually Usable Agentic TI/Detection Engineering Plugin**

</div>

---

<p align="center"><em>Built cause I'm done with midnight detection sessions for another shitty supply chain vuln.</em></p>

## BLUF

This plugin gives your claude 2 abilities.

1. Do actionable threat intel reserach and output an artifact that could immediately be tested in prod. By default it is more PoC/advisory centric so if you want a more generic TTP detection make sure you modfiy settings. The rules aren't bs. At the minimum it is syntatically valid.
2. Automatic daily routine based OSINT -> artifact pipeline. checkout the sources, add yours too — [feeds.yaml](feeds.yaml).

## See It Work

Check out the sample reports in repo.


## Benchmark
- coming soon


## Install

```
/plugin marketplace add ThomasPark20/Actioner
/plugin install actioner@actioner
/actioner:research <a recent threat or CVE>
```

That's it to start researchin'

## What You Get

Below is semi-ai generated. Read if you want.

Two methods of execution. **On demand** (out of the box): `/actioner:research <threat>` chases primary sources, extracts IOCs and ATT&CK TTPs, generates Sigma/YARA/Snort/Suricata, **syntactically verifies every rule by compiling it** (sigma-cli, yarac, snort -T, suricata -T) and converting Sigma to Splunk/CrowdStrike, then runs the survivors through a critic gate before delivering a technical report (real compilation once you've run `/actioner:setup`; before that, an honest structural check labeled ⚠️ uncompiled). Detections are **PoC/advisory-specific by default** — keyed on the artifact the source gives — with an **opt-in behavioral TTP layer**, and written to **convert cleanly to Splunk and CrowdStrike**.

**Autonomous** (after `/actioner:setup`): a once-daily routine scans your CTI feeds, triages what warrants a near-term detection, and runs the full pipeline on each qualifying item — research → generate → validate → commit — into a connected GitHub repo, hands-off.

## How It Works

A chain of skills and isolated subagents, all inside Claude Code — no servers, no containers. `/actioner:research` orchestrates: **ioc-extract** (IOCs + ATT&CK TTPs) → **rule-gen** (generate → compile-verify → convert to Splunk/CrowdStrike) → **critic** (production-readiness gate) → report. The autonomous routine wraps the same engine — an **ingest** triage stage selects qualifying feed items up front, and a commit step writes detections to a GitHub repo at the end.

## Set Up More

Run `/actioner:setup` — a router, not a gauntlet. Add the validation toolchain (real compile-checks for all four formats), a GitHub repo sink, the daily routine, chat/mobile front-ends, or pre-scoped approvals. Pick what you want, one at a time.

## License

MIT
