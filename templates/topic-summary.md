# Technical Analysis Report: [THREAT_NAME] ([DATE])

Prepared by: [AUTHOR / ORGANIZATION]
Classification: [CLASSIFICATION_LEVEL]
Date: [DATE]
Version: [VERSION]

## Executive Summary

[Concise overview of the threat: what happened, who was affected, what the impact is, and key technical details. Should be 1-2 paragraphs that give a decision-maker everything they need to know at a glance. Include scope of impact, exposure window, and attribution if available.]

## Background: [AFFECTED_SYSTEM / TARGET]

[Context on the targeted system, software, platform, or organization. What is it, why does it matter, what was the state before the attack. Helps the reader understand why this threat is significant.]

## Attack Timeline (All Times UTC)

| Timestamp | Event |
|-----------|-------|
| [DATETIME] | [Event description] |
| [DATETIME] | [Event description] |
| ... | ... |

## Root Cause: [INITIAL_ACCESS_VECTOR]

[How the attacker gained initial access. Technical details on the compromise vector — credential theft, vulnerability exploitation, social engineering, supply chain injection, etc. Include forensic evidence supporting the conclusion.]

## Technical Analysis of the Malicious Payload

### 1. [STAGE_1_NAME — e.g., "Dependency Injection", "Initial Loader", "Exploit Delivery"]

[Technical details of the first stage. Code snippets, file modifications, delivery mechanism. Be specific — include file names, sizes, hashes where available.]

### 2. [STAGE_2_NAME — e.g., "Dropper", "Stager", "Shellcode Loader"]

[Technical breakdown of the second stage. Obfuscation techniques, deobfuscated logic, execution flow. Include annotated code where available.]

### 3. C2 Infrastructure

[Command and control details: domains, IPs, ports, protocols, beacon intervals, User-Agent strings, URI patterns, encryption/encoding used in communications.]

### 4. Platform-Specific Behavior

[If the threat is cross-platform, detail each platform variant separately. Include: delivery mechanism, payload type, persistence mechanism, key capabilities, and unique detection opportunities per platform.]

#### [Platform A — e.g., macOS]
[Details...]

#### [Platform B — e.g., Windows]
[Details...]

#### [Platform C — e.g., Linux]
[Details...]

### 5. Anti-Forensics / Evasion Techniques

[Self-deletion, log wiping, timestomping, process hollowing, anti-analysis techniques, sandbox evasion, etc.]

## Indicators of Compromise (IOCs)

> **Defanging Convention:** All IOCs in this report use defanged notation to prevent accidental resolution or click-through:
> - URLs: `hxxps://` or `hxxp://` (e.g., `hxxps://evil[.]com/payload`)
> - Domains: `[.]` replacing dots (e.g., `evil[.]com`, `c2[.]attacker[.]net`)
> - IP addresses: `[.]` replacing dots (e.g., `1.2.3[.]4`, `192.168[.]1[.]100`)
> - Email addresses: `[at]` replacing @ (e.g., `attacker[at]evil[.]com`)

### Package / Software Level

| Package / Component | Malicious Version | Description |
|---------------------|-------------------|-------------|
| [PACKAGE_NAME] | [VERSION] | [What was modified or injected] |

### File System

| Platform | Path | Hash (SHA256) | Description |
|----------|------|---------------|-------------|
| [OS] | [Path] | [SHA256_HASH] | [What it is] |

### Network

| Type | Value | Context |
|------|-------|---------|
| Domain | [domain[.]com] | [role — C2, staging, exfil] |
| IP | [1.2.3[.]4:PORT] | [role] |
| URL Pattern | [hxxps://domain[.]com/path] | [description] |

### Behavioral

[Process behaviors, registry modifications, unusual network patterns, timing anomalies — things that don't have a single IOC value but are detectable via behavioral rules]

## MITRE ATT&CK Mapping

| TID | Technique | Observed Behavior |
|-----|-----------|-------------------|
| [T1566.001] | [Spearphishing Attachment] | [How it was used in this attack] |
| [T####.###] | [Technique Name] | [How it was used in this attack] |

## Impact Assessment

[Breadth (how many affected), depth (how severe), stealth (how hard to detect), and any known victim telemetry or statistics.]

## Detection & Remediation

### Immediate Detection

[Commands, queries, scripts defenders can run RIGHT NOW to check if they're affected. Be specific and copy-pasteable.]

### Remediation

[Step-by-step remediation actions, ordered by priority. Include: containment, eradication, recovery, and secret rotation guidance.]

### Long-Term Hardening

[Structural changes to prevent this class of attack in the future.]

## Detection Rules

<!-- PLACEHOLDER: Rule Generator Agent will append Sigma, YARA, and/or Snort detection rules below this line. Each rule will include a description, validation status (VALIDATED or UNVALIDATED), and fenced code block. -->

## Lessons Learned

[What this attack teaches us about the threat landscape, defensive gaps, and what needs to change.]

## Sources

<!-- Every source MUST be a markdown link [Name](URL). A source without a URL is a bug. -->

- [Source Name](https://example.com/full-url) — brief description of what this source contributed
- [Cisco Talos Blog](https://blog.talosintelligence.com/example) — primary technical analysis
- [CISA Advisory AA24-XXX](https://www.cisa.gov/example) — government advisory with IOCs and mitigations

NOT acceptable: "Cisco Talos Blog — primary technical analysis" (no URL = wrong)
NOT acceptable: "https://blog.talosintelligence.com/example" (bare URL without name = wrong)

---
*Report generated by Actioner CTI Agent Swarm*
