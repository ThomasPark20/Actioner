---
name: setup
description: Run initial Actioner setup. Use when user wants to install dependencies, authenticate messaging channels, register their main channel, or start the background services. Triggers on "setup", "install", "configure actioner", or first-time setup requests.
---

# Actioner Setup

Run setup steps automatically. Only pause when user action is required (channel authentication, configuration choices). Setup uses `bash setup.sh` for bootstrap, then `npx tsx setup/index.ts --step <name>` for all other steps. Steps emit structured status blocks to stdout. Verbose logs go to `logs/setup.log`.

**Principle:** When something is broken or missing, fix it. Don't tell the user to go fix it themselves unless it genuinely requires their manual action (e.g. authenticating a channel, pasting a secret token). If a dependency is missing, install it. If a service won't start, diagnose and repair. Ask the user for permission when needed, then do the work.

**UX Note:** Use `AskUserQuestion` for multiple-choice questions only (e.g. "Docker or Apple Container?", "which channels?"). Do NOT use it when free-text input is needed (e.g. phone numbers, tokens, paths) — just ask the question in plain text and wait for the user's reply.

## 1. Bootstrap (Node.js + Dependencies)

Run `bash setup.sh` and parse the status block.

- If NODE_OK=false → Node.js is missing or too old. Use `AskUserQuestion: Would you like me to install Node.js 22?` If confirmed:
  - macOS: `brew install node@22` (if brew available) or install nvm then `nvm install 22`
  - Linux: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs`, or nvm
  - After installing Node, re-run `bash setup.sh`
- If DEPS_OK=false → Read `logs/setup.log`. Try: delete `node_modules`, re-run `bash setup.sh`. If native module build fails, install build tools (`xcode-select --install` on macOS, `build-essential` on Linux), then retry.
- If NATIVE_OK=false → better-sqlite3 failed to load. Install build tools and re-run.
- Record PLATFORM and IS_WSL for later steps.

## 2. Check Environment

Run `npx tsx setup/index.ts --step environment` and parse the status block.

- If HAS_AUTH=true → a channel is already configured, note for step 5
- If HAS_REGISTERED_GROUPS=true → note existing config, offer to skip or reconfigure
- Record APPLE_CONTAINER and DOCKER values for step 3

## 2a. Timezone

Run `npx tsx setup/index.ts --step timezone` and parse the status block.

- If NEEDS_USER_INPUT=true → The system timezone could not be autodetected (e.g. POSIX-style TZ like `IST-2`). AskUserQuestion: "What is your timezone?" with common options (America/New_York, Europe/London, Asia/Jerusalem, Asia/Tokyo) and an "Other" escape. Then re-run: `npx tsx setup/index.ts --step timezone -- --tz <their-answer>`.
- If STATUS=success → Timezone is configured. Note RESOLVED_TZ for reference.

## 3. Container Runtime

### 3a. Choose runtime

Check the preflight results for `APPLE_CONTAINER` and `DOCKER`, and the PLATFORM from step 1.

- PLATFORM=linux → Docker (only option)
- PLATFORM=macos + APPLE_CONTAINER=installed → AskUserQuestion with two options:
  1. **Docker (recommended)** — description: "Cross-platform, better credential management, well-tested."
  2. **Apple Container (experimental)** — description: "Native macOS runtime. Requires advanced setup."
  If Apple Container, run `/convert-to-apple-container` now, then skip to 3c.
- PLATFORM=macos + APPLE_CONTAINER=not_found → Docker

### 3a-docker. Install Docker

- DOCKER=running → continue to 4b
- DOCKER=installed_not_running → start Docker: `open -a Docker` (macOS) or `sudo systemctl start docker` (Linux). Wait 15s, re-check with `docker info`.
- DOCKER=not_found → Use `AskUserQuestion: Docker is required for running agents. Would you like me to install it?` If confirmed:
  - macOS: install via `brew install --cask docker`, then `open -a Docker` and wait for it to start. If brew not available, direct to Docker Desktop download at https://docker.com/products/docker-desktop
  - Linux: install with `curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker $USER`. Note: user may need to log out/in for group membership.

### 3b. Apple Container conversion gate (if needed)

**If the chosen runtime is Apple Container**, you MUST check whether the source code has already been converted from Docker to Apple Container. Do NOT skip this step. Run:

```bash
grep -q "CONTAINER_RUNTIME_BIN = 'container'" src/container-runtime.ts && echo "ALREADY_CONVERTED" || echo "NEEDS_CONVERSION"
```

**If NEEDS_CONVERSION**, the source code still uses Docker as the runtime. You MUST run the `/convert-to-apple-container` skill NOW, before proceeding to the build step.

**If ALREADY_CONVERTED**, the code already uses Apple Container. Continue to 3c.

**If the chosen runtime is Docker**, no conversion is needed. Continue to 3c.

### 3c. Build and test

Run `npx tsx setup/index.ts --step container -- --runtime <chosen>` and parse the status block.

**If BUILD_OK=false:** Read `logs/setup.log` tail for the build error.
- Cache issue (stale layers): `docker builder prune -f` (Docker) or `container builder stop && container builder rm && container builder start` (Apple Container). Retry.
- Dockerfile syntax or missing files: diagnose from the log and fix, then retry.

**If TEST_OK=false but BUILD_OK=true:** The image built but won't run. Check logs — common cause is runtime not fully started. Wait a moment and retry the test.

## 4. Credential System

The credential system depends on the container runtime chosen in step 3.

### 4a. Docker → OneCLI

Install OneCLI and its CLI tool:

```bash
curl -fsSL onecli.sh/install | sh
curl -fsSL onecli.sh/cli/install | sh
```

Verify both installed: `onecli version`. If the command is not found, the CLI was likely installed to `~/.local/bin/`. Add it to PATH for the current session and persist it:

```bash
export PATH="$HOME/.local/bin:$PATH"
# Persist for future sessions (append to shell profile if not already present)
grep -q '.local/bin' ~/.bashrc 2>/dev/null || echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
grep -q '.local/bin' ~/.zshrc 2>/dev/null || echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
```

Then re-verify with `onecli version`.

Point the CLI at the local OneCLI instance (it defaults to the cloud service otherwise):
```bash
onecli config set api-host http://127.0.0.1:10254
```

Ensure `.env` has the OneCLI URL (create the file if it doesn't exist):
```bash
grep -q 'ONECLI_URL' .env 2>/dev/null || echo 'ONECLI_URL=http://127.0.0.1:10254' >> .env
```

Check if a secret already exists:
```bash
onecli secrets list
```

If an Anthropic secret is listed, confirm with user: keep or reconfigure? If keeping, skip to step 5.

AskUserQuestion: Do you want to use your **Claude subscription** (Pro/Max) or an **Anthropic API key**?

1. **Claude subscription (Pro/Max)** — description: "Uses your existing Claude Pro or Max subscription. You'll run `claude setup-token` in another terminal to get your token."
2. **Anthropic API key** — description: "Pay-per-use API key from console.anthropic.com."

#### Subscription path

Tell the user:

> Run `claude setup-token` in another terminal. It will output a token — copy it but don't paste it here.

Then stop and wait for the user to confirm they have the token. Do NOT proceed until they respond.

Once they confirm, they register it with OneCLI. AskUserQuestion with two options:

1. **Dashboard** — description: "Best if you have a browser on this machine. Open http://127.0.0.1:10254 and add the secret in the UI. Use type 'anthropic' and paste your token as the value."
2. **CLI** — description: "Best for remote/headless servers. Run: `onecli secrets create --name Anthropic --type anthropic --value YOUR_TOKEN --host-pattern api.anthropic.com`"

#### API key path

Tell the user to get an API key from https://console.anthropic.com/settings/keys if they don't have one.

Then AskUserQuestion with two options:

1. **Dashboard** — description: "Best if you have a browser on this machine. Open http://127.0.0.1:10254 and add the secret in the UI."
2. **CLI** — description: "Best for remote/headless servers. Run: `onecli secrets create --name Anthropic --type anthropic --value YOUR_KEY --host-pattern api.anthropic.com`"

#### After either path

Ask them to let you know when done.

**If the user's response happens to contain a token or key** (starts with `sk-ant-`): handle it gracefully — run the `onecli secrets create` command with that value on their behalf.

**After user confirms:** verify with `onecli secrets list` that an Anthropic secret exists. If not, ask again.

### 4b. Apple Container → Native Credential Proxy

Apple Container is not compatible with OneCLI. The credential proxy code is already included in the apple-container branch — do NOT invoke `/use-native-credential-proxy` (it would conflict with already-applied code).

Instead, just configure the credentials in `.env`:

AskUserQuestion: Do you want to use your **Claude subscription** (Pro/Max) or an **Anthropic API key**?

1. **Claude subscription (Pro/Max)** — description: "Uses your existing Claude Pro or Max subscription. Run `claude setup-token` in another terminal to get your token."
2. **Anthropic API key** — description: "Pay-per-use API key from console.anthropic.com."

For subscription: tell the user to run `claude setup-token` in another terminal. Stop and wait for the user to confirm they have completed this step successfully before proceeding.

Once confirmed, add the token to `.env`:
```bash
echo 'CLAUDE_CODE_OAUTH_TOKEN=<their-token>' >> .env
```

For API key: add to `.env`:
```bash
echo 'ANTHROPIC_API_KEY=<their-key>' >> .env
```

Verify the proxy starts: `npm run dev` should show "Credential proxy listening" in the logs.

## 5. Set Up Channels

AskUserQuestion (multiSelect): Which messaging channels do you want to enable?
- Discord (authenticates via Discord bot token)
- Telegram (authenticates via bot token from @BotFather)

**Delegate to each selected channel's own skill.** Each channel skill handles authentication, registration, and configuration. The channel code is already bundled — no code changes needed.

For each selected channel, invoke its skill:

- **Discord:** Invoke `/add-discord`
- **Telegram:** Invoke `/add-telegram`

Each skill will:
1. Collect credentials/tokens and write to `.env`
2. Build and verify the connection
3. Register the chat with the correct JID format

**After all channel skills complete**, install dependencies and rebuild — channel merges may introduce new packages:

```bash
npm install && npm run build
```

If the build fails, read the error output and fix it (usually a missing dependency). Then continue to step 6.

## 6. Mount Allowlist

AskUserQuestion: Agent access to external directories?

**No:** `npx tsx setup/index.ts --step mounts -- --empty`
**Yes:** Collect paths/permissions. `npx tsx setup/index.ts --step mounts -- --json '{"allowedRoots":[...],"blockedPatterns":[],"nonMainReadOnly":true}'`

## 7. Configure Model

Actioner uses Claude Opus 4.6 by default. The model is configured in `src/container-runner.ts` (settings.json written per group). Verify:

```bash
grep 'claude-opus-4-6' src/container-runner.ts
```

If not present, this was already set during the Actioner build. No user action needed.

## 8. Start Service

If service already running: unload first.
- macOS: `launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist`
- Linux: `systemctl --user stop actioner` (or `systemctl stop actioner` if root)

Run `npx tsx setup/index.ts --step service` and parse the status block.

**If FALLBACK=wsl_no_systemd:** WSL without systemd detected. Tell user they can either enable systemd in WSL (`echo -e "[boot]\nsystemd=true" | sudo tee /etc/wsl.conf` then restart WSL) or use the generated `start-nanoclaw.sh` wrapper.

**If DOCKER_GROUP_STALE=true:** The user was added to the docker group after their session started — the systemd service can't reach the Docker socket. Ask user to run these two commands:

1. Immediate fix: `sudo setfacl -m u:$(whoami):rw /var/run/docker.sock`
2. Persistent fix (re-applies after every Docker restart):
```bash
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo tee /etc/systemd/system/docker.service.d/socket-acl.conf << 'EOF'
[Service]
ExecStartPost=/usr/bin/setfacl -m u:USERNAME:rw /var/run/docker.sock
EOF
sudo systemctl daemon-reload
```
Replace `USERNAME` with the actual username (from `whoami`). Run the two `sudo` commands separately — the `tee` heredoc first, then `daemon-reload`. After user confirms setfacl ran, re-run the service step.

**If SERVICE_LOADED=false:**
- Read `logs/setup.log` for the error.
- macOS: check `launchctl list | grep actioner`. If PID=`-` and status non-zero, read `logs/actioner.error.log`.
- Linux: check `systemctl --user status actioner`.
- Re-run the service step after fixing.

## 9. Verify

Run `npx tsx setup/index.ts --step verify` and parse the status block.

**If STATUS=failed, fix each:**
- SERVICE=stopped → `npm run build`, then restart: `launchctl kickstart -k gui/$(id -u)/com.nanoclaw` (macOS) or `systemctl --user restart actioner` (Linux) or `bash start-nanoclaw.sh` (WSL nohup)
- SERVICE=not_found → re-run step 7
- CREDENTIALS=missing → re-run step 4 (Docker: check `onecli secrets list`; Apple Container: check `.env` for credentials)
- CHANNEL_AUTH shows `not_found` for any channel → re-invoke that channel's skill (e.g. `/add-telegram`)
- REGISTERED_GROUPS=0 → re-invoke the channel skills from step 5
- MOUNT_ALLOWLIST=missing → `npx tsx setup/index.ts --step mounts -- --empty`

Tell user to test: send a message in their registered chat. Show: `tail -f logs/nanoclaw.log`

## 9a. Automated Threat Monitoring

After verifying the service works, configure the automated reporting pipeline.

### RSS Feed Scanning (2-hour checks)

AskUserQuestion: Would you like Actioner to automatically scan CTI feeds every 2 hours for critical threats?
1. **Yes** — "Scans RSS feeds every 2 hours. Critical items (APTs, CVEs, zero-days, ransomware) get researched immediately and delivered as Discord threads."
2. **No** — "Skip — you can enable this later by telling Actioner 'enable feed scanning' in chat."

Note the user's choice for the next question.

### Daily Report

AskUserQuestion: Would you like a daily threat intelligence summary?
1. **Yes** — "Compiles all research from the day into an executive briefing, delivered as a Discord thread at your chosen time."
2. **No** — "Skip — you can enable later via 'set daily report at 9am' in chat or `/schedule-report`."

If **Yes**:
- If RSS scanning was declined above, tell the user: "The daily report compiles findings from feed scanning — I'll enable the 2-hour scan as well so your daily report has content."
- Ask: "What time would you like the daily report? (e.g. '9am', '07:30')"
- Convert to a cron expression (e.g. "9am" → `0 9 * * *`, "07:30" → `30 7 * * *`)

### Seed the tasks

Look up the registered channel JID:
```bash
sqlite3 store/messages.db "SELECT jid FROM registered_groups WHERE is_main = 1 LIMIT 1"
```

Then seed tasks based on the user's choices using `npx tsx setup/index.ts --step seed-tasks`. The `--jid` is the JID from above:

- **Both RSS + daily**: `npx tsx setup/index.ts --step seed-tasks -- --jid "<jid>" --daily-cron "<cron>"`
- **RSS only (no daily)**: `npx tsx setup/index.ts --step seed-tasks -- --jid "<jid>" --no-daily`
- **Neither**: Skip this step entirely.

After seeding, restart the service so it picks up the new tasks:
```bash
launchctl kickstart -k gui/$(id -u)/com.nanoclaw   # macOS (if loaded)
# or: systemctl --user restart nanoclaw              # Linux
```

Confirm to user what was enabled and when things will run.

## Troubleshooting

**Service not starting:** Check `logs/actioner.error.log`. Common: wrong Node path (re-run step 7), credential system not running (Docker: check `curl http://127.0.0.1:10254/api/health`; Apple Container: check `.env` credentials), missing channel credentials (re-invoke channel skill).

**Container agent fails ("Claude Code process exited with code 1"):** Ensure the container runtime is running — `open -a Docker` (macOS Docker), `container system start` (Apple Container), or `sudo systemctl start docker` (Linux). Check container logs in `groups/main/logs/container-*.log`.

**No response to messages:** Check trigger pattern. Main channel doesn't need prefix. Check DB: `npx tsx setup/index.ts --step verify`. Check `logs/nanoclaw.log`.

**Channel not connecting:** Verify the channel's credentials are set in `.env`. Channels auto-enable when their credentials are present. For WhatsApp: check `store/auth/creds.json` exists. For token-based channels: check token values in `.env`. Restart the service after any `.env` change.

**Unload service:** macOS: `launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist` | Linux: `systemctl --user stop actioner`
