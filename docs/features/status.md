# /status Command

Send `/status` in any Discord channel or Telegram chat to get an instant system dashboard. This is a bot-level command: it responds immediately without spinning up an agent container.

## Example Output

```
Actioner Status

System
  Uptime: 2d 5h 12m
  Containers: 1/5 active

Channels
  discord: connected
  telegram: connected

Groups: 3 registered

Scheduled Tasks
  Active: 4 | Paused: 1 | Total: 5

Messages: 1,234 stored

Running Now
  task:threat-scan (0h 2m)
  dc:1234567890 (0h 45m)

Recent Task Runs
  threat-scan: ok 2.3s (5m ago)
  daily-report: ok 45.1s (3h ago)
```

## What It Shows

| Section | Description |
|---------|-------------|
| **System** | Process uptime and container utilization (active / max) |
| **Channels** | Connected messaging platforms |
| **Groups** | Number of registered chat groups |
| **Scheduled Tasks** | Active, paused, and total scheduled tasks |
| **Messages** | Total messages stored in the database |
| **Running Now** | Currently active containers with runtime duration |
| **Recent Task Runs** | Last 5 completed task executions with status and duration |

## How It Works

Unlike agent commands that route through the container pipeline, `/status` is handled directly by the bot at the channel adapter level, the same way `/ping` and `/chatid` work. This means:

- **Instant response**: no container spin-up, no agent processing
- **Works when things are broken**: if containers are stuck or the agent is down, `/status` still responds
- **No registration required**: works in any channel where the bot is present (Discord) or any chat (Telegram)

## Other Bot Commands

| Command | Platform | Description |
|---------|----------|-------------|
| `/status` | Discord, Telegram | System dashboard |
| `/ping` | Telegram | Quick online check |
| `/chatid` | Telegram | Get the chat ID for registration |

## What It Doesn't Show

<Wordmark /> never exposes internal details like file paths, API keys, database queries, or system architecture. The output is user-friendly, not a debug dump.
