# RSS Feeds

<Wordmark /> ingests threat intelligence from RSS feeds. Edit `feeds.yaml` to customize sources.

## Default Feeds

<Wordmark /> ships with feeds from:
- BleepingComputer
- The Record
- Unit42 (Palo Alto)
- Krebs on Security
- The DFIR Report
- SentinelOne Labs
- Cisco Talos
- Microsoft Security Blog
- Google TAG
- Elastic Security Labs
- r/cybersecurity (Reddit)

## Adding a Feed

```yaml
feeds:
  - name: My Custom Feed
    url: https://example.com/feed/
```

## Reddit Feeds

Reddit subreddits expose RSS at `https://www.reddit.com/r/<subreddit>/.rss`:

```yaml
feeds:
  - name: r/netsec
    url: https://www.reddit.com/r/netsec/.rss
  - name: r/malware
    url: https://www.reddit.com/r/malware/.rss
```

## Feed Processing

During the daily briefing (at your configured time), <Wordmark />:
1. Fetches all feeds
2. Filters noise (listicles, vendor marketing, job posts, memes)
3. Deduplicates against existing summaries
4. Groups by topic
5. Researches each new topic
6. Generates and validates detection rules
7. Delivers the briefing
