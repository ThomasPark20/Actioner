# Custom Skills

<Wordmark /> comes with 9 built-in skills. You can add your own.

## Built-in Skills

| Skill | Path | Purpose |
|-------|------|---------|
| Research | `container/skills/research/` | Web research and primary source chasing for threat intelligence |
| Ingest | `container/skills/ingest/` | RSS feed ingestion, article triage, deduplication, and topic grouping |
| IOC Extract | `container/skills/ioc-extract/` | Extract and defang IOCs, map TTPs to MITRE ATT&CK |
| Rule Gen | `container/skills/rule-gen/` | Generate and validate Sigma, YARA, Snort, and Suricata rules |
| Threat Scan | `container/skills/threat-scan/` | 2-hour RSS scan cycle with LLM triage and proactive search |
| Schedule Report | `container/skills/schedule-report/` | Set up or manage daily briefing schedule |
| Agent Browser | `container/skills/agent-browser/` | Browse the web, read articles, interact with pages |
| Capabilities | `container/skills/capabilities/` | Show installed skills, tools, and system info |
| Status | `container/skills/status/` | Quick health check on session, workspace, and tasks |

## Creating a Skill

```bash
mkdir -p container/skills/my-skill
```

Create `container/skills/my-skill/SKILL.md`:

```markdown
---
name: my-skill
description: What this skill does and when to use it.
---

# My Skill

Instructions for the agent when this skill is invoked.

## Workflow
1. Step one
2. Step two

## Output
What the skill produces.
```

Skills in `container/skills/` are synced to each container's `.claude/skills/` at startup.
