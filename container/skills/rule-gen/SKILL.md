# Skill: Rule Generator

Generation, validation, and appending of Sigma, YARA, Snort, and Suricata detection rules to topic summaries.

## When to Use

Invoke this skill after a topic summary has been produced (or updated) by the Ingest/Research Agent. The input is a completed topic summary file in `./summaries/`. The output is detection rules appended to that summary's `## Detection Rules` section.

---

## Step 1: Determine Applicable Rule Types

Read the topic summary and decide which rule types to generate based on available indicators:

| Rule Type | When to Generate | Indicators to Look For |
|-----------|-----------------|----------------------|
| **Sigma** | Almost always — any technical/behavioral indicators | Process creation, registry changes, scheduled tasks, network connections, DNS queries, authentication events, file events, cloud audit logs, web server logs |
| **Snort** | Network indicators present | IP addresses, domains, URLs, HTTP request patterns, DNS query patterns, TLS certificate anomalies, C2 communication patterns |
| **Suricata** | Network indicators present (especially TLS/JA3/certificate IOCs) | Same as Snort, plus: JA3/JA4 fingerprints, TLS certificate fingerprints, dataset-based bulk IOC matching, SSH/SMTP/QUIC protocol detection |
| **YARA** | File-level indicators only (narrowest scope) | Malware samples, string patterns in binaries, byte sequences, PE structure anomalies, embedded configs, file hashes with associated string/byte context |
| **None** | Purely strategic intel with no technical indicators | Geopolitical analysis, trend reports, policy advisories with no IOCs or TTPs |

**Key principle:** Sigma, Snort, and Suricata often overlap on network topics — that's fine. They serve different detection points (log analysis vs. network tap). Generate Snort AND Suricata when network indicators are present — many orgs run one or the other. Suricata is preferred when JA3/JA4 fingerprints, TLS certificate fingerprints, or dataset-based IOC matching is needed.

---

## Step 2: Load Reference Docs and Generate Rules

For each applicable rule type, load the corresponding reference document into context alongside the topic summary:

- **Sigma:** Read `./docs/sigma-spec.md`
- **YARA:** Read `./docs/yara-ref.md`
- **Snort:** Read `./docs/snort-ref.md`
- **Suricata:** Read `./docs/suricata-ref.md`

Generate all applicable rules in a single pass. For each rule, derive detection logic from:
1. **TTPs** (primary) — behavioral patterns are the strongest detection basis
2. **IOCs** (supplementary) — network/file indicators for quick matching
3. **MITRE ATT&CK mappings** from the summary — use for Sigma tags

### Required Fields per Rule Type

**Sigma rules must include:**
- `title` — descriptive, references threat actor/campaign where applicable
- `id` — generate a valid UUID v4
- `status: experimental` (always for new rules)
- `description` — what the rule detects and why
- `references` — URLs from the topic summary's Sources section
- `author: Actioner CTI Agent Swarm`
- `date` — today's date in YYYY/MM/DD format
- `tags` — MITRE ATT&CK tags in `attack.tXXXX` format (e.g., `attack.t1059.001`)
- `logsource` — with `category`, `product`, and optionally `service`
- `detection` — with `selection`, optional `filter`, and `condition`
- `level` — one of: informational, low, medium, high, critical

**YARA rules must include:**
- `meta` section: `description`, `author = "Actioner CTI Agent Swarm"`, `date`, `reference`, `hash` (if available from summary)
- `strings` section: with appropriate modifiers (`ascii`, `wide`, `nocase`, `fullword`, etc.)
- `condition` section: logical combination of string matches, optionally using `filesize`, PE module checks

**Snort rules must include:**
- `alert` action (use `alert` unless specific reason for `drop`)
- Protocol: `tcp`, `udp`, `http`, `dns`, `tls` as appropriate
- Source/destination using variables: `$HOME_NET`, `$EXTERNAL_NET`, `$HTTP_PORTS`, `$DNS_PORTS`
- `msg` — descriptive message string
- `content` matches with appropriate modifiers and sticky buffers
- `flow` — typically `established,to_server` or `established,to_client`
- `sid` — in range 2100000+ (custom rule range)
- `rev:1`
- `classtype` — e.g., `trojan-activity`, `policy-violation`, `attempted-recon`
- `reference` — URL from topic summary

**Suricata rules must include:**
- `alert` action (use `alert` unless specific reason for `drop`)
- Protocol: `tcp`, `udp`, `http`, `dns`, `tls`, `ssh`, `smtp` as appropriate
- Source/destination using variables: `$HOME_NET`, `$EXTERNAL_NET`, `$HTTP_PORTS`, `$DNS_PORTS`
- `msg` — descriptive message string prefixed with `"AEGIS - "`
- `content` matches using **dot-notation** sticky buffers (`http.uri`, NOT `http_uri`)
- `flow` — typically `established,to_server` or `established,to_client`
- `sid` — in range 2200000+ (custom Suricata rule range, separate from Snort)
- `rev:1`
- `classtype` — e.g., `trojan-activity`, `policy-violation`, `attempted-recon`
- `reference` — URL from topic summary
- `metadata` — include `author AEGIS, created_at YYYY-MM-DD`
- When TLS/JA3 indicators are available: use `ja3.hash`, `ja3s.hash`, `tls.cert_fingerprint`, `tls.sni`
- When bulk IOCs are available: consider `dataset` keyword for efficient matching

---

## Step 3: Validate Each Rule

Write each generated rule to a temporary file and validate using CLI tools:

### Sigma Validation
```bash
# Write rule to temp file
cat > /tmp/rule.yml << 'EOF'
<sigma rule content>
EOF

# Check syntax
sigma check /tmp/rule.yml

# Test compilation to Splunk backend
sigma convert --without-pipeline -t splunk /tmp/rule.yml
```
Both commands must exit 0 for the rule to be considered valid.

### YARA Validation
```bash
# Write rule to temp file
cat > /tmp/rule.yar << 'EOF'
<yara rule content>
EOF

# Compile check
yarac /tmp/rule.yar /dev/null
```
Exit code 0 = valid.

### Snort Validation
```bash
# Write rule to temp file
cat > /tmp/rule.rules << 'EOF'
<snort rule content>
EOF

# Syntax check (requires snort3 and snort.lua config)
snort -T -c /etc/snort/snort.lua --rule-path /tmp/rule.rules
```
Exit code 0 = valid.

> **Note:** If `snort` is not installed, perform LLM-based structural validation as fallback: verify semicolons terminate all options, protocol matches sticky buffers used, parentheses are balanced, and all required fields are present.

### Suricata Validation
```bash
# Write rule to temp file
cat > /tmp/suricata.rules << 'EOF'
<suricata rule content>
EOF

# Syntax validation
suricata -T -S /tmp/suricata.rules -l /tmp 2>&1
```
Exit code 0 = valid. The `-T` flag runs test mode, `-S` specifies the rule file.

> **Note:** If `suricata` is not installed, perform LLM-based structural validation as fallback: verify semicolons terminate all options, **dot-notation** sticky buffers are used (NOT underscore), protocol matches the buffers used, JA3/JA4 keywords use `tls` protocol, parentheses are balanced, and all required fields (`msg`, `sid`, `rev`) are present.

---

## Step 4: Retry on Validation Failure

If validation fails for any rule:

1. Capture the full error output from the validation tool
2. Feed the error back alongside the original rule
3. Fix the specific issue identified by the validator
4. Re-validate the corrected rule

**Maximum attempts: 3 total** (1 original generation + 2 retries).

On each retry, include in context:
- The original rule
- The validation error message
- The specific field/line that caused the error
- The reference doc section relevant to the error

---

## Step 5: Handle Persistent Validation Failures

If a rule still fails after 3 total attempts:

1. Keep the best version of the rule (fewest/least-severe errors)
2. Mark it as **UNVALIDATED** when appending
3. Include the validation error as an HTML comment for manual review

Format:
```markdown
### Sigma: [Rule Title]
**Status:** ⚠️ UNVALIDATED
<!-- Validation error: [paste last error message] -->
```yaml
<rule content>
```​
```

---

## Step 6: Append Rules to Topic Summary

**Rules are ALWAYS appended to summaries, not saved as separate files.** Never generate a standalone rule file. Detection rules only exist inside topic summaries.

Open the topic summary file and locate the `## Detection Rules` section (identified by the HTML comment placeholder `<!-- PLACEHOLDER: Rule Generator Agent will append detection rules here -->`).

Replace the placeholder with the generated rules. Format each rule as:

### For validated rules:
```markdown
### [RuleType]: [Rule Title]
**Status:** ✅ Validated
```[language]
<rule content>
```​
```

Where `[language]` is:
- `yaml` for Sigma rules
- `yara` for YARA rules
- `snort` for Snort rules
- `suricata` for Suricata rules

### For unvalidated rules:
```markdown
### [RuleType]: [Rule Title]
**Status:** ⚠️ UNVALIDATED
<!-- Validation error: [error message] -->
```[language]
<rule content>
```​
```

### When a rule type is not applicable:
```markdown
### [RuleType]: N/A
No [file-level|network|behavioral] indicators suitable for [RuleType] detection in this topic.
```

### Rule ordering within the section:
1. Sigma rules first (most common)
2. Snort rules second (network detection)
3. Suricata rules third (network detection with extended features)
4. YARA rules last (file-level, least common)

Each rule should have a brief description line between the heading and the status line explaining what it detects.

---

## Example Output

```markdown
## Detection Rules

### Sigma: Suspicious certutil Download Activity
Detects certutil.exe abuse for downloading files from external URLs, consistent with living-off-the-land techniques.
**Status:** ✅ Validated
```yaml
title: Suspicious certutil Download Activity
id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
status: experimental
description: Detects certutil.exe abuse for file download consistent with observed campaign TTPs
references:
    - https://blog.talosintelligence.com/example-report
author: Actioner CTI Agent Swarm
date: 2026/04/01
tags:
    - attack.command_and_control
    - attack.t1105
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith: '\certutil.exe'
        CommandLine|contains|all:
            - 'urlcache'
            - '-split'
    condition: selection
falsepositives:
    - Legitimate certificate management operations
level: high
```​

### Snort: HTTP C2 Beacon with Custom User-Agent
Detects outbound HTTP traffic with a known malicious User-Agent string associated with this campaign.
**Status:** ✅ Validated
```snort
alert http $HOME_NET any -> $EXTERNAL_NET $HTTP_PORTS (
    msg:"CAMPAIGN C2 Beacon - Custom User-Agent";
    flow:established,to_server;
    content:"Mozilla/5.0 (Compatible; MSIE 9.0; Update Service)";
    http_header;
    fast_pattern;
    sid:2100001; rev:1;
    classtype:trojan-activity;
    reference:url,blog.talosintelligence.com/example-report;
)
```​

### Suricata: TLS C2 Beacon with JA3 Fingerprint
Detects TLS connections matching a known malicious JA3 fingerprint and suspicious SNI pattern associated with this campaign.
**Status:** ✅ Validated
```suricata
alert tls $HOME_NET any -> $EXTERNAL_NET any (
    msg:"AEGIS - TLS C2 Beacon with Known JA3 Hash";
    flow:established,to_server;
    ja3.hash;
    content:"e7d705a3286e19ea42f587b344ee6865";
    tls.sni;
    content:".top"; endswith;
    classtype:trojan-activity;
    reference:url,blog.talosintelligence.com/example-report;
    metadata:author AEGIS, created_at 2026-04-01;
    sid:2200001;
    rev:1;
)
```​

### YARA: N/A
No file-level indicators suitable for YARA detection in this topic.
```
