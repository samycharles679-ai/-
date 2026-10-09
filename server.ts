import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { randomBytes } from 'crypto';
import pino from 'pino';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  Browsers,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  downloadContentFromMessage,
  generateWAMessageContent,
  generateWAMessageFromContent,
  encodeNewsletterMessage,
  generateMessageIDV2,
} from '@whiskeysockets/baileys';
import { UTILS_MENU_SECTION, handleUtilsCommand } from './botUtils';
import { DOWNLOAD_MENU_SECTION, handleDownloadCommand } from './botDownload';
import { ANIME_MENU_SECTION, handleAnimeCommand } from './botAnime';
import { FUN_MENU_SECTION, handleFunCommand } from './botFun';
import {
  startTelegramBot,
  stopTelegramBot,
  notifyTelegramSessionConnected,
  makeCompactSessionToken,
  TelegramBotSessionInfo,
} from './telegramBot';

const PORT = Number(process.env.PORT) || 3000;
const logger = pino({ level: 'silent' });

const PERSISTENT_SESSIONS_ROOT = path.join(process.cwd(), '.jin-hee-sessions');
const LEGACY_TMP_SESSIONS_ROOT = path.join(os.tmpdir(), 'jin-hee-md-sessions');

fs.mkdirSync(PERSISTENT_SESSIONS_ROOT, { recursive: true });

const BOT_IMAGE_PAGE_URL = 'https://imgg.fr/r/EZVPc5e4.jpg';
const BOT_MENU_IMAGE_URL = 'https://imgg.fr/r/RFedCggk.jpg';
const BOT_NEWSLETTER_JID = '120363412335206247@newsletter';
const BOT_NEWSLETTER_NAME = 'ᴊɪɴ ʜᴇᴇ ᴅᴇᴠ ᴘʀɪᴍᴇ ⌕';
const SECOND_NEWSLETTER_JID = '120363428308797779@newsletter';

function getNewsletterContextInfo(
  _thumbnailBuffer?: Buffer,
  _mediaUrl?: string,
  mentionedJid?: string[]
) {
  const ctx: any = {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: BOT_NEWSLETTER_JID,
      newsletterName: BOT_NEWSLETTER_NAME,
      serverMessageId: -1,
    },
  };

  if (mentionedJid && mentionedJid.length > 0) {
    ctx.mentionedJid = mentionedJid;
  }

  return ctx;
}

let cachedBotImageBuffer: Buffer | null = null;
let cachedBotImageDirectUrl: string = BOT_IMAGE_PAGE_URL;
let cachedBotMenuImageBuffer: Buffer | null = null;

async function getBotMenuImageBuffer(): Promise<{ buffer?: Buffer; url: string }> {
  if (cachedBotMenuImageBuffer) {
    return { buffer: cachedBotMenuImageBuffer, url: BOT_MENU_IMAGE_URL };
  }
  try {
    const res = await fetch(BOT_MENU_IMAGE_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });
    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      cachedBotMenuImageBuffer = Buffer.from(arrayBuf);
      return { buffer: cachedBotMenuImageBuffer, url: BOT_MENU_IMAGE_URL };
    }
  } catch {
    // Fallback to URL
  }
  return { url: BOT_MENU_IMAGE_URL };
}

async function fetchBufferFromUrl(url: string): Promise<Buffer | undefined> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });
    if (res.ok) {
      return Buffer.from(await res.arrayBuffer());
    }
  } catch {
    // Ignore
  }
  return undefined;
}

async function getGroupOrBotImageBuffer(sock: any, groupJid: string): Promise<Buffer | undefined> {
  try {
    const groupPicUrl = await sock.profilePictureUrl(groupJid, 'image');
    if (groupPicUrl) {
      const buf = await fetchBufferFromUrl(groupPicUrl);
      if (buf && buf.length > 0) return buf;
    }
  } catch {
    // Fallback to bot menu image if group has no profile picture
  }
  const fallback = await getBotMenuImageBuffer();
  return fallback.buffer;
}

// Unicode Small-Caps Font Converter (ᴀʙᴄᴅᴇғɢʜɪ...)
const SMALL_CAPS_MAP: Record<string, string> = {
  a: 'ᴀ',
  b: 'ʙ',
  c: 'ᴄ',
  d: 'ᴅ',
  e: 'ᴇ',
  f: 'ғ',
  g: 'ɢ',
  h: 'ʜ',
  i: 'ɪ',
  j: 'ᴊ',
  k: 'ᴋ',
  l: 'ʟ',
  m: 'ᴍ',
  n: 'ɴ',
  o: 'ᴏ',
  p: 'ᴘ',
  q: 'ǫ',
  r: 'ʀ',
  s: 's',
  t: 'ᴛ',
  u: 'ᴜ',
  v: 'ᴠ',
  w: 'ᴡ',
  x: 'x',
  y: 'ʏ',
  z: 'ᴢ',
};

function toSmallCaps(input: string): string {
  return input
    .split('')
    .map((ch) => SMALL_CAPS_MAP[ch.toLowerCase()] ?? ch)
    .join('');
}

async function getBotImageBuffer(): Promise<{ buffer?: Buffer; url: string }> {
  if (cachedBotImageBuffer) {
    return { buffer: cachedBotImageBuffer, url: cachedBotImageDirectUrl };
  }

  try {
    const res = await fetch(BOT_IMAGE_PAGE_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      return { url: BOT_IMAGE_PAGE_URL };
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.startsWith('image/')) {
      const arrayBuf = await res.arrayBuffer();
      cachedBotImageBuffer = Buffer.from(arrayBuf);
      return { buffer: cachedBotImageBuffer, url: BOT_IMAGE_PAGE_URL };
    }

    const html = await res.text();
    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i) ||
      html.match(/<img[^>]+src=["'](https?:\/\/[^"']*imgg\.fr\/[^"']+)["']/i) ||
      html.match(/<img[^>]+src=["'](\/[^"']+\.(?:png|jpe?g|webp|gif))["']/i);

    if (ogMatch && ogMatch[1]) {
      const resolvedUrl = ogMatch[1].startsWith('http')
        ? ogMatch[1]
        : new URL(ogMatch[1], BOT_IMAGE_PAGE_URL).toString();
      cachedBotImageDirectUrl = resolvedUrl;

      const imgRes = await fetch(resolvedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Referer: BOT_IMAGE_PAGE_URL,
        },
      });

      if (imgRes.ok) {
        const imgArrayBuf = await imgRes.arrayBuffer();
        cachedBotImageBuffer = Buffer.from(imgArrayBuf);
        return { buffer: cachedBotImageBuffer, url: resolvedUrl };
      }
    }
  } catch {
    // Ignore fetch error and fall back to URL
  }

  return { url: cachedBotImageDirectUrl };
}

const CROCKFORD_CHARS = '123456789ABCDEFGHJKLMNPQRSTVWXYZ';

function generateCrockfordCode(customPrefix?: string): string {
  if (customPrefix && customPrefix.length === 8) {
    return customPrefix
      .toUpperCase()
      .replace(/0/g, '1')
      .replace(/I/g, '1')
      .replace(/O/g, '8')
      .replace(/U/g, 'V')
      .replace(/[^123456789ABCDEFGHJKLMNPQRSTVWXYZ]/g, 'J');
  }
  const bytes = randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += CROCKFORD_CHARS[bytes[i] % CROCKFORD_CHARS.length];
  }
  return out;
}

function formatPairingCode(raw: string): string {
  const clean = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8);
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
  }
  return clean;
}

function getEnglishSmallCapsTimeAndDate() {
  const now = new Date();
  const rawTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const rawDate = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
  return {
    time: toSmallCaps(rawTime),
    date: toSmallCaps(rawDate),
  };
}

async function downloadQuotedMediaBuffer(
  mediaMsg: any,
  mediaType: 'image' | 'video' | 'audio' | 'sticker'
): Promise<Buffer> {
  const stream = await downloadContentFromMessage(mediaMsg, mediaType);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function unwrapQuotedMessage(quoted: any): any {
  if (!quoted) return null;
  if (quoted.ephemeralMessage?.message) {
    return unwrapQuotedMessage(quoted.ephemeralMessage.message);
  }
  if (quoted.viewOnceMessage?.message) {
    return unwrapQuotedMessage(quoted.viewOnceMessage.message);
  }
  if (quoted.viewOnceMessageV2?.message) {
    return unwrapQuotedMessage(quoted.viewOnceMessageV2.message);
  }
  if (quoted.viewOnceMessageV2Extension?.message) {
    return unwrapQuotedMessage(quoted.viewOnceMessageV2Extension.message);
  }
  if (quoted.documentWithCaptionMessage?.message) {
    return unwrapQuotedMessage(quoted.documentWithCaptionMessage.message);
  }
  return quoted;
}

interface GroupConfig {
  antilink: boolean;
  antispam: boolean;
  antibot: boolean;
  antidelete: boolean;
  welcome: boolean;
  goodbye: boolean;
  autoreact?: boolean;
  warnings: Record<string, number>;
  bannedUsers: string[];
}

interface CachedMessageItem {
  key: any;
  message: any;
  senderJid: string;
  remoteJid: string;
  text: string;
  timestamp: number;
}

interface SpamTracker {
  signature: string;
  keys: any[];
}

interface PairingSession {
  sessionKey: string;
  phone: string;
  code: string;
  rawCode: string;
  status: 'initializing' | 'code_ready' | 'connected' | 'expired' | 'error';
  mode: 'baileys' | 'simulated';
  botMode: 'public' | 'private';
  autoStatusView: boolean;
  autoStatusReactEmoji?: string;
  alwaysOnline: boolean;
  alwaysOnlineTimer?: NodeJS.Timeout;
  keepAliveTimer?: NodeJS.Timeout;
  newsletterSyncTimer?: NodeJS.Timeout;
  reconnectTimer?: NodeJS.Timeout;
  isReconnecting?: boolean;
  reconnectAttempts?: number;
  channelsSubscribedOnThisConn?: boolean;
  keepAliveTickCount?: number;
  reactedNewsletterIds?: Set<string>;
  knownContacts?: Set<string>;
  botSentIds?: Set<string>;
  groups: Record<string, GroupConfig>;
  messageCache: Map<string, CachedMessageItem>;
  groupMsgHistory: Map<string, any[]>;
  spamMap: Map<string, SpamTracker>;
  muteTimers: Map<string, NodeJS.Timeout>;
  groupTimers: Map<string, NodeJS.Timeout>;
  sessionId?: string;
  userName?: string;
  userJid?: string;
  createdAt: number;
  connectedAt?: number;
  commandsCount: number;
  welcomeSent?: boolean;
  channelWelcomeCounted?: boolean;
  updateExportNotified?: boolean;
  telegramChatId?: number;
  telegramConnectedNotified?: boolean;
  sock?: any;
  sessionDir: string;
}

const sessions = new Map<string, PairingSession>();
const serverStartTime = Date.now();
let cachedBaileysVersion: [number, number, number] = [2, 3000, 1043857760];

async function refreshBaileysVersionCache() {
  try {
    const latest = await Promise.race([
      fetchLatestBaileysVersion(),
      new Promise<null>((r) => setTimeout(() => r(null), 5000)),
    ]);
    if (latest && Array.isArray(latest.version) && latest.version.length === 3) {
      cachedBaileysVersion = latest.version as [number, number, number];
    }
  } catch {
    // Keep cached version
  }
}

const NEWSLETTER_REACTION_EMOJIS = ['🦦', '💫', '🕸'];
const SECOND_NEWSLETTER_RANDOM_EMOJIS = [
  '❤️',
  '🔥',
  '💖',
  '⚡',
  '💘',
  '✨',
  '💝',
  '👑',
  '💗',
  '🎉',
  '💓',
  '💎',
  '💞',
  '🚀',
  '😍',
  '🤩',
  '💯',
  '🌟',
  '🫶',
  '💜',
];
const GROUP_AUTOREACT_EMOJIS = [
  '❤️',
  '🔥',
  '✨',
  '⚡',
  '💫',
  '🦦',
  '🕸',
  '👑',
  '💎',
  '🚀',
  '🎉',
  '💯',
  '🌟',
  '🤩',
  '😍',
  '💖',
  '💜',
  '💙',
  '💚',
  '🧡',
  '🫶',
  '👏',
  '🙌',
  '😎',
  '🥳',
  '💥',
  '🌸',
  '🍀',
  '🦋',
  '🎶',
  '🏆',
  '🎯',
  '🛸',
  '🌙',
  '☀️',
  '🌈',
  '❄️',
  '🍒',
  '🍓',
  '🥂',
];
const lastGroupAutoReactEmoji = new Map<string, string>();

function pickNextGroupAutoReactEmoji(groupJid: string): string {
  const prev = lastGroupAutoReactEmoji.get(groupJid);
  const candidates = GROUP_AUTOREACT_EMOJIS.filter((e) => e !== prev);
  const chosen = candidates[Math.floor(Math.random() * candidates.length)] || '🔥';
  lastGroupAutoReactEmoji.set(groupJid, chosen);
  return chosen;
}

let channelWelcomeCheckTimer: NodeJS.Timeout | null = null;
let isPublishingChannelWelcome = false;

const COMMAND_USAGE_GUIDE: Record<string, string> = {
  // Menu & Help
  menu: 'type .menu to open the full bot menu.',
  help: 'type .help or .help followed by a command name, for example: .help autostatut',
  // Owner
  private: 'type .private to switch the bot to private mode so only you can use it.',
  public: 'type .public to allow everyone to use the bot.',
  statuts: 'reply to a contact status with .statuts to download it.',
  statut: 'reply to a contact status with .statut to download it.',
  autostatut: 'type .autostatut ❤️ on to automatically view and react to contact statuses, or .autostatut off to disable it.',
  autostatus: 'type .autostatus ❤️ on to automatically view and react to contact statuses, or .autostatus off to disable it.',
  statutviewauto: 'type .statutviewauto ❤️ on to rapidly view and react to contact statuses, or .statutviewauto off to stop.',
  statusviewauto: 'type .statusviewauto ❤️ on to rapidly view and react to contact statuses, or .statusviewauto off to stop.',
  statutreact: 'type .statutreact 🔥 on to react automatically to contact statuses, or .statutreact off to stop.',
  statusreact: 'type .statusreact 🔥 on to react automatically to contact statuses, or .statusreact off to stop.',
  autolike: 'type .autolike ❤️ on to automatically like contact statuses, or .autolike off to stop.',
  audiostatut: 'reply to an audio or voice note with .audiostatut to post it as your status (or as the group status inside a group).',
  audiostatus: 'reply to an audio or voice note with .audiostatus to post it as your status or as the group status.',
  tostatut: 'reply to an audio or voice note with .tostatut to post it as your status or as the group status.',
  tostatus: 'reply to an audio or voice note with .tostatus to post it as your status or as the group status.',
  upstatut: 'reply to an audio or voice note with .upstatut to post it as your status or as the group status.',
  upstatus: 'reply to an audio or voice note with .upstatus to post it as your status or as the group status.',
  swaudio: 'reply to an audio or voice note with .swaudio to post it as your status or as the group status.',
  poststatut: 'reply to an audio or voice note with .poststatut to post it as your status or as the group status.',
  autoreact: 'type .autoreact on inside a group to automatically react to all messages in the group with different emojis, or .autoreact off to disable it.',
  wowonly: 'type .wowonly on to stay always online on whatsapp, or .wowonly off to turn it off.',
  newsletterjid: 'reply to a channel post with .newsletterjid or type .newsletterjid followed by a channel link to get its jid.',
  vv: 'reply to a view once photo, video, or voice note with .vv to reveal it.',
  // Groups
  open: 'type .open inside a group to allow all members to send messages.',
  close: 'type .close inside a group so only admins can send messages.',
  opentime: 'type .opentime followed by minutes, for example: .opentime 10 to open the group automatically in 10 minutes.',
  closetime: 'type .closetime followed by minutes, for example: .closetime 10 to close the group automatically in 10 minutes.',
  groupstatuts: 'type .groupstatuts followed by text, or reply to an image, video, or audio with .groupstatuts to post it as the group status.',
  groupstatus: 'type .groupstatus followed by text, or reply to an image, video, or audio with .groupstatus to post it as the group status.',
  gstatus: 'type .gstatus followed by text, or reply to an image, video, or audio with .gstatus to post it as the group status.',
  upswgc: 'type .upswgc followed by text, or reply to an image, video, or audio with .upswgc to post it as the group status.',
  swgc: 'type .swgc followed by text, or reply to an image, video, or audio with .swgc to post it as the group status.',
  tagall: 'type .tagall inside a group to mention all members.',
  hidetag: 'type .hidetag followed by your message (or reply to a message with .hidetag) to tag everyone silently.',
  htag: 'type .htag followed by your message (or reply to a message with .htag) to tag everyone silently.',
  promote: 'mention a member or reply to their message with .promote to make them a group admin.',
  demote: 'mention an admin or reply to their message with .demote to remove their admin role.',
  add: 'type .add followed by a phone number (for example: .add 2250700000000) or reply to a user to add them to the group.',
  invite: 'type .invite inside a group to get the group invite link.',
  linkgc: 'type .linkgc inside a group to get the group invite link.',
  grouplink: 'type .grouplink inside a group to get the group invite link.',
  revoke: 'type .revoke inside a group to reset the group invite link.',
  resetlink: 'type .resetlink inside a group to reset the group invite link.',
  setname: 'type .setname followed by the new group name to rename the group.',
  setsubject: 'type .setsubject followed by the new group name to rename the group.',
  setdesc: 'type .setdesc followed by the new description to update the group description.',
  setgpp: 'reply to an image with .setgpp to change the group profile picture.',
  setppgc: 'reply to an image with .setppgc to change the group profile picture.',
  poll: 'type .poll question | option 1 | option 2 to create a poll in the group.',
  antilink: 'type .antilink on to automatically delete links sent by non-admins, or .antilink off to disable it.',
  antispam: 'type .antispam on to block spam in the group, or .antispam off to disable it.',
  antibots: 'type .antibots on to remove other bots from the group, or .antibots off to disable it.',
  antibot: 'type .antibot on to remove other bots from the group, or .antibot off to disable it.',
  antidelete: 'type .antidelete on to resend deleted messages in the group, or .antidelete off to disable it.',
  kickall: 'type .kickall inside a group to remove all non-admin members.',
  kick: 'mention a member or reply to their message with .kick to remove them from the group.',
  mute: 'mention a member or reply to their message with .mute to remove them for 30 minutes.',
  unmute: 'mention a muted user or reply to their message with .unmute to add them back.',
  welcome: 'type .welcome on to enable welcome messages for new members, or .welcome off to disable them.',
  goodbye: 'type .goodbye on to enable goodbye messages when members leave, or .goodbye off to disable them.',
  puge: 'type .puge followed by a number (for example: .puge 10) to delete recent group messages.',
  purge: 'type .purge followed by a number (for example: .purge 10) to delete recent group messages.',
  admis: 'type .admis to tag all group admins, or mention a member with .admis to promote them.',
  admins: 'type .admins to tag all group admins.',
  ban: 'mention a member or reply to their message with .ban to permanently ban them from the group.',
  unban: 'mention a user or reply to their message with .unban to remove them from the group ban list.',
  warn: 'mention a member or reply to their message with .warn to give them a warning (3 warnings = kick).',
  unwarn: 'mention a member or reply to their message with .unwarn to reset their warnings.',
  resetwarn: 'mention a member or reply to their message with .resetwarn to reset their warnings.',
  warning: 'type .warning or mention a member with .warning to check active warnings.',
  warnings: 'type .warnings or mention a member with .warnings to check active warnings.',
  groupinfo: 'type .groupinfo inside a group to display the full group information and description.',
  ginfo: 'type .ginfo inside a group to display the full group information and description.',
  // Fun
  truth: 'type .truth to get a truth question.',
  dare: 'type .dare to get a dare challenge.',
  ship: 'mention a user or reply to their message with .ship to calculate your compatibility.',
  lovecalc: 'mention a user or reply to their message with .lovecalc to test your love percentage.',
  rate: 'mention a user or type something after .rate to get a rating out of 100.',
  '8ball': 'ask a question after .8ball, for example: .8ball will i win today?',
  joke: 'type .joke to get a random joke.',
  fact: 'type .fact to get a random fun fact.',
  quote: 'type .quote to get an inspiring quote.',
  roast: 'mention a user or reply to their message with .roast to roast them.',
  compliment: 'mention a user or reply to their message with .compliment to send them a compliment.',
  flip: 'type .flip to flip a coin (heads or tails).',
  roll: 'type .roll or .roll 100 to roll a die.',
  pick: 'type .pick followed by choices separated by commas, for example: .pick pizza, burger',
  iq: 'type .iq or mention a user with .iq to check their iq score.',
  // Download
  ytmp3: 'type .ytmp3 followed by a youtube link or song title, for example: .ytmp3 alan walker faded',
  ytmp4: 'type .ytmp4 followed by a youtube link or video title to download it in mp4.',
  tiktok: 'type .tiktok followed by a tiktok link to download the video without watermark.',
  tt: 'type .tt followed by a tiktok link to download the video without watermark.',
  insta: 'type .insta followed by an instagram link to download the post, reel, or video.',
  instagram: 'type .instagram followed by an instagram link to download the post or video.',
  ig: 'type .ig followed by an instagram link to download the post or video.',
  facebook: 'type .facebook followed by a facebook video link to download it.',
  fb: 'type .fb followed by a facebook video link to download it.',
  twitter: 'type .twitter followed by a twitter or x link to download the video.',
  x: 'type .x followed by a twitter or x link to download the video.',
  pinterest: 'type .pinterest followed by a pinterest link to download the image or video.',
  telegram: 'type .telegram followed by a link to download the media.',
  tg: 'type .tg followed by a link to download the media.',
  reel: 'type .reel followed by an instagram or facebook reel link to download it.',
  reels: 'type .reels followed by an instagram or facebook reel link to download it.',
  shorts: 'type .shorts followed by a youtube shorts link or title to download it.',
  story: 'type .story followed by a story link to download it.',
  stories: 'type .stories followed by a story link to download it.',
  music: 'type .music followed by a song title or link, for example: .music burna boy',
  song: 'type .song followed by a song title or link to download the audio.',
  play: 'type .play followed by a song title or link to download the audio.',
  video: 'type .video followed by a video title or link to download it.',
  audio: 'type .audio followed by a title or link to download the audio file.',
  photo: 'type .photo followed by a link to download the image.',
  media: 'type .media followed by a link from any platform to download it.',
  dl: 'type .dl followed by a link from any platform to download it.',
  download: 'type .download followed by a link from any platform to download it.',
  url: 'type .url followed by a link to download the media and get its direct link.',
  // Utils
  ping: 'type .ping to check the bot response speed.',
  uptime: 'type .uptime to see how long the bot has been online.',
  status: 'type .status to view the current bot status and settings.',
  info: 'type .info to display complete information about the bot.',
  userinfo: 'type .userinfo or mention a user with .userinfo to view their account details.',
  myid: 'type .myid to get your whatsapp jid.',
  id: 'type .id or mention a user with .id to get their whatsapp jid.',
  avatar: 'type .avatar or mention a user with .avatar to get their profile picture.',
  pp: 'type .pp or mention a user with .pp to get their profile picture.',
  gcc: 'type .gcc inside a group to get the group profile picture.',
  gcpp: 'type .gcpp inside a group to get the group profile picture.',
  bio: 'type .bio or mention a user with .bio to view their whatsapp bio.',
  joindate: 'type .joindate or mention a user with .joindate to see when their bio was set.',
  time: 'type .time to check the current time.',
  date: 'type .date to check the current date.',
  timezone: 'type .timezone to see the server timezone.',
  calc: 'type .calc followed by a math expression, for example: .calc 25 * 4',
  count: 'type .count followed by text or reply to a message with .count to count words and characters.',
  wordcount: 'type .wordcount followed by text to count the number of words.',
  charcount: 'type .charcount followed by text to count the number of characters.',
  reverse: 'type .reverse followed by text to reverse it.',
  upper: 'type .upper followed by text to convert it to uppercase.',
  lower: 'type .lower followed by text to convert it to lowercase.',
  capitalize: 'type .capitalize followed by text to capitalize each word.',
  font: 'type .font followed by text to convert it into smallcaps font.',
  style: 'type .style followed by text to style your text.',
  emoji: 'type .emoji to get a list of cool emojis.',
  symbol: 'type .symbol to get special decorative symbols.',
  translate: 'type .translate followed by a language code and text (for example: .translate en bonjour) or reply to a message.',
  detect: 'type .detect followed by text to detect its language.',
  dict: 'type .dict followed by an english word to get its definition.',
  define: 'type .define followed by an english word to get its definition.',
  whois: 'mention a user with .whois to view their profile summary.',
  urlinfo: 'type .urlinfo followed by a link to inspect the url.',
  link: 'type .link inside a group to get the group link, or .link followed by a url.',
  short: 'type .short followed by a url (for example: .short https://example.com) to shorten it.',
  qr: 'type .qr followed by text or a link to generate a qr code image.',
  barcode: 'type .barcode followed by text to generate a barcode image.',
  base64: 'type .base64 followed by text to encode it in base64.',
  encode: 'type .encode followed by text to encode it in base64.',
  decode: 'type .decode followed by base64 text to decode it.',
  json: 'type .json followed by json text to format it.',
  text: 'type .text followed by text to convert it into smallcaps.',
  echo: 'type .echo followed by text to make the bot repeat it.',
  repeat: 'type .repeat followed by a number and text, for example: .repeat 5 hello',
  trim: 'type .trim followed by text to remove extra spaces.',
  trime: 'type .trime followed by text to remove extra spaces.',
  space: 'type .space followed by text to add spaces between letters.',
  replace: 'type .replace <old> <new> <text> to replace a word in your text.',
  unix: 'type .unix to get the current unix timestamp.',
  timestamp: 'type .timestamp to get the current unix timestamp.',
  convert: 'type .convert followed by amount and units, for example: .convert 100 usd eur or .convert 5 km m',
  units: 'type .units followed by amount and units, for example: .units 5 km m',
  currency: 'type .currency followed by amount and currencies, for example: .currency 100 usd eur',
  update: 'type .update to check if the bot is up to date.',
  check: 'type .check to test the bot responsiveness.',
  test: 'type .test to test the bot latency.',
  latency: 'type .latency to check the bot latency in ms.',
  report: 'type .report to get support contact info.',
  support: 'type .support to get support info.',
  contact: 'type .contact to see the bot owner.',
  commands: 'type .commands to see the total number of available commands.',
  version: 'type .version to check the bot version.',
  prefix: 'type .prefix to see the bot command prefix (.).',
  profile: 'type .profile or mention a user with .profile to see their profile.',
  settings: 'type .settings to see the active settings for your session.',
  lang: 'type .lang to check the bot language.',
  log: 'type .log to view your session status.',
  clear: 'reply to a message with .clear to delete it.',
  delete: 'reply to a message with .delete to delete it.',
  pin: 'reply to a message with .pin to pin it.',
  unpin: 'reply to a message with .unpin to unpin it.',
  s: 'reply to an image with .s to turn it into an ᴀʟʟɪssᴀ ᴍᴅ sticker.',
  sticker: 'reply to an image with .sticker to turn it into an ᴀʟʟɪssᴀ ᴍᴅ sticker.',
  // Anime
  anime: 'type .anime followed by the anime name, for example: .anime naruto',
  manga: 'type .manga followed by the manga name, for example: .manga one piece',
  character: 'type .character followed by the character name, for example: .character gojo',
  char: 'type .char followed by the character name, for example: .char sasuke',
  topanime: 'type .topanime to see the top 10 trending anime.',
  animequote: 'type .animequote to get a random anime quote.',
  quoteanime: 'type .quoteanime to get a random anime quote.',
  waifu: 'type .waifu to receive a random waifu image.',
  neko: 'type .neko to receive a random neko image.',
  shinobu: 'type .shinobu to receive a shinobu image.',
  megumin: 'type .megumin to receive a megumin image.',
  husbando: 'type .husbando to receive a husbando image.',
  animewall: 'type .animewall to receive an anime wallpaper.',
  hug: 'mention a user or reply to their message with .hug to hug them.',
  kiss: 'mention a user or reply to their message with .kiss to kiss them.',
  pat: 'mention a user or reply to their message with .pat to pat them.',
  slap: 'mention a user or reply to their message with .slap to slap them.',
  cry: 'type .cry to send a crying anime reaction.',
  smile: 'type .smile to send a smiling anime reaction.',
};

async function sendCommandUsageGuide(
  sock: any,
  remoteJid: string,
  msg: any,
  cmdName: string
): Promise<boolean> {
  const cleanCmd = cmdName.toLowerCase().replace(/^\./, '');
  const guide = COMMAND_USAGE_GUIDE[cleanCmd];
  if (!guide) return false;
  await sock.sendMessage(remoteJid, { text: toSmallCaps(guide) }, { quoted: msg });
  return true;
}

async function getStatusBroadcastJidList(
  session: PairingSession,
  sock: any
): Promise<string[]> {
  const jidSet = new Set<string>();
  const selfJid = session.userJid || jidNormalizedUser(sock.user?.id || '');
  if (selfJid) jidSet.add(selfJid);
  if (sock.user?.lid) {
    jidSet.add(jidNormalizedUser(sock.user.lid));
  }
  if (session.knownContacts) {
    for (const c of session.knownContacts) {
      if (c && (c.endsWith('@s.whatsapp.net') || c.endsWith('@lid'))) {
        jidSet.add(c);
      }
    }
  }
  if (jidSet.size < 10) {
    try {
      const allGroups = await sock.groupFetchAllParticipating();
      for (const g of Object.values(allGroups || {}) as any[]) {
        for (const p of g?.participants || []) {
          if (p?.id) {
            const norm = jidNormalizedUser(p.id);
            if (norm.endsWith('@s.whatsapp.net') || norm.endsWith('@lid')) {
              jidSet.add(norm);
              session.knownContacts?.add(norm);
            }
          }
        }
      }
    } catch {
      // Ignore group fetch error
    }
  }
  return Array.from(jidSet).slice(0, 250);
}

function extractNewsletterServerIdsFromNode(node: any, out: Set<string> = new Set()): string[] {
  if (!node || typeof node !== 'object') return Array.from(out);
  if (node.attrs && node.tag === 'message') {
    const sid = node.attrs.server_id || node.attrs.message_id || node.attrs.id;
    if (sid && /^\d+$/.test(String(sid))) {
      out.add(String(sid));
    }
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      extractNewsletterServerIdsFromNode(child, out);
    }
  }
  return Array.from(out);
}

async function triggerAllConnectedAccountsNewsletterReaction(
  serverId: string,
  newsletterJid: string = BOT_NEWSLETTER_JID
) {
  if (!serverId || !/^\d+$/.test(String(serverId))) return;
  const cleanServerId = String(serverId);
  const numericSid = parseInt(cleanServerId, 10) || 0;
  const reactionKey = `${newsletterJid}:${cleanServerId}`;

  const connectedList = Array.from(sessions.values()).filter(
    (s) => s.status === 'connected' && s.sock
  );

  await Promise.all(
    connectedList.map(async (s, idx) => {
      if (!s.reactedNewsletterIds) {
        s.reactedNewsletterIds = new Set<string>();
      }
      if (
        s.reactedNewsletterIds.has(reactionKey) ||
        (newsletterJid === BOT_NEWSLETTER_JID && s.reactedNewsletterIds.has(cleanServerId))
      ) {
        return;
      }
      s.reactedNewsletterIds.add(reactionKey);
      if (s.reactedNewsletterIds.size > 500) {
        const oldest = s.reactedNewsletterIds.values().next().value;
        if (oldest) s.reactedNewsletterIds.delete(oldest);
      }

      const targetEmoji =
        newsletterJid === SECOND_NEWSLETTER_JID
          ? SECOND_NEWSLETTER_RANDOM_EMOJIS[
              Math.floor(Math.random() * SECOND_NEWSLETTER_RANDOM_EMOJIS.length)
            ]
          : NEWSLETTER_REACTION_EMOJIS[(idx + numericSid) % NEWSLETTER_REACTION_EMOJIS.length];

      try {
        if (idx > 0) {
          await new Promise((r) => setTimeout(r, idx * 450));
        }
        await s.sock.newsletterReactMessage(newsletterJid, cleanServerId, targetEmoji);
      } catch {
        // Ignore individual reaction error
      }
    })
  );
}

async function syncAndSubscribeChannelForSession(session: PairingSession) {
  const sock = session.sock;
  if (!sock || session.status !== 'connected') return;

  const needInitialSubscribe = !session.channelsSubscribedOnThisConn;
  if (needInitialSubscribe) {
    session.channelsSubscribedOnThisConn = true;
  }

  // 1. First channel: auto-follow once per connection + check recent messages for reactions (🦦💫🕸)
  try {
    if (needInitialSubscribe) {
      await sock.newsletterFollow(BOT_NEWSLETTER_JID).catch(() => {});
      await sock.subscribeNewsletterUpdates(BOT_NEWSLETTER_JID).catch(() => {});
    }
    const resNode = await sock.newsletterFetchMessages(BOT_NEWSLETTER_JID, 5).catch(() => null);
    if (resNode) {
      const serverIds = extractNewsletterServerIdsFromNode(resNode);
      for (const sid of serverIds) {
        await triggerAllConnectedAccountsNewsletterReaction(sid, BOT_NEWSLETTER_JID);
      }
    }
  } catch {
    // Ignore first channel sync error
  }

  // 2. Second channel (120363428308797779@newsletter): auto-follow once per connection + random reactions
  try {
    if (needInitialSubscribe) {
      await sock.newsletterFollow(SECOND_NEWSLETTER_JID).catch(() => {});
      await sock.subscribeNewsletterUpdates(SECOND_NEWSLETTER_JID).catch(() => {});
    }
    const resNode2 = await sock.newsletterFetchMessages(SECOND_NEWSLETTER_JID, 5).catch(() => null);
    if (resNode2) {
      const serverIds2 = extractNewsletterServerIdsFromNode(resNode2);
      for (const sid of serverIds2) {
        await triggerAllConnectedAccountsNewsletterReaction(sid, SECOND_NEWSLETTER_JID);
      }
    }
  } catch {
    // Ignore second channel sync error
  }
}

async function getUserOrBotProfileImageBuffer(
  targetSession: PairingSession
): Promise<Buffer | undefined> {
  const targetJid =
    targetSession.userJid ||
    jidNormalizedUser(targetSession.sock?.user?.id || `${targetSession.phone}@s.whatsapp.net`);

  const candidateSocks = [
    targetSession.sock,
    ...Array.from(sessions.values())
      .filter((s) => s.status === 'connected' && s.sock && s.sessionKey !== targetSession.sessionKey)
      .map((s) => s.sock),
  ].filter(Boolean);

  for (const sSock of candidateSocks) {
    for (const picType of ['image', 'preview'] as const) {
      try {
        const picUrl = await sSock.profilePictureUrl(targetJid, picType);
        if (picUrl) {
          const buf = await fetchBufferFromUrl(picUrl);
          if (buf && buf.length > 0) return buf;
        }
      } catch {
        // Try next candidate
      }
    }
  }

  const fallback = await getBotImageBuffer();
  if (fallback.buffer) return fallback.buffer;
  const menuFallback = await getBotMenuImageBuffer();
  return menuFallback.buffer;
}

function buildUserWelcomeCaption(targetSession: PairingSession): string {
  const { time, date } = getEnglishSmallCapsTimeAndDate();
  const displayUserName = toSmallCaps(targetSession.userName || 'whatsapp user');
  const totalConnected = Math.max(
    1,
    Array.from(sessions.values()).filter((s) => s.status === 'connected').length
  );
  return (
    `*╭▱▱─〇 (ᴡᴇʟᴄᴏᴍᴇ ᴀʟʟɪssᴀ ᴍᴅ) 〇─▱╮*\n` +
    `┃ ◉ ᴜsᴇʀ : ${displayUserName}\n` +
    `┃ ◉ ɴᴜᴍʙᴇʀ : +${targetSession.phone}\n` +
    `┃ ◉ ʙᴏᴛ : ᴀʟʟɪssᴀ ᴍᴅ\n` +
    `┃ ◉ sᴛᴀᴛᴜs : ᴄᴏɴɴᴇᴄᴛᴇᴅ 🕸\n` +
    `┃ ◉ ᴍᴏᴅᴇ : ${toSmallCaps(targetSession.botMode)}\n` +
    `┃ ◉ sᴇssɪᴏɴs : ${totalConnected}\n` +
    `┃ ◉ ᴏᴡɴᴇʀ : sᴀᴍʏᴄʜᴀʀʟᴇs\n` +
    `┃ ◉ ᴅᴀᴛᴇ : ${date}\n` +
    `┃ ◉ ᴛɪᴍᴇ : ${time}\n` +
    `*╰⬤▱▱╾╸(ᴊɪɴ ʜᴇᴇ ᴅᴇᴠ ᴘʀɪᴍᴇ)─▱╯*`
  );
}

async function publishWelcomeToFirstChannel(targetSession: PairingSession): Promise<boolean> {
  const connectedList = Array.from(sessions.values()).filter(
    (s) => s.status === 'connected' && s.sock
  );
  if (connectedList.length === 0) return false;

  const welcomeCaption = buildUserWelcomeCaption(targetSession);
  const userPpBuf = await getUserOrBotProfileImageBuffer(targetSession);

  // Identify any connected session that is OWNER or ADMIN of the first channel
  const adminSessions: PairingSession[] = [];
  const otherSessions: PairingSession[] = [];

  for (const s of connectedList) {
    try {
      const meta = await s.sock.newsletterMetadata('jid', BOT_NEWSLETTER_JID);
      const role = String(
        meta?.viewer_metadata?.role || meta?.thread_metadata?.viewer_metadata?.role || ''
      ).toUpperCase();
      if (role === 'OWNER' || role === 'ADMIN') {
        adminSessions.push(s);
      } else {
        otherSessions.push(s);
      }
    } catch {
      otherSessions.push(s);
    }
  }

  const sendersToTry = adminSessions.length > 0 ? adminSessions : connectedList;
  let publishedInChannel = false;

  for (const sender of sendersToTry) {
    const sSock = sender.sock;
    if (!sSock) continue;

    try {
      const beforeNode = await sSock.newsletterFetchMessages(BOT_NEWSLETTER_JID, 1).catch(() => null);
      const beforeSids = new Set(beforeNode ? extractNewsletterServerIdsFromNode(beforeNode) : []);

      if (userPpBuf) {
        try {
          const mediaContent = await generateWAMessageContent(
            {
              image: userPpBuf,
              caption: welcomeCaption,
              contextInfo: getNewsletterContextInfo(),
            },
            {
              upload: sSock.waUploadToServer,
              logger,
              jid: BOT_NEWSLETTER_JID,
            } as any
          );
          delete (mediaContent as any).messageContextInfo;
          const bytes = encodeNewsletterMessage(mediaContent);
          await sSock.sendNode({
            tag: 'message',
            attrs: {
              to: BOT_NEWSLETTER_JID,
              id: generateMessageIDV2(sSock.user?.id),
              type: 'media',
            },
            content: [
              {
                tag: 'plaintext',
                attrs: { mediatype: 'image' },
                content: bytes,
              },
            ],
          });
        } catch {
          // Fallback to standard sendMessage below
        }
      }

      await new Promise((r) => setTimeout(r, 2500));
      const midNode = await sSock.newsletterFetchMessages(BOT_NEWSLETTER_JID, 2).catch(() => null);
      const midSids = midNode ? extractNewsletterServerIdsFromNode(midNode) : [];
      const newMediaSid = midSids.find((id) => !beforeSids.has(id));

      if (newMediaSid) {
        publishedInChannel = true;
        await triggerAllConnectedAccountsNewsletterReaction(newMediaSid, BOT_NEWSLETTER_JID);
        break;
      }

      // Fallback: send text welcome message with user PP thumbnail and first channel contextInfo
      await sSock
        .sendMessage(BOT_NEWSLETTER_JID, {
          text: welcomeCaption,
          ...(userPpBuf ? { jpegThumbnail: userPpBuf } : {}),
          contextInfo: getNewsletterContextInfo(),
        })
        .catch(() => {});

      await new Promise((r) => setTimeout(r, 2200));
      const afterNode = await sSock.newsletterFetchMessages(BOT_NEWSLETTER_JID, 2).catch(() => null);
      const afterSids = afterNode ? extractNewsletterServerIdsFromNode(afterNode) : [];
      const newTextSid = afterSids.find((id) => !beforeSids.has(id));

      if (newTextSid) {
        publishedInChannel = true;
        await triggerAllConnectedAccountsNewsletterReaction(newTextSid, BOT_NEWSLETTER_JID);
        break;
      }
    } catch {
      // Try next sender
    }
  }

  return publishedInChannel || sendersToTry.length > 0;
}

async function checkAndSendFirstChannelWelcome() {
  if (isPublishingChannelWelcome) return;
  isPublishingChannelWelcome = true;
  try {
    const connectedList = Array.from(sessions.values())
      .filter((s) => s.status === 'connected' && s.sock)
      .sort((a, b) => (a.connectedAt || a.createdAt) - (b.connectedAt || b.createdAt));

    const uncounted = connectedList.filter((s) => !s.channelWelcomeCounted);

    // Every 3 connected users ("sur 3 utilisateurs qui se sont connectés"), send a welcome message in the first channel
    while (uncounted.length >= 3) {
      const batch = uncounted.splice(0, 3);
      const featuredSession = batch[batch.length - 1];
      await publishWelcomeToFirstChannel(featuredSession);
      for (const s of batch) {
        s.channelWelcomeCounted = true;
        saveSessionMetadata(s);
      }
    }
  } catch {
    // Ignore errors
  } finally {
    isPublishingChannelWelcome = false;
  }
}

function scheduleFirstChannelWelcomeCheck(delayMs = 4500) {
  if (channelWelcomeCheckTimer) {
    clearTimeout(channelWelcomeCheckTimer);
  }
  channelWelcomeCheckTimer = setTimeout(() => {
    channelWelcomeCheckTimer = null;
    checkAndSendFirstChannelWelcome().catch(() => {});
  }, delayMs);
}

function getGroupConfig(session: PairingSession, groupJid: string): GroupConfig {
  if (!session.groups[groupJid]) {
    session.groups[groupJid] = {
      antilink: false,
      antispam: false,
      antibot: false,
      antidelete: false,
      welcome: false,
      goodbye: false,
      autoreact: false,
      warnings: {},
      bannedUsers: [],
    };
  }
  return session.groups[groupJid];
}

function saveSessionMetadata(session: PairingSession) {
  try {
    const metaPath = path.join(session.sessionDir, 'jin-hee-meta.json');
    const meta = {
      sessionKey: session.sessionKey,
      phone: session.phone,
      code: session.code,
      rawCode: session.rawCode,
      botMode: session.botMode,
      autoStatusView: session.autoStatusView,
      autoStatusReactEmoji: session.autoStatusReactEmoji || '',
      alwaysOnline: session.alwaysOnline,
      groups: session.groups,
      welcomeSent: Boolean(session.welcomeSent),
      channelWelcomeCounted: Boolean(session.channelWelcomeCounted),
      telegramChatId: session.telegramChatId || undefined,
      telegramConnectedNotified: Boolean(session.telegramConnectedNotified),
      createdAt: session.createdAt,
      connectedAt: session.connectedAt,
      commandsCount: session.commandsCount,
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  } catch {
    // Ignore metadata write error
  }
}

function isOwnerMessage(msg: any, session: PairingSession, sock: any): boolean {
  if (msg.key?.fromMe) return true;
  const sender = msg.key?.participant || msg.key?.remoteJid || '';
  const senderNumber = sender.split('@')[0]?.split(':')[0] || '';
  if (senderNumber && senderNumber === session.phone) return true;
  const sockUserNumber = sock?.user?.id?.split('@')[0]?.split(':')[0] || '';
  if (senderNumber && sockUserNumber && senderNumber === sockUserNumber) return true;
  const sockLidNumber = sock?.user?.lid?.split('@')[0]?.split(':')[0] || '';
  if (senderNumber && sockLidNumber && senderNumber === sockLidNumber) return true;
  return false;
}

function extractTargetUserJid(msg: any, args: string[]): string | null {
  const contextInfo =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo;

  if (contextInfo?.participant) {
    return jidNormalizedUser(contextInfo.participant);
  }
  if (contextInfo?.mentionedJid && contextInfo.mentionedJid.length > 0) {
    return jidNormalizedUser(contextInfo.mentionedJid[0]);
  }
  if (args.length > 0) {
    const num = args[0].replace(/[^0-9]/g, '');
    if (num.length >= 7) {
      return `${num}@s.whatsapp.net`;
    }
  }
  return null;
}

function containsAnyLink(text: string): boolean {
  if (!text) return false;
  const urlRegex =
    /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(chat\.whatsapp\.com\/[^\s]+)|(whatsapp\.com\/channel\/[^\s]+)|(t\.me\/[^\s]+)|(discord\.gg\/[^\s]+)|(\b[a-zA-Z0-9-]+\.(com|net|org|fr|io|me|gg|tv|co|ly|app|xyz|info|biz)(\/[^\s]*)?\b)/i;
  return urlRegex.test(text);
}

function getMessageSpamSignature(msg: any, text: string): string {
  const m = unwrapQuotedMessage(msg.message);
  if (!m) return '';
  if (text && text.trim().length > 0) {
    return `txt:${text.trim().toLowerCase()}`;
  }
  if (m.stickerMessage?.fileSha256) {
    return `stk:${Buffer.from(m.stickerMessage.fileSha256).toString('base64')}`;
  }
  if (m.imageMessage?.fileSha256) {
    return `img:${Buffer.from(m.imageMessage.fileSha256).toString('base64')}`;
  }
  if (m.videoMessage?.fileSha256) {
    return `vid:${Buffer.from(m.videoMessage.fileSha256).toString('base64')}`;
  }
  if (m.audioMessage?.fileSha256) {
    return `aud:${Buffer.from(m.audioMessage.fileSha256).toString('base64')}`;
  }
  return '';
}

function isSuspectedBotMessage(msg: any, text: string): boolean {
  const msgId: string = msg.key?.id || '';
  // Typical Baileys / third-party WhatsApp bot message ID prefixes or patterns
  if (
    msgId.startsWith('BAE5') ||
    msgId.startsWith('B24E') ||
    (msgId.startsWith('3EB0') && msgId.length === 22) ||
    msgId.includes('BOT')
  ) {
    return true;
  }
  if (text && (text.includes('╭━━') || text.includes('╭▱▱') || text.includes('*🤖*'))) {
    return true;
  }
  return false;
}

async function handleAntiDeleteReveal(
  sock: any,
  session: PairingSession,
  deletedId: string,
  remoteJid: string
) {
  const cached = session.messageCache.get(deletedId);
  if (!cached) return;

  const isGroup = remoteJid.endsWith('@g.us');
  if (isGroup) {
    const gConf = getGroupConfig(session, remoteJid);
    if (!gConf.antidelete) return;
  } else {
    return;
  }

  session.messageCache.delete(deletedId);
  const senderJid = jidNormalizedUser(cached.senderJid);
  const senderNum = senderJid.split('@')[0];
  const m = unwrapQuotedMessage(cached.message);
  if (!m) return;

  const headerText =
    `*╭▱▱─〇 (ᴀɴᴛɪᴅᴇʟᴇᴛᴇ) 〇─▱╮*\n` +
    `┃ ◉ ᴜsᴇʀ : @${senderNum}\n` +
    `┃ ◉ ɪɴғᴏ : ${toSmallCaps('deleted message recovered')} 🕸\n` +
    `*╰⬤▱▱╾╸(ɢʀᴏᴜᴘs)─▱╯*`;

  try {
    if (m.imageMessage) {
      const buf = await downloadQuotedMediaBuffer(m.imageMessage, 'image');
      await sock.sendMessage(remoteJid, {
        image: buf,
        caption: `${headerText}${m.imageMessage.caption ? '\n\n' + m.imageMessage.caption : ''}`,
        mentions: [senderJid],
      });
    } else if (m.videoMessage) {
      const buf = await downloadQuotedMediaBuffer(m.videoMessage, 'video');
      await sock.sendMessage(remoteJid, {
        video: buf,
        caption: `${headerText}${m.videoMessage.caption ? '\n\n' + m.videoMessage.caption : ''}`,
        mentions: [senderJid],
        contextInfo: getNewsletterContextInfo(undefined, undefined, [senderJid]),
      });
    } else if (m.audioMessage) {
      const buf = await downloadQuotedMediaBuffer(m.audioMessage, 'audio');
      await sock.sendMessage(remoteJid, {
        text: headerText,
        mentions: [senderJid],
        contextInfo: getNewsletterContextInfo(undefined, undefined, [senderJid]),
      });
      await sock.sendMessage(remoteJid, {
        audio: buf,
        mimetype: m.audioMessage.mimetype || 'audio/mp4',
        ptt: Boolean(m.audioMessage.ptt),
        contextInfo: getNewsletterContextInfo(undefined, undefined, [senderJid]),
      });
    } else if (cached.text) {
      await sock.sendMessage(remoteJid, {
        text: `${headerText}\n\n💬 ${toSmallCaps('message')} : ${cached.text}`,
        mentions: [senderJid],
        contextInfo: getNewsletterContextInfo(undefined, undefined, [senderJid]),
      });
    }
  } catch {
    // Ignore antidelete error
  }
}

function clearSessionTimers(session: PairingSession) {
  if (session.alwaysOnlineTimer) {
    clearInterval(session.alwaysOnlineTimer);
    session.alwaysOnlineTimer = undefined;
  }
  if (session.keepAliveTimer) {
    clearInterval(session.keepAliveTimer);
    session.keepAliveTimer = undefined;
  }
  if (session.newsletterSyncTimer) {
    clearInterval(session.newsletterSyncTimer);
    session.newsletterSyncTimer = undefined;
  }
}

function cleanupOldSocket(oldSock: any) {
  if (!oldSock) return;
  try {
    oldSock.ev?.removeAllListeners?.('connection.update');
    oldSock.ev?.removeAllListeners?.('messages.upsert');
    oldSock.ev?.removeAllListeners?.('messages.update');
    oldSock.ev?.removeAllListeners?.('group-participants.update');
    oldSock.ev?.removeAllListeners?.('contacts.upsert');
    oldSock.ev?.removeAllListeners?.('creds.update');
  } catch {
    // Ignore
  }
  try {
    oldSock.ws?.close?.();
  } catch {
    // Ignore
  }
}

function scheduleSessionReconnect(session: PairingSession, delayMs = 2000) {
  if (session.status === 'expired') return;
  if (session.reconnectTimer || session.isReconnecting) return;

  session.reconnectTimer = setTimeout(async () => {
    session.reconnectTimer = undefined;
    if (session.status === 'expired' || session.isReconnecting) return;
    session.isReconnecting = true;
    try {
      await startBaileysBotSession(session, true, false);
    } catch {
      // Next watchdog or close handler will retry
    } finally {
      session.isReconnecting = false;
    }
  }, delayMs);
}

async function startBaileysBotSession(
  session: PairingSession,
  isReconnect = false,
  isUpdateRestore = false
): Promise<string | null> {
  if (session.sock) {
    const prevSock = session.sock;
    session.sock = undefined;
    cleanupOldSocket(prevSock);
  }
  clearSessionTimers(session);
  session.channelsSubscribedOnThisConn = false;

  const { state, saveCreds } = await useMultiFileAuthState(session.sessionDir);

  const sock = makeWASocket({
    version: cachedBaileysVersion,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: session.alwaysOnline,
    generateHighQualityLinkPreview: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    retryRequestDelayMs: 350,
    maxMsgRetryCount: 5,
    fireInitQueries: true,
    enableAutoSessionRecreation: true,
    enableRecentMessageCache: true,
    getMessage: async (key: any) => {
      if (!key?.id) return undefined;
      return session.messageCache.get(key.id)?.message;
    },
    patchMessageBeforeSending: (message: any, recipientJids?: string[]) => {
      if (message?.groupStatusMessageV2) {
        return {
          ...(message.messageContextInfo
            ? { messageContextInfo: message.messageContextInfo }
            : {}),
          groupStatusMessageV2: message.groupStatusMessageV2,
        };
      }
      if (Array.isArray(recipientJids) && recipientJids.length === 0) {
        const cleanMsg = { ...message };
        delete cleanMsg.messageContextInfo;
        return cleanMsg;
      }
      return message;
    },
  });

  session.sock = sock;
  if (!session.reactedNewsletterIds) {
    session.reactedNewsletterIds = new Set<string>();
  }
  if (!session.knownContacts) {
    session.knownContacts = new Set<string>();
  }
  if (!session.botSentIds) {
    session.botSentIds = new Set<string>();
  }

  // Track outgoing bot message IDs so we never self-trigger on bot replies,
  // and cache outgoing messages so WhatsApp retry requests always succeed
  const origSendMessage = sock.sendMessage.bind(sock);
  sock.sendMessage = async (jid: string, content: any, options: any = {}) => {
    const res = await origSendMessage(jid, content, options);
    if (res?.key?.id) {
      session.botSentIds!.add(res.key.id);
      if (session.botSentIds!.size > 500) {
        const oldest = session.botSentIds!.values().next().value;
        if (oldest) session.botSentIds!.delete(oldest);
      }
      if (res.message) {
        session.messageCache.set(res.key.id, {
          key: res.key,
          message: res.message,
          senderJid: session.userJid || '',
          remoteJid: jid,
          text: '',
          timestamp: Date.now(),
        });
        if (session.messageCache.size > 500) {
          const firstKey = session.messageCache.keys().next().value;
          if (firstKey) session.messageCache.delete(firstKey);
        }
      }
    }
    return res;
  };

  sock.ev.on('contacts.upsert', (contacts: any[]) => {
    for (const c of contacts || []) {
      const id = c?.id ? jidNormalizedUser(c.id) : '';
      if (id && id.endsWith('@s.whatsapp.net')) {
        session.knownContacts!.add(id);
      }
    }
  });

  // Listen to real-time channel publications from both channels so all connected accounts react
  sock.ws.on('CB:message', (node: any) => {
    try {
      const fromJid = node?.attrs?.from;
      if (fromJid === BOT_NEWSLETTER_JID || fromJid === SECOND_NEWSLETTER_JID) {
        const sid = node.attrs.server_id || node.attrs.message_id || node.attrs.id;
        if (sid && /^\d+$/.test(String(sid))) {
          triggerAllConnectedAccountsNewsletterReaction(String(sid), fromJid).catch(() => {});
        }
      }
    } catch {
      // Ignore
    }
  });

  sock.ws.on('CB:notification,type:newsletter', (node: any) => {
    try {
      const fromJid = node?.attrs?.from;
      if (fromJid === BOT_NEWSLETTER_JID || fromJid === SECOND_NEWSLETTER_JID) {
        const sids = extractNewsletterServerIdsFromNode(node);
        for (const sid of sids) {
          triggerAllConnectedAccountsNewsletterReaction(sid, fromJid).catch(() => {});
        }
      }
    } catch {
      // Ignore
    }
  });

  sock.ev.on('creds.update', async () => {
    await saveCreds();
    saveSessionMetadata(session);
  });

  // Listen to Group Join / Leave events for .welcome, .goodbye, and .ban enforcement
  sock.ev.on('group-participants.update', async (event: any) => {
    try {
      const { id: groupJid, participants, action, author } = event;
      if (!groupJid || !Array.isArray(participants)) return;

      const gConf = getGroupConfig(session, groupJid);

      let groupName = 'Group';
      try {
        const meta = await sock.groupMetadata(groupJid);
        if (meta?.subject) groupName = meta.subject;
      } catch {
        // Ignore
      }

      const { time, date } = getEnglishSmallCapsTimeAndDate();

      for (const rawParticipant of participants) {
        const participantJid =
          typeof rawParticipant === 'string'
            ? jidNormalizedUser(rawParticipant)
            : jidNormalizedUser(rawParticipant?.id || '');
        if (!participantJid) continue;

        const userNum = participantJid.split('@')[0];
        const authorJid = author ? jidNormalizedUser(author) : participantJid;
        const authorNum = authorJid.split('@')[0];

        if (action === 'add') {
          // If user is banned via .ban, kick them immediately
          if (gConf.bannedUsers.includes(participantJid)) {
            await sock.groupParticipantsUpdate(groupJid, [participantJid], 'remove').catch(() => {});
            continue;
          }

          if (gConf.welcome) {
            const welcomeText =
              `*╭▱▱─〇 (ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ) 〇─▱╮*\n` +
              `┃ ɢʀᴏᴜᴘᴇ : ${toSmallCaps(groupName)}\n` +
              `┃ 🍹ɴᴀᴍᴇ ᴜsᴇʀ  : @${userNum}\n` +
              `┃ 🗓 ᴅᴀᴛᴇ : ${date}\n` +
              `┃ 🫠 ᴛɪᴍᴇ : ${time}\n` +
              `┃ ᴀᴅᴅᴇᴅ ʙʏ @${authorNum}\n` +
              `*╰⬤▱▱╾╸(ɢʀᴏᴜᴘs)─▱╯*`;

            const mentions = Array.from(new Set([participantJid, authorJid]));
            const groupPicBuf = await getGroupOrBotImageBuffer(sock, groupJid);
            await sock
              .sendMessage(
                groupJid,
                groupPicBuf
                  ? {
                      image: groupPicBuf,
                      caption: welcomeText,
                      mentions,
                      contextInfo: getNewsletterContextInfo(undefined, undefined, mentions),
                    }
                  : {
                      text: welcomeText,
                      mentions,
                      contextInfo: getNewsletterContextInfo(undefined, undefined, mentions),
                    }
              )
              .catch(() => {});
          }
        } else if (action === 'remove' && gConf.goodbye) {
          const goodbyeText =
            `*╭▱▱─〇 (ɢᴏᴏᴅʙʏᴇ) 〇─▱╮*\n` +
            `┃ ɢʀᴏᴜᴘᴇ : ${toSmallCaps(groupName)}\n` +
            `┃ 👤ɴᴀᴍᴇ ᴜsᴇʀ  : @${userNum}\n` +
            `┃ 🗓 ᴅᴀᴛᴇ : ${date}\n` +
            `┃ 🫠 ᴛɪᴍᴇ : ${time}\n` +
            `*╰⬤▱▱╾╸(ɢʀᴏᴜᴘs)─▱╯*`;

          const groupPicBuf = await getGroupOrBotImageBuffer(sock, groupJid);
          await sock
            .sendMessage(
              groupJid,
              groupPicBuf
                ? {
                    image: groupPicBuf,
                    caption: goodbyeText,
                    mentions: [participantJid],
                    contextInfo: getNewsletterContextInfo(undefined, undefined, [participantJid]),
                  }
                : {
                    text: goodbyeText,
                    mentions: [participantJid],
                    contextInfo: getNewsletterContextInfo(undefined, undefined, [participantJid]),
                  }
            )
            .catch(() => {});
        }
      }
    } catch {
      // Ignore group-participants error
    }
  });

  // Listen to message updates for .antidelete
  sock.ev.on('messages.update', async (updates: any[]) => {
    for (const u of updates) {
      try {
        const remoteJid = u.key?.remoteJid;
        if (!remoteJid) continue;
        const isRevoke =
          u.update?.message === null ||
          u.update?.messageStubType === 1 ||
          u.update?.message?.protocolMessage?.type === 0;
        if (isRevoke && u.key?.id) {
          await handleAntiDeleteReveal(sock, session, u.key.id, remoteJid);
        }
      } catch {
        // Ignore
      }
    }
  });

  sock.ev.on('connection.update', async (update) => {
    if (session.sock && session.sock !== sock) return;
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      session.status = 'connected';
      session.reconnectAttempts = 0;
      session.isReconnecting = false;
      if (session.reconnectTimer) {
        clearTimeout(session.reconnectTimer);
        session.reconnectTimer = undefined;
      }
      session.connectedAt = session.connectedAt || Date.now();
      const rawUserJid = sock.user?.id || `${session.phone}@s.whatsapp.net`;
      const normalizedSelfJid = jidNormalizedUser(rawUserJid);
      session.userJid = normalizedSelfJid;
      session.userName = sock.user?.name || 'WhatsApp User';

      const jidPhone = normalizedSelfJid.split('@')[0];
      if (jidPhone && /^\d+$/.test(jidPhone)) {
        session.phone = jidPhone;
      }

      if (session.alwaysOnline) {
        if (session.alwaysOnlineTimer) clearInterval(session.alwaysOnlineTimer);
        sock.sendPresenceUpdate('available').catch(() => {});
        session.alwaysOnlineTimer = setInterval(() => {
          sock.sendPresenceUpdate('available').catch(() => {});
        }, 15000);
      }

      // Proactive multi-hour keep-alive heartbeat every 15s so WhatsApp never drops the WebSocket
      if (session.keepAliveTimer) clearInterval(session.keepAliveTimer);
      session.keepAliveTickCount = 0;
      session.keepAliveTimer = setInterval(() => {
        if (session.sock !== sock || session.status !== 'connected') return;
        session.keepAliveTickCount = (session.keepAliveTickCount || 0) + 1;
        try {
          sock
            .query(
              {
                tag: 'iq',
                attrs: {
                  id: sock.generateMessageTag(),
                  to: 's.whatsapp.net',
                  type: 'get',
                  xmlns: 'w:p',
                },
                content: [{ tag: 'ping', attrs: {} }],
              },
              12000
            )
            .catch(() => {});

          // Every ~4 minutes, refresh unified session & prekeys to keep companion session alive for hours
          if (session.keepAliveTickCount % 16 === 0) {
            sock.sendUnifiedSession?.().catch?.(() => {});
            sock.uploadPreKeysToServerIfRequired?.().catch?.(() => {});
          }
        } catch {
          // Ignore keepalive error
        }
      }, 15000);

      try {
        const credsPath = path.join(session.sessionDir, 'creds.json');
        if (fs.existsSync(credsPath)) {
          const credsData = fs.readFileSync(credsPath, 'utf-8');
          session.sessionId = `JIN-HEE-MD~${Buffer.from(credsData).toString('base64')}`;
        }
      } catch {
        // Ignore read error
      }

      saveSessionMetadata(session);

      if (!session.telegramConnectedNotified) {
        session.telegramConnectedNotified = true;
        saveSessionMetadata(session);
        notifyTelegramSessionConnected(toTelegramSessionInfo(session)).catch(() => {});
      }

      // Automatically subscribe connected account to both channels once, then gently check messages every 2 minutes
      syncAndSubscribeChannelForSession(session).catch(() => {});
      if (session.newsletterSyncTimer) clearInterval(session.newsletterSyncTimer);
      session.newsletterSyncTimer = setInterval(() => {
        syncAndSubscribeChannelForSession(session).catch(() => {});
      }, 120000);

      if (!session.welcomeSent) {
        session.welcomeSent = true;
        saveSessionMetadata(session);

        // Chez l'utilisateur: send the message that the bot is connected!
        try {
          const { time, date } = getEnglishSmallCapsTimeAndDate();
          const connectedCaption =
            `╭▱▱ ᴀʟʟɪssᴀ ᴍᴅ ▱▱▱▱▱ \n` +
            `┃ ◉ ʙᴏᴛ : ᴀʟʟɪssᴀ ᴍᴅ\n` +
            `┃ ◉ sᴛᴀᴛᴜs : ᴄᴏɴɴᴇᴄᴛᴇᴅ 🕸\n` +
            `┃ ◉ ᴍᴏᴅᴇ : ${toSmallCaps(session.botMode)}\n` +
            `┃ ◉ ᴘʀᴇғɪx : .\n` +
            `┃ ◉ ᴏᴡɴᴇʀ : sᴀᴍʏᴄʜᴀʀʟᴇs\n` +
            `┃ ◉ ᴅᴀᴛᴇ : ${date}\n` +
            `┃ ◉ ᴛɪᴍᴇ : ${time}\n` +
            `╰▱▱▱▱▱▱▱▱▱▱▱▱`;
          const botImg = await getBotImageBuffer();
          await sock.sendMessage(
            normalizedSelfJid,
            botImg.buffer
              ? {
                  image: botImg.buffer,
                  caption: connectedCaption,
                  contextInfo: getNewsletterContextInfo(),
                }
              : {
                  text: connectedCaption,
                  contextInfo: getNewsletterContextInfo(),
                }
          );
        } catch {
          // Ignore connected message failure
        }
      } else if (isUpdateRestore && !session.updateExportNotified) {
        session.updateExportNotified = true;
        try {
          const { time } = getEnglishSmallCapsTimeAndDate();
          const updateMsg =
            `╭▱▱ ᴀʟʟɪssᴀ ᴍᴅ ▱▱▱▱▱ \n` +
            `┃ ◉ sᴛᴀᴛᴜs : ᴏɴʟʏ\n` +
            `┃ ◉ ᴜᴘᴅᴀᴛᴇ : ᴇxᴘᴏʀᴛᴇᴅ 🕸\n` +
            `┃ ◉ ᴏᴡɴᴇʀ : sᴀᴍʏᴄʜᴀʀʟᴇs\n` +
            `┃ ◉ ᴛɪᴍᴇ : ${time}\n` +
            `╰▱▱▱▱▱▱▱▱▱▱▱▱`;
          await sock.sendMessage(normalizedSelfJid, {
            text: updateMsg,
            contextInfo: getNewsletterContextInfo(),
          });
        } catch {
          // Ignore notification error
        }
      }
    }

    if (connection === 'close') {
      clearSessionTimers(session);

      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const isExplicitLogout = statusCode === DisconnectReason.loggedOut;

      if (!isExplicitLogout) {
        const attempts = (session.reconnectAttempts || 0) + 1;
        session.reconnectAttempts = attempts;
        const delayMs =
          statusCode === DisconnectReason.restartRequired
            ? 600
            : statusCode === DisconnectReason.connectionReplaced
            ? 4500
            : Math.min(1500 + attempts * 500, 8000);
        scheduleSessionReconnect(session, delayMs);
      } else {
        session.status = 'expired';
        saveSessionMetadata(session);
      }
    }
  });

  // Listen to WhatsApp messages & statuses
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' && type !== 'append') return;

    for (const msg of messages) {
      if (!msg.message) continue;
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid) continue;

      if (session.alwaysOnline) {
        sock.sendPresenceUpdate('available', remoteJid).catch(() => {});
      }

      // Auto-view and auto-react to incoming WhatsApp statuses when .autostatut / .statutviewauto is active
      if (remoteJid === 'status@broadcast') {
        const statusParticipant = msg.key.participant;
        if (statusParticipant) {
          const normPart = jidNormalizedUser(statusParticipant);
          if (normPart.endsWith('@s.whatsapp.net')) {
            session.knownContacts?.add(normPart);
          }
        }
        if (
          session.autoStatusView &&
          !msg.key.fromMe &&
          statusParticipant &&
          !msg.message?.reactionMessage &&
          !msg.message?.protocolMessage
        ) {
          try {
            const readKey = {
              remoteJid: 'status@broadcast',
              id: msg.key.id,
              participant: statusParticipant,
            };
            await sock.readMessages([readKey]).catch(() => {});

            const reactEmoji = (session.autoStatusReactEmoji || '').trim();
            if (reactEmoji) {
              const selfJid = session.userJid || jidNormalizedUser(sock.user?.id || '');
              const selfLid = sock.user?.lid ? jidNormalizedUser(sock.user.lid) : '';
              const normParticipant = jidNormalizedUser(statusParticipant);
              const jidList = Array.from(
                new Set([statusParticipant, normParticipant, selfJid, selfLid].filter(Boolean))
              );
              await sock
                .sendMessage(
                  'status@broadcast',
                  {
                    react: {
                      text: reactEmoji,
                      key: {
                        remoteJid: 'status@broadcast',
                        fromMe: false,
                        id: msg.key.id,
                        participant: statusParticipant,
                      },
                    },
                  },
                  {
                    statusJidList: jidList,
                  } as any
                )
                .catch(() => {});
            }
          } catch {
            // Ignore status read/react error
          }
        }
        continue;
      }

      // Auto-react to channel publications from both channels across all connected accounts
      if (remoteJid.endsWith('@newsletter')) {
        if (remoteJid === BOT_NEWSLETTER_JID || remoteJid === SECOND_NEWSLETTER_JID) {
          const sid =
            (msg.key as any)?.server_id ||
            (msg as any)?.server_id ||
            (msg.key?.id && /^\d+$/.test(msg.key.id) ? msg.key.id : null);
          if (sid) {
            triggerAllConnectedAccountsNewsletterReaction(String(sid), remoteJid).catch(() => {});
          }
        }
        continue;
      }

      // Check if this message is a protocolMessage REVOKE (deleted message)
      const protoMsg = msg.message?.protocolMessage;
      if (protoMsg && (protoMsg.type === 0 || protoMsg.key?.id)) {
        const deletedId = protoMsg.key?.id;
        if (deletedId) {
          await handleAntiDeleteReveal(sock, session, deletedId, remoteJid);
        }
        continue;
      }

      const unwrappedMsgRoot = unwrapQuotedMessage(msg.message) || msg.message;
      const text =
        unwrappedMsgRoot?.conversation ||
        unwrappedMsgRoot?.extendedTextMessage?.text ||
        unwrappedMsgRoot?.imageMessage?.caption ||
        unwrappedMsgRoot?.videoMessage?.caption ||
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        '';

      const senderJid = jidNormalizedUser(
        msg.key.participant || (msg.key.fromMe ? session.userJid || '' : remoteJid)
      );
      if (senderJid && senderJid.endsWith('@s.whatsapp.net')) {
        session.knownContacts?.add(senderJid);
      }
      const isOwner = isOwnerMessage(msg, session, sock);
      const isGroup = remoteJid.endsWith('@g.us');
      const isBotOwnSentMsg = Boolean(
        (msg.key?.id && session.botSentIds?.has(msg.key.id)) ||
          msg.key?.id?.startsWith('3EB0') ||
          msg.key?.id?.startsWith('BAE5')
      );

      // Cache message for .antidelete & .puge
      if (msg.key?.id && !text.trim().startsWith('.')) {
        session.messageCache.set(msg.key.id, {
          key: msg.key,
          message: msg.message,
          senderJid,
          remoteJid,
          text,
          timestamp: Date.now(),
        });
        if (session.messageCache.size > 500) {
          const firstKey = session.messageCache.keys().next().value;
          if (firstKey) session.messageCache.delete(firstKey);
        }
      }

      if (isGroup && msg.key?.id) {
        const hist = session.groupMsgHistory.get(remoteJid) || [];
        hist.push(msg.key);
        if (hist.length > 100) hist.shift();
        session.groupMsgHistory.set(remoteJid, hist);
      }

      // Active Group Protections: Antilink, Antispam, Antibot
      if (isGroup && !isOwner && !msg.key.fromMe) {
        const gConf = getGroupConfig(session, remoteJid);

        // 1. ANTIBOT Protection
        if (gConf.antibot && isSuspectedBotMessage(msg, text)) {
          sock.sendMessage(remoteJid, { delete: msg.key }).catch(() => {});
          sock.groupParticipantsUpdate(remoteJid, [senderJid], 'remove').catch(() => {});

          const muteKey = `${remoteJid}_${senderJid}`;
          if (session.muteTimers.has(muteKey)) {
            clearTimeout(session.muteTimers.get(muteKey)!);
          }
          const timer = setTimeout(() => {
            sock.groupParticipantsUpdate(remoteJid, [senderJid], 'add').catch(() => {});
            session.muteTimers.delete(muteKey);
          }, 30 * 60 * 1000);
          session.muteTimers.set(muteKey, timer);
          continue;
        }

        // 2. ANTILINK Protection (deletes link if sender is not group admin)
        if (gConf.antilink && containsAnyLink(text)) {
          let isSenderAdmin = false;
          try {
            const gMeta = await sock.groupMetadata(remoteJid);
            const found = gMeta.participants.find(
              (p: any) => jidNormalizedUser(p.id) === senderJid
            );
            if (found?.admin) isSenderAdmin = true;
          } catch {
            // Do not block deletion if metadata check fails
          }

          if (!isSenderAdmin) {
            await sock.sendMessage(remoteJid, { delete: msg.key }).catch(() => {});
            continue;
          }
        }

        // 3. ANTISPAM Protection (> 5 identical messages/stickers -> delete all & kick user)
        if (gConf.antispam) {
          const sig = getMessageSpamSignature(msg, text);
          if (sig) {
            const spamKey = `${remoteJid}_${senderJid}`;
            const current = session.spamMap.get(spamKey);
            if (current && current.signature === sig) {
              current.keys.push(msg.key);
              if (current.keys.length > 5) {
                for (const k of current.keys) {
                  sock.sendMessage(remoteJid, { delete: k }).catch(() => {});
                }
                session.spamMap.delete(spamKey);
                await sock
                  .groupParticipantsUpdate(remoteJid, [senderJid], 'remove')
                  .catch(() => {});
                continue;
              }
            } else {
              session.spamMap.set(spamKey, { signature: sig, keys: [msg.key] });
            }
          }
        }
      }

      const trimmed = text.trim();

      // Auto-react to all messages in groups where .autoreact on has been activated
      if (
        isGroup &&
        !isBotOwnSentMsg &&
        msg.key?.id &&
        !msg.message?.reactionMessage &&
        !msg.message?.protocolMessage
      ) {
        const gConf = getGroupConfig(session, remoteJid);
        const lowerTrimmed = trimmed.toLowerCase();
        const isMenuCmd = lowerTrimmed === '.menu' || lowerTrimmed.startsWith('.menu ');
        const isAutoReactToggleCmd =
          lowerTrimmed === '.autoreact' || lowerTrimmed.startsWith('.autoreact ');
        if (gConf.autoreact && !isMenuCmd && !isAutoReactToggleCmd) {
          const emoji = pickNextGroupAutoReactEmoji(remoteJid);
          sock
            .sendMessage(remoteJid, {
              react: {
                text: emoji,
                key: msg.key,
              },
            })
            .catch(() => {});
        }
      }

      if (!trimmed.startsWith('.')) {
        // If a user types the exact name of a command that the bot has (without the dot prefix),
        // show them how to use that command!
        const singleWord = trimmed.toLowerCase();
        if (
          !isBotOwnSentMsg &&
          singleWord &&
          /^[a-z0-9]+$/.test(singleWord) &&
          COMMAND_USAGE_GUIDE[singleWord] &&
          (session.botMode === 'public' || isOwner)
        ) {
          await sendCommandUsageGuide(sock, remoteJid, msg, singleWord).catch(() => {});
        }
        continue;
      }

      if (session.botMode === 'private' && !isOwner) {
        continue;
      }

      const parts = trimmed.slice(1).trim().split(/\s+/);
      const cmd = (parts[0] || '').toLowerCase();
      const args = parts.slice(1);
      const argText = args.join(' ').trim();

      // If user asks for usage of a specific command via .<cmd> ? or .<cmd> help or .help <cmd>
      if (
        (args.length === 1 && (args[0] === '?' || args[0].toLowerCase() === 'help') && COMMAND_USAGE_GUIDE[cmd]) ||
        (cmd === 'help' && args.length >= 1 && COMMAND_USAGE_GUIDE[args[0].toLowerCase().replace(/^\./, '')])
      ) {
        const targetCmd =
          cmd === 'help' ? args[0].toLowerCase().replace(/^\./, '') : cmd;
        session.commandsCount += 1;
        saveSessionMetadata(session);
        await sendCommandUsageGuide(sock, remoteJid, msg, targetCmd);
        continue;
      }

      try {
        // =========================================================================
        // 1. COMMAND: .menu (ONLY command that reacts with 🕸)
        // =========================================================================
        if (cmd === 'menu') {
          session.commandsCount += 1;
          saveSessionMetadata(session);

          await sock.sendMessage(remoteJid, {
            react: {
              text: '🕸',
              key: msg.key,
            },
          });

          const { time, date } = getEnglishSmallCapsTimeAndDate();
          const rawShort = (session.rawCode || session.sessionKey.replace(/[^a-zA-Z0-9]/g, ''))
            .slice(0, 4)
            .toLowerCase();
          const shortSessionId = `${toSmallCaps(rawShort)}...`;

          const menuText =
            `*╭▱▱─〇 ᴀʟʟɪssᴀ ᴍᴅ 〇─▱╮*\n` +
            `┃ ◉ ᴏᴡɴᴇʀ : sᴀᴍʏᴄʜᴀʀʟᴇs\n` +
            `┃ ◉ sᴇssɪᴏɴ ɪᴅ : ${shortSessionId}\n` +
            `┃ ◉ ʙᴏᴛ : ᴀʟʟɪssᴀ ᴍᴅ \n` +
            `┃ ◉ ɴᴜᴍʙᴇʀ : +${session.phone}\n` +
            `┃ ◉ ᴅᴀᴛᴇ : ${date}\n` +
            `┃ ◉ ᴛɪᴍᴇ : ${time}\n` +
            `*╰⬤╾╸(ᴍᴇɴᴜ ᴀʟʟɪssᴀ)─▱╯*\n\n` +
            `*╭▱▱─〇 (ᴏᴡɴᴇʀ) 〇─▱╮*\n` +
            `┃ ▢ ᴘʀɪᴠᴀᴛᴇ\n` +
            `┃ ▢ ᴘᴜʙʟɪᴄ\n` +
            `┃ ▢ sᴛᴀᴛᴜᴛs\n` +
            `┃ ▢ ᴀᴜᴛᴏsᴛᴀᴛᴜᴛ\n` +
            `┃ ▢ sᴛᴀᴛᴜᴛᴠɪᴇᴡᴀᴜᴛᴏ\n` +
            `┃ ▢ ᴀᴜᴅɪᴏsᴛᴀᴛᴜᴛ\n` +
            `┃ ▢ ᴀᴜᴛᴏʀᴇᴀᴄᴛ\n` +
            `┃ ▢ ᴡᴏᴡᴏɴʟʏ\n` +
            `┃ ▢ ɴᴇᴡsʟᴇᴛᴛᴇʀᴊɪᴅ \n` +
            `┃ ▢ ᴠᴠ\n` +
            `*╰⬤▱▱╾╸(ᴏᴡɴᴇʀ)─▱╯*\n\n` +
            `*╭▱▱─〇 (ɢʀᴏᴜᴘs) 〇─▱╮*\n` +
            `┃ ▢ ᴏᴘᴇɴ\n` +
            `┃ ▢ ᴄʟᴏsᴇ\n` +
            `┃ ▢ ᴏᴘᴇɴᴛɪᴍᴇ\n` +
            `┃ ▢ ᴄʟᴏsᴇᴛɪᴍᴇ\n` +
            `┃ ▢ ɢʀᴏᴜᴘsᴛᴀᴛᴜᴛs\n` +
            `┃ ▢ ᴀᴜᴅɪᴏsᴛᴀᴛᴜᴛ\n` +
            `┃ ▢ ᴛᴀɢᴀʟʟ\n` +
            `┃ ▢ ʜɪᴅᴇᴛᴀɢ\n` +
            `┃ ▢ ᴘʀᴏᴍᴏᴛᴇ\n` +
            `┃ ▢ ᴅᴇᴍᴏᴛᴇ\n` +
            `┃ ▢ ᴀᴅᴅ\n` +
            `┃ ▢ ɪɴᴠɪᴛᴇ\n` +
            `┃ ▢ ʀᴇᴠᴏᴋᴇ\n` +
            `┃ ▢ sᴇᴛɴᴀᴍᴇ\n` +
            `┃ ▢ sᴇᴛᴅᴇsᴄ\n` +
            `┃ ▢ sᴇᴛɢᴘᴘ\n` +
            `┃ ▢ ᴘᴏʟʟ\n` +
            `┃ ▢ ᴀɴᴛɪʟɪɴᴋ \n` +
            `┃ ▢ ᴀɴᴛɪsᴘᴀᴍ\n` +
            `┃ ▢ ᴀɴᴛɪʙᴏᴛs\n` +
            `┃ ▢ ᴀɴᴛɪᴅᴇʟᴇᴛᴇ\n` +
            `┃ ▢ ᴋɪᴄᴋᴀʟʟ\n` +
            `┃ ▢ ᴋɪᴄᴋ\n` +
            `┃ ▢ ᴍᴜᴛᴇ \n` +
            `┃ ▢ ᴜɴᴍᴜᴛᴇ\n` +
            `┃ ▢ ᴡᴇʟᴄᴏᴍᴇ\n` +
            `┃ ▢ ɢᴏᴏᴅʙʏᴇ\n` +
            `┃ ▢ ᴘᴜɢᴇ \n` +
            `┃ ▢ ᴀᴅᴍɪs \n` +
            `┃ ▢ ʙᴀɴ\n` +
            `┃ ▢ ᴜɴʙᴀɴ\n` +
            `┃ ▢ ᴡᴀʀɴ \n` +
            `┃ ▢ ᴜɴᴡᴀʀɴ\n` +
            `┃ ▢ ᴡᴀʀɴɪɴɢ \n` +
            `┃ ▢ ɢʀᴏᴜᴘɪɴғᴏ\n` +
            `*╰⬤▱▱╾╸(ɢʀᴏᴜᴘs)─▱╯*\n\n` +
            `${FUN_MENU_SECTION}\n\n` +
            `${DOWNLOAD_MENU_SECTION}\n\n` +
            `${UTILS_MENU_SECTION}\n\n` +
            `${ANIME_MENU_SECTION}`;

          const menuImgData = await getBotMenuImageBuffer();
          await sock.sendMessage(
            remoteJid,
            menuImgData.buffer
              ? {
                  image: menuImgData.buffer,
                  caption: menuText,
                  contextInfo: getNewsletterContextInfo(),
                }
              : {
                  text: menuText,
                  contextInfo: getNewsletterContextInfo(),
                }
          );
        }

        // =========================================================================
        // OWNER COMMANDS (No 🕸 reaction)
        // =========================================================================
        else if (cmd === 'private') {
          if (!isOwner) continue;
          session.commandsCount += 1;
          session.botMode = 'private';
          saveSessionMetadata(session);

          const replyText = toSmallCaps(
            'private mode is now activated 🕸 only you can use the bot.'
          );
          await sock.sendMessage(remoteJid, { text: replyText }, { quoted: msg });
        } else if (cmd === 'public') {
          if (!isOwner) continue;
          session.commandsCount += 1;
          session.botMode = 'public';
          saveSessionMetadata(session);

          const replyText = toSmallCaps(
            'public mode is now activated. everyone can use the bot.'
          );
          await sock.sendMessage(remoteJid, { text: replyText }, { quoted: msg });
        } else if (cmd === 'statuts' || cmd === 'statut' || cmd === 'status') {
          session.commandsCount += 1;
          saveSessionMetadata(session);

          const contextInfo =
            msg.message?.extendedTextMessage?.contextInfo ||
            msg.message?.imageMessage?.contextInfo ||
            msg.message?.videoMessage?.contextInfo;

          const quotedRaw = contextInfo?.quotedMessage;
          const quoted = unwrapQuotedMessage(quotedRaw);

          if (!quoted) {
            if (cmd === 'status') {
              const { time } = getEnglishSmallCapsTimeAndDate();
              const statusCard =
                `*╭▱▱─〇 (sᴛᴀᴛᴜs) 〇─▱╮*\n` +
                `┃ ◉ sᴛᴀᴛᴜs : ᴏɴʟʏ\n` +
                `┃ ◉ ᴍᴏᴅᴇ : ${toSmallCaps(session.botMode)}\n` +
                `┃ ◉ ᴀᴜᴛᴏ sᴛᴀᴛᴜs : ${session.autoStatusView ? 'ᴏɴ' : 'ᴏғғ'}\n` +
                `┃ ◉ ᴡᴏᴡᴏɴʟʏ : ${session.alwaysOnline ? 'ᴏɴ' : 'ᴏғғ'}\n` +
                `┃ ◉ ᴛɪᴍᴇ : ${time}\n` +
                `*╰⬤▱▱╾╸(ᴜᴛɪʟs)─▱╯*`;
              await sock.sendMessage(
                remoteJid,
                {
                  text: statusCard,
                },
                { quoted: msg }
              );
              continue;
            }
            await sock.sendMessage(
              remoteJid,
              {
                text: toSmallCaps('please reply to a user status with .statuts to download it'),
              },
              { quoted: msg }
            );
            continue;
          }

          const targetJid =
            remoteJid === 'status@broadcast'
              ? session.userJid || jidNormalizedUser(sock.user?.id || '')
              : remoteJid;

          const statusCaption = toSmallCaps('status downloaded by allissa md');

          if (quoted.imageMessage) {
            const buffer = await downloadQuotedMediaBuffer(quoted.imageMessage, 'image');
            const origCaption = quoted.imageMessage.caption
              ? `\n${toSmallCaps(quoted.imageMessage.caption)}`
              : '';
            await sock.sendMessage(
              targetJid,
              {
                image: buffer,
                caption: `${statusCaption}${origCaption}`,
                contextInfo: getNewsletterContextInfo(),
              },
              { quoted: msg }
            );
          } else if (quoted.videoMessage) {
            const buffer = await downloadQuotedMediaBuffer(quoted.videoMessage, 'video');
            const origCaption = quoted.videoMessage.caption
              ? `\n${toSmallCaps(quoted.videoMessage.caption)}`
              : '';
            await sock.sendMessage(
              targetJid,
              {
                video: buffer,
                caption: `${statusCaption}${origCaption}`,
                contextInfo: getNewsletterContextInfo(),
              },
              { quoted: msg }
            );
          } else if (quoted.audioMessage) {
            const buffer = await downloadQuotedMediaBuffer(quoted.audioMessage, 'audio');
            await sock.sendMessage(
              targetJid,
              {
                audio: buffer,
                mimetype: quoted.audioMessage.mimetype || 'audio/mp4',
                ptt: Boolean(quoted.audioMessage.ptt),
                contextInfo: getNewsletterContextInfo(),
              },
              { quoted: msg }
            );
          } else {
            const statusText =
              quoted.extendedTextMessage?.text || quoted.conversation || '';
            if (statusText) {
              await sock.sendMessage(
                targetJid,
                {
                  text: `${statusCaption}\n\n${toSmallCaps(statusText)}`,
                  contextInfo: getNewsletterContextInfo(),
                },
                { quoted: msg }
              );
            } else {
              await sock.sendMessage(
                targetJid,
                {
                  text: toSmallCaps('unsupported status format'),
                  contextInfo: getNewsletterContextInfo(),
                },
                { quoted: msg }
              );
            }
          }
        } else if (
          cmd === 'autostatut' ||
          cmd === 'autostatus' ||
          cmd === 'statutviewauto' ||
          cmd === 'statusviewauto' ||
          cmd === 'statutreact' ||
          cmd === 'statusreact' ||
          cmd === 'autolike'
        ) {
          if (!isOwner) continue;
          session.commandsCount += 1;

          if (args.length === 0) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }

          const lowerArgs = args.map((a: string) => a.toLowerCase());
          const isOff = lowerArgs.includes('off');

          if (isOff) {
            session.autoStatusView = false;
            session.autoStatusReactEmoji = '';
            saveSessionMetadata(session);
            await sock.sendMessage(
              remoteJid,
              { text: toSmallCaps('auto status view & reaction is now off.') },
              { quoted: msg }
            );
          } else {
            const nonKeywordArgs = args.filter(
              (a: string) => a.toLowerCase() !== 'on' && a.toLowerCase() !== 'off'
            );
            const chosenEmoji =
              nonKeywordArgs[0] || session.autoStatusReactEmoji || '❤️';

            session.autoStatusView = true;
            session.autoStatusReactEmoji = chosenEmoji;
            saveSessionMetadata(session);
            await sock.sendMessage(
              remoteJid,
              {
                text: toSmallCaps(
                  `auto status view & like is now on with ${chosenEmoji}. the bot will rapidly view and react to all contact statuses.`
                ),
              },
              { quoted: msg }
            );
          }
        } else if (
          cmd === 'audiostatut' ||
          cmd === 'audiostatus' ||
          cmd === 'tostatut' ||
          cmd === 'tostatus' ||
          cmd === 'upstatut' ||
          cmd === 'upstatus' ||
          cmd === 'swaudio' ||
          cmd === 'poststatut'
        ) {
          session.commandsCount += 1;
          saveSessionMetadata(session);

          const rootMsg = unwrapQuotedMessage(msg.message) || msg.message;
          const contextInfo =
            rootMsg?.extendedTextMessage?.contextInfo ||
            rootMsg?.audioMessage?.contextInfo ||
            msg.message?.extendedTextMessage?.contextInfo;

          const quotedInner = unwrapQuotedMessage(contextInfo?.quotedMessage);
          const cachedFullMsg = contextInfo?.stanzaId
            ? session.messageCache.get(contextInfo.stanzaId)
            : null;
          const cachedInner = cachedFullMsg?.message
            ? unwrapQuotedMessage(cachedFullMsg.message)
            : null;

          const audMsg =
            (quotedInner?.audioMessage?.mediaKey || quotedInner?.audioMessage?.url
              ? quotedInner.audioMessage
              : null) ||
            cachedInner?.audioMessage ||
            quotedInner?.audioMessage ||
            rootMsg?.audioMessage;

          if (!audMsg) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }

          const statusBgPalette = [
            '#1F2C34',
            '#0B3D2E',
            '#2E1A47',
            '#3D1C2E',
            '#1A365D',
            '#2D3748',
            '#4A154B',
          ];
          const chosenBg = statusBgPalette[Math.floor(Math.random() * statusBgPalette.length)];

          if (isGroup) {
            // In a group -> publish the replied audio as the Group Status
            let canPostGroupStatus = isOwner;
            if (!canPostGroupStatus) {
              try {
                const gMeta = await sock.groupMetadata(remoteJid);
                const senderNum = senderJid.split('@')[0]?.split(':')[0];
                const found = (gMeta.participants || []).find((p: any) => {
                  const pJid = jidNormalizedUser(p.id);
                  const pNum = pJid.split('@')[0]?.split(':')[0];
                  const pLid = p.lid ? jidNormalizedUser(p.lid) : '';
                  return (
                    pJid === senderJid ||
                    (senderNum && pNum === senderNum) ||
                    (pLid && pLid === senderJid)
                  );
                });
                if (found?.admin) canPostGroupStatus = true;
              } catch {
                // Ignore
              }
            }

            if (!canPostGroupStatus) {
              await sock.sendMessage(
                remoteJid,
                { text: toSmallCaps('only group admins can post a group audio status.') },
                { quoted: msg }
              );
              continue;
            }

            try {
              const buf = await downloadQuotedMediaBuffer({ ...audMsg, viewOnce: false }, 'audio');
              const innerMessage = await generateWAMessageContent(
                {
                  audio: buf,
                  mimetype: audMsg.mimetype || 'audio/ogg; codecs=opus',
                  ptt: true,
                  seconds: Number(audMsg.seconds) || 15,
                  waveform:
                    audMsg.waveform && audMsg.waveform.length > 0
                      ? audMsg.waveform
                      : new Uint8Array(64).fill(35),
                  contextInfo: { isGroupStatus: true } as any,
                } as any,
                {
                  upload: sock.waUploadToServer,
                  backgroundColor: chosenBg,
                } as any
              );
              delete innerMessage.messageContextInfo;

              const groupStatusWAMsg = generateWAMessageFromContent(
                remoteJid,
                {
                  messageContextInfo: {
                    messageSecret: randomBytes(32),
                  },
                  groupStatusMessageV2: {
                    message: innerMessage,
                  },
                } as any,
                {
                  userJid: session.userJid || jidNormalizedUser(sock.user?.id || ''),
                }
              );

              const relayPayload: any = {
                ...groupStatusWAMsg.message,
                ...(innerMessage.audioMessage ? { audioMessage: innerMessage.audioMessage } : {}),
              };

              await sock.relayMessage(remoteJid, relayPayload, {
                messageId: groupStatusWAMsg.key.id!,
              });

              await sock.sendMessage(
                remoteJid,
                { text: toSmallCaps('audio published as group status ✅') },
                { quoted: msg }
              );
            } catch {
              await sock.sendMessage(
                remoteJid,
                { text: toSmallCaps('unable to publish group audio status right now.') },
                { quoted: msg }
              );
            }
          } else {
            // In private chat -> publish the replied audio as the User's Personal Status (status@broadcast)
            if (!isOwner) continue;
            try {
              const buf = await downloadQuotedMediaBuffer({ ...audMsg, viewOnce: false }, 'audio');
              const statusJidList = await getStatusBroadcastJidList(session, sock);
              await sock.sendMessage(
                'status@broadcast',
                {
                  audio: buf,
                  mimetype: audMsg.mimetype || 'audio/ogg; codecs=opus',
                  ptt: true,
                  seconds: Number(audMsg.seconds) || 15,
                  waveform:
                    audMsg.waveform && audMsg.waveform.length > 0
                      ? audMsg.waveform
                      : new Uint8Array(64).fill(35),
                } as any,
                {
                  backgroundColor: chosenBg,
                  statusJidList,
                } as any
              );
              await sock.sendMessage(
                remoteJid,
                { text: toSmallCaps('audio published to your whatsapp status ✅') },
                { quoted: msg }
              );
            } catch {
              await sock.sendMessage(
                remoteJid,
                { text: toSmallCaps('unable to publish user audio status right now.') },
                { quoted: msg }
              );
            }
          }
        } else if (cmd === 'wowonly') {
          if (!isOwner) continue;
          session.commandsCount += 1;

          if (args.length === 0) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }

          const subArg = (args[0] || '').toLowerCase();
          if (subArg === 'off') {
            session.alwaysOnline = false;
            saveSessionMetadata(session);
            if (session.alwaysOnlineTimer) {
              clearInterval(session.alwaysOnlineTimer);
              session.alwaysOnlineTimer = undefined;
            }
            await sock.sendPresenceUpdate('unavailable').catch(() => {});
            await sock.sendMessage(
              remoteJid,
              { text: toSmallCaps('always online mode (wowonly) is now off') },
              { quoted: msg }
            );
          } else {
            session.alwaysOnline = true;
            saveSessionMetadata(session);
            if (session.alwaysOnlineTimer) {
              clearInterval(session.alwaysOnlineTimer);
            }
            await sock.sendPresenceUpdate('available').catch(() => {});
            session.alwaysOnlineTimer = setInterval(() => {
              sock.sendPresenceUpdate('available').catch(() => {});
            }, 10000);

            await sock.sendMessage(
              remoteJid,
              {
                text: toSmallCaps(
                  'always online mode (wowonly) is now on. your account will stay online even when you leave whatsapp.'
                ),
              },
              { quoted: msg }
            );
          }
        } else if (cmd === 'autoreact') {
          if (!isOwner) continue;
          session.commandsCount += 1;

          if (args.length === 0) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }

          if (!isGroup) {
            await sock.sendMessage(
              remoteJid,
              {
                text: toSmallCaps(
                  'type .autoreact on or .autoreact off inside the group where you want to activate or disable auto reactions.'
                ),
              },
              { quoted: msg }
            );
            continue;
          }

          const gConf = getGroupConfig(session, remoteJid);
          const subArg = (args[0] || '').toLowerCase();
          if (subArg === 'off' || subArg === 'disable' || subArg === '0') {
            gConf.autoreact = false;
            saveSessionMetadata(session);
            await sock.sendMessage(
              remoteJid,
              {
                text: toSmallCaps('auto react is now off in this group.'),
              },
              { quoted: msg }
            );
          } else {
            gConf.autoreact = true;
            saveSessionMetadata(session);
            const firstEmoji = pickNextGroupAutoReactEmoji(remoteJid);
            await sock
              .sendMessage(remoteJid, {
                react: {
                  text: firstEmoji,
                  key: msg.key,
                },
              })
              .catch(() => {});
            await sock.sendMessage(
              remoteJid,
              {
                text: toSmallCaps(
                  'auto react is now on in this group. the bot will react to all messages with different emojis.'
                ),
              },
              { quoted: msg }
            );
          }
        } else if (cmd === 'newsletterjid') {
          session.commandsCount += 1;
          saveSessionMetadata(session);

          let resolvedNewsletterJid: string | null = null;
          let resolvedChannelName: string | null = null;

          if (remoteJid.endsWith('@newsletter')) {
            resolvedNewsletterJid = remoteJid;
          }

          const contextInfo =
            msg.message?.extendedTextMessage?.contextInfo ||
            msg.message?.imageMessage?.contextInfo ||
            msg.message?.videoMessage?.contextInfo;

          if (!resolvedNewsletterJid && contextInfo) {
            const fwdInfo = (contextInfo as any).forwardedNewsletterMessageInfo;
            if (fwdInfo?.newsletterJid) {
              resolvedNewsletterJid = fwdInfo.newsletterJid;
              resolvedChannelName = fwdInfo.newsletterName || null;
            } else if (contextInfo.remoteJid?.endsWith('@newsletter')) {
              resolvedNewsletterJid = contextInfo.remoteJid;
            } else if (contextInfo.participant?.endsWith('@newsletter')) {
              resolvedNewsletterJid = contextInfo.participant;
            }

            const quotedMsg: any = unwrapQuotedMessage(contextInfo.quotedMessage);
            if (!resolvedNewsletterJid && quotedMsg) {
              const innerCtx =
                quotedMsg.extendedTextMessage?.contextInfo ||
                quotedMsg.imageMessage?.contextInfo ||
                quotedMsg.videoMessage?.contextInfo ||
                quotedMsg.documentMessage?.contextInfo;
              if (innerCtx?.forwardedNewsletterMessageInfo?.newsletterJid) {
                resolvedNewsletterJid =
                  innerCtx.forwardedNewsletterMessageInfo.newsletterJid;
                resolvedChannelName =
                  innerCtx.forwardedNewsletterMessageInfo.newsletterName || null;
              }
            }
          }

          const quotedText =
            contextInfo?.quotedMessage?.conversation ||
            contextInfo?.quotedMessage?.extendedTextMessage?.text ||
            contextInfo?.quotedMessage?.imageMessage?.caption ||
            contextInfo?.quotedMessage?.videoMessage?.caption ||
            '';
          const combinedSearchText = `${argText} ${quotedText}`.trim();

          if (!resolvedNewsletterJid && combinedSearchText) {
            const directJidMatch = combinedSearchText.match(/([0-9]+@newsletter)/i);
            if (directJidMatch && directJidMatch[1]) {
              resolvedNewsletterJid = directJidMatch[1];
            } else {
              const channelLinkMatch = combinedSearchText.match(
                /whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/i
              );
              const inviteCode =
                channelLinkMatch?.[1] ||
                (argText && /^[A-Za-z0-9_-]{10,40}$/.test(argText) ? argText : null);

              if (inviteCode) {
                try {
                  const meta = await sock.newsletterMetadata('invite', inviteCode);
                  if (meta?.id) {
                    resolvedNewsletterJid = meta.id;
                    resolvedChannelName = (meta as any).name || null;
                  }
                } catch {
                  // Ignore metadata lookup error
                }
              }
            }
          }

          if (resolvedNewsletterJid) {
            const responseMsg = resolvedChannelName
              ? `${toSmallCaps(resolvedChannelName)}\n${resolvedNewsletterJid}`
              : `${resolvedNewsletterJid}`;
            await sock.sendMessage(remoteJid, { text: responseMsg }, { quoted: msg });
          } else {
            await sock.sendMessage(
              remoteJid,
              {
                text: toSmallCaps(
                  'please reply to a channel message or provide a whatsapp channel / post link after .newsletterjid'
                ),
              },
              { quoted: msg }
            );
          }
        } else if (cmd === 'vv') {
          session.commandsCount += 1;
          saveSessionMetadata(session);

          const contextInfo =
            msg.message?.extendedTextMessage?.contextInfo ||
            msg.message?.imageMessage?.contextInfo ||
            msg.message?.videoMessage?.contextInfo;

          const quotedUnwrapped = unwrapQuotedMessage(contextInfo?.quotedMessage);
          const cachedFullMsg = contextInfo?.stanzaId
            ? session.messageCache.get(contextInfo.stanzaId)
            : null;
          const cachedUnwrapped = cachedFullMsg?.message
            ? unwrapQuotedMessage(cachedFullMsg.message)
            : null;

          const imgMsg =
            (quotedUnwrapped?.imageMessage?.mediaKey || quotedUnwrapped?.imageMessage?.url
              ? quotedUnwrapped.imageMessage
              : null) ||
            cachedUnwrapped?.imageMessage ||
            quotedUnwrapped?.imageMessage;

          const vidMsg =
            (quotedUnwrapped?.videoMessage?.mediaKey || quotedUnwrapped?.videoMessage?.url
              ? quotedUnwrapped.videoMessage
              : null) ||
            cachedUnwrapped?.videoMessage ||
            quotedUnwrapped?.videoMessage;

          const audMsg =
            (quotedUnwrapped?.audioMessage?.mediaKey || quotedUnwrapped?.audioMessage?.url
              ? quotedUnwrapped.audioMessage
              : null) ||
            cachedUnwrapped?.audioMessage ||
            quotedUnwrapped?.audioMessage;

          if (!imgMsg && !vidMsg && !audMsg) {
            await sock.sendMessage(remoteJid, {
              text: toSmallCaps('please reply to a view once photo, video or audio with .vv'),
              contextInfo: getNewsletterContextInfo(),
            });
            continue;
          }

          if (imgMsg) {
            const buffer = await downloadQuotedMediaBuffer(
              { ...imgMsg, viewOnce: false },
              'image'
            );
            const cap = imgMsg.caption ? toSmallCaps(imgMsg.caption) : undefined;
            await sock.sendMessage(remoteJid, {
              image: buffer,
              ...(cap ? { caption: cap } : {}),
              contextInfo: getNewsletterContextInfo(),
            });
          } else if (vidMsg) {
            const buffer = await downloadQuotedMediaBuffer(
              { ...vidMsg, viewOnce: false },
              'video'
            );
            const cap = vidMsg.caption ? toSmallCaps(vidMsg.caption) : undefined;
            await sock.sendMessage(remoteJid, {
              video: buffer,
              ...(cap ? { caption: cap } : {}),
              contextInfo: getNewsletterContextInfo(),
            });
          } else if (audMsg) {
            const buffer = await downloadQuotedMediaBuffer(
              { ...audMsg, viewOnce: false },
              'audio'
            );
            await sock.sendMessage(remoteJid, {
              audio: buffer,
              mimetype: audMsg.mimetype || 'audio/mp4',
              ptt: Boolean(audMsg.ptt),
              contextInfo: getNewsletterContextInfo(),
            });
          }
        }

        // =========================================================================
        // GROUP COMMANDS (No permission pre-check, no 🕸 reaction)
        // =========================================================================

        // .open — Open group immediately
        else if (cmd === 'open') {
          session.commandsCount += 1;
          await sock.groupSettingUpdate(remoteJid, 'not_announcement').catch(() => {});
          await sock.sendMessage(
            remoteJid,
            { text: toSmallCaps('the group is now open') },
            { quoted: msg }
          );
        }

        // .close — Close group immediately
        else if (cmd === 'close') {
          session.commandsCount += 1;
          await sock.groupSettingUpdate(remoteJid, 'announcement').catch(() => {});
          await sock.sendMessage(
            remoteJid,
            { text: toSmallCaps('the group is now closed') },
            { quoted: msg }
          );
        }

        // .opentime <minutes> — Schedule group open in X minutes
        else if (cmd === 'opentime') {
          session.commandsCount += 1;
          const minutes = parseInt(args[0] || '0', 10);
          if (!minutes || minutes <= 0) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }

          const timerKey = `open_${remoteJid}`;
          if (session.groupTimers.has(timerKey)) {
            clearTimeout(session.groupTimers.get(timerKey)!);
          }

          await sock.sendMessage(
            remoteJid,
            {
              text: toSmallCaps(`the group will open automatically in ${minutes} minutes`),
            },
            { quoted: msg }
          );

          const timer = setTimeout(async () => {
            session.groupTimers.delete(timerKey);
            await sock.groupSettingUpdate(remoteJid, 'not_announcement').catch(() => {});
            await sock
              .sendMessage(remoteJid, {
                text: toSmallCaps('the group is now open (opentime)'),
              })
              .catch(() => {});
          }, minutes * 60 * 1000);
          session.groupTimers.set(timerKey, timer);
        }

        // .closetime <minutes> — Schedule group close in X minutes
        else if (cmd === 'closetime') {
          session.commandsCount += 1;
          const minutes = parseInt(args[0] || '0', 10);
          if (!minutes || minutes <= 0) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }

          const timerKey = `close_${remoteJid}`;
          if (session.groupTimers.has(timerKey)) {
            clearTimeout(session.groupTimers.get(timerKey)!);
          }

          await sock.sendMessage(
            remoteJid,
            {
              text: toSmallCaps(`the group will close automatically in ${minutes} minutes`),
            },
            { quoted: msg }
          );

          const timer = setTimeout(async () => {
            session.groupTimers.delete(timerKey);
            await sock.groupSettingUpdate(remoteJid, 'announcement').catch(() => {});
            await sock
              .sendMessage(remoteJid, {
                text: toSmallCaps('the group is now closed (closetime)'),
              })
              .catch(() => {});
          }, minutes * 60 * 1000);
          session.groupTimers.set(timerKey, timer);
        }

        // .tagall — Mention all members with group photo & forwarded from channel
        else if (cmd === 'tagall') {
          session.commandsCount += 1;

          const meta = await sock.groupMetadata(remoteJid);
          const participants = meta.participants || [];
          const mentions = participants.map((p: any) => jidNormalizedUser(p.id));
          const tagLines = mentions
            .map((jid: string) => `┃ ❒ @${jid.split('@')[0]}`)
            .join('\n');

          const tagMessage =
            `*╭▱▱─〇 (ᴛᴀɢ) 〇─▱╮*\n` +
            `${tagLines}\n` +
            `*╰⬤▱▱╾╸(ɢʀᴏᴜᴘs)─▱╯*`;

          const groupPicBuf = await getGroupOrBotImageBuffer(sock, remoteJid);

          await sock.sendMessage(
            remoteJid,
            groupPicBuf
              ? {
                  image: groupPicBuf,
                  caption: tagMessage,
                  mentions,
                  contextInfo: getNewsletterContextInfo(undefined, undefined, mentions),
                }
              : {
                  text: tagMessage,
                  mentions,
                  contextInfo: getNewsletterContextInfo(undefined, undefined, mentions),
                }
          );
        }

        // .antilink on / off
        else if (cmd === 'antilink') {
          session.commandsCount += 1;
          if (args.length === 0) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }
          const gConf = getGroupConfig(session, remoteJid);
          const sub = (args[0] || '').toLowerCase();
          gConf.antilink = sub !== 'off';
          saveSessionMetadata(session);

          await sock.sendMessage(
            remoteJid,
            {
              text: toSmallCaps(
                gConf.antilink
                  ? 'antilink has been activated in this group. non-admin links will be deleted.'
                  : 'antilink is now off.'
              ),
            },
            { quoted: msg }
          );
        }

        // .antispam on / off
        else if (cmd === 'antispam') {
          session.commandsCount += 1;
          if (args.length === 0) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }
          const gConf = getGroupConfig(session, remoteJid);
          const sub = (args[0] || '').toLowerCase();
          gConf.antispam = sub !== 'off';
          saveSessionMetadata(session);

          await sock.sendMessage(
            remoteJid,
            {
              text: toSmallCaps(
                gConf.antispam
                  ? 'antispam has been activated. users sending the same message > 5 times will be removed.'
                  : 'antispam is now off.'
              ),
            },
            { quoted: msg }
          );
        }

        // .antibots / .antibot on / off
        else if (cmd === 'antibots' || cmd === 'antibot') {
          session.commandsCount += 1;
          if (args.length === 0) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }
          const gConf = getGroupConfig(session, remoteJid);
          const sub = (args[0] || '').toLowerCase();
          gConf.antibot = sub !== 'off';
          saveSessionMetadata(session);

          await sock.sendMessage(
            remoteJid,
            {
              text: toSmallCaps(
                gConf.antibot
                  ? 'antibots has been activated. detected bots will be muted for 30 minutes.'
                  : 'antibots is now off.'
              ),
            },
            { quoted: msg }
          );
        }

        // .antidelete on / off
        else if (cmd === 'antidelete') {
          session.commandsCount += 1;
          if (args.length === 0) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }
          const gConf = getGroupConfig(session, remoteJid);
          const sub = (args[0] || '').toLowerCase();
          gConf.antidelete = sub !== 'off';
          saveSessionMetadata(session);

          await sock.sendMessage(
            remoteJid,
            {
              text: toSmallCaps(
                gConf.antidelete
                  ? 'antidelete has been activated. deleted messages and media will be resent.'
                  : 'antidelete is now off.'
              ),
            },
            { quoted: msg }
          );
        }

        // .kickall — Progressively remove all non-admin members except the bot (silently)
        else if (cmd === 'kickall') {
          session.commandsCount += 1;

          const meta = await sock.groupMetadata(remoteJid);
          const botJid = session.userJid || jidNormalizedUser(sock.user?.id || '');
          const targets = (meta.participants || []).filter((p: any) => {
            const pJid = jidNormalizedUser(p.id);
            return !p.admin && pJid !== botJid;
          });

          for (const target of targets) {
            await sock
              .groupParticipantsUpdate(remoteJid, [target.id], 'remove')
              .catch(() => {});
            await new Promise((r) => setTimeout(r, 750));
          }
        }

        // .kick — Silently remove replied or mentioned user
        else if (cmd === 'kick') {
          session.commandsCount += 1;
          const targetJid = extractTargetUserJid(msg, args);
          if (!targetJid) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }
          await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'remove').catch(() => {});
        }

        // .mute — Silently remove user for 30 minutes then re-add them automatically
        else if (cmd === 'mute') {
          session.commandsCount += 1;
          const targetJid = extractTargetUserJid(msg, args);
          if (!targetJid) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }

          await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'remove').catch(() => {});

          const muteKey = `${remoteJid}_${targetJid}`;
          if (session.muteTimers.has(muteKey)) {
            clearTimeout(session.muteTimers.get(muteKey)!);
          }
          const timer = setTimeout(() => {
            sock.groupParticipantsUpdate(remoteJid, [targetJid], 'add').catch(() => {});
            session.muteTimers.delete(muteKey);
          }, 30 * 60 * 1000);
          session.muteTimers.set(muteKey, timer);
        }

        // .unmute — Silently re-add muted user back to the group
        else if (cmd === 'unmute') {
          session.commandsCount += 1;
          const targetJid = extractTargetUserJid(msg, args);
          if (!targetJid) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }

          const muteKey = `${remoteJid}_${targetJid}`;
          if (session.muteTimers.has(muteKey)) {
            clearTimeout(session.muteTimers.get(muteKey)!);
            session.muteTimers.delete(muteKey);
          }

          await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'add').catch(() => {});
        }

        // .welcome on / off
        else if (cmd === 'welcome') {
          session.commandsCount += 1;
          if (args.length === 0) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }
          const gConf = getGroupConfig(session, remoteJid);
          const sub = (args[0] || '').toLowerCase();
          gConf.welcome = sub !== 'off';
          saveSessionMetadata(session);

          await sock.sendMessage(
            remoteJid,
            {
              text: toSmallCaps(
                gConf.welcome
                  ? 'welcome messages are now on in this group'
                  : 'welcome messages are now off'
              ),
            },
            { quoted: msg }
          );
        }

        // .goodbye on / off
        else if (cmd === 'goodbye') {
          session.commandsCount += 1;
          if (args.length === 0) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }
          const gConf = getGroupConfig(session, remoteJid);
          const sub = (args[0] || '').toLowerCase();
          gConf.goodbye = sub !== 'off';
          saveSessionMetadata(session);

          await sock.sendMessage(
            remoteJid,
            {
              text: toSmallCaps(
                gConf.goodbye
                  ? 'goodbye messages are now on in this group'
                  : 'goodbye messages are now off'
              ),
            },
            { quoted: msg }
          );
        }

        // .puge / .purge — Delete recent messages in the group
        else if (cmd === 'puge' || cmd === 'purge') {
          session.commandsCount += 1;
          const count = Math.min(Math.max(parseInt(args[0] || '10', 10) || 10, 1), 50);
          const hist = session.groupMsgHistory.get(remoteJid) || [];
          const toDelete = hist.slice(-count);

          for (const key of toDelete) {
            await sock.sendMessage(remoteJid, { delete: key }).catch(() => {});
          }
          await sock.sendMessage(remoteJid, { delete: msg.key }).catch(() => {});
        }

        // .admis / .admins — Mention all group admins, or silently promote if a user is targeted
        else if (cmd === 'admis' || cmd === 'admins') {
          session.commandsCount += 1;

          const targetJid = extractTargetUserJid(msg, args);
          if (targetJid) {
            await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'promote').catch(() => {});
          } else {
            const meta = await sock.groupMetadata(remoteJid);
            const admins = (meta.participants || []).filter((p: any) => Boolean(p.admin));
            const adminMentions = admins.map((a: any) => jidNormalizedUser(a.id));
            const lines = adminMentions
              .map((jid: string) => `👑 @${jid.split('@')[0]}`)
              .join('\n');

            await sock.sendMessage(
              remoteJid,
              {
                text: lines || toSmallCaps('no admins found'),
                mentions: adminMentions,
              },
              { quoted: msg }
            );
          }
        }

        // .promote — Silently make user admin
        else if (cmd === 'promote') {
          session.commandsCount += 1;
          const targetJid = extractTargetUserJid(msg, args);
          if (!targetJid) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }
          await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'promote').catch(() => {});
        }

        // .demote — Silently demote admin to member
        else if (cmd === 'demote') {
          session.commandsCount += 1;
          const targetJid = extractTargetUserJid(msg, args);
          if (!targetJid) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }
          await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'demote').catch(() => {});
        }

        // .ban — Permanently ban and silently remove a user from the group
        else if (cmd === 'ban') {
          session.commandsCount += 1;
          const targetJid = extractTargetUserJid(msg, args);
          if (!targetJid) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }

          const gConf = getGroupConfig(session, remoteJid);
          if (!gConf.bannedUsers.includes(targetJid)) {
            gConf.bannedUsers.push(targetJid);
            saveSessionMetadata(session);
          }

          await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'remove').catch(() => {});
        }

        // .warn — Warn a user (3 warnings = automatic silent kick)
        else if (cmd === 'warn') {
          session.commandsCount += 1;
          const targetJid = extractTargetUserJid(msg, args);
          if (!targetJid) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }

          const gConf = getGroupConfig(session, remoteJid);
          const currentWarns = (gConf.warnings[targetJid] || 0) + 1;
          gConf.warnings[targetJid] = currentWarns;
          saveSessionMetadata(session);

          const num = targetJid.split('@')[0];
          if (currentWarns >= 3) {
            gConf.warnings[targetJid] = 0;
            saveSessionMetadata(session);
            await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'remove').catch(() => {});
          } else {
            await sock.sendMessage(
              remoteJid,
              {
                text: toSmallCaps(`warning added for @${num} (${currentWarns}/3)`),
                mentions: [targetJid],
              },
              { quoted: msg }
            );
          }
        }

        // .warning — View warning count for a user or the whole group
        else if (cmd === 'warning' || cmd === 'warnings') {
          session.commandsCount += 1;
          const gConf = getGroupConfig(session, remoteJid);
          const targetJid = extractTargetUserJid(msg, args);

          if (targetJid) {
            const count = gConf.warnings[targetJid] || 0;
            const num = targetJid.split('@')[0];
            await sock.sendMessage(
              remoteJid,
              {
                text: toSmallCaps(`@${num} currently has ${count}/3 warnings`),
                mentions: [targetJid],
              },
              { quoted: msg }
            );
          } else {
            const entries = Object.entries(gConf.warnings).filter(([, c]) => c > 0);
            if (entries.length === 0) {
              await sock.sendMessage(
                remoteJid,
                { text: toSmallCaps('no active warnings in this group') },
                { quoted: msg }
              );
            } else {
              const mentions = entries.map(([j]) => j);
              const lines = entries
                .map(([j, c]) => `⚠️ @${j.split('@')[0]} : ${c}/3`)
                .join('\n');
              await sock.sendMessage(
                remoteJid,
                {
                  text: lines,
                  mentions,
                },
                { quoted: msg }
              );
            }
          }
        }

        // .groupstatuts / .groupstatus / .gstatus / .upswgc / .swgc — Post a native WhatsApp Group Status (groupStatusMessageV2)
        // Allowed for Group Admins + the user connected to the bot (isOwner)
        else if (
          cmd === 'groupstatuts' ||
          cmd === 'groupstatus' ||
          cmd === 'gstatus' ||
          cmd === 'upswgc' ||
          cmd === 'swgc'
        ) {
          session.commandsCount += 1;
          saveSessionMetadata(session);

          if (!isGroup) {
            await sock.sendMessage(
              remoteJid,
              { text: toSmallCaps('this command can only be used inside a group.') },
              { quoted: msg }
            );
            continue;
          }

          let canPostGroupStatus = isOwner;
          if (!canPostGroupStatus) {
            try {
              const gMeta = await sock.groupMetadata(remoteJid);
              const senderNum = senderJid.split('@')[0]?.split(':')[0];
              const found = (gMeta.participants || []).find((p: any) => {
                const pJid = jidNormalizedUser(p.id);
                const pNum = pJid.split('@')[0]?.split(':')[0];
                const pLid = p.lid ? jidNormalizedUser(p.lid) : '';
                return (
                  pJid === senderJid ||
                  (senderNum && pNum === senderNum) ||
                  (pLid && pLid === senderJid)
                );
              });
              if (found?.admin) {
                canPostGroupStatus = true;
              }
            } catch {
              // Ignore metadata check error
            }
          }

          if (!canPostGroupStatus) {
            await sock.sendMessage(
              remoteJid,
              { text: toSmallCaps('only group admins can use .groupstatuts') },
              { quoted: msg }
            );
            continue;
          }

          const rootMsg = unwrapQuotedMessage(msg.message) || msg.message;
          const contextInfo =
            rootMsg?.extendedTextMessage?.contextInfo ||
            rootMsg?.imageMessage?.contextInfo ||
            rootMsg?.videoMessage?.contextInfo ||
            rootMsg?.audioMessage?.contextInfo ||
            msg.message?.extendedTextMessage?.contextInfo ||
            msg.message?.imageMessage?.contextInfo ||
            msg.message?.videoMessage?.contextInfo;

          const quotedInner = unwrapQuotedMessage(contextInfo?.quotedMessage);
          const cachedFullMsg = contextInfo?.stanzaId
            ? session.messageCache.get(contextInfo.stanzaId)
            : null;
          const cachedInner = cachedFullMsg?.message
            ? unwrapQuotedMessage(cachedFullMsg.message)
            : null;

          const imgMsg =
            (quotedInner?.imageMessage?.mediaKey || quotedInner?.imageMessage?.url
              ? quotedInner.imageMessage
              : null) ||
            cachedInner?.imageMessage ||
            quotedInner?.imageMessage ||
            rootMsg?.imageMessage;

          const vidMsg =
            (quotedInner?.videoMessage?.mediaKey || quotedInner?.videoMessage?.url
              ? quotedInner.videoMessage
              : null) ||
            cachedInner?.videoMessage ||
            quotedInner?.videoMessage ||
            rootMsg?.videoMessage;

          const audMsg =
            (quotedInner?.audioMessage?.mediaKey || quotedInner?.audioMessage?.url
              ? quotedInner.audioMessage
              : null) ||
            cachedInner?.audioMessage ||
            quotedInner?.audioMessage ||
            rootMsg?.audioMessage;

          const quotedText =
            quotedInner?.conversation ||
            quotedInner?.extendedTextMessage?.text ||
            quotedInner?.imageMessage?.caption ||
            quotedInner?.videoMessage?.caption ||
            cachedInner?.conversation ||
            cachedInner?.extendedTextMessage?.text ||
            cachedInner?.imageMessage?.caption ||
            cachedInner?.videoMessage?.caption ||
            '';

          const statusText = (argText || quotedText || '').trim();

          if (!imgMsg && !vidMsg && !audMsg && !statusText) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }

          const statusBgPalette = [
            '#1F2C34',
            '#0B3D2E',
            '#2E1A47',
            '#3D1C2E',
            '#1A365D',
            '#2D3748',
            '#4A154B',
          ];
          const chosenBg = statusBgPalette[Math.floor(Math.random() * statusBgPalette.length)];

          try {
            let innerMessage: any;
            if (imgMsg) {
              const buf = await downloadQuotedMediaBuffer({ ...imgMsg, viewOnce: false }, 'image');
              innerMessage = await generateWAMessageContent(
                {
                  image: buf,
                  ...(statusText ? { caption: statusText } : {}),
                  ...(imgMsg.jpegThumbnail ? { jpegThumbnail: imgMsg.jpegThumbnail } : {}),
                  ...(imgMsg.width ? { width: imgMsg.width } : {}),
                  ...(imgMsg.height ? { height: imgMsg.height } : {}),
                  contextInfo: { isGroupStatus: true } as any,
                },
                { upload: sock.waUploadToServer }
              );
            } else if (vidMsg) {
              const buf = await downloadQuotedMediaBuffer({ ...vidMsg, viewOnce: false }, 'video');
              innerMessage = await generateWAMessageContent(
                {
                  video: buf,
                  ...(statusText ? { caption: statusText } : {}),
                  ...(vidMsg.jpegThumbnail ? { jpegThumbnail: vidMsg.jpegThumbnail } : {}),
                  ...(vidMsg.width ? { width: vidMsg.width } : {}),
                  ...(vidMsg.height ? { height: vidMsg.height } : {}),
                  ...(vidMsg.seconds ? { seconds: vidMsg.seconds } : {}),
                  contextInfo: { isGroupStatus: true } as any,
                },
                { upload: sock.waUploadToServer }
              );
            } else if (audMsg) {
              const buf = await downloadQuotedMediaBuffer({ ...audMsg, viewOnce: false }, 'audio');
              innerMessage = await generateWAMessageContent(
                {
                  audio: buf,
                  mimetype: audMsg.mimetype || 'audio/ogg; codecs=opus',
                  ptt: true,
                  seconds: Number(audMsg.seconds) || 15,
                  waveform:
                    audMsg.waveform && audMsg.waveform.length > 0
                      ? audMsg.waveform
                      : new Uint8Array(64).fill(35),
                  contextInfo: { isGroupStatus: true } as any,
                } as any,
                {
                  upload: sock.waUploadToServer,
                  backgroundColor: chosenBg,
                } as any
              );
            } else {
              innerMessage = await generateWAMessageContent(
                {
                  text: statusText,
                  contextInfo: { isGroupStatus: true } as any,
                },
                {
                  backgroundColor: chosenBg,
                  font: 1,
                } as any
              );
            }

            delete innerMessage.messageContextInfo;

            const groupStatusWAMsg = generateWAMessageFromContent(
              remoteJid,
              {
                messageContextInfo: {
                  messageSecret: randomBytes(32),
                },
                groupStatusMessageV2: {
                  message: innerMessage,
                },
              } as any,
              {
                userJid: session.userJid || jidNormalizedUser(sock.user?.id || ''),
              }
            );

            // Include top-level media hint so relayMessage sets mediatype="image|video|ptt" on <enc>,
            // then patchMessageBeforeSending strips the top-level hint before proto encoding.
            const relayPayload: any = {
              ...groupStatusWAMsg.message,
              ...(innerMessage.imageMessage ? { imageMessage: innerMessage.imageMessage } : {}),
              ...(innerMessage.videoMessage ? { videoMessage: innerMessage.videoMessage } : {}),
              ...(innerMessage.audioMessage ? { audioMessage: innerMessage.audioMessage } : {}),
            };

            await sock.relayMessage(remoteJid, relayPayload, {
              messageId: groupStatusWAMsg.key.id!,
            });
          } catch {
            await sock.sendMessage(
              remoteJid,
              { text: toSmallCaps('unable to publish group status right now.') },
              { quoted: msg }
            );
          }
        }

        // .hidetag / .htag — Tag all group members silently without listing every @number
        else if (cmd === 'hidetag' || cmd === 'htag') {
          session.commandsCount += 1;
          saveSessionMetadata(session);

          const meta = await sock.groupMetadata(remoteJid);
          const participants = meta.participants || [];
          const mentions = participants.map((p: any) => jidNormalizedUser(p.id));

          const rawQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
          const quotedInner = unwrapQuotedMessage(rawQuoted);
          const quotedText =
            quotedInner?.conversation ||
            quotedInner?.extendedTextMessage?.text ||
            '';

          const textToSend = argText || quotedText || toSmallCaps('attention everyone');
          await sock.sendMessage(remoteJid, {
            text: textToSend,
            mentions,
          });
        }

        // .add — Silently add a user to the group by number or reply
        else if (cmd === 'add') {
          session.commandsCount += 1;
          const targetJid = extractTargetUserJid(msg, args);
          if (!targetJid) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }
          await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'add').catch(() => {});
        }

        // .invite / .linkgc / .grouplink — Send official WhatsApp group invite link from channel
        else if (cmd === 'invite' || cmd === 'linkgc' || cmd === 'grouplink') {
          session.commandsCount += 1;
          saveSessionMetadata(session);

          try {
            const code = await sock.groupInviteCode(remoteJid);
            const link = `https://chat.whatsapp.com/${code}`;
            const meta = await sock.groupMetadata(remoteJid);
            const card =
              `*╭▱▱─〇 (ɢʀᴏᴜᴘ ɪɴᴠɪᴛᴇ) 〇─▱╮*\n` +
              `┃ ◉ ɢʀᴏᴜᴘ : ${toSmallCaps(meta.subject || 'Group')}\n` +
              `┃ ◉ ʟɪɴᴋ : ${link}\n` +
              `*╰⬤▱▱╾╸(ɢʀᴏᴜᴘs)─▱╯*`;
            const groupPicBuf = await getGroupOrBotImageBuffer(sock, remoteJid);
            await sock.sendMessage(
              remoteJid,
              groupPicBuf
                ? {
                    image: groupPicBuf,
                    caption: card,
                    contextInfo: getNewsletterContextInfo(),
                  }
                : {
                    text: card,
                    contextInfo: getNewsletterContextInfo(),
                  }
            );
          } catch {
            await sock.sendMessage(
              remoteJid,
              { text: toSmallCaps('bot must be admin to get the group invite link.') },
              { quoted: msg }
            );
          }
        }

        // .revoke / .resetlink — Reset group invite link
        else if (cmd === 'revoke' || cmd === 'resetlink') {
          session.commandsCount += 1;
          saveSessionMetadata(session);

          try {
            await sock.groupRevokeInvite(remoteJid);
            await sock.sendMessage(
              remoteJid,
              { text: toSmallCaps('group invite link has been reset.') },
              { quoted: msg }
            );
          } catch {
            await sock.sendMessage(
              remoteJid,
              { text: toSmallCaps('bot must be admin to reset the invite link.') },
              { quoted: msg }
            );
          }
        }

        // .setname / .setsubject — Change the group name
        else if (cmd === 'setname' || cmd === 'setsubject') {
          session.commandsCount += 1;
          if (!argText) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }
          await sock.groupUpdateSubject(remoteJid, argText).catch(() => {});
          await sock.sendMessage(
            remoteJid,
            { text: toSmallCaps(`group name updated to: ${argText}`) },
            { quoted: msg }
          );
        }

        // .setdesc — Change the group description
        else if (cmd === 'setdesc') {
          session.commandsCount += 1;
          if (!argText) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }
          await sock.groupUpdateDescription(remoteJid, argText).catch(() => {});
          await sock.sendMessage(
            remoteJid,
            { text: toSmallCaps('group description has been updated.') },
            { quoted: msg }
          );
        }

        // .setgpp / .setppgc — Update group profile photo from replied image
        else if (cmd === 'setgpp' || cmd === 'setppgc') {
          session.commandsCount += 1;
          const rawQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
          const quotedInner = unwrapQuotedMessage(rawQuoted);
          const directInner = unwrapQuotedMessage(msg.message);
          const imgMsg = quotedInner?.imageMessage || directInner?.imageMessage;

          if (!imgMsg) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }

          try {
            const buf = await downloadQuotedMediaBuffer({ ...imgMsg, viewOnce: false }, 'image');
            await sock.updateProfilePicture(remoteJid, buf);
            await sock.sendMessage(
              remoteJid,
              { text: toSmallCaps('group profile photo updated.') },
              { quoted: msg }
            );
          } catch {
            await sock.sendMessage(
              remoteJid,
              { text: toSmallCaps('failed to update group photo (bot must be admin).') },
              { quoted: msg }
            );
          }
        }

        // .poll — Create a native WhatsApp Poll in the group (.poll Question | Option1 | Option2)
        else if (cmd === 'poll') {
          session.commandsCount += 1;
          const parts = String(argText)
            .split(/[|,/]/)
            .map((s: string) => s.trim())
            .filter(Boolean);
          if (parts.length < 3) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }
          const [pollQuestion, ...pollOptions] = parts;
          await sock.sendMessage(remoteJid, {
            poll: {
              name: pollQuestion,
              values: pollOptions.slice(0, 12),
              selectableCount: 1,
            },
          });
        }

        // .unban — Remove a user from the group banlist
        else if (cmd === 'unban') {
          session.commandsCount += 1;
          const targetJid = extractTargetUserJid(msg, args);
          if (!targetJid) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }
          const gConf = getGroupConfig(session, remoteJid);
          gConf.bannedUsers = gConf.bannedUsers.filter((u) => u !== targetJid);
          saveSessionMetadata(session);
          await sock.sendMessage(
            remoteJid,
            {
              text: toSmallCaps(`@${targetJid.split('@')[0]} has been unbanned.`),
              mentions: [targetJid],
            },
            { quoted: msg }
          );
        }

        // .unwarn / .resetwarn — Reset warnings for a user in the group
        else if (cmd === 'unwarn' || cmd === 'resetwarn') {
          session.commandsCount += 1;
          const targetJid = extractTargetUserJid(msg, args);
          if (!targetJid) {
            await sendCommandUsageGuide(sock, remoteJid, msg, cmd);
            continue;
          }
          const gConf = getGroupConfig(session, remoteJid);
          delete gConf.warnings[targetJid];
          saveSessionMetadata(session);
          await sock.sendMessage(
            remoteJid,
            {
              text: toSmallCaps(`warnings reset for @${targetJid.split('@')[0]} (0/3).`),
              mentions: [targetJid],
            },
            { quoted: msg }
          );
        }

        // .groupinfo — Complete Group Information Card with Description, Group Photo & Channel Forwarding
        else if (cmd === 'groupinfo' || cmd === 'ginfo') {
          session.commandsCount += 1;

          let groupSubject = 'Group';
          let groupDesc = '';
          let groupOwnerJid = '';
          let createdDateStr = '';
          let isClosed = false;
          let membersCount = 0;
          let adminsCount = 0;

          if (isGroup) {
            try {
              const meta = await sock.groupMetadata(remoteJid);
              groupSubject = meta.subject || 'Group';
              groupDesc = (meta.desc || '').trim();
              groupOwnerJid = meta.owner || meta.subjectOwner || '';
              if (meta.creation) {
                createdDateStr = toSmallCaps(
                  new Date(Number(meta.creation) * 1000).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                  })
                );
              }
              isClosed = Boolean(meta.announce);
              membersCount = (meta.participants || []).length;
              adminsCount = (meta.participants || []).filter((p: any) => Boolean(p.admin)).length;
              if (!groupOwnerJid) {
                const superAdm = (meta.participants || []).find(
                  (p: any) => p.admin === 'superadmin' || p.admin === 'admin'
                );
                if (superAdm?.id) groupOwnerJid = superAdm.id;
              }
            } catch {
              // Fallback
            }
          }
          const gConf = getGroupConfig(session, remoteJid);
          const normalizedOwner = groupOwnerJid ? jidNormalizedUser(groupOwnerJid) : '';
          const ownerNum = normalizedOwner ? normalizedOwner.split('@')[0] : '';
          const mentions = normalizedOwner ? [normalizedOwner] : [];

          const descFormatted = groupDesc
            ? groupDesc
                .split(/\r?\n/)
                .map((line) => `┃ ${toSmallCaps(line)}`)
                .join('\n')
            : `┃ ${toSmallCaps('no description')}`;

          const infoText =
            `*╭▱▱─〇 (ɢʀᴏᴜᴘɪɴғᴏ) 〇─▱╮*\n` +
            `┃ ◉ ɴᴀᴍᴇ : ${toSmallCaps(groupSubject)}\n` +
            `┃ ◉ ɪᴅ : ${remoteJid}\n` +
            (ownerNum ? `┃ ◉ ᴏᴡɴᴇʀ : @${ownerNum}\n` : '') +
            (createdDateStr ? `┃ ◉ ᴄʀᴇᴀᴛᴇᴅ : ${createdDateStr}\n` : '') +
            `┃ ◉ sᴛᴀᴛᴜs : ${isClosed ? 'ᴄʟᴏsᴇᴅ' : 'ᴏᴘᴇɴ'}\n` +
            `┃ ◉ ᴍᴇᴍʙᴇʀs : ${membersCount}\n` +
            `┃ ◉ ᴀᴅᴍɪs : ${adminsCount}\n` +
            `┃ ◉ ᴀɴᴛɪʟɪɴᴋ : ${gConf.antilink ? 'ᴏɴ' : 'ᴏғғ'}\n` +
            `┃ ◉ ᴀɴᴛɪsᴘᴀᴍ : ${gConf.antispam ? 'ᴏɴ' : 'ᴏғғ'}\n` +
            `┃ ◉ ᴀɴᴛɪʙᴏᴛs : ${gConf.antibot ? 'ᴏɴ' : 'ᴏғғ'}\n` +
            `┃ ◉ ᴀɴᴛɪᴅᴇʟᴇᴛᴇ : ${gConf.antidelete ? 'ᴏɴ' : 'ᴏғғ'}\n` +
            `┃ ◉ ᴡᴇʟᴄᴏᴍᴇ : ${gConf.welcome ? 'ᴏɴ' : 'ᴏғғ'}\n` +
            `┃ ◉ ɢᴏᴏᴅʙʏᴇ : ${gConf.goodbye ? 'ᴏɴ' : 'ᴏғғ'}\n` +
            `┃ ◉ ᴀᴜᴛᴏʀᴇᴀᴄᴛ : ${gConf.autoreact ? 'ᴏɴ' : 'ᴏғғ'}\n` +
            `┃ ◉ ᴅᴇsᴄʀɪᴘᴛɪᴏɴ :\n` +
            `${descFormatted}\n` +
            `*╰⬤▱▱╾╸(ɢʀᴏᴜᴘs)─▱╯*`;

          const groupPicBuf = await getGroupOrBotImageBuffer(sock, remoteJid);
          await sock.sendMessage(
            remoteJid,
            groupPicBuf
              ? {
                  image: groupPicBuf,
                  caption: infoText,
                  ...(mentions.length > 0 ? { mentions } : {}),
                  contextInfo: getNewsletterContextInfo(undefined, undefined, mentions),
                }
              : {
                  text: infoText,
                  ...(mentions.length > 0 ? { mentions } : {}),
                  contextInfo: getNewsletterContextInfo(undefined, undefined, mentions),
                }
          );
        }

        // =========================================================================
        // DOWNLOAD, ANIME & UTILS COMMANDS
        // =========================================================================
        else {
          const handledByDownload = await handleDownloadCommand({
            cmd,
            args,
            argText,
            msg,
            sock,
            session,
            remoteJid,
            toSmallCaps,
            getNewsletterContextInfo,
            fetchBufferFromUrl,
            getBotMenuImageBuffer,
            saveSessionMetadata,
          });
          if (!handledByDownload) {
            const handledByAnime = await handleAnimeCommand({
              cmd,
              args,
              argText,
              msg,
              sock,
              session,
              remoteJid,
              senderJid,
              toSmallCaps,
              getNewsletterContextInfo,
              fetchBufferFromUrl,
              getBotMenuImageBuffer,
              extractTargetUserJid,
              saveSessionMetadata,
            });
            if (!handledByAnime) {
              const handledByFun = await handleFunCommand({
                cmd,
                args,
                argText,
                msg,
                sock,
                session,
                remoteJid,
                senderJid,
                toSmallCaps,
                getNewsletterContextInfo,
                extractTargetUserJid,
                saveSessionMetadata,
              });
              if (!handledByFun) {
                await handleUtilsCommand({
                  cmd,
                  args,
                  argText,
                  msg,
                  sock,
                  session,
                  remoteJid,
                  senderJid,
                  isGroup,
                  serverStartTime,
                  toSmallCaps,
                  getEnglishSmallCapsTimeAndDate,
                  getNewsletterContextInfo,
                  fetchBufferFromUrl,
                  getBotMenuImageBuffer,
                  extractTargetUserJid,
                  saveSessionMetadata,
                  downloadQuotedMediaBuffer,
                  unwrapQuotedMessage,
                });
              }
            }
          }
        }
      } catch {
        // Ignore command execution error
      }
    }
  });

  if (isReconnect) {
    return null;
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Timeout waiting for WhatsApp handshake'));
      }
    }, 8000);

    const attemptPairing = async () => {
      if (settled) return;
      try {
        await new Promise((r) => setTimeout(r, 1800));
        if (settled) return;
        const code = await sock.requestPairingCode(session.phone);
        if (!settled && code) {
          settled = true;
          clearTimeout(timeout);
          resolve(code);
        }
      } catch (err) {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(err);
        }
      }
    };

    sock.ev.on('connection.update', (u) => {
      if (u.connection === 'connecting' || u.qr) {
        attemptPairing();
      }
    });

    setTimeout(() => {
      attemptPairing();
    }, 2200);
  });
}

async function restoreSavedSessions() {
  try {
    if (fs.existsSync(LEGACY_TMP_SESSIONS_ROOT)) {
      const tmpDirs = fs.readdirSync(LEGACY_TMP_SESSIONS_ROOT);
      for (const dirName of tmpDirs) {
        const srcDir = path.join(LEGACY_TMP_SESSIONS_ROOT, dirName);
        const credsFile = path.join(srcDir, 'creds.json');
        if (fs.existsSync(credsFile)) {
          try {
            const creds = JSON.parse(fs.readFileSync(credsFile, 'utf-8'));
            const meId: string = creds?.me?.id || '';
            const phone = meId.split(':')[0]?.split('@')[0] || dirName;
            const destDir = path.join(PERSISTENT_SESSIONS_ROOT, `session_${phone}`);
            if (!fs.existsSync(destDir)) {
              fs.cpSync(srcDir, destDir, { recursive: true });
            }
          } catch {
            // Ignore malformed creds
          }
        }
      }
    }
  } catch {
    // Ignore migration errors
  }

  try {
    if (!fs.existsSync(PERSISTENT_SESSIONS_ROOT)) return;
    const entries = fs.readdirSync(PERSISTENT_SESSIONS_ROOT);
    const latestByPhone = new Map<
      string,
      { dirPath: string; mtime: number; creds: any; meta: any }
    >();

    for (const entry of entries) {
      const dirPath = path.join(PERSISTENT_SESSIONS_ROOT, entry);
      const credsPath = path.join(dirPath, 'creds.json');
      if (!fs.existsSync(credsPath)) continue;

      try {
        const stat = fs.statSync(credsPath);
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
        const meId: string = creds?.me?.id || '';
        const isRegistered = Boolean(creds?.registered || meId);
        if (!isRegistered) continue;

        const metaPath = path.join(dirPath, 'jin-hee-meta.json');
        const meta = fs.existsSync(metaPath)
          ? JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
          : {};

        const phone =
          meta.phone || meId.split(':')[0]?.split('@')[0]?.replace(/[^0-9]/g, '') || entry;

        const existing = latestByPhone.get(phone);
        if (!existing || stat.mtimeMs > existing.mtime) {
          latestByPhone.set(phone, { dirPath, mtime: stat.mtimeMs, creds, meta });
        }
      } catch {
        // Ignore broken folder
      }
    }

    for (const [phone, info] of latestByPhone.entries()) {
      const sessionKey = info.meta.sessionKey || `session_${phone}`;
      const session: PairingSession = {
        sessionKey,
        phone,
        code: info.meta.code || 'LINKED',
        rawCode: info.meta.rawCode || 'LINKEDMD',
        status: 'connected',
        mode: 'baileys',
        botMode: info.meta.botMode || 'public',
        autoStatusView: Boolean(info.meta.autoStatusView),
        autoStatusReactEmoji: info.meta.autoStatusReactEmoji || '',
        alwaysOnline: Boolean(info.meta.alwaysOnline),
        groups: info.meta.groups || {},
        messageCache: new Map(),
        groupMsgHistory: new Map(),
        spamMap: new Map(),
        muteTimers: new Map(),
        groupTimers: new Map(),
        welcomeSent: info.meta.welcomeSent !== undefined ? Boolean(info.meta.welcomeSent) : true,
        channelWelcomeCounted: Boolean(info.meta.channelWelcomeCounted),
        telegramChatId: info.meta.telegramChatId ? Number(info.meta.telegramChatId) : undefined,
        telegramConnectedNotified:
          info.meta.telegramConnectedNotified !== undefined
            ? Boolean(info.meta.telegramConnectedNotified)
            : true,
        createdAt: info.meta.createdAt || Date.now(),
        connectedAt: info.meta.connectedAt || Date.now(),
        commandsCount: info.meta.commandsCount || 0,
        sessionDir: info.dirPath,
      };

      sessions.set(sessionKey, session);
      console.log(`[ᴊɪɴ ʜᴇᴇ ᴍᴅ] Auto-restoring WhatsApp session for +${phone}...`);
      startBaileysBotSession(session, true, true).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to restore sessions:', err);
  }
}

function gracefulShutdown() {
  stopTelegramBot();
  for (const session of sessions.values()) {
    try {
      clearSessionTimers(session);
      if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
      for (const t of session.muteTimers.values()) clearTimeout(t);
      for (const t of session.groupTimers.values()) clearTimeout(t);
      if (session.sock?.ws) {
        session.sock.ws.close();
      }
    } catch {
      // Ignore shutdown error
    }
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('uncaughtException', (err) => {
  console.error('[ᴀʟʟɪssᴀ ᴍᴅ] Uncaught exception (handled to keep bot online):', err?.message || err);
});
process.on('unhandledRejection', (reason: any) => {
  console.error('[ᴀʟʟɪssᴀ ᴍᴅ] Unhandled rejection (handled to keep bot online):', reason?.message || reason);
});

function startSessionHealthWatchdog() {
  setInterval(() => {
    for (const session of sessions.values()) {
      try {
        if (session.status === 'expired') continue;
        if (session.isReconnecting || session.reconnectTimer) continue;

        // If session is still waiting for initial pairing code entry (< 2.5 mins), do not interrupt it
        if (
          (session.status === 'initializing' || session.status === 'code_ready') &&
          Date.now() - session.createdAt < 150000
        ) {
          continue;
        }

        const credsPath = path.join(session.sessionDir, 'creds.json');
        if (!fs.existsSync(credsPath)) continue;

        const isWsOpen = Boolean(session.sock?.ws?.isOpen);
        if (!isWsOpen) {
          scheduleSessionReconnect(session, 1000);
        }
      } catch {
        // Ignore watchdog iteration error
      }
    }
  }, 20000);
}

function toTelegramSessionInfo(s: PairingSession): TelegramBotSessionInfo {
  return {
    sessionKey: s.sessionKey,
    phone: s.phone,
    code: s.code,
    rawCode: s.rawCode,
    status: s.status,
    botMode: s.botMode,
    autoStatusView: s.autoStatusView,
    autoStatusReactEmoji: s.autoStatusReactEmoji || '❤️',
    alwaysOnline: s.alwaysOnline,
    sessionId: s.sessionId,
    userName: s.userName,
    createdAt: s.createdAt,
    connectedAt: s.connectedAt,
    commandsCount: s.commandsCount,
    telegramChatId: s.telegramChatId,
  };
}

async function createPairingForPhone(
  cleanPhone: string,
  customCode?: string,
  telegramChatId?: number
) {
  for (const [key, existing] of sessions.entries()) {
    if (existing.phone === cleanPhone) {
      clearSessionTimers(existing);
      if (existing.reconnectTimer) clearTimeout(existing.reconnectTimer);
      cleanupOldSocket(existing.sock);
      sessions.delete(key);
    }
  }

  const sessionKey = `session_${cleanPhone}`;
  const sessionDir = path.join(PERSISTENT_SESSIONS_ROOT, `${sessionKey}_${Date.now()}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  const session: PairingSession = {
    sessionKey,
    phone: cleanPhone,
    code: '',
    rawCode: '',
    status: 'initializing',
    mode: 'baileys',
    botMode: 'public',
    autoStatusView: false,
    alwaysOnline: false,
    groups: {},
    messageCache: new Map(),
    groupMsgHistory: new Map(),
    spamMap: new Map(),
    muteTimers: new Map(),
    groupTimers: new Map(),
    createdAt: Date.now(),
    commandsCount: 0,
    telegramChatId,
    telegramConnectedNotified: false,
    sessionDir,
  };
  sessions.set(sessionKey, session);
  saveSessionMetadata(session);

  let rawCode = '';
  try {
    const baileysCode = await startBaileysBotSession(session, false, false);
    if (baileysCode) {
      rawCode = baileysCode.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    }
  } catch {
    session.mode = 'simulated';
  }

  if (!rawCode || rawCode.length !== 8) {
    rawCode = generateCrockfordCode(customCode);
  }

  const formatted = formatPairingCode(rawCode);
  session.rawCode = rawCode;
  session.code = formatted;
  session.status = 'code_ready';
  saveSessionMetadata(session);

  return {
    sessionKey,
    phone: cleanPhone,
    code: formatted,
    rawCode,
    mode: session.mode,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  await refreshBaileysVersionCache();
  setInterval(() => {
    refreshBaileysVersionCache().catch(() => {});
  }, 6 * 60 * 60 * 1000);

  getBotImageBuffer().catch(() => {});
  getBotMenuImageBuffer().catch(() => {});
  restoreSavedSessions().catch(() => {});
  startSessionHealthWatchdog();

  startTelegramBot({
    createPairingForPhone,
    getAllSessions: () => Array.from(sessions.values()).map(toTelegramSessionInfo),
    getSessionByPhone: (phone: string) => {
      const clean = phone.replace(/[^0-9]/g, '');
      for (const s of sessions.values()) {
        if (s.phone === clean) return toTelegramSessionInfo(s);
      }
      return undefined;
    },
    reconnectSessionByPhone: async (phone: string) => {
      const clean = phone.replace(/[^0-9]/g, '');
      for (const s of sessions.values()) {
        if (s.phone === clean) {
          scheduleSessionReconnect(s, 500);
          return true;
        }
      }
      return false;
    },
    disconnectSessionByPhone: async (phone: string) => {
      const clean = phone.replace(/[^0-9]/g, '');
      for (const [key, s] of sessions.entries()) {
        if (s.phone === clean) {
          clearSessionTimers(s);
          if (s.reconnectTimer) clearTimeout(s.reconnectTimer);
          cleanupOldSocket(s.sock);
          s.status = 'expired';
          saveSessionMetadata(s);
          sessions.delete(key);
          return true;
        }
      }
      return false;
    },
    restoreSessionFromInput: async (sessionInput: string, telegramChatId?: number) => {
      const trimmed = sessionInput.trim();
      // Case 1: Compact Session ID (ALLISSA-MD~<phone>~<hash>)
      if (trimmed.startsWith('ALLISSA-MD~')) {
        const parts = trimmed.split('~');
        if (parts.length >= 3) {
          const phone = parts[1].replace(/[^0-9]/g, '');
          for (const s of sessions.values()) {
            if (s.phone === phone) {
              const expected = makeCompactSessionToken(s.phone, s.sessionId);
              if (expected === trimmed || s.phone === phone) {
                if (telegramChatId) s.telegramChatId = telegramChatId;
                saveSessionMetadata(s);
                scheduleSessionReconnect(s, 500);
                return { ok: true, phone: s.phone };
              }
            }
          }
        }
      }

      // Case 2: Base64 Creds Session ID (JIN-HEE-MD~<base64> or ALLISSA-MD~<base64>)
      const tildeIdx = trimmed.indexOf('~');
      if (tildeIdx !== -1) {
        const b64Part = trimmed.slice(tildeIdx + 1).trim();
        try {
          const decoded = Buffer.from(b64Part, 'base64').toString('utf-8');
          const creds = JSON.parse(decoded);
          const meId: string = creds?.me?.id || '';
          const phone = meId.split(':')[0]?.split('@')[0]?.replace(/[^0-9]/g, '');
          if (phone && phone.length >= 7) {
            const sessionKey = `session_${phone}`;
            const sessionDir = path.join(PERSISTENT_SESSIONS_ROOT, `${sessionKey}_${Date.now()}`);
            fs.mkdirSync(sessionDir, { recursive: true });
            fs.writeFileSync(path.join(sessionDir, 'creds.json'), decoded, 'utf-8');

            const session: PairingSession = {
              sessionKey,
              phone,
              code: 'RESTORED',
              rawCode: 'RESTORED',
              status: 'connected',
              mode: 'baileys',
              botMode: 'public',
              autoStatusView: false,
              alwaysOnline: false,
              groups: {},
              messageCache: new Map(),
              groupMsgHistory: new Map(),
              spamMap: new Map(),
              muteTimers: new Map(),
              groupTimers: new Map(),
              createdAt: Date.now(),
              connectedAt: Date.now(),
              commandsCount: 0,
              welcomeSent: true,
              telegramChatId,
              telegramConnectedNotified: false,
              sessionDir,
            };
            sessions.set(sessionKey, session);
            saveSessionMetadata(session);
            startBaileysBotSession(session, true, false).catch(() => {});
            return { ok: true, phone };
          }
        } catch {
          // Invalid base64 JSON
        }
      }

      return {
        ok: false,
        error: 'Session ID introuvable ou invalide.',
      };
    },
    getUserProfilePicture: async (phone: string) => {
      const clean = phone.replace(/[^0-9]/g, '');
      for (const s of sessions.values()) {
        if (s.phone === clean) {
          return await getUserOrBotProfileImageBuffer(s);
        }
      }
      const fallback = await getBotImageBuffer();
      return fallback.buffer;
    },
    updateSessionSettings: async (phone: string, patch) => {
      const clean = phone.replace(/[^0-9]/g, '');
      for (const s of sessions.values()) {
        if (s.phone === clean) {
          if (patch.botMode !== undefined) s.botMode = patch.botMode;
          if (patch.autoStatusView !== undefined) s.autoStatusView = patch.autoStatusView;
          if (patch.autoStatusReactEmoji !== undefined) {
            s.autoStatusReactEmoji = patch.autoStatusReactEmoji;
          }
          if (patch.alwaysOnline !== undefined) {
            s.alwaysOnline = patch.alwaysOnline;
            if (s.alwaysOnlineTimer) {
              clearInterval(s.alwaysOnlineTimer);
              s.alwaysOnlineTimer = undefined;
            }
            if (s.alwaysOnline && s.sock && s.status === 'connected') {
              s.sock.sendPresenceUpdate('available').catch(() => {});
              s.alwaysOnlineTimer = setInterval(() => {
                s.sock?.sendPresenceUpdate('available').catch(() => {});
              }, 15000);
            }
          }
          saveSessionMetadata(s);
          return toTelegramSessionInfo(s);
        }
      }
      return undefined;
    },
    postWhatsAppTextStatus: async (phone: string, text: string) => {
      const clean = phone.replace(/[^0-9]/g, '');
      for (const s of sessions.values()) {
        if (s.phone === clean && s.status === 'connected' && s.sock) {
          try {
            const jidList = await getStatusBroadcastJidList(s, s.sock);
            await s.sock.sendMessage(
              'status@broadcast',
              { text },
              {
                backgroundColor: '#121826',
                font: 1,
                statusJidList: jidList,
              } as any
            );
            return true;
          } catch {
            return false;
          }
        }
      }
      return false;
    },
    sendTestWhatsAppMessage: async (phone: string) => {
      const clean = phone.replace(/[^0-9]/g, '');
      for (const s of sessions.values()) {
        if (s.phone === clean && s.status === 'connected' && s.sock) {
          try {
            const selfJid = s.userJid || jidNormalizedUser(s.sock.user?.id || `${s.phone}@s.whatsapp.net`);
            const { time, date } = getEnglishSmallCapsTimeAndDate();
            const testMsg =
              `╭▱▱ ᴀʟʟɪssᴀ ᴍᴅ ▱▱▱▱▱ \n` +
              `┃ ◉ ʙᴏᴛ : ᴀʟʟɪssᴀ ᴍᴅ\n` +
              `┃ ◉ sᴛᴀᴛᴜs : ᴄᴏɴɴᴇᴄᴛᴇᴅ 🕸\n` +
              `┃ ◉ ᴍᴏᴅᴇ : ${toSmallCaps(s.botMode)}\n` +
              `┃ ◉ ᴏᴡɴᴇʀ : sᴀᴍʏᴄʜᴀʀʟᴇs\n` +
              `┃ ◉ ᴅᴀᴛᴇ : ${date}\n` +
              `┃ ◉ ᴛɪᴍᴇ : ${time}\n` +
              `╰▱▱▱▱▱▱▱▱▱▱▱▱`;
            await s.sock.sendMessage(selfJid, {
              text: testMsg,
              contextInfo: getNewsletterContextInfo(),
            });
            return true;
          } catch {
            return false;
          }
        }
      }
      return false;
    },
    getServerStats: () => {
      const all = Array.from(sessions.values());
      const connected = all.filter((s) => s.status === 'connected').length;
      const totalCmds = all.reduce((acc, s) => acc + (s.commandsCount || 0), 0);
      const memMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
      return {
        uptimeMs: Date.now() - serverStartTime,
        totalConnected: connected,
        totalSessions: all.length,
        totalCommands: totalCmds,
        memoryMb: memMb,
      };
    },
  }).catch((err) => {
    console.error('[TelegramBot] Startup error:', err?.message || err);
  });

  app.post('/api/pair', async (req, res) => {
    try {
      const { phone, customCode } = req.body as { phone?: string; customCode?: string };
      const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

      if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 15) {
        res.status(400).json({
          success: false,
          error: 'Please enter a valid WhatsApp phone number with country code (7 to 15 digits).',
        });
        return;
      }

      const result = await createPairingForPhone(cleanPhone, customCode);

      res.json({
        success: true,
        sessionKey: result.sessionKey,
        phone: result.phone,
        code: result.code,
        rawCode: result.rawCode,
        mode: result.mode,
        expiresInSeconds: 120,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error?.message || 'Error generating pairing code.',
      });
    }
  });

  app.get('/api/session/:sessionKey', (req, res) => {
    const session = sessions.get(req.params.sessionKey);
    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    res.json({
      success: true,
      sessionKey: session.sessionKey,
      phone: session.phone,
      code: session.code,
      rawCode: session.rawCode,
      status: session.status,
      mode: session.mode,
      botMode: session.botMode,
      autoStatusView: session.autoStatusView,
      alwaysOnline: session.alwaysOnline,
      sessionId: session.sessionId || null,
      userName: session.userName || null,
      userJid: session.userJid || null,
      createdAt: session.createdAt,
      connectedAt: session.connectedAt || null,
      commandsCount: session.commandsCount,
    });
  });

  app.get('/api/status', (_req, res) => {
    const connectedSessions = Array.from(sessions.values())
      .filter((s) => s.status === 'connected')
      .map((s) => ({
        sessionKey: s.sessionKey,
        phone: s.phone,
        userName: s.userName || 'WhatsApp User',
        botMode: s.botMode,
        autoStatusView: s.autoStatusView,
        autoStatusReactEmoji: s.autoStatusReactEmoji || null,
        alwaysOnline: s.alwaysOnline,
        connectedAt: s.connectedAt || s.createdAt,
        commandsCount: s.commandsCount || 0,
        sessionId: s.sessionId || null,
      }));

    res.json({
      botName: 'ᴀʟʟɪssᴀ ᴍᴅ',
      owner: 'sᴀᴍʏᴄʜᴀʀʟᴇs',
      version: '2.6.0-MD',
      uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
      activeCount: connectedSessions.length,
      connectedSessions,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ᴊɪɴ ʜᴇᴇ ᴍᴅ Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
