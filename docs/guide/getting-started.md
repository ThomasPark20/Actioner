# Getting Started

## Quick Start

```bash
git clone https://github.com/ThomasPark20/Aegis.git
cd Aegis
claude
/setup
```

`/setup` handles everything in one flow:

1. **Dependencies** — Node.js 22+, npm install
2. **Container runtime** — Docker build + test
3. **API credentials** — Anthropic API key or Claude subscription
4. **Channel** — Discord bot creation, permissions, registration
5. **Feed scanning** — 2-hour RSS scan for critical threats (optional)
6. **Daily report** — configurable delivery time (optional)
7. **Service** — background process started

## After Setup

Once connected, <Wordmark />:

- Responds to research requests by creating Discord threads
- Delivers all reports as `.md` file attachments
- Scans RSS feeds every 2 hours for critical threats (if enabled)
- Compiles a daily briefing at your configured time (if enabled)
- Validates every detection rule with CLI tools before delivery
- Never blocks chat — research runs in isolated containers

## Prerequisites

- **Git** and **Node.js 22+**
- **Docker** (running)
- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** CLI
- **Anthropic API access** (API key or Claude Pro/Max subscription)
