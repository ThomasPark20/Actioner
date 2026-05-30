---
name: ingest
description: "Triage stage of Actioner's autonomous pipeline: pull configured CTI feeds, filter noise, apply editable decision criteria, deduplicate, and return the items that warrant a detection (plus a digest). Used by the daily routine before research → critic → commit."
---

# Actioner — Feed Triage (Ingest)

Pull the configured CTI feeds and produce two things: (a) the **qualifying set** — the items that meet the decision criteria and should go forward to research — and (b) a short **digest** recording what was surfaced. This is the routine's triage stage: fetch, filter, judge, deduplicate. It does not research or generate rules itself; the routine takes the qualifying set forward through research → critic → commit.

## Step 1 — Read feed config

Read `feeds.yaml` from the plugin/repo root. Each entry has a `name`, a `type` (`url` or `repo`, default `url`), and either a `url` or a `repo`+`path`:

```yaml
feeds:
  - name: BleepingComputer
    type: url
    url: https://www.bleepingcomputer.com/feed/
  - name: Internal CTI
    type: repo
    repo: myorg/internal-intel
    path: feeds/
```

## Step 2 — Fetch each feed

- **`type: url`** — fetch the RSS/Atom XML with **web_fetch**, and parse each entry: title, canonical URL, snippet (`<description>`/`<summary>`), published date, source name. **Requires the routine environment's network Access level to be `Full` (or `Custom` + feed domains)** — under the default `Trusted` level the egress proxy 403s feed domains and you'll reach almost nothing (see `/actioner:setup`).
- **`type: repo`** — read the intel files from the connected repo at `repo`/`path` (the routine pulls them via the GitHub connector). Treat each as a source item with the same fields.
- **Errors:** if a feed fails (timeout, 403, 404, malformed XML), log `[WARN] Failed to fetch: {name} ({url}) — {error}` and skip it. One dead feed never blocks the run — but **count reachable vs total feeds and surface it in the digest** (Step 6) so coverage gaps aren't silent. If reachability is near-zero, that's the `Trusted`-egress signature, not the feeds — fix the environment Access level.

## Step 3 — Filter obvious noise

Drop items that can never warrant a detection regardless of criteria: listicles, "best practices"/how-to guides, vendor product/PR announcements, analyst-relations ("named a Leader in…"), job posts, conference invites, executive interviews, and depth-free roundups. Keep anything with concrete technical substance (CVE IDs, malware/campaign names, IPs, domains, hashes, ATT&CK references) for the criteria check.

## Step 4 — Apply the decision criteria

Evaluate each surviving item against the **decision criteria** supplied by the routine prompt (the editable block — see `routine/actioner-daily.md`). The criteria decide what counts as "interesting / warrants a detection." Judge title + snippet against it; when an item is a borderline match, keep it — a missed real threat is worse than one extra item to research. Record, per kept item, one short clause on *why* it matched (which part of the criteria).

## Step 5 — Deduplicate

Avoid re-processing what was already handled. If history is persisted in the connected repo, grep `digests/` **and** `summaries/` for each item's URL/topic and skip ones already surfaced or already researched. Within a single run, dedup in two passes:

1. **Exact:** collapse identical URLs.
2. **Story-level (important — the feed list is mostly overlapping general-news outlets, so the same event appears 5+ times):** cluster items that refer to the **same underlying event** — keyed on a shared CVE ID, malware/campaign name, compromised package (`name@version`), threat actor, or victim org — into **one** entry. Keep the most **primary/technical** source (vendor research > original reporter > aggregator/rewrite) as the canonical link and list the rest as additional coverage. Research runs **once per cluster**, not once per outlet — this is the main cost control now that there are many redundant feeds.

## Step 6 — Output: the qualifying set + a digest

Return the **qualifying set** — the items that should go to research — each with: source, title, canonical URL, snippet, published date, and the one-clause match reason. Order most-urgent first. This is what the routine iterates over (research → critic → commit).

Also produce a dated **digest** recording what was surfaced (the same items, as a table with a clickable `[Read](url)` link each). **State feed coverage** — e.g. "scanned 11 feeds, 9 reachable" — and name any that failed, so a run that only reached one source is visibly degraded rather than looking complete. If nothing meets the criteria, the qualifying set is empty and the digest is a one-line "no qualifying items today" — a valid, useful result, not a failure.
