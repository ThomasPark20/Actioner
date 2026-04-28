# Connect Telegram

## Create a Telegram Bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Follow the prompts — choose a name and username
4. BotFather gives you a token — copy it

## Run /add-telegram

In your <Wordmark /> Claude session:

```
/add-telegram
```

You'll be asked for:
- **Bot token** — from BotFather

<Wordmark /> writes the token, builds, registers the channel, and seeds scheduled tasks.

## Verify

Send a message to your bot in Telegram. <Wordmark /> should respond within a few seconds.

## Bot Commands

These commands work instantly in any chat — no registration needed.

| Command | Description |
|---------|-------------|
| `/status` | System dashboard — uptime, active containers, scheduled tasks, recent runs |
| `/ping` | Quick online check |
| `/chatid` | Get the chat ID for registration |
