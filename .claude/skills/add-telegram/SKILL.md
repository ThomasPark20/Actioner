---
name: add-telegram
description: Configure Telegram bot channel integration for Actioner. No code changes needed — Telegram support is bundled.
---

# Add Telegram Channel

This skill configures a Telegram bot for Actioner. The Telegram channel code is already bundled in the repo — this skill just collects your token and registers the channel.

## Phase 1: Pre-flight Check

### Check if already configured

Check if `TELEGRAM_BOT_TOKEN` is set in `.env`:

```bash
grep TELEGRAM_BOT_TOKEN .env 2>/dev/null
```

If it's already set and non-empty, skip to Phase 3 (Registration). Ask the user if they want to reconfigure or add another chat.

### Ask the user

AskUserQuestion: Do you have a Telegram bot token, or do you need to create one?

If they have one, collect it and skip to Phase 2 (Configure). If not, walk them through creating one below.

### Create Telegram Bot

If the user doesn't have a bot token, tell them:

> I need you to create a Telegram bot:
>
> 1. Open Telegram and search for `@BotFather`
> 2. Send `/newbot` and follow the prompts:
>    - Bot name: Something friendly (e.g., "Actioner Assistant")
>    - Bot username: Must end with "bot" (e.g., "actioner_cti_bot")
> 3. Copy the bot token (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

Wait for the user to provide the token.

## Phase 2: Configure Environment

### Write the token

Add to `.env`:

```bash
TELEGRAM_BOT_TOKEN=<their-token>
```

Channels auto-enable when their credentials are present — no extra configuration needed.

### Sync to container environment

```bash
mkdir -p data/env && cp .env data/env/env
```

The container reads environment from `data/env/env`, not `.env` directly.

### Disable Group Privacy (for group chats)

Tell the user:

> **Important for group chats**: By default, Telegram bots only see @mentions and commands in groups. To let the bot see all messages:
>
> 1. Open Telegram and search for `@BotFather`
> 2. Send `/mybots` and select your bot
> 3. Go to **Bot Settings** > **Group Privacy** > **Turn off**
>
> This is optional if you only want trigger-based responses via @mentioning the bot.

### Build and restart

```bash
npm run build
```

Restart the service. Use whichever matches the current state:

```bash
# macOS — if service is already loaded:
launchctl kickstart -k gui/$(id -u)/com.nanoclaw

# macOS — if service is NOT loaded yet (fresh install):
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist

# Linux:
systemctl --user restart nanoclaw
```

To check if the service is loaded: `launchctl list | grep nanoclaw`. If no output, it's not loaded — use `load`.

## Phase 3: Registration

### Get Chat ID

Ask the user:

> To get the chat ID:
>
> 1. Open your bot in Telegram (search for its username)
> 2. Send `/chatid` — the bot will reply with the chat ID
> 3. For groups: add the bot to the group first, then send `/chatid` in the group
>
> The chat ID will be a number like `123456789` (DMs) or `-1001234567890` (groups).

Wait for the user to provide the chat ID and a name for the chat.

### Register the chat

For a main chat (responds to all messages):

```bash
npx tsx setup/index.ts --step register -- --jid "tg:<chat-id>" --name "<chat-name>" --folder "telegram_main" --trigger "@Actioner" --channel telegram --no-trigger-required --is-main
```

For additional chats (trigger-only):

```bash
npx tsx setup/index.ts --step register -- --jid "tg:<chat-id>" --name "<chat-name>" --folder "telegram_<group-name>" --trigger "@Actioner" --channel telegram
```

## Phase 4: Seed Scheduled Tasks

After registration, seed the default Actioner tasks. **Only seed if they don't already exist** — check with `list_tasks` first.

1. **Daily briefing** — runs every morning at 8am local time:

```
schedule_task(
  taskId: "daily-report",
  prompt: "Compile and deliver the daily CTI briefing. Read all summaries from ../global/summaries/ with today's date prefix. Create an executive summary with the top 3-5 items, full topic summaries, and an IOC table if applicable. Save the compiled report to ../global/summaries/daily/YYYY-MM-DD-daily-report.md. Then send the executive summary as a message and attach the full report as an .md file via send_file. If no new summaries exist for today, send: 'No significant threat activity in the last 24 hours.'",
  schedule_type: "cron",
  schedule_value: "0 8 * * *",
  context_mode: "isolated"
)
```

2. **RSS feed scan** — runs every 2 hours with a script gate that scans all CTI feeds:

```
schedule_task(
  taskId: "rss-scan",
  prompt: "Process the RSS scan results. The script detected new articles from CTI feeds.\n\nFor each topic group in data.criticalArticles: dedup against existing summaries (grep URLs in ../global/summaries/), then research the topic following primary sources, extract IOCs, save summary to ../global/summaries/<date>-<topic-slug>.md, and send the report as an .md file attachment via send_file with a brief caption summarizing the critical finding.\n\nFor data.newArticles (non-critical): save article URLs and titles to investigation.md for daily compilation.\n\nNEVER dump full reports as inline messages — always attach as .md file.",
  schedule_type: "cron",
  schedule_value: "0 */2 * * *",
  context_mode: "isolated",
  script: "node /workspace/project/container/skills/rss-scan/scan.mjs"
)
```

## Phase 5: Verify

### Test the connection

Tell the user:

> Send a message to your registered Telegram chat:
> - For main chat: Any message works
> - For non-main: `@Actioner hello` or @mention the bot
>
> The bot should respond within a few seconds.

### Check logs if needed

```bash
tail -f logs/actioner.log
```

## Troubleshooting

### Bot not responding

1. Check `TELEGRAM_BOT_TOKEN` is set in `.env` AND synced to `data/env/env`
2. Check chat is registered: `sqlite3 store/messages.db "SELECT * FROM registered_groups WHERE jid LIKE 'tg:%'"`
3. For non-main chats: message must include trigger pattern (@mention the bot)
4. Service is running: `launchctl list | grep actioner` (macOS) or `systemctl --user status actioner` (Linux)
5. Verify token: `curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"`

### Bot only responds to @mentions in groups

Group Privacy is enabled (default). Fix:
1. `@BotFather` > `/mybots` > select bot > **Bot Settings** > **Group Privacy** > **Turn off**
2. Remove and re-add the bot to the group (required for the change to take effect)

### Getting chat ID

If `/chatid` doesn't work:
- Verify token: `curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"`
- Check bot is started: `tail -f logs/actioner.log`

## After Setup

The Telegram bot supports:
- Text messages in registered chats and groups
- **Critical alerts** — every 2 hours, RSS feeds are scanned. Critical items (APTs, CVEs, zero-days, ransomware) are researched and delivered as message + .md file attachment.
- **Daily briefing** — at your configured time (default 8am), a compiled daily report is sent as message + .md file attachment.
- Media handling (photos, documents, videos shown as descriptions)
- Reply context (shows who the user is replying to)
- @mention translation (Telegram mentions → Actioner trigger format)
- Message splitting for long responses
- File sending for reports and exports via `sendDocument`

Note: Telegram does not support threads like Discord. Reports are delivered as regular messages with file attachments.
