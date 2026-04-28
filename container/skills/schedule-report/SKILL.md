---
name: schedule-report
description: Set up or manage your daily Actioner security report schedule. Configure what time the daily brief is delivered, view the current schedule, change the time, or cancel it.
---

# /schedule-report — Daily Report Schedule Manager

Interactively guide the user through setting up, viewing, or managing their daily Actioner security report schedule.

**Main-channel check:** Only the main channel can manage scheduled tasks. Run:

```bash
test -d /workspace/project && echo "MAIN" || echo "NOT_MAIN"
```

If `NOT_MAIN`, respond with:
> This command is available in your main chat only. Send `/schedule-report` there to manage your daily report schedule.

Then stop.

## Step 1: Check current schedule

Read the current tasks to see if a daily-report task already exists:

```bash
cat /workspace/ipc/current_tasks.json 2>/dev/null || echo "[]"
```

Parse the JSON and look for a task with `id` equal to `daily-report`.

- **If found:** Show the current schedule to the user:
  > Your daily report is currently scheduled: [cron expression] ([human-readable time]) in $TIMEZONE timezone. Status: [active/paused].
  >
  > Would you like to:
  > 1. Change the time
  > 2. Pause the report
  > 3. Resume the report (if paused)
  > 4. Cancel the report entirely

- **If not found:** Proceed to Step 2.

## Step 2: Ask for preferred time

Ask the user:
> What time would you like your daily security report delivered?
> (e.g., "9am", "7:30am", "14:00", "8:00 PM")

## Step 3: Confirm timezone

Read the timezone from the environment:

```bash
echo "$TIMEZONE"
```

Confirm with the user:
> I'll schedule your daily report for [time] in the [TIMEZONE] timezone. Does that look right?

If the user confirms, proceed to Step 4. If they want to adjust, go back to Step 2.

## Step 4: Create or update the scheduled task

Convert the user's requested time to a cron expression. Examples:
- "9am" → `0 9 * * *`
- "7:30am" → `30 7 * * *`
- "2pm" → `0 14 * * *`
- "8:00 PM" → `0 20 * * *`

### If daily-report task already exists (from Step 1):

Use `mcp__actioner__update_task` to update:

```
mcp__actioner__update_task({
  taskId: "daily-report",
  schedule_value: "<cron expression>"
})
```

### If daily-report task does not exist:

Use `mcp__actioner__schedule_task` to create:

```
mcp__actioner__schedule_task({
  taskId: "daily-report",
  targetJid: "$NANOCLAW_CHAT_JID",
  prompt: "It is time for the daily security report. Compile all summaries from today into a structured daily brief. Read all files in /workspace/extra/summaries/ with today's date prefix. Create an executive summary (top 3-5 items), full topic summaries, and an IOC table if any IOCs were extracted. Save the report to /workspace/extra/summaries/daily/. Then deliver it as a new thread using start_research_thread with thread name 'Daily Brief — YYYY-MM-DD'. Post the executive summary bullets as the opening message and attach the full report as an .md file via send_file. If no new summaries exist for today, send a short message: 'No significant threat activity detected in the last 24 hours.'",
  schedule_type: "cron",
  schedule_value: "<cron expression>",
  context_mode: "isolated"
})
```

## Step 5: Confirm to the user

> Your daily Actioner security report is now scheduled for [time] ([TIMEZONE]).
> It will be delivered as a new thread each day with an executive summary and full report attached.
>
> You can also say "set daily report at [time]" in chat anytime to change the schedule, or run `/schedule-report` again to manage it.

## Handling cancel/pause/resume requests

If the user chose an action from Step 1:

### Pause
```
mcp__actioner__pause_task({ taskId: "daily-report" })
```
> Daily report paused. Say "resume daily report" or run `/schedule-report` to re-enable it.

### Resume
```
mcp__actioner__resume_task({ taskId: "daily-report" })
```
> Daily report resumed. Next delivery at [next scheduled time].

### Cancel
```
mcp__actioner__cancel_task({ taskId: "daily-report" })
```
> Daily report cancelled. Run `/schedule-report` anytime to set up a new schedule.
