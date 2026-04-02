# AEGIS — CTI Research & Detection Platform

An AI-powered Cyber Threat Intelligence platform that researches threats, generates validated detection rules (Sigma, YARA, Snort), and delivers reports — all through your existing chat channels.

Built on the [NanoClaw](https://github.com/qwibitai/nanoclaw) agent framework. Agents run in isolated Linux containers with filesystem sandboxing.

---

## Quick Start

```bash
git clone git@github.com:ThomasPark20/Aegis.git
cd Aegis
claude
```

Then run `/setup` inside the Claude Code prompt. It handles everything: dependencies, authentication, container build, and service configuration.

> **Note:** Commands prefixed with `/` (like `/setup`, `/add-discord`) are [Claude Code skills](https://code.claude.com/docs/en/skills). Type them inside the `claude` CLI prompt, not in your regular terminal.

### Prerequisites

- macOS, Linux, or Windows (via WSL2)
- Node.js 22+
- [Claude Code](https://claude.ai/download) installed
- [Docker](https://docker.com/products/docker-desktop) or [Apple Container](https://github.com/apple/container) (macOS)
- An Anthropic API key or OAuth token

### What `/setup` Does

1. Installs Node.js dependencies (`npm install`)
2. Builds TypeScript (`npm run build`)
3. Builds the agent container image (includes Sigma, YARA, Snort validation tools)
4. Configures authentication (Anthropic API key or OAuth token via OneCLI)
5. Sets up the service (launchd on macOS, systemd on Linux)
6. Creates the main control group
7. Configures Claude Opus 4.6 as the default model

---

## Connecting Discord

### 1. Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and name it (e.g., "AEGIS")
3. Go to **Bot** in the sidebar
4. Click **Reset Token** and copy the bot token — you'll need it shortly
5. Under **Privileged Gateway Intents**, enable:
   - **Message Content Intent**
   - **Server Members Intent**
6. Go to **OAuth2 > URL Generator**
7. Select scopes: `bot`
8. Select bot permissions: `Send Messages`, `Read Message History`, `Attach Files`, `Read Messages/View Channels`
9. Copy the generated URL and open it in your browser to invite the bot to your server

### 2. Install the Discord Channel

Inside the Claude Code prompt:

```
/add-discord
```

This clones the [aegis-discord](https://github.com/ThomasPark20/aegis-discord) channel adapter, configures the bot token, and registers the channel.

### 3. Register Groups

From the main control channel:

```
@AEGIS join the #threat-intel channel
```

AEGIS will find the channel and register it. Each channel gets its own isolated filesystem and memory.

---

## Connecting Telegram

### 1. Create a Telegram Bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Choose a name (e.g., "AEGIS CTI") and username (e.g., `aegis_cti_bot`)
4. Copy the bot token BotFather gives you
5. Send `/setprivacy` to BotFather, select your bot, and choose **Disable** (so the bot can read group messages)
6. Add the bot to your Telegram group

### 2. Install the Telegram Channel

Inside the Claude Code prompt:

```
/add-telegram
```

This clones the [aegis-telegram](https://github.com/ThomasPark20/aegis-telegram) channel adapter, configures the bot token, and registers the channel.

---

## Architecture

```
                    +------------------+
                    |   Chat Channels  |
                    | Discord/Telegram |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  SQLite Message   |
                    |     Database      |
                    +--------+---------+
                             |
                    +--------v---------+
                    |   Polling Loop    |
                    |   (index.ts)      |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
    +---------v----------+       +----------v---------+
    |   Agent Container  |       |  Research Container |
    |  (Chat / Main)     |       |  (Background CTI)   |
    |                    |       |                      |
    |  Claude Agent SDK  |       |  Claude Agent SDK    |
    |  + MCP Tools       |       |  + CTI Skills        |
    |  + Web Access      |       |  + Sigma/YARA/Snort  |
    +--------------------+       +----------------------+
```

**Single Node.js process.** Channels self-register at startup. Messages flow into SQLite, get picked up by the polling loop, and dispatched to isolated Linux containers running the Claude Agent SDK. Each group has its own container, filesystem, and CLAUDE.md memory.

### Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Orchestrator: state, message loop, agent invocation |
| `src/container-runner.ts` | Spawns agent containers with mounts |
| `src/ipc.ts` | IPC watcher, file/message processing |
| `src/task-scheduler.ts` | Scheduled task execution |
| `src/db.ts` | SQLite operations |
| `src/channels/registry.ts` | Channel self-registration |
| `groups/main/CLAUDE.md` | Main group agent template |
| `groups/research/CLAUDE.md` | Research agent template |
| `container/skills/` | CTI skills loaded in containers |

---

## Core Features

1. **Threat Research** — Ask AEGIS to research any threat topic. It follows primary sources, chases IOC repos, and produces structured reports.

2. **Detection Rule Generation** — Automatically generates Sigma, YARA, and Snort rules based on discovered TTPs and IOCs. Rules are validated using CLI tools before delivery.

3. **Daily Briefing** — Scheduled RSS feed ingestion, noise filtering, deduplication, and topic grouping. Produces daily threat intelligence summaries.

4. **Critical Issue Polling** — Monitors for high-priority threats on a 2-hour interval and alerts when action is needed.

5. **Multi-Channel Messaging** — Interact through Discord, Telegram, Slack, or WhatsApp. Add channels with skills like `/add-discord` or `/add-telegram`.

6. **Container Isolation** — Every agent runs in its own Linux container with filesystem sandboxing. Only explicitly mounted directories are accessible.

7. **Credential Security** — Agents never hold raw API keys. Outbound requests route through OneCLI's Agent Vault, which injects credentials at request time.

8. **Agent Swarms** — Spin up teams of specialized agents (research, analysis, rule generation) that collaborate on complex investigations.

---

## Adding RSS Feeds

Edit `feeds.yaml` to add or modify RSS feed sources:

```yaml
feeds:
  - name: "Krebs on Security"
    url: "https://krebsonsecurity.com/feed/"
    category: "threat-intel"
  - name: "CISA Advisories"
    url: "https://www.cisa.gov/cybersecurity-advisories/all.xml"
    category: "advisories"
```

The daily briefing task automatically fetches and processes all configured feeds.

---

## Custom Skills

AEGIS ships with four CTI skills in `container/skills/`:

| Skill | Purpose |
|-------|---------|
| `ingest` | Fetch RSS feeds, filter noise, deduplicate, group by topic |
| `research` | Deep investigation, follow primary sources, chase IOC repos |
| `ioc-extract` | Extract and normalize IOCs, map TTPs to MITRE ATT&CK |
| `rule-gen` | Generate, validate, and append detection rules |

To add custom skills, create a new directory under `container/skills/` with a `SKILL.md` file. Skills are automatically loaded into agent containers at runtime.

---

## Updating

Pull the latest changes:

```bash
cd Aegis
git pull origin main
npm install
npm run build
./container/build.sh
```

Then restart the service.

### Syncing Upstream NanoClaw Changes

AEGIS is forked from NanoClaw. To pull upstream improvements:

```bash
git remote add upstream https://github.com/qwibitai/nanoclaw.git
git fetch upstream
git merge upstream/main
```

Resolve any conflicts (AEGIS customizations take priority), rebuild, and restart.

---

## Project Structure

```
aegis/
├── src/                     # Runtime source code (TypeScript)
│   ├── index.ts             # Main orchestrator
│   ├── container-runner.ts  # Container spawning
│   ├── ipc.ts               # Inter-process communication
│   ├── task-scheduler.ts    # Scheduled tasks
│   ├── db.ts                # SQLite database
│   └── channels/            # Channel registry
├── container/               # Docker container
│   ├── Dockerfile           # Agent image (Node + Sigma + YARA + Snort)
│   ├── build.sh             # Build script
│   ├── agent-runner/        # In-container agent bootstrap
│   └── skills/              # CTI skills (ingest, research, ioc-extract, rule-gen)
├── groups/                  # Group templates
│   ├── main/CLAUDE.md       # Main chat agent template
│   ├── global/CLAUDE.md     # Global shared memory
│   └── research/CLAUDE.md   # Research agent template
├── docs/                    # Reference documentation
│   ├── sigma-spec.md        # Sigma rule specification
│   ├── yara-ref.md          # YARA rule reference
│   └── snort-ref.md         # Snort 3 rule reference
├── templates/               # Output templates
│   └── topic-summary.md     # Topic summary template
├── feeds.yaml               # RSS feed configuration
├── setup.sh                 # Installation bootstrap
└── .claude/skills/          # Claude Code skills (/setup, /add-discord, etc.)
```

---

## Troubleshooting

**Container build fails?**
Ensure Docker is running. Try `./container/build.sh` from the `container/` directory. If cached layers are stale, run `docker builder prune` first.

**Bot not responding in Discord/Telegram?**
Check that the bot has the correct permissions and intents enabled. Verify the bot token is configured correctly. Run `/debug` in Claude Code for guided troubleshooting.

**Authentication errors (401)?**
Ensure you're using a long-lived API key or OAuth token, not a short-lived session token. Run `/setup` to reconfigure authentication.

**Sigma/YARA validation failing in container?**
The container includes `sigma-cli`, `yarac`, and optionally `snort`. Run `docker run --rm --entrypoint bash nanoclaw-agent:latest -c 'sigma -h'` to verify tools are installed.

**Service won't start?**
Check logs with `journalctl --user -u aegis` (Linux) or `log show --predicate 'process == "node"' --last 1h` (macOS). Common issues: missing environment variables, port conflicts, stale lock files.

**Messages not being processed?**
Verify the trigger word (`@AEGIS`) is being used in non-main groups. Check that the sender is on the allowlist if one is configured.

---

## License

MIT

---

<sub>Built on [NanoClaw](https://github.com/qwibitai/nanoclaw) — a lightweight, container-isolated AI assistant framework.</sub>
