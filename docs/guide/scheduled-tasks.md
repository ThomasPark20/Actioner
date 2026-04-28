# Scheduled Tasks

<Wordmark /> can run two automated tasks, both configured during `/setup`.

## RSS Feed Scan

- **Schedule:** Every 2 hours (`0 */2 * * *`)
- **How it works:** A script fetches all RSS feeds, deduplicates against existing summaries, and classifies articles as critical or non-critical
- **If nothing critical:** Zero tokens consumed
- **If critical items found:** Creates a "Critical: [Topic]" Discord thread with immediate research
- **Non-critical items:** Saved for daily report compilation

## Daily Report

- **Schedule:** Your configured time (default 8:00 AM local)
- **How it works:** Compiles all research from the day into an executive brief
- **Delivery:** Creates a "Daily Brief — YYYY-MM-DD" Discord thread with executive summary and full report attached
- **If nothing new:** "No significant threat activity in the last 24 hours."
- **Depends on:** RSS feed scanning (auto-enabled if you enable daily reports)

## Configuring

Set or change your daily report time anytime in chat:

```
"Set daily report at 9am"
"Change daily report to 7:30am"
"Cancel daily report"
```

Or run `/schedule-report` for a guided setup.

## Custom Tasks

Create custom scheduled tasks inside a Claude session:

```
schedule_task(
  prompt: "Your instructions",
  schedule_type: "cron",
  schedule_value: "0 9 * * 1",  # every Monday 9am
  context_mode: "isolated"
)
```

## Managing Tasks

Ask <Wordmark /> in chat to manage your tasks:

```
"Show my scheduled tasks"
"Pause the daily report"
"Resume the threat scan"
"Cancel the daily report task"
```

The agent reads the current task list and uses IPC to pause, resume, or cancel tasks.
