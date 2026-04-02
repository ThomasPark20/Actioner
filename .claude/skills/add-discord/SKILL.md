---
name: add-discord
description: Configure Discord bot channel integration for AEGIS. No code changes needed — Discord support is bundled.
---

# Add Discord Channel

This skill configures a Discord bot for AEGIS. The Discord channel code is already bundled in the repo — this skill just collects your token and registers the channel.

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
> 3. Give it a name — e.g., **"AEGIS"** — and click Create
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
launchctl kickstart -k gui/$(id -u)/com.nanoclaw
```

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
npx tsx setup/index.ts --step register -- --jid "dc:<channel-id>" --name "<server-name> #<channel-name>" --folder "discord_main" --trigger "@AEGIS" --channel discord --no-trigger-required --is-main
```

For additional channels (trigger-only):

```bash
npx tsx setup/index.ts --step register -- --jid "dc:<channel-id>" --name "<server-name> #<channel-name>" --folder "discord_<channel-name>" --trigger "@AEGIS" --channel discord
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
4. Service is running: `launchctl list | grep aegis`
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
4. Restart AEGIS

### Getting Channel ID

If you can't copy the channel ID:
- Ensure **Developer Mode** is enabled: User Settings > Advanced > Developer Mode
- Right-click the channel name in the server sidebar > Copy Channel ID

## After Setup

The Discord bot supports:
- Text messages in registered channels
- **Research threads** — research requests automatically create a Discord thread where the research agent works. Users can follow up in the thread with questions or additional context. Threads expire after 10 minutes of inactivity.
- Attachment descriptions (images, videos, files shown as placeholders)
- Reply context (shows who the user is replying to)
- @mention translation (Discord `<@botId>` → AEGIS trigger format)
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
