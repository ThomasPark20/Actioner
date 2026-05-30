---
name: research
description: "On-demand CTI research and detection engineering. Use to research a threat, campaign, threat actor, CVE, or malware family, or turn an article/URL into rules — e.g. 'research the latest Volt Typhoon activity', '/actioner:research CVE-2026-1234', 'turn this writeup into Sigma rules'. Extracts IOCs and ATT&CK TTPs, generates PoC/advisory-specific detections (Splunk/CrowdStrike-portable), critic-gated, and delivers a technical analysis report."
---

# Actioner — On-Demand Research

This is the interactive entry point. The user wants a threat investigated and turned into production-ready detection rules. The topic is in the user's message (a threat name, campaign, actor, CVE, malware family, or a URL to ingest).

## How to run it — orchestrate the pipeline

The work runs in isolated subagents so the main thread stays free for the user to steer. **Subagents can't spawn subagents, so you (the main thread) drive the chain** with the Task tool:

1. **DRAFT** — launch the `researcher` subagent in **DRAFT** mode. Pass it: the topic/URL; the output location (the connected GitHub repo path if a sink is configured, else the current working directory); the **altitude** (default `specific` = PoC/advisory-specific; `ttp`/`both` if the user asked); **leniency** (default `strict`); and any user requirements. It returns the draft report path + a per-rule list (type, title, compile-status, confidence).
2. **CRITIC** — launch the `critic` subagent. Pass it: the draft report path, the threat context, the requested altitude/leniency, and the requirements. It returns a verdict (`READY` | `NEEDS-REVISION` | `NO-VIABLE-DETECTION`) with per-rule keep/fix/drop and confidence.
3. **REVISE / finalize** — launch the `researcher` subagent in **REVISE** mode with the draft path + the critic's verdict. It applies fixes, drops weak rules (noting what was cut), re-validates changed rules, and **finalizes** — writing standalone rule files when a sink is configured. (Run this even on a `READY` verdict so the finalize/persist step happens. On `NO-VIABLE-DETECTION`, skip rule work and just surface the report.)
4. **Surface** — give the user the final report path and a short summary (topic, severity, rule counts by type, confidence spread, and anything the critic dropped and why).

## Steering while it runs

The user stays in the main thread. When they add a requirement mid-flight ("also check Kimsuky overlap", "only PoC/advisory-specific", "skip YARA"), capture it and feed it into the chain — relaunch the relevant step with the added constraint, or pass it as a requirement the report must satisfy before delivery. The investigation isn't complete until every stated requirement is addressed.

## Detection altitude (ask once, briefly, if unstated)

Actioner generates two kinds of detection. Default to **PoC/advisory-specific** unless the user says otherwise:

- **PoC/advisory-specific (default, strict):** keys on the artifact's distinctive features — exact strings, hashes, command lines, paths — from a public PoC when one exists, otherwise the advisory's specific indicators. High precision; convertible to Splunk/CrowdStrike.
- **Behavioral TTP (opt-in):** keys on adversary behavior. Higher recall and more durable, but broader — ships at lower confidence because efficacy can't be proven without telemetry.

If the user hasn't indicated a preference, default to PoC/advisory-specific and mention a TTP layer is available on request. One short line, then proceed.

## Output

A single technical analysis report following the template at `${CLAUDE_PLUGIN_ROOT}/templates/topic-summary.md`, with critic-approved detection rules in `## Detection Rules`, each labeled **compile-status × confidence**. If a GitHub repo sink is configured (see `/actioner:setup`), standalone rule files are also written alongside the report so the output is directly consumable by a detection pipeline; otherwise the report is produced in the working directory and surfaced to the user. If the topic was a generic advisory with no concrete artifacts, the report is delivered **without rules**, with a one-line explanation — that's a valid outcome, not a failure.
