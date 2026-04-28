#!/usr/bin/env node
// RSS Feed Scanner — 2-hour scan for new articles with critical detection
// Reads feeds.yaml, fetches RSS, deduplicates against summaries/, classifies critical vs non-critical
// Output: JSON { wakeAgent: bool, data: { newArticles: [...], criticalArticles: [...] } }

import { readFileSync, readdirSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

const CRITICAL_KEYWORDS = [
  'apt', 'cve-', 'active exploitation', 'actively exploited',
  'zero-day', 'zero day', '0-day', '0day',
  'ransomware', 'data breach', 'cisa advisory',
  'emergency directive', 'critical vulnerability',
  'remote code execution', 'rce'
];

// Simple RSS/Atom XML parser — extracts title, link, description from items/entries
function parseRssItems(xml) {
  const items = [];
  // Match RSS <item> or Atom <entry> blocks
  const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, 'title');
    const link = extractLink(block);
    const description = extractTag(block, 'description') || extractTag(block, 'summary') || '';
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated') || '';
    if (title && link) {
      items.push({ title: decodeEntities(title), link, description: decodeEntities(description).slice(0, 500), pubDate });
    }
  }
  return items;
}

function extractTag(xml, tag) {
  // Handle CDATA: <tag><![CDATA[content]]></tag>
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();
  // Handle regular: <tag>content</tag>
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(regex);
  return m ? m[1].trim() : '';
}

function extractLink(xml) {
  // RSS: <link>url</link>
  const linkTag = extractTag(xml, 'link');
  if (linkTag && !linkTag.startsWith('<')) return linkTag;
  // Atom: <link href="url" />
  const atomLink = xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  return atomLink ? atomLink[1] : '';
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, ''); // strip remaining HTML tags
}

function isCritical(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  return CRITICAL_KEYWORDS.some(kw => text.includes(kw));
}

function getExistingSummaryUrls(summariesDir) {
  const urls = new Set();
  try {
    const files = readdirSync(summariesDir, { recursive: true });
    for (const file of files) {
      if (!String(file).endsWith('.md')) continue;
      try {
        const content = readFileSync(join(summariesDir, String(file)), 'utf8');
        // Extract URLs from markdown links and plain URLs
        const urlMatches = content.match(/https?:\/\/[^\s\])"'<>]+/g);
        if (urlMatches) {
          for (const url of urlMatches) {
            urls.add(url.replace(/[.,;:!?)]+$/, '')); // strip trailing punctuation
          }
        }
      } catch { /* skip unreadable files */ }
    }
  } catch { /* summaries dir doesn't exist yet */ }
  return urls;
}

function loadFeeds(feedsPath) {
  try {
    const yaml = readFileSync(feedsPath, 'utf8');
    const feeds = [];
    // Simple YAML parser for our flat structure: - name: X\n  url: Y
    const feedBlocks = yaml.split(/^\s*-\s+name:/m).slice(1);
    for (const block of feedBlocks) {
      const nameMatch = block.match(/^\s*(.+)/);
      const urlMatch = block.match(/url:\s*(.+)/);
      if (nameMatch && urlMatch) {
        feeds.push({ name: nameMatch[1].trim(), url: urlMatch[1].trim() });
      }
    }
    return feeds;
  } catch {
    return [];
  }
}

async function fetchFeed(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Actionable-RSS-Scanner/1.0' }
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  // Resolve paths — works both inside container and standalone
  const projectRoot = process.env.NANOCLAW_PROJECT_DIR || join(process.cwd(), '..');
  const feedsPath = join(projectRoot, 'feeds.yaml');
  const summariesDir = join(projectRoot, 'groups', 'global', 'summaries');

  const feeds = loadFeeds(feedsPath);
  if (feeds.length === 0) {
    console.log(JSON.stringify({ wakeAgent: false, data: { error: 'No feeds found', newArticles: [], criticalArticles: [] } }));
    return;
  }

  const existingUrls = getExistingSummaryUrls(summariesDir);
  const newArticles = [];
  const criticalArticles = [];
  const seenUrls = new Set();

  // Fetch all feeds concurrently
  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const xml = await fetchFeed(feed.url);
      if (!xml) return [];
      const items = parseRssItems(xml);
      return items.map(item => ({ ...item, source: feed.name }));
    })
  );

  for (const result of results) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    for (const article of result.value) {
      // Dedup against existing summaries and within this scan
      if (existingUrls.has(article.link) || seenUrls.has(article.link)) continue;
      seenUrls.add(article.link);

      const entry = {
        title: article.title,
        link: article.link,
        source: article.source,
        pubDate: article.pubDate,
        snippet: article.description.slice(0, 200)
      };

      if (isCritical(article.title, article.description)) {
        criticalArticles.push(entry);
      }
      newArticles.push(entry);
    }
  }

  // Persist scan log — every run gets recorded so daily report can compile from it
  const scanLogDir = join(projectRoot, 'groups', 'global', 'scan-log');
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const logFile = join(scanLogDir, `${today}.jsonl`);
  try {
    mkdirSync(scanLogDir, { recursive: true });
    const logEntry = {
      timestamp: new Date().toISOString(),
      feedsScanned: feeds.length,
      totalNew: newArticles.length,
      totalCritical: criticalArticles.length,
      articles: newArticles.map(a => ({
        title: a.title,
        link: a.link,
        source: a.source,
        pubDate: a.pubDate,
        snippet: a.snippet,
        critical: criticalArticles.some(c => c.link === a.link)
      }))
    };
    appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  } catch { /* scan-log write is best-effort — don't fail the scan */ }

  // Limit output size — top 20 new, all critical
  const output = {
    wakeAgent: criticalArticles.length > 0 || newArticles.length > 10,
    data: {
      newArticles: newArticles.slice(0, 20),
      criticalArticles,
      totalNew: newArticles.length,
      totalCritical: criticalArticles.length,
      feedsScanned: feeds.length
    }
  };

  console.log(JSON.stringify(output));
}

main().catch(err => {
  console.log(JSON.stringify({ wakeAgent: false, data: { error: err.message, newArticles: [], criticalArticles: [] } }));
});
