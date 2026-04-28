import { ASSISTANT_NAME } from './config.js';
import { SystemStats } from './types.js';

function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function timeAgo(isoDate: string): string {
  const diff = (Date.now() - new Date(isoDate).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatStatusMessage(stats: SystemStats): string {
  const lines: string[] = [];

  lines.push(`*${ASSISTANT_NAME} Status*`);
  lines.push('');

  // System
  lines.push(`*System*`);
  lines.push(`  Uptime: ${formatDuration(stats.uptime)}`);
  lines.push(
    `  Containers: ${stats.activeContainers}/${stats.maxContainers} active`,
  );
  lines.push('');

  // Channels
  lines.push(`*Channels*`);
  for (const ch of stats.connectedChannels) {
    lines.push(`  ${ch}: connected`);
  }
  lines.push('');

  // Groups
  lines.push(`*Groups:* ${stats.registeredGroups} registered`);
  lines.push('');

  // Scheduled tasks
  lines.push(`*Scheduled Tasks*`);
  lines.push(
    `  Active: ${stats.scheduledTasks.active} | Paused: ${stats.scheduledTasks.paused} | Total: ${stats.scheduledTasks.total}`,
  );
  lines.push('');

  // Messages
  lines.push(`*Messages:* ${stats.messageCount.toLocaleString()} stored`);
  lines.push('');

  // Running containers
  if (stats.activeGroups.length > 0) {
    lines.push(`*Running Now*`);
    for (const g of stats.activeGroups) {
      const runtime = g.startedAt
        ? formatDuration(Math.floor((Date.now() - g.startedAt) / 1000))
        : '?';
      const label = g.isTask ? `task:${g.taskId}` : g.jid;
      lines.push(`  ${label} (${runtime})`);
    }
    lines.push('');
  }

  // Recent task runs
  if (stats.recentTaskRuns.length > 0) {
    lines.push(`*Recent Task Runs*`);
    for (const run of stats.recentTaskRuns) {
      const icon = run.status === 'success' ? 'ok' : 'err';
      const dur = (run.durationMs / 1000).toFixed(1);
      lines.push(`  ${run.taskId}: ${icon} ${dur}s (${timeAgo(run.runAt)})`);
    }
  }

  return lines.join('\n');
}
