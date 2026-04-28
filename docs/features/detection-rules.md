# Validated Detection Rules

Every detection rule <Wordmark /> generates is validated with real CLI tools before inclusion in a report.

## Example

A Scattered Spider research report might include:

```yaml
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
level: high
tags:
  - attack.credential_access
  - attack.t1003.001
```

This rule was written by the agent, validated with `sigma check` and `sigma convert`, and included in the report as "Validated." If it had failed validation, it would retry up to 3 times before being marked `UNVALIDATED` with the error attached.

## Supported Rule Types

| Type | When Generated | Validation |
|------|---------------|------------|
| **Sigma** | Almost always: behavioral and technical indicators | `sigma check` + `sigma convert --without-pipeline -t splunk` |
| **YARA** | File-level indicators (malware, byte patterns) | `yarac rule.yar /dev/null` |
| **Snort** | Network indicators (IPs, domains, HTTP patterns) | `snort -T` |
| **Suricata** | Network indicators (IDS/IPS deployments) | `suricata -T -S rule.rules` |

## Validation Flow

1. **Generate** rules from the topic analysis
2. **Write** each rule to a temp file
3. **Run** the validation command
4. **If passes:** included as "Validated" in the report
5. **If fails:** error captured, rule regenerated (up to 3 attempts)
6. **If still failing:** included with `<!-- UNVALIDATED -->` marker and the error

Rules are never silently dropped. If it can't validate, you see it marked as unvalidated with the reason.

## Rules Live Inside Summaries

Detection rules are always part of a topic summary, never standalone files. Each `## Detection Rules` section begins with a context paragraph explaining what the rules detect, which TTPs they target, and which log sources they cover.

## Reference Docs

The agent reads format specifications before generating:
- `docs/sigma-spec.md`: Sigma rule specification
- `docs/yara-ref.md`: YARA rule reference
- `docs/snort-ref.md`: Snort 3 rule reference
- `docs/suricata-ref.md`: Suricata rule reference
