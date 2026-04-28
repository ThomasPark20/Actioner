# Daily Briefing

<Wordmark /> compiles all research from the day into an executive report, delivered as a Discord thread at your configured time.

## Example

```
Thread: Daily Brief — 2026-04-02
────────────────────────────────
Actioner: Daily CTI Briefing — April 2, 2026

  - CVE-2026-1234: Critical RCE in Apache Struts (CVSS 9.8, active exploitation)
  - Scattered Spider: New social engineering campaign targeting telecom
  - BlackCat ransomware: Updated encryptor variant with Linux support

  3 reports, 7 detection rules generated.

  [attached: 2026-04-02-daily-report.md]
```

## Setup

During `/setup`, <Wordmark /> asks what time you want your daily report. You can also configure it anytime:

```
"Set daily report at 9am"
"Schedule my briefing for 07:30"
"Cancel daily report"
```

Or run `/schedule-report` for a guided setup.

## What Happens

At your scheduled time:

1. Reads all topic summaries from the current day
2. Compiles an executive brief (top 3-5 items by severity)
3. Includes full topic summaries, IOC table, detection rules count
4. Creates a **"Daily Brief — YYYY-MM-DD"** Discord thread
5. Posts the executive summary as the opening message
6. Attaches the full compiled report as a `.md` file

## Quiet Days

If nothing new was researched:

```
No significant threat activity in the last 24 hours.
```

## Depends on Feed Scanning

The daily report compiles findings from the 2-hour RSS feed scan. If you enable the daily report, feed scanning is automatically enabled too.
