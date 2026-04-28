---
name: add-discord
description: Configure Discord bot channel integration for Actioner. No code changes needed — Discord support is bundled.
---

# Add Discord Channel

This skill configures a Discord bot for Actioner. The Discord channel code is already bundled in the repo — this skill just collects your token and registers the channel.

## Phase 1: Pre-flight Check

### Check if already configured

Check if `DISCORD_BOT_TOKEN` is set in `.env`:

```bash
grep DISCORD_BOT_TOKEN .env 2>/dev/null
```

If it's already set and non-empty, skip to Phase 3 (Registration). Ask the user if they want to reconfigure or add another channel.

### Ask the user

AskUserQuestion: Do you have a Discord bot token, or do you need to create one?

If they have one, collect it and skip to Phase 2 (Configure). If not, walk them through creating one below.

### Create Discord Bot

If the user doesn't have a bot token, walk them through each step:

> **Step 1 — Create the Application**
>
> 1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
> 2. Click **New Application** in the top right
> 3. Give it a name — e.g., **"Actioner"** — and click Create
>
> **Step 2 — Configure the Bot**
>
> 1. In the left sidebar, click **Bot**
> 2. Click **Reset Token** to generate a new bot token
> 3. **Copy the token immediately** — you can only see it once. If you lose it, you'll need to reset again
> 4. Under **Privileged Gateway Intents**, enable these (scroll down):
>    - **Message Content Intent** — required so the bot can read message text
>    - **Server Members Intent** — optional, for showing display names
>
> **Step 3 — Set Bot Permissions & Invite to Server**
>
> 1. In the left sidebar, click **OAuth2** > **URL Generator**
> 2. Under **Scopes**, check: `bot`
> 3. Under **Bot Permissions**, check these boxes:
>    - `Send Messages` — so the bot can reply
>    - `Send Messages in Threads` — so research threads work
>    - `Create Public Threads` — so the bot can create research threads
>    - `Attach Files` — for sending reports and exports
>    - `Read Message History` — to understand conversation context
>    - `View Channels` — to see the channels it's registered in
> 4. Copy the generated URL at the bottom
> 5. Open it in your browser — select your server and click **Authorize**
>
> **Step 4 — Copy the bot token and paste it here**

Wait for the user to provide the token.

## Phase 2: Configure Environment

### Write the token

Add to `.env`:

```bash
DISCORD_BOT_TOKEN=<their-token>
```

Channels auto-enable when their credentials are present — no extra configuration needed.

### Sync to container environment

```bash
mkdir -p data/env && cp .env data/env/env
```

The container reads environment from `data/env/env`, not `.env` directly.

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

### Collect channel info

Ask the user for:

1. **Server name** — the name of their Discord server (e.g., "My Security Team")
2. **Channel name** — the text channel name (e.g., "general" or "threat-intel")
3. **Channel ID** — tell them:

> To get the channel ID:
>
> 1. In Discord, go to **User Settings** > **Advanced** > Enable **Developer Mode**
> 2. Right-click the text channel you want the bot to respond in
> 3. Click **Copy Channel ID**
>
> The channel ID will be a long number like `1234567890123456`.

Wait for the user to provide the server name, channel name, and channel ID.

### Register the channel

For a main channel (responds to all messages):

```bash
npx tsx setup/index.ts --step register -- --jid "dc:<channel-id>" --name "<server-name> #<channel-name>" --folder "discord_main" --trigger "@Actioner" --channel discord --no-trigger-required --is-main
```

For additional channels (trigger-only):

```bash
npx tsx setup/index.ts --step register -- --jid "dc:<channel-id>" --name "<server-name> #<channel-name>" --folder "discord_<channel-name>" --trigger "@Actioner" --channel discord
```

## Phase 4: Seed Scheduled Tasks

After registration, seed the default Actioner tasks. **Only seed if they don't already exist** — check with `list_tasks` first.

1. **Daily briefing** — runs every morning at 8am local time:

```
schedule_task(
  taskId: "daily-report",
  prompt: "Compile and deliver the daily CTI briefing. Read all summaries from ../global/summaries/ with today's date prefix. Create an executive summary with the top 3-5 items, full topic summaries, and an IOC table if applicable. Save the compiled report to ../global/summaries/daily/YYYY-MM-DD-daily-report.md. Then create a new thread to deliver it: write a start_research_thread IPC task with threadName 'Daily Brief — YYYY-MM-DD', post the executive summary bullets as the opening message, and attach the full report as an .md file. If no new summaries exist for today, send a short message: 'No significant threat activity in the last 24 hours.'",
  schedule_type: "cron",
  schedule_value: "0 8 * * *",
  context_mode: "isolated"
)
```

2. **RSS feed scan** — runs every 2 hours with a script gate that scans all CTI feeds:

```
schedule_task(
  taskId: "rss-scan",
  prompt: "Process the RSS scan results. The script detected new articles from CTI feeds.\n\nFor each topic group in data.criticalArticles: dedup against existing summaries (grep URLs in ../global/summaries/), then dispatch a start_research_thread IPC task with threadName 'Critical: [Topic Name]' and parentJid set to $NANOCLAW_CHAT_JID. The research prompt should include: ingest the articles, research the topic following primary sources, extract IOCs, save summary to ../global/summaries/<date>-<topic-slug>.md, and send_file the report in the thread. Do NOT generate detection rules unless the user asks in the thread.\n\nFor data.newArticles (non-critical): save article URLs and titles to investigation.md for daily compilation. Do NOT create threads for non-critical items.\n\nNEVER post full results as inline messages in the main channel — always use threads for critical items.",
  schedule_type: "cron",
  schedule_value: "0 */2 * * *",
  context_mode: "isolated",
  script: "node /workspace/project/container/skills/rss-scan/scan.mjs"
)
```

## Phase 5: Verify

### Test the connection

Tell the user:

> Send a message in your registered Discord channel:
> - For main channel: Any message works
> - For non-main: @mention the bot in Discord
>
> The bot should respond within a few seconds.

### Check logs if needed

```bash
tail -f logs/nanoclaw.log
```

## Troubleshooting

### Bot not responding

1. Check `DISCORD_BOT_TOKEN` is set in `.env` AND synced to `data/env/env`
2. Check channel is registered: `sqlite3 store/messages.db "SELECT * FROM registered_groups WHERE jid LIKE 'dc:%'"`
3. For non-main channels: message must include trigger pattern (@mention the bot)
4. Service is running: `launchctl list | grep actioner`
5. Verify the bot has been invited to the server (check OAuth2 URL was used)

### Bot only responds to @mentions

This is the default behavior for non-main channels (`requiresTrigger: true`). To change:
- Update the registered group's `requiresTrigger` to `false`
- Or register the channel as the main channel

### Message Content Intent not enabled

If the bot connects but can't read messages, ensure:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application > **Bot** tab
3. Under **Privileged Gateway Intents**, enable **Message Content Intent**
4. Restart Actioner

### Getting Channel ID

If you can't copy the channel ID:
- Ensure **Developer Mode** is enabled: User Settings > Advanced > Developer Mode
- Right-click the channel name in the server sidebar > Copy Channel ID

## After Setup

The Discord bot supports:
- Text messages in registered channels
- **Research threads** — research requests automatically create a Discord thread where the research agent works. Users can follow up in the thread with questions or additional context. Threads expire after 10 minutes of inactivity.
- **Critical alert threads** — every 2 hours, RSS feeds are scanned. Critical items (APTs, CVEs, zero-days, ransomware, data breaches) get their own thread: "Critical: [Topic Name]" with an executive brief and full report attached.
- **Daily briefing thread** — at your configured time (default 8am), a "Daily Brief — YYYY-MM-DD" thread is created with an executive summary and full compiled report.
- Attachment descriptions (images, videos, files shown as placeholders)
- Reply context (shows who the user is replying to)
- @mention translation (Discord `<@botId>` → Actioner trigger format)
- Message splitting for responses over 2000 characters
- Typing indicators while the agent processes
- File sending for reports and exports

### Required Bot Permissions for Full Functionality

| Permission | Why |
|-----------|-----|
| Send Messages | Reply to users |
| Send Messages in Threads | Post research results in threads |
| Create Public Threads | Spin up research threads automatically |
| Attach Files | Send .md reports and exports |
| Read Message History | Understand conversation context |
| View Channels | See registered channels |
