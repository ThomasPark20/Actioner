---
name: add-telegram
description: Add Telegram as a channel. Can replace WhatsApp entirely or run alongside it. Also configurable as a control-only channel (triggers actions) or passive channel (receives notifications only).
---

# Add Telegram Channel

This skill adds Telegram support to AEGIS, then walks through interactive setup.

## Phase 1: Pre-flight

### Check if already applied

Check if `src/channels/telegram.ts` exists. If it does, skip to Phase 3 (Setup). The code changes are already in place.

### Ask the user

Use `AskUserQuestion` to collect configuration:

AskUserQuestion: Do you have a Telegram bot token, or do you need to create one?

If they have one, collect it now. If not, we'll create one in Phase 3.

## Phase 2: Apply Code Changes

### Ensure channel remote

```bash
git remote -v
```

If `telegram` is missing, add it:

```bash
git remote add telegram https://github.com/qwibitai/nanoclaw-telegram.git
```

### Merge the skill branch

```bash
git fetch telegram main
git merge telegram/main || {
  git checkout --theirs package-lock.json
  git add package-lock.json
  git merge --continue
}
```

This merges in:
- `src/channels/telegram.ts` (TelegramChannel class with self-registration via `registerChannel`)
- `src/channels/telegram.test.ts` (unit tests with grammy mock)
- `import './telegram.js'` appended to the channel barrel file `src/channels/index.ts`
- `grammy` npm dependency in `package.json`
- `TELEGRAM_BOT_TOKEN` in `.env.example`

If the merge reports conflicts, resolve them by reading the conflicted files and understanding the intent of both sides.

### Validate code changes

```bash
npm install
npm run build
npx vitest run src/channels/telegram.test.ts
```

All tests must pass (including the new Telegram tests) and build must be clean before proceeding.

## Phase 2.5: Apply AEGIS Enhancements

After the Telegram merge succeeds, apply these enhancements. **If /add-discord was already run**, some of these may already be applied — check before duplicating.

### Enhancement 1: sendFile on Channel interface (if not already applied)

Check if `sendFile` already exists on the Channel interface in `src/types.ts`. If not, add it:

```typescript
sendFile?(jid: string, filePath: string, caption?: string): Promise<void>;
```

### Enhancement 2: sendFile on Telegram channel

In `src/channels/telegram.ts`, add a `sendFile` method to the TelegramChannel class using grammy's `sendDocument`:

```typescript
async sendFile(jid: string, filePath: string, caption?: string): Promise<void> {
  const chatId = jid.replace(/^tg:/, '');
  const { InputFile } = await import('grammy');
  await this.bot.api.sendDocument(chatId, new InputFile(filePath), {
    caption: caption || undefined,
  });
}
```

### Enhancement 3: send_file MCP tool (if not already applied)

Check if `send_file` tool already exists in `container/agent-runner/src/ipc-mcp-stdio.ts`. If not, add it after the `send_message` tool (see /add-discord Phase 2.5 Enhancement 3 for exact code).

### Enhancement 4: File IPC handling (if not already applied)

Check if `type === 'file'` handling exists in `src/ipc.ts`. If not, add the file IPC handler and `sendFile` to `IpcDeps` (see /add-discord Phase 2.5 Enhancement 4 for exact code).

### Enhancement 5: Wire sendFile into IPC deps (if not already applied)

Check if `sendFile` is already in the IPC deps in `src/index.ts`. If not, add it (see /add-discord Phase 2.5 Enhancement 5 for exact code).

### Enhancement 6: Dedup fix (if not already applied)

Check if `allPending.length === 0` guard exists in `src/index.ts`. If not, add it (see /add-discord Phase 2.5 Enhancement 6).

### Enhancement 7: Cache invalidation fix (if not already applied)

Check if mtime comparison loop exists in `src/container-runner.ts`. If not, add it (see /add-discord Phase 2.5 Enhancement 7).

### Validate all enhancements

```bash
npx tsc --noEmit
npm run build
```

Both must pass cleanly.

## Phase 3: Setup

### Create Telegram Bot (if needed)

If the user doesn't have a bot token, tell them:

> I need you to create a Telegram bot:
>
> 1. Open Telegram and search for `@BotFather`
> 2. Send `/newbot` and follow prompts:
>    - Bot name: Something friendly (e.g., "AEGIS Assistant")
>    - Bot username: Must end with "bot" (e.g., "aegis_ai_bot")
> 3. Copy the bot token (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

Wait for the user to provide the token.

### Configure environment

Add to `.env`:

```bash
TELEGRAM_BOT_TOKEN=<their-token>
```

Channels auto-enable when their credentials are present — no extra configuration needed.

Sync to container environment:

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

## Phase 4: Registration

### Get Chat ID

Tell the user:

> 1. Open your bot in Telegram (search for its username)
> 2. Send `/chatid` — it will reply with the chat ID
> 3. For groups: add the bot to the group first, then send `/chatid` in the group

Wait for the user to provide the chat ID (format: `tg:123456789` or `tg:-1001234567890`).

### Register the chat

The chat ID, name, and folder name are needed. Use `npx tsx setup/index.ts --step register` with the appropriate flags.

For a main chat (responds to all messages):

```bash
npx tsx setup/index.ts --step register -- --jid "tg:<chat-id>" --name "<chat-name>" --folder "telegram_main" --trigger "@${ASSISTANT_NAME}" --channel telegram --no-trigger-required --is-main
```

For additional chats (trigger-only):

```bash
npx tsx setup/index.ts --step register -- --jid "tg:<chat-id>" --name "<chat-name>" --folder "telegram_<group-name>" --trigger "@${ASSISTANT_NAME}" --channel telegram
```

## Phase 5: Seed Scheduled Tasks

After successful registration, seed the daily briefing and critical polling tasks if not already seeded (check with `sqlite3 store/messages.db "SELECT * FROM scheduled_tasks"`).

### Daily Briefing (8 AM ET)

```
mcp__nanoclaw__schedule_task({
  prompt: "Run the daily threat intelligence briefing. Steps: 1) Read feeds.yaml for RSS feed URLs. 2) Fetch each feed and filter for items from the last 24 hours. 3) Deduplicate by title similarity. 4) For each unique item, research the topic using /research skill. 5) Generate detection rules using /rule-gen skill. 6) Validate all rules (sigma check, yarac, snort -T). 7) Compile everything into a single briefing report as a markdown file. 8) Send the report via send_file. If no new actionable threat intelligence today, send: 'No new actionable threat intelligence today.'",
  schedule_type: "cron",
  schedule_value: "0 8 * * *",
  timezone: "America/New_York"
})
```

### Critical Issue Polling (Every 2 Hours)

```
mcp__nanoclaw__schedule_task({
  prompt: "Check for critical security issues that need immediate attention. Review the script output for any headlines flagged as critical.",
  schedule_type: "cron",
  schedule_value: "0 */2 * * *",
  timezone: "America/New_York",
  script: "node --input-type=module -e \"\nimport https from 'https';\nconst feeds = ['https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'];\nlet critical = [];\nfor (const url of feeds) {\n  try {\n    const data = await new Promise((resolve, reject) => {\n      https.get(url, {headers: {'User-Agent': 'AEGIS/1.0'}}, (res) => {\n        let body = '';\n        res.on('data', (c) => body += c);\n        res.on('end', () => resolve(body));\n        res.on('error', reject);\n      }).on('error', reject);\n    });\n    const parsed = JSON.parse(data);\n    const vulns = (parsed.vulnerabilities || []).slice(0, 5);\n    for (const v of vulns) {\n      const kev = v.knownRansomwareCampaignUse === 'Known';\n      if (kev) critical.push(v.vulnerabilityName + ' - ' + v.shortDescription);\n    }\n  } catch(e) { /* skip feed errors */ }\n}\nconsole.log(JSON.stringify({wakeAgent: critical.length > 0, data: {headlines: critical}}));\n\""
})
```

## Phase 6: Verify

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

Check:
1. `TELEGRAM_BOT_TOKEN` is set in `.env` AND synced to `data/env/env`
2. Chat is registered in SQLite (check with: `sqlite3 store/messages.db "SELECT * FROM registered_groups WHERE jid LIKE 'tg:%'"`)
3. For non-main chats: message includes trigger pattern
4. Service is running: `launchctl list | grep aegis` (macOS) or `systemctl --user status aegis` (Linux)

### Bot only responds to @mentions in groups

Group Privacy is enabled (default). Fix:
1. `@BotFather` > `/mybots` > select bot > **Bot Settings** > **Group Privacy** > **Turn off**
2. Remove and re-add the bot to the group (required for the change to take effect)

### Getting chat ID

If `/chatid` doesn't work:
- Verify token: `curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"`
- Check bot is started: `tail -f logs/aegis.log`

## After Setup

If running `npm run dev` while the service is active:
```bash
# macOS:
launchctl unload ~/Library/LaunchAgents/com.aegis.plist
npm run dev
# When done testing:
launchctl load ~/Library/LaunchAgents/com.aegis.plist
# Linux:
# systemctl --user stop aegis
# npm run dev
# systemctl --user start aegis
```

## Removal

To remove Telegram integration:

1. Delete `src/channels/telegram.ts` and `src/channels/telegram.test.ts`
2. Remove `import './telegram.js'` from `src/channels/index.ts`
3. Remove `TELEGRAM_BOT_TOKEN` from `.env`
4. Remove Telegram registrations from SQLite: `sqlite3 store/messages.db "DELETE FROM registered_groups WHERE jid LIKE 'tg:%'"`
5. Uninstall: `npm uninstall grammy`
6. Rebuild: `npm run build && launchctl kickstart -k gui/$(id -u)/com.aegis` (macOS) or `npm run build && systemctl --user restart aegis` (Linux)
