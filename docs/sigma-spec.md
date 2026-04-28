# Sigma Rule Specification Reference

> Concise reference for generating valid Sigma detection rules. Loaded into the Rule Generator Agent's context alongside topic summaries.

## Rule Schema

Every Sigma rule is a YAML document with these fields:

```yaml
title: Short descriptive title (max ~100 chars)
id: <UUID v4>          # Unique identifier, generate a new one per rule
status: experimental   # See valid values below
description: >
    What this rule detects and why it matters.
references:
    - https://source-url-from-topic-summary
author: Actioner
date: YYYY-MM-DD       # Date rule was created
modified: YYYY-MM-DD   # Date rule was last modified (optional on first creation)
tags:
    - attack.tactic_name        # e.g. attack.execution
    - attack.tXXXX              # e.g. attack.t1059.001
logsource:
    category: <category>
    product: <product>          # Optional depending on category
    service: <service>          # Optional depending on category
detection:
    selection:
        FieldName: value
    condition: selection
falsepositives:
    - Description of known false positive scenarios
level: medium           # See valid values below
```

## Field Reference

### status

| Value | Use when |
|---|---|
| `experimental` | New rule, not yet tested in production. **Default for all generated rules.** |
| `test` | Rule is being tested in a production-like environment |
| `stable` | Rule has been validated in production |
| `deprecated` | Rule is no longer maintained |
| `unsupported` | Rule is not supported by current backends |

### level

| Value | Meaning |
|---|---|
| `informational` | Purely informational, no action needed |
| `low` | Suspicious but common; high false positive rate expected |
| `medium` | Moderately suspicious; warrants investigation |
| `high` | Highly suspicious; likely malicious activity |
| `critical` | Almost certainly malicious; requires immediate response |

### logsource

The `logsource` field defines what log data the rule applies to. Use these combinations:

**Endpoint categories** (no `product` required unless OS-specific):

| category | Description |
|---|---|
| `process_creation` | Process start events (Sysmon EID 1, Windows 4688) |
| `file_event` | File creation/modification/deletion |
| `file_change` | File content modification |
| `file_rename` | File rename events |
| `file_delete` | File deletion events |
| `registry_event` | Registry key/value operations |
| `registry_set` | Registry value set operations |
| `registry_add` | Registry key creation |
| `network_connection` | Outbound network connections (Sysmon EID 3) |
| `dns_query` | DNS resolution requests (Sysmon EID 22) |
| `image_load` | DLL/module load events (Sysmon EID 7) |
| `pipe_created` | Named pipe creation |
| `ps_script` | PowerShell script block logging |
| `ps_module` | PowerShell module logging |

**With product/service** (for specific log sources):

| product | service | Description |
|---|---|---|
| `windows` | `security` | Windows Security event log |
| `windows` | `system` | Windows System event log |
| `windows` | `sysmon` | Sysmon operational log |
| `linux` | `auditd` | Linux audit daemon |
| `linux` | `syslog` | Linux syslog |
| `aws` | `cloudtrail` | AWS CloudTrail logs |
| `azure` | `activitylogs` | Azure Activity Logs |
| `gcp` | `gcp.audit` | GCP Audit Logs |

**Proxy/web/firewall**:

| category | Description |
|---|---|
| `proxy` | Web proxy logs |
| `firewall` | Network firewall logs |
| `webserver` | Web server access logs |

## Detection Syntax

### Selection blocks

Selections define field-value matching conditions:

```yaml
detection:
    selection:
        FieldName: 'value'                    # Exact match
        FieldName:
            - 'value1'                        # OR list
            - 'value2'
        FieldName|modifier: 'value'           # Modified match
```

### Field name modifiers

Modifiers are appended to field names with `|`:

| Modifier | Description | Example |
|---|---|---|
| `contains` | Substring match | `CommandLine|contains: 'mimikatz'` |
| `startswith` | Prefix match | `Image|startswith: 'C:\Temp\'` |
| `endswith` | Suffix match | `Image|endswith: '\cmd.exe'` |
| `re` | Regular expression | `CommandLine|re: '\/[a-z]{8}\.exe'` |
| `base64` | Base64-encoded match | `CommandLine|base64: 'IEX'` |
| `base64offset` | Base64 with offset variants | `CommandLine|base64offset: 'IEX'` |
| `cidr` | CIDR network range | `DestinationIp|cidr: '10.0.0.0/8'` |
| `all` | All values must match (AND) | `CommandLine|contains|all:` |
| `windash` | Match both `-` and `/` switches | `CommandLine|windash|contains: '-enc'` |

**Chaining modifiers**: Modifiers chain left-to-right. Common patterns:

```yaml
# All substrings must be present in CommandLine (AND logic)
CommandLine|contains|all:
    - 'urlcache'
    - '-split'
    - 'http'

# Any value ends with one of these (OR logic, default)
Image|endswith:
    - '\certutil.exe'
    - '\bitsadmin.exe'
```

### Condition expressions

The `condition` field combines named selections with boolean logic:

```yaml
condition: selection                              # Simple: just the selection
condition: selection and not filter               # Selection minus exclusions
condition: selection1 or selection2               # Either selection
condition: 1 of selection*                        # Any selection matching wildcard
condition: all of selection*                      # All selections matching wildcard
condition: selection and not (filter1 or filter2) # Complex exclusion
```

### Keywords (fieldless matching)

Match against the full log message without specifying a field:

```yaml
detection:
    keywords:
        - 'mimikatz'
        - 'sekurlsa'
    condition: keywords
```

### Multiple selections pattern

```yaml
detection:
    selection_process:
        Image|endswith: '\powershell.exe'
    selection_cmdline:
        CommandLine|contains|all:
            - '-encodedcommand'
            - '-noprofile'
    filter_legit:
        ParentImage|endswith: '\svchost.exe'
        User|contains: 'SYSTEM'
    condition: selection_process and selection_cmdline and not filter_legit
```

## Tag Conventions

Tags use the `attack.` prefix for MITRE ATT&CK mapping:

- **Tactics** (lowercase, dots replaced with underscores): `attack.execution`, `attack.persistence`, `attack.defense_evasion`, `attack.credential_access`, `attack.discovery`, `attack.lateral_movement`, `attack.collection`, `attack.command_and_control`, `attack.exfiltration`, `attack.impact`, `attack.initial_access`, `attack.privilege_escalation`, `attack.reconnaissance`, `attack.resource_development`
- **Techniques**: `attack.t1059` (Command and Scripting Interpreter)
- **Sub-techniques**: `attack.t1059.001` (PowerShell)

Always include at least one tactic and one technique tag.

## Example Rules

### Example 1: Process Creation — Suspicious certutil usage

```yaml
title: Certutil Download and Decode Activity
id: 3b6ab547-be7f-4d6c-ae1e-8c9b0e4f7a2d
status: experimental
description: >
    Detects certutil.exe used to download or decode files, a common LOLBin
    technique used by threat actors including Volt Typhoon.
references:
    - https://blog.talosintelligence.com/volt-typhoon-certutil
author: Actioner
date: 2026-04-01
tags:
    - attack.command_and_control
    - attack.t1105
    - attack.defense_evasion
    - attack.t1140
logsource:
    category: process_creation
    product: windows
detection:
    selection_binary:
        Image|endswith: '\certutil.exe'
    selection_args:
        CommandLine|contains|all:
            - 'urlcache'
            - '-split'
    condition: selection_binary and selection_args
falsepositives:
    - Legitimate certificate management operations
    - Software update mechanisms using certutil
level: high
```

### Example 2: DNS Query — Suspicious DGA-like domain

```yaml
title: DNS Query to Potential DGA Domain
id: a8c1e4b9-2f3d-4a6e-9b7c-1d5e8f0a3c2b
status: experimental
description: >
    Detects DNS queries to domains with high entropy names typical of
    domain generation algorithms used by malware for C2 communication.
references:
    - https://example.com/dga-analysis
author: Actioner
date: 2026-04-01
tags:
    - attack.command_and_control
    - attack.t1568.002
logsource:
    category: dns_query
detection:
    selection:
        QueryName|re: '^[a-z0-9]{15,}\.(xyz|top|club|info|tk|ml|ga|cf|gq)$'
    filter_known:
        QueryName|endswith:
            - '.windowsupdate.com'
            - '.microsoft.com'
    condition: selection and not filter_known
falsepositives:
    - CDN domains with long hashed subdomains
    - Legitimate services using unusual TLDs
level: medium
```

### Example 3: Proxy — Suspicious HTTP beacon pattern

```yaml
title: HTTP Beacon to Suspicious Endpoint with Fixed Interval
id: d4e7f1a2-8b3c-4e5d-9a6f-2c1b0d8e7f3a
status: experimental
description: >
    Detects HTTP requests to suspicious endpoints with patterns consistent
    with C2 beacon check-ins, including encoded parameters and unusual paths.
references:
    - https://example.com/c2-beacon-analysis
author: Actioner
date: 2026-04-01
tags:
    - attack.command_and_control
    - attack.t1071.001
logsource:
    category: proxy
detection:
    selection_method:
        cs-method: 'POST'
    selection_uri:
        cs-uri-query|contains:
            - 'id='
            - 'token='
            - 'session='
        cs-uri-stem|re: '\/(api|update|check|beacon|sync)\/[a-f0-9]{8,}'
    condition: selection_method and selection_uri
falsepositives:
    - Legitimate API calls with similar URI patterns
    - Telemetry or analytics endpoints
level: medium
```

## Validation

Generated Sigma rules must pass these checks:

```bash
# Syntax validation
sigma check rule.yml

# Backend conversion test (confirms rule compiles to a valid query)
sigma convert --without-pipeline -t splunk rule.yml
```

If validation fails, review the error message, fix the rule, and retry (max 3 attempts total).
