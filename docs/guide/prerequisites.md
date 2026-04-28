# Prerequisites

## Required

| Tool | Version | Check |
|------|---------|-------|
| Git | Any | `git --version` |
| Node.js | 22+ | `node --version` |
| Docker | Any | `docker --version` |
| Claude Code | Latest | `claude --version` |

**Anthropic API access** — either an API key from [console.anthropic.com](https://console.anthropic.com) or a Claude Pro/Max subscription.

## Installing Node.js

macOS (Homebrew):
```bash
brew install node@22
```

Any platform (nvm):
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22
```

## Installing Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

## Installing Docker

- **macOS:** [Docker Desktop](https://docs.docker.com/desktop/install/mac-install/)
- **Linux:** [Docker Engine](https://docs.docker.com/engine/install/)
- **Windows (WSL):** [Docker Desktop with WSL 2](https://docs.docker.com/desktop/install/windows-install/)
