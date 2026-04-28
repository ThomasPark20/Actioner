# Architecture

## Overview

<ArchitectureFlow />

## Research Thread Flow

<ResearchThreadFlow />

## Dual-Agent Thread Model

Research threads use two concurrent agents:

| Agent | Purpose | Speed | Container |
|-------|---------|-------|-----------|
| **Research agent** | Deep investigation, IOC extraction, rule generation | Slow (minutes) | Full tooling |
| **Thread-chat agent** | User Q&A, add research requirements, report progress | Fast (seconds) | Lightweight |

When a user sends a follow-up message in a research thread:

1. The message is **piped** to the running research agent via IPC (arrives at next SDK turn boundary)
2. A **thread-chat agent** spawns in a virtual sub-group to respond immediately
3. The chat agent can answer questions directly, or append to `requirements.md` to add research requirements
4. Both agents output to the same Discord thread

The chat agent uses a virtual sub-group (`{folder}_chat`) with `replyToJid` set to the parent thread JID, so its output appears in the same Discord thread.

## Why Chat Never Blocks

Each message spawns a **new container**. Research runs in its own container tied to a Discord thread. The main channel agent acknowledges immediately and exits. Multiple research threads can run concurrently. Follow-up messages in threads get fast responses from the thread-chat agent while research continues uninterrupted.

## Container Mounts

### Main group

| Container Path | Host Path | Access |
|----------------|-----------|--------|
| `/workspace/project` | Project root | read-only |
| `/workspace/project/.env` | `/dev/null` | read-only (shadow) |
| `/workspace/group` | `groups/{folder}/` | read-write |
| `/home/node/.claude` | `data/sessions/{group}/.claude/` | read-write |
| `/workspace/ipc` | `data/ipc/{group}/` | read-write |

The main group does **not** receive `/workspace/global`. The `.env` file is shadowed with `/dev/null` so containers never see host secrets.

### Research thread

| Container Path | Host Path | Access |
|----------------|-----------|--------|
| `/workspace/group` | `groups/{folder}/` | read-write |
| `/workspace/global` | `groups/global/` | read-only |
| `/workspace/global/summaries` | `groups/global/summaries/` | read-write (overlay) |
| `/home/node/.claude` | `data/sessions/{group}/.claude/` | read-write |
| `/workspace/ipc` | `data/ipc/{group}/` | read-write |

The summaries directory is overlaid as read-write so research agents can save reports to the shared global directory.

### Thread-chat sub-group

| Container Path | Host Path | Access |
|----------------|-----------|--------|
| `/workspace/group` | `groups/{folder}_chat/` | read-write |
| `/workspace/global` | `groups/global/` | read-only |
| `/workspace/global/summaries` | `groups/global/summaries/` | read-write (overlay) |
| `/workspace/research` | `groups/{research_folder}/` | read-write (for `requirements.md`) |
| `/home/node/.claude` | `data/sessions/{folder}_chat/.claude/` | read-write |
| `/workspace/ipc` | `data/ipc/{folder}_chat/` | read-write |

## IPC

Containers communicate with the host via JSON files:

| Directory | Direction | Purpose |
|-----------|-----------|---------|
| `/workspace/ipc/messages/` | Container → Host | Send messages and files to channels |
| `/workspace/ipc/tasks/` | Container → Host | Schedule tasks, create threads, register groups |
| `/workspace/ipc/input/` | Host → Container | Pipe follow-up messages to running containers |

The host resolves `$NANOCLAW_CHAT_JID` in task files to the actual channel JID automatically. For thread-chat sub-groups, `$NANOCLAW_CHAT_JID` resolves to the parent thread JID (via `replyToJid`).

## Research Requirements

When a user sends a follow-up in a research thread while the research agent is working:

1. **Thread-chat agent responds immediately** — a lightweight chat container spawns, answers the user's question or acknowledges the directive within seconds, then exits.

2. **Requirements are recorded** — if the message is a research directive ("include FBI members", "focus on IOCs"), the chat agent appends it as a checklist item to `requirements.md` in the shared research group folder.

3. **Research agent validates before delivery** — the research agent checks `requirements.md` before delivering the final report. Every `- [ ]` item must be addressed and marked `- [x]` before the report is posted. If requirements are unmet, the agent goes back and researches them.

This creates a **contract** between the user and the research agent — requirements are mandatory, not advisory. The user can add requirements at any time during research, and the agent will not deliver until all are satisfied.

## Thread Re-activation

Expired thread groups are **soft-deleted** (status set to `expired` in the database). The group folder and session data are preserved on disk.

When a user sends a message to an expired thread:
1. The channel handler calls `tryReactivate(jid)`
2. The host looks up the expired thread in the database
3. If found, re-registers the group with a fresh `added_at` timestamp
4. The message is delivered normally, spawning a new container
5. The agent resumes with its existing session and group context

## Thread Groups

Research threads are registered as temporary groups with `idleExpiryMs`. After 10 minutes of inactivity, the group is soft-expired. The Discord thread remains archived and can be re-activated.

Each thread group gets:
- Its own group folder with research CLAUDE.md
- Its own IPC namespace
- Its own container and session
- No trigger required (all messages in the thread are processed)
- An optional thread-chat sub-group for fast user interaction

## Detection Validation

The container image includes:
- **sigma-cli** — `sigma check` + `sigma convert --without-pipeline -t splunk`
- **yarac** — compiles YARA rules
- **snort** — validates Snort rules (when available)
- **suricata** — validates Suricata rules (when available)

Rules validate before inclusion. Failed rules retry 3 times. If still failing, marked `<!-- UNVALIDATED -->`.

## Model

All containers use **Claude Opus 4.6** (`claude-opus-4-6`).

## Built on NanoClaw

<Wordmark /> is built on [NanoClaw](https://github.com/qwibitai/nanoclaw) — an open-source personal Claude assistant framework. NanoClaw provides the core runtime: channel system, container isolation, IPC messaging, group queue, and task scheduler. <Wordmark /> extends it with CTI-specific research pipelines, dual-agent threads, detection rule generation, and the requirements contract system.
