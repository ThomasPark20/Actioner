---
name: add-telegram
description: Configure Telegram bot channel integration for AEGIS. No code changes needed — Telegram support is bundled.
---

# Add Telegram Channel

This skill configures a Telegram bot for AEGIS. The Telegram channel code is already bundled in the repo — this skill just collects your token and registers the channel.

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
>    - Bot name: Something friendly (e.g., "AEGIS Assistant")
>    - Bot username: Must end with "bot" (e.g., "aegis_cti_bot")
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
launchctl kickstart -k gui/$(id -u)/com.aegis  # macOS
# Linux: systemctl --user restart aegis
```

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
npx tsx setup/index.ts --step register -- --jid "tg:<chat-id>" --name "<chat-name>" --folder "telegram_main" --trigger "@AEGIS" --channel telegram --no-trigger-required --is-main
```

For additional chats (trigger-only):

```bash
npx tsx setup/index.ts --step register -- --jid "tg:<chat-id>" --name "<chat-name>" --folder "telegram_<group-name>" --trigger "@AEGIS" --channel telegram
```

## Phase 4: Seed Scheduled Tasks

After registration, seed the default AEGIS tasks. **Only seed if they don't already exist** — check with `list_tasks` first.

1. **Daily briefing** — runs every morning at 8am local time:

```
schedule_task(
  prompt: "Run the daily CTI briefing. Check feeds, summarize new threats, and send a briefing to this channel.",
  schedule_type: "cron",
  schedule_value: "0 8 * * *",
  context_mode: "isolated"
)
```

2. **Critical issue polling** — runs every 2 hours with a script gate:

```
schedule_task(
  prompt: "Check for critical security issues. If the script detected new critical items, analyze and alert the channel.",
  schedule_type: "interval",
  schedule_value: "7200000",
  context_mode: "isolated",
  script: "curl -sf https://cve.circl.lu/api/last/5 | node -e \"const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const c=d.filter(i=>i.cvss&&i.cvss>=9);console.log(JSON.stringify({wakeAgent:c.length>0,data:c}))\""
)
```

## Phase 5: Verify

### Test the connection

Tell the user:

> Send a message to your registered Telegram chat:
> - For main chat: Any message works
> - For non-main: `@AEGIS hello` or @mention the bot
>
> The bot should respond within a few seconds.

### Check logs if needed

```bash
tail -f logs/aegis.log
```

## Troubleshooting

### Bot not responding

1. Check `TELEGRAM_BOT_TOKEN` is set in `.env` AND synced to `data/env/env`
2. Check chat is registered: `sqlite3 store/messages.db "SELECT * FROM registered_groups WHERE jid LIKE 'tg:%'"`
3. For non-main chats: message must include trigger pattern (@mention the bot)
4. Service is running: `launchctl list | grep aegis` (macOS) or `systemctl --user status aegis` (Linux)
5. Verify token: `curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"`

### Bot only responds to @mentions in groups

Group Privacy is enabled (default). Fix:
1. `@BotFather` > `/mybots` > select bot > **Bot Settings** > **Group Privacy** > **Turn off**
2. Remove and re-add the bot to the group (required for the change to take effect)

### Getting chat ID

If `/chatid` doesn't work:
- Verify token: `curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"`
- Check bot is started: `tail -f logs/aegis.log`

## After Setup

The Telegram bot supports:
- Text messages in registered chats and groups
- Media handling (photos, documents, videos shown as descriptions)
- Reply context (shows who the user is replying to)
- @mention translation (Telegram mentions → AEGIS trigger format)
- Message splitting for long responses
- File sending for reports and exports via `sendDocument`
