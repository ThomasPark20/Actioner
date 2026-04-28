# Connect Discord

## Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** — name it "Actioner" (or whatever you like)
3. Go to the **Bot** tab
4. Click **Reset Token** — copy it immediately (you only see it once)
5. Under **Privileged Gateway Intents**, enable:
   - **Message Content Intent** (required)
   - **Server Members Intent** (optional, for display names)
6. Go to **OAuth2** > **URL Generator**:
   - Scopes: select `bot`
   - Bot Permissions: `Send Messages`, `Attach Files`, `Read Message History`, `View Channels`
   - Copy the generated URL

## Invite the Bot

Open the OAuth2 URL in your browser. Select your server. Authorize.

## Get Your Channel ID

1. In Discord: **User Settings** > **Advanced** > Enable **Developer Mode**
2. Right-click the text channel you want <Wordmark /> in
3. Click **Copy Channel ID**

## Run /add-discord

In your <Wordmark /> Claude session:

```
/add-discord
```

You'll be asked for:
- **Bot token** — from step 4 above
- **Server name** — your Discord server name
- **Channel name** — the channel name (e.g., "threat-intel")
- **Channel ID** — the number you copied

<Wordmark /> registers the channel, seeds scheduled tasks (daily briefing + critical alerts), and verifies the connection.

## Verify

Send any message in your registered channel. <Wordmark /> should respond within a few seconds.

## Bot Commands

These commands work instantly in any channel where the bot is present — no registration needed.

| Command | Description |
|---------|-------------|
| `/status` | System dashboard — uptime, active containers, scheduled tasks, recent runs |

## Adding More Channels

Run `/add-discord` again. The first channel is registered as the main channel (responds to all messages). Additional channels are trigger-only — prefix messages with `@Actioner`.
