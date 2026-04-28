import fs from 'fs';
import path from 'path';

import {
  Attachment,
  AttachmentBuilder,
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  Message,
  TextChannel,
  ThreadChannel,
} from 'discord.js';

import { ASSISTANT_NAME, TRIGGER_PATTERN } from '../config.js';
import { readEnvFile } from '../env.js';
import { resolveGroupFolderPath } from '../group-folder.js';
import { logger } from '../logger.js';
import { formatStatusMessage } from '../status-formatter.js';
import { registerChannel, ChannelOpts } from './registry.js';
import {
  Channel,
  OnChatMetadata,
  OnInboundMessage,
  RegisteredGroup,
  SystemStats,
} from '../types.js';

export interface DiscordChannelOpts {
  onMessage: OnInboundMessage;
  onChatMetadata: OnChatMetadata;
  registeredGroups: () => Record<string, RegisteredGroup>;
  tryReactivate?: (jid: string) => boolean;
  getSystemStats?: () => SystemStats;
}

export class DiscordChannel implements Channel {
  name = 'discord';

  private client: Client | null = null;
  private opts: DiscordChannelOpts;
  private botToken: string;

  constructor(botToken: string, opts: DiscordChannelOpts) {
    this.botToken = botToken;
    this.opts = opts;
  }

  /**
   * Download a Discord attachment to the group's attachments directory.
   * Returns the container-relative path (e.g. /workspace/group/attachments/photo.png)
   * or null if the download fails.
   */
  private async downloadAttachment(
    att: Attachment,
    groupFolder: string,
  ): Promise<string | null> {
    try {
      const groupDir = resolveGroupFolderPath(groupFolder);
      const attachDir = path.join(groupDir, 'attachments');
      fs.mkdirSync(attachDir, { recursive: true });

      const safeName = (att.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
      // Prefix with attachment ID to avoid collisions
      const finalName = `${att.id}_${safeName}`;
      const destPath = path.join(attachDir, finalName);

      const resp = await fetch(att.url);
      if (!resp.ok) {
        logger.warn(
          { url: att.url, status: resp.status },
          'Discord attachment download failed',
        );
        return null;
      }

      const buffer = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(destPath, buffer);

      logger.info({ name: att.name, dest: destPath }, 'Discord attachment downloaded');
      return `/workspace/group/attachments/${finalName}`;
    } catch (err) {
      logger.error({ name: att.name, err }, 'Failed to download Discord attachment');
      return null;
    }
  }

  async connect(): Promise<void> {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.client.on(Events.MessageCreate, async (message: Message) => {
      // Ignore bot messages (including own)
      if (message.author.bot) return;

      // Bot-level commands — respond instantly, no container needed
      if (message.content.trim() === '/status') {
        const stats = this.opts.getSystemStats?.();
        if (stats) {
          try {
            await message.reply(formatStatusMessage(stats));
          } catch (err) {
            logger.debug({ err }, 'Failed to reply with status');
          }
        }
        return;
      }

      const channelId = message.channelId;
      const chatJid = `dc:${channelId}`;
      let content = message.content;
      const timestamp = message.createdAt.toISOString();
      const senderName =
        message.member?.displayName ||
        message.author.displayName ||
        message.author.username;
      const sender = message.author.id;
      const msgId = message.id;

      // Determine chat name
      let chatName: string;
      if (message.guild) {
        const textChannel = message.channel as TextChannel;
        chatName = `${message.guild.name} #${textChannel.name}`;
      } else {
        chatName = senderName;
      }

      // Translate Discord @bot mentions into TRIGGER_PATTERN format.
      // Discord mentions look like <@botUserId> — these won't match
      // TRIGGER_PATTERN (e.g., ^@Andy\b), so we prepend the trigger
      // when the bot is @mentioned.
      if (this.client?.user) {
        const botId = this.client.user.id;
        const isBotMentioned =
          message.mentions.users.has(botId) ||
          content.includes(`<@${botId}>`) ||
          content.includes(`<@!${botId}>`);

        if (isBotMentioned) {
          // Strip the <@botId> mention to avoid visual clutter
          content = content
            .replace(new RegExp(`<@!?${botId}>`, 'g'), '')
            .trim();
          // Prepend trigger if not already present
          if (!TRIGGER_PATTERN.test(content)) {
            content = `@${ASSISTANT_NAME} ${content}`;
          }
        }
      }

      // Handle reply context — include who the user is replying to
      if (message.reference?.messageId) {
        try {
          const repliedTo = await message.channel.messages.fetch(
            message.reference.messageId,
          );
          const replyAuthor =
            repliedTo.member?.displayName ||
            repliedTo.author.displayName ||
            repliedTo.author.username;
          content = `[Reply to ${replyAuthor}] ${content}`;
        } catch {
          // Referenced message may have been deleted
        }
      }

      // Store chat metadata for discovery
      const isGroup = message.guild !== null;
      this.opts.onChatMetadata(
        chatJid,
        timestamp,
        chatName,
        'discord',
        isGroup,
      );

      // Only deliver full message for registered groups
      let group = this.opts.registeredGroups()[chatJid];
      if (!group) {
        // Try re-activating an expired thread group
        if (this.opts.tryReactivate?.(chatJid)) {
          group = this.opts.registeredGroups()[chatJid];
        }
        if (!group) {
          logger.debug(
            { chatJid, chatName },
            'Message from unregistered Discord channel',
          );
          return;
        }
      }

      // Handle attachments — download files to group folder so the agent can read them
      if (message.attachments.size > 0) {
        const attachmentDescriptions = await Promise.all(
          [...message.attachments.values()].map(async (att) => {
            const contentType = att.contentType || '';
            const label = contentType.startsWith('image/')
              ? 'Image'
              : contentType.startsWith('video/')
                ? 'Video'
                : contentType.startsWith('audio/')
                  ? 'Audio'
                  : 'File';

            const filePath = await this.downloadAttachment(att, group.folder);
            if (filePath) {
              return `[${label}: ${att.name || label.toLowerCase()}] (${filePath})`;
            }
            return `[${label}: ${att.name || label.toLowerCase()}]`;
          }),
        );
        if (content) {
          content = `${content}\n${attachmentDescriptions.join('\n')}`;
        } else {
          content = attachmentDescriptions.join('\n');
        }
      }

      // Deliver message — startMessageLoop() will pick it up
      this.opts.onMessage(chatJid, {
        id: msgId,
        chat_jid: chatJid,
        sender,
        sender_name: senderName,
        content,
        timestamp,
        is_from_me: false,
      });

      logger.info(
        { chatJid, chatName, sender: senderName },
        'Discord message stored',
      );
    });

    // Handle errors gracefully
    this.client.on(Events.Error, (err) => {
      logger.error({ err: err.message }, 'Discord client error');
    });

    return new Promise<void>((resolve) => {
      this.client!.once(Events.ClientReady, (readyClient) => {
        logger.info(
          { username: readyClient.user.tag, id: readyClient.user.id },
          'Discord bot connected',
        );
        console.log(`\n  Discord bot: ${readyClient.user.tag}`);
        console.log(
          `  Use /chatid command or check channel IDs in Discord settings\n`,
        );
        resolve();
      });

      this.client!.login(this.botToken);
    });
  }

  async sendMessage(jid: string, text: string): Promise<void> {
    if (!this.client) {
      logger.warn('Discord client not initialized');
      return;
    }

    try {
      const channelId = jid.replace(/^dc:/, '');
      const channel = await this.client.channels.fetch(channelId);

      if (!channel || !('send' in channel)) {
        logger.warn({ jid }, 'Discord channel not found or not text-based');
        return;
      }

      const textChannel = channel as TextChannel;

      // Discord has a 2000 character limit per message — split if needed
      const MAX_LENGTH = 2000;
      if (text.length <= MAX_LENGTH) {
        await textChannel.send(text);
      } else {
        for (let i = 0; i < text.length; i += MAX_LENGTH) {
          await textChannel.send(text.slice(i, i + MAX_LENGTH));
        }
      }
      logger.info({ jid, length: text.length }, 'Discord message sent');
    } catch (err) {
      logger.error({ jid, err }, 'Failed to send Discord message');
    }
  }

  async sendFile(
    jid: string,
    filePath: string,
    caption?: string,
  ): Promise<void> {
    if (!this.client) {
      logger.warn('Discord client not initialized');
      return;
    }

    try {
      const channelId = jid.replace(/^dc:/, '');
      const channel = await this.client.channels.fetch(channelId);

      if (!channel || !('send' in channel)) {
        logger.warn({ jid }, 'Discord channel not found or not text-based');
        return;
      }

      const textChannel = channel as TextChannel;
      const attachment = new AttachmentBuilder(filePath);
      await textChannel.send({
        content: caption || undefined,
        files: [attachment],
      });
      logger.info({ jid, filePath }, 'Discord file sent');
    } catch (err) {
      logger.error({ jid, filePath, err }, 'Failed to send Discord file');
    }
  }

  async createThread(parentJid: string, name: string): Promise<string | null> {
    if (!this.client) {
      logger.warn('Discord client not initialized');
      return null;
    }

    try {
      const channelId = parentJid.replace(/^dc:/, '');
      const channel = await this.client.channels.fetch(channelId);

      if (!channel || channel.type !== ChannelType.GuildText) {
        logger.warn(
          { parentJid },
          'Discord channel not found or not a text channel',
        );
        return null;
      }

      const textChannel = channel as TextChannel;
      const thread = await textChannel.threads.create({
        name,
        autoArchiveDuration: 1440, // 24 hours
      });

      logger.info(
        { parentJid, threadId: thread.id, name },
        'Discord thread created',
      );
      return `dc:${thread.id}`;
    } catch (err) {
      logger.error({ parentJid, name, err }, 'Failed to create Discord thread');
      return null;
    }
  }

  isConnected(): boolean {
    return this.client !== null && this.client.isReady();
  }

  ownsJid(jid: string): boolean {
    return jid.startsWith('dc:');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.destroy();
      this.client = null;
      logger.info('Discord bot stopped');
    }
  }

  async setTyping(jid: string, isTyping: boolean): Promise<void> {
    if (!this.client || !isTyping) return;
    try {
      const channelId = jid.replace(/^dc:/, '');
      const channel = await this.client.channels.fetch(channelId);
      if (channel && 'sendTyping' in channel) {
        await (channel as TextChannel).sendTyping();
      }
    } catch (err) {
      logger.debug({ jid, err }, 'Failed to send Discord typing indicator');
    }
  }
}

registerChannel('discord', (opts: ChannelOpts) => {
  const envVars = readEnvFile(['DISCORD_BOT_TOKEN']);
  const token =
    process.env.DISCORD_BOT_TOKEN || envVars.DISCORD_BOT_TOKEN || '';
  if (!token) {
    logger.warn('Discord: DISCORD_BOT_TOKEN not set');
    return null;
  }
  return new DiscordChannel(token, opts);
});
