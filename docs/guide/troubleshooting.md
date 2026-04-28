# Troubleshooting

## Bot Not Responding

1. **Check the token** — `grep BOT_TOKEN .env` should show your token
2. **Check channel registered** — `sqlite3 store/messages.db "SELECT * FROM registered_groups"`
3. **Check service running** — `launchctl list | grep nanoclaw`
4. **Check logs** — `tail -f logs/actioner.log`
5. **For non-main channels** — messages must start with `@Actioner`

## Bot Responds to @mentions Only

Default for non-main channels. To change:
- Register the channel as main (`--is-main --no-trigger-required`)
- Or set `requiresTrigger: false` on the group

## Discord: Can't Read Messages

Enable **Message Content Intent**:
1. [Discord Developer Portal](https://discord.com/developers/applications) > your app > **Bot** tab
2. Under **Privileged Gateway Intents**, enable **Message Content Intent**
3. Restart <Wordmark />

## Research Not Returning Results

1. **Check container** — `docker ps` should show a running container
2. **Check summaries** — `ls groups/global/summaries/`
3. **Check container tools** — `docker run --rm --entrypoint bash nanoclaw-agent:latest -c 'sigma --version'`

## Detection Rules Failing Validation

Validation runs inside the container. Check:
```bash
docker run --rm --entrypoint bash nanoclaw-agent:latest -c 'sigma --version && yarac --help | head -1'
```

If tools are missing, rebuild: `cd container && bash build.sh`

## Duplicate Bot Responses

Usually means two processes are running. Check:
```bash
ps aux | grep 'node.*dist/index'
```

Kill duplicates. Only one should be running.

## Can't Get Channel ID (Discord)

1. **User Settings** > **Advanced** > Enable **Developer Mode**
2. Right-click the channel name in the sidebar
3. Click **Copy Channel ID**
