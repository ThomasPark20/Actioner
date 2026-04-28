import fs from 'fs';
import path from 'path';

import { CronExpressionParser } from 'cron-parser';

import {
  DATA_DIR,
  GROUPS_DIR,
  IPC_POLL_INTERVAL,
  TIMEZONE,
} from './config.js';
import { AvailableGroup } from './container-runner.js';
import { createTask, deleteTask, getTaskById, updateTask } from './db.js';
import { isValidGroupFolder, resolveGroupFolderPath } from './group-folder.js';
import { logger } from './logger.js';
import { RegisteredGroup } from './types.js';

export interface IpcDeps {
  sendMessage: (jid: string, text: string) => Promise<void>;
  sendFile: (jid: string, filePath: string, caption?: string) => Promise<void>;
  createThread: (parentJid: string, name: string) => Promise<string | null>;
  storeMessage: (msg: import('./types.js').NewMessage) => void;
  registeredGroups: () => Record<string, RegisteredGroup>;
  registerGroup: (jid: string, group: RegisteredGroup) => void;
  syncGroups: (force: boolean) => Promise<void>;
  getAvailableGroups: () => AvailableGroup[];
  writeGroupsSnapshot: (
    groupFolder: string,
    isMain: boolean,
    availableGroups: AvailableGroup[],
    registeredJids: Set<string>,
  ) => void;
  onTasksChanged: () => void;
}

let ipcWatcherRunning = false;

export function startIpcWatcher(deps: IpcDeps): void {
  if (ipcWatcherRunning) {
    logger.debug('IPC watcher already running, skipping duplicate start');
    return;
  }
  ipcWatcherRunning = true;

  const ipcBaseDir = path.join(DATA_DIR, 'ipc');
  fs.mkdirSync(ipcBaseDir, { recursive: true });

  const processIpcFiles = async () => {
    // Scan all group IPC directories (identity determined by directory)
    let groupFolders: string[];
    try {
      groupFolders = fs.readdirSync(ipcBaseDir).filter((f) => {
        const stat = fs.statSync(path.join(ipcBaseDir, f));
        return stat.isDirectory() && f !== 'errors';
      });
    } catch (err) {
      logger.error({ err }, 'Error reading IPC base directory');
      setTimeout(processIpcFiles, IPC_POLL_INTERVAL);
      return;
    }

    const registeredGroups = deps.registeredGroups();

    // Build folder→isMain and folder→jid lookups from registered groups
    // For thread-chat sub-groups, replyToJid overrides the JID used for $NANOCLAW_CHAT_JID resolution
    const folderIsMain = new Map<string, boolean>();
    const folderToJid = new Map<string, string>();
    for (const [jid, group] of Object.entries(registeredGroups)) {
      if (group.isMain) folderIsMain.set(group.folder, true);
      folderToJid.set(group.folder, group.replyToJid ?? jid);
    }

    for (const sourceGroup of groupFolders) {
      const isMain = folderIsMain.get(sourceGroup) === true;
      const messagesDir = path.join(ipcBaseDir, sourceGroup, 'messages');
      const tasksDir = path.join(ipcBaseDir, sourceGroup, 'tasks');

      // Process messages from this group's IPC directory
      try {
        if (fs.existsSync(messagesDir)) {
          const messageFiles = fs
            .readdirSync(messagesDir)
            .filter((f) => f.endsWith('.json'));
          for (const file of messageFiles) {
            const filePath = path.join(messagesDir, file);
            try {
              const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              // Resolve $NANOCLAW_CHAT_JID in message data
              const msgGroupJid = folderToJid.get(sourceGroup);
              if (msgGroupJid && data.chatJid === '$NANOCLAW_CHAT_JID') {
                data.chatJid = msgGroupJid;
              }
              const targetJid = data.chatJid;

              if (targetJid) {
                // Authorization: verify this group can send to this chatJid
                const targetGroup = registeredGroups[targetJid];
                const authorized =
                  isMain || (targetGroup && targetGroup.folder === sourceGroup);

                if (!authorized) {
                  logger.warn(
                    { chatJid: targetJid, sourceGroup },
                    'Unauthorized IPC message attempt blocked',
                  );
                } else if (data.type === 'message' && data.text) {
                  await deps.sendMessage(targetJid, data.text);
                  logger.info(
                    { chatJid: targetJid, sourceGroup },
                    'IPC message sent',
                  );
                } else if (data.type === 'file' && data.filePath) {
                  // Resolve container path → host path.
                  const containerPath: string = data.filePath;
                  let hostPath: string | null = null;
                  if (containerPath.startsWith('/workspace/group/')) {
                    hostPath = path.join(
                      resolveGroupFolderPath(sourceGroup),
                      containerPath.slice('/workspace/group/'.length),
                    );
                  } else if (containerPath.startsWith('/workspace/global/')) {
                    hostPath = path.join(
                      GROUPS_DIR,
                      'global',
                      containerPath.slice('/workspace/global/'.length),
                    );
                  } else {
                    logger.warn(
                      { containerPath, sourceGroup },
                      'IPC file path outside mounted directories, skipping',
                    );
                  }

                  if (hostPath && fs.existsSync(hostPath)) {
                    await deps.sendFile(targetJid, hostPath, data.caption);
                    logger.info(
                      { chatJid: targetJid, sourceGroup, hostPath },
                      'IPC file sent',
                    );
                  } else if (hostPath) {
                    logger.warn(
                      { hostPath, containerPath, sourceGroup },
                      'IPC file not found on host',
                    );
                  }
                }
              }
              fs.unlinkSync(filePath);
            } catch (err) {
              logger.error(
                { file, sourceGroup, err },
                'Error processing IPC message',
              );
              const errorDir = path.join(ipcBaseDir, 'errors');
              fs.mkdirSync(errorDir, { recursive: true });
              fs.renameSync(
                filePath,
                path.join(errorDir, `${sourceGroup}-${file}`),
              );
            }
          }
        }
      } catch (err) {
        logger.error(
          { err, sourceGroup },
          'Error reading IPC messages directory',
        );
      }

      // Process tasks from this group's IPC directory
      try {
        if (fs.existsSync(tasksDir)) {
          const taskFiles = fs
            .readdirSync(tasksDir)
            .filter((f) => f.endsWith('.json'));
          for (const file of taskFiles) {
            const filePath = path.join(tasksDir, file);
            // Atomically claim the file before async processing to prevent
            // the next poll cycle from picking it up again (race condition
            // that caused duplicate thread creation).
            const claimedPath = filePath + '.processing';
            try {
              fs.renameSync(filePath, claimedPath);
            } catch {
              // File was already claimed by a concurrent poll — skip it
              continue;
            }
            try {
              const data = JSON.parse(fs.readFileSync(claimedPath, 'utf-8'));
              // Resolve $NANOCLAW_CHAT_JID — the container agent writes
              // this literal string because Claude doesn't shell-expand
              // env vars inside JSON. Replace with the actual JID for
              // this source group.
              const groupJid = folderToJid.get(sourceGroup);
              if (groupJid) {
                for (const key of Object.keys(data)) {
                  if (data[key] === '$NANOCLAW_CHAT_JID') {
                    data[key] = groupJid;
                  }
                }
              }
              // Pass source group identity to processTaskIpc for authorization
              await processTaskIpc(data, sourceGroup, isMain, deps);
              fs.unlinkSync(claimedPath);
            } catch (err) {
              logger.error(
                { file, sourceGroup, err },
                'Error processing IPC task',
              );
              const errorDir = path.join(ipcBaseDir, 'errors');
              fs.mkdirSync(errorDir, { recursive: true });
              fs.renameSync(
                claimedPath,
                path.join(errorDir, `${sourceGroup}-${file}`),
              );
            }
          }
        }
      } catch (err) {
        logger.error({ err, sourceGroup }, 'Error reading IPC tasks directory');
      }
    }

    setTimeout(processIpcFiles, IPC_POLL_INTERVAL);
  };

  processIpcFiles();
  logger.info('IPC watcher started (per-group namespaces)');
}

export async function processTaskIpc(
  data: {
    type: string;
    taskId?: string;
    prompt?: string;
    schedule_type?: string;
    schedule_value?: string;
    context_mode?: string;
    script?: string;
    groupFolder?: string;
    chatJid?: string;
    targetJid?: string;
    // For register_group
    jid?: string;
    name?: string;
    folder?: string;
    trigger?: string;
    requiresTrigger?: boolean;
    containerConfig?: RegisteredGroup['containerConfig'];
    // For start_research_thread
    parentJid?: string;
    threadName?: string;
    researchTopic?: string;
    // For add_feed / remove_feed
    url?: string;
  },
  sourceGroup: string, // Verified identity from IPC directory
  isMain: boolean, // Verified from directory path
  deps: IpcDeps,
): Promise<void> {
  const registeredGroups = deps.registeredGroups();

  switch (data.type) {
    case 'schedule_task':
      if (
        data.prompt &&
        data.schedule_type &&
        data.schedule_value &&
        data.targetJid
      ) {
        // Resolve the target group from JID
        const targetJid = data.targetJid as string;
        const targetGroupEntry = registeredGroups[targetJid];

        if (!targetGroupEntry) {
          logger.warn(
            { targetJid },
            'Cannot schedule task: target group not registered',
          );
          break;
        }

        const targetFolder = targetGroupEntry.folder;

        // Authorization: non-main groups can only schedule for themselves
        if (!isMain && targetFolder !== sourceGroup) {
          logger.warn(
            { sourceGroup, targetFolder },
            'Unauthorized schedule_task attempt blocked',
          );
          break;
        }

        const scheduleType = data.schedule_type as 'cron' | 'interval' | 'once';

        let nextRun: string | null = null;
        if (scheduleType === 'cron') {
          try {
            const interval = CronExpressionParser.parse(data.schedule_value, {
              tz: TIMEZONE,
            });
            nextRun = interval.next().toISOString();
          } catch {
            logger.warn(
              { scheduleValue: data.schedule_value },
              'Invalid cron expression',
            );
            break;
          }
        } else if (scheduleType === 'interval') {
          const ms = parseInt(data.schedule_value, 10);
          if (isNaN(ms) || ms <= 0) {
            logger.warn(
              { scheduleValue: data.schedule_value },
              'Invalid interval',
            );
            break;
          }
          nextRun = new Date(Date.now() + ms).toISOString();
        } else if (scheduleType === 'once') {
          const date = new Date(data.schedule_value);
          if (isNaN(date.getTime())) {
            logger.warn(
              { scheduleValue: data.schedule_value },
              'Invalid timestamp',
            );
            break;
          }
          nextRun = date.toISOString();
        }

        const taskId =
          data.taskId ||
          `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const contextMode =
          data.context_mode === 'group' || data.context_mode === 'isolated'
            ? data.context_mode
            : 'isolated';
        createTask({
          id: taskId,
          group_folder: targetFolder,
          chat_jid: targetJid,
          prompt: data.prompt,
          script: data.script || null,
          schedule_type: scheduleType,
          schedule_value: data.schedule_value,
          context_mode: contextMode,
          next_run: nextRun,
          status: 'active',
          created_at: new Date().toISOString(),
        });
        logger.info(
          { taskId, sourceGroup, targetFolder, contextMode },
          'Task created via IPC',
        );
        deps.onTasksChanged();
      }
      break;

    case 'pause_task':
      if (data.taskId) {
        const task = getTaskById(data.taskId);
        if (task && (isMain || task.group_folder === sourceGroup)) {
          updateTask(data.taskId, { status: 'paused' });
          logger.info(
            { taskId: data.taskId, sourceGroup },
            'Task paused via IPC',
          );
          deps.onTasksChanged();
        } else {
          logger.warn(
            { taskId: data.taskId, sourceGroup },
            'Unauthorized task pause attempt',
          );
        }
      }
      break;

    case 'resume_task':
      if (data.taskId) {
        const task = getTaskById(data.taskId);
        if (task && (isMain || task.group_folder === sourceGroup)) {
          updateTask(data.taskId, { status: 'active' });
          logger.info(
            { taskId: data.taskId, sourceGroup },
            'Task resumed via IPC',
          );
          deps.onTasksChanged();
        } else {
          logger.warn(
            { taskId: data.taskId, sourceGroup },
            'Unauthorized task resume attempt',
          );
        }
      }
      break;

    case 'cancel_task':
      if (data.taskId) {
        const task = getTaskById(data.taskId);
        if (task && (isMain || task.group_folder === sourceGroup)) {
          deleteTask(data.taskId);
          logger.info(
            { taskId: data.taskId, sourceGroup },
            'Task cancelled via IPC',
          );
          deps.onTasksChanged();
        } else {
          logger.warn(
            { taskId: data.taskId, sourceGroup },
            'Unauthorized task cancel attempt',
          );
        }
      }
      break;

    case 'update_task':
      if (data.taskId) {
        const task = getTaskById(data.taskId);
        if (!task) {
          logger.warn(
            { taskId: data.taskId, sourceGroup },
            'Task not found for update',
          );
          break;
        }
        if (!isMain && task.group_folder !== sourceGroup) {
          logger.warn(
            { taskId: data.taskId, sourceGroup },
            'Unauthorized task update attempt',
          );
          break;
        }

        const updates: Parameters<typeof updateTask>[1] = {};
        if (data.prompt !== undefined) updates.prompt = data.prompt;
        if (data.script !== undefined) updates.script = data.script || null;
        if (data.schedule_type !== undefined)
          updates.schedule_type = data.schedule_type as
            | 'cron'
            | 'interval'
            | 'once';
        if (data.schedule_value !== undefined)
          updates.schedule_value = data.schedule_value;

        // Recompute next_run if schedule changed
        if (data.schedule_type || data.schedule_value) {
          const updatedTask = {
            ...task,
            ...updates,
          };
          if (updatedTask.schedule_type === 'cron') {
            try {
              const interval = CronExpressionParser.parse(
                updatedTask.schedule_value,
                { tz: TIMEZONE },
              );
              updates.next_run = interval.next().toISOString();
            } catch {
              logger.warn(
                { taskId: data.taskId, value: updatedTask.schedule_value },
                'Invalid cron in task update',
              );
              break;
            }
          } else if (updatedTask.schedule_type === 'interval') {
            const ms = parseInt(updatedTask.schedule_value, 10);
            if (!isNaN(ms) && ms > 0) {
              updates.next_run = new Date(Date.now() + ms).toISOString();
            }
          }
        }

        updateTask(data.taskId, updates);
        logger.info(
          { taskId: data.taskId, sourceGroup, updates },
          'Task updated via IPC',
        );
        deps.onTasksChanged();
      }
      break;

    case 'refresh_groups':
      // Only main group can request a refresh
      if (isMain) {
        logger.info(
          { sourceGroup },
          'Group metadata refresh requested via IPC',
        );
        await deps.syncGroups(true);
        // Write updated snapshot immediately
        const availableGroups = deps.getAvailableGroups();
        deps.writeGroupsSnapshot(
          sourceGroup,
          true,
          availableGroups,
          new Set(Object.keys(registeredGroups)),
        );
      } else {
        logger.warn(
          { sourceGroup },
          'Unauthorized refresh_groups attempt blocked',
        );
      }
      break;

    case 'register_group':
      // Only main group can register new groups
      if (!isMain) {
        logger.warn(
          { sourceGroup },
          'Unauthorized register_group attempt blocked',
        );
        break;
      }
      if (data.jid && data.name && data.folder && data.trigger) {
        if (!isValidGroupFolder(data.folder)) {
          logger.warn(
            { sourceGroup, folder: data.folder },
            'Invalid register_group request - unsafe folder name',
          );
          break;
        }
        // Defense in depth: agent cannot set isMain via IPC.
        // Preserve isMain from the existing registration so IPC config
        // updates (e.g. adding additionalMounts) don't strip the flag.
        const existingGroup = registeredGroups[data.jid];
        deps.registerGroup(data.jid, {
          name: data.name,
          folder: data.folder,
          trigger: data.trigger,
          added_at: new Date().toISOString(),
          containerConfig: data.containerConfig,
          requiresTrigger: data.requiresTrigger,
          isMain: existingGroup?.isMain,
        });
      } else {
        logger.warn(
          { data },
          'Invalid register_group request - missing required fields',
        );
      }
      break;

    case 'start_research_thread': {
      // Only main group can create research threads
      if (!isMain) {
        logger.warn(
          { sourceGroup },
          'Unauthorized start_research_thread attempt blocked',
        );
        break;
      }
      if (!data.parentJid || !data.threadName || !data.prompt) {
        logger.warn(
          { data },
          'Invalid start_research_thread request - missing required fields',
        );
        break;
      }

      // 1. Create Discord thread
      const threadJid = await deps.createThread(
        data.parentJid,
        data.threadName,
      );
      if (!threadJid) {
        logger.error(
          { parentJid: data.parentJid, threadName: data.threadName },
          'Failed to create Discord thread',
        );
        // Notify the parent channel that thread creation failed
        await deps.sendMessage(
          data.parentJid,
          `Failed to create research thread. Check bot permissions (Create Public Threads).`,
        );
        break;
      }

      // 2. Register the thread as a group (no trigger required, 10 min idle expiry)
      const threadFolder = `discord_research_${Date.now()}`;
      const THREAD_IDLE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

      deps.registerGroup(threadJid, {
        name: data.threadName,
        folder: threadFolder,
        trigger: '@Actioner',
        added_at: new Date().toISOString(),
        requiresTrigger: false,
        idleExpiryMs: THREAD_IDLE_EXPIRY_MS,
      });

      // 3. Copy research CLAUDE.md template and prepend thread context
      const threadGroupDir = resolveGroupFolderPath(threadFolder);
      const researchTemplatePath = path.join(
        GROUPS_DIR,
        'research',
        'CLAUDE.md',
      );
      const threadClaudePath = path.join(threadGroupDir, 'CLAUDE.md');

      if (fs.existsSync(researchTemplatePath)) {
        const researchTemplate = fs.readFileSync(researchTemplatePath, 'utf-8');
        const topic =
          data.researchTopic || data.threadName.replace(/^Research:\s*/i, '');
        const threadHeader = `<!-- Thread context: This is a research thread for "${topic}". -->
<!-- The user can send follow-up messages here. Incorporate them into your research. -->
<!-- Do NOT start concurrent research — augment the current investigation instead. -->

`;
        fs.writeFileSync(threadClaudePath, threadHeader + researchTemplate);
      }

      // 4. Seed empty requirements.md for user-directed research requirements
      const requirementsPath = path.join(threadGroupDir, 'requirements.md');
      fs.writeFileSync(
        requirementsPath,
        '# Research Requirements\n\nUser-added requirements. Check ALL items before delivering the final report.\n\n',
      );

      // 5. Store chat metadata so the message loop can find this JID
      const now = new Date().toISOString();
      deps.storeMessage({
        id: `research-init-${Date.now()}`,
        chat_jid: threadJid,
        sender: 'system',
        sender_name: 'Actioner',
        content: data.prompt,
        timestamp: now,
        is_from_me: false,
      });

      logger.info(
        {
          parentJid: data.parentJid,
          threadJid,
          threadFolder,
          topic: data.researchTopic,
        },
        'Research thread created and research initiated',
      );
      break;
    }

    case 'add_feed': {
      // Only main group can modify feeds
      if (!isMain) {
        logger.warn({ sourceGroup }, 'Unauthorized add_feed attempt blocked');
        break;
      }
      if (!data.name || !data.url) {
        logger.warn({ data }, 'Invalid add_feed request - missing name or url');
        break;
      }
      const feedsPath = path.join(path.resolve(process.cwd()), 'feeds.yaml');
      try {
        let feedsContent = '';
        try {
          feedsContent = fs.readFileSync(feedsPath, 'utf-8');
        } catch {
          feedsContent = 'feeds:\n';
        }
        // Check if feed URL already exists
        if (feedsContent.includes(data.url)) {
          logger.info(
            { url: data.url },
            'Feed already exists, skipping add',
          );
          break;
        }
        // Append new feed entry before any trailing comments or at end
        const newEntry = `  - name: ${data.name}\n    url: ${data.url}\n`;
        // Find the last feed entry and append after it
        const lines = feedsContent.split('\n');
        let insertIndex = lines.length;
        for (let i = lines.length - 1; i >= 0; i--) {
          const trimmed = lines[i].trim();
          if (trimmed.startsWith('- name:') || trimmed.startsWith('url:')) {
            insertIndex = i + 1;
            break;
          }
        }
        lines.splice(insertIndex, 0, newEntry.trimEnd());
        fs.writeFileSync(feedsPath, lines.join('\n'));
        logger.info(
          { name: data.name, url: data.url },
          'Feed added via IPC',
        );
      } catch (err) {
        logger.error({ err, name: data.name }, 'Failed to add feed');
      }
      break;
    }

    case 'remove_feed': {
      // Only main group can modify feeds
      if (!isMain) {
        logger.warn(
          { sourceGroup },
          'Unauthorized remove_feed attempt blocked',
        );
        break;
      }
      if (!data.name && !data.url) {
        logger.warn(
          { data },
          'Invalid remove_feed request - need name or url',
        );
        break;
      }
      const removeFeedsPath = path.join(
        path.resolve(process.cwd()),
        'feeds.yaml',
      );
      try {
        const content = fs.readFileSync(removeFeedsPath, 'utf-8');
        const lines = content.split('\n');
        const filtered: string[] = [];
        let skipNext = false;
        for (const line of lines) {
          if (skipNext) {
            // This should be the url: line following the matched name
            if (line.trim().startsWith('url:')) {
              skipNext = false;
              continue;
            }
            skipNext = false;
          }
          const trimmed = line.trim();
          // Match by name or URL
          if (
            data.name &&
            trimmed.startsWith('- name:') &&
            trimmed.toLowerCase().includes(data.name.toLowerCase())
          ) {
            skipNext = true; // skip the following url: line
            continue;
          }
          if (
            data.url &&
            trimmed.startsWith('url:') &&
            trimmed.includes(data.url)
          ) {
            // Also remove the preceding - name: line if it's the last in filtered
            if (
              filtered.length > 0 &&
              filtered[filtered.length - 1].trim().startsWith('- name:')
            ) {
              filtered.pop();
            }
            continue;
          }
          filtered.push(line);
        }
        fs.writeFileSync(removeFeedsPath, filtered.join('\n'));
        logger.info(
          { name: data.name, url: data.url },
          'Feed removed via IPC',
        );
      } catch (err) {
        logger.error(
          { err, name: data.name, url: data.url },
          'Failed to remove feed',
        );
      }
      break;
    }

    default:
      logger.warn({ type: data.type }, 'Unknown IPC task type');
  }
}
