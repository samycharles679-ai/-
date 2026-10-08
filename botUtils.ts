import sharp from 'sharp';
// @ts-expect-error node-webpmux does not ship TypeScript definitions
import WebP from 'node-webpmux';

export const UTILS_MENU_SECTION =
  `*╭▱▱─〇 (ᴜᴛɪʟs) 〇─▱╮*\n` +
  `┃ ▢ ʜᴇʟᴘ\n` +
  `┃ ▢ ᴍᴇɴᴜ\n` +
  `┃ ▢ ᴘɪɴɢ\n` +
  `┃ ▢ ᴜᴘᴛɪᴍᴇ\n` +
  `┃ ▢ sᴛᴀᴛᴜs\n` +
  `┃ ▢ ɪɴғᴏ\n` +
  `┃ ▢ ᴜsᴇʀɪɴғᴏ\n` +
  `┃ ▢ ɢʀᴏᴜᴘɪɴғᴏ\n` +
  `┃ ▢ ᴍʏɪᴅ\n` +
  `┃ ▢ ɪᴅ\n` +
  `┃ ▢ ᴀᴠᴀᴛᴀʀ\n` +
  `┃ ▢ ᴘᴘ\n` +
  `┃ ▢ ɢᴄᴄ\n` +
  `┃ ▢ ʙɪᴏ\n` +
  `┃ ▢ ᴊᴏɪɴᴅᴀᴛᴇ\n` +
  `┃ ▢ ᴛɪᴍᴇ\n` +
  `┃ ▢ ᴅᴀᴛᴇ\n` +
  `┃ ▢ ᴛɪᴍᴇᴢᴏɴᴇ\n` +
  `┃ ▢ ᴄᴀʟᴄ\n` +
  `┃ ▢ ᴄᴏᴜɴᴛ\n` +
  `┃ ▢ ᴡᴏʀᴅᴄᴏᴜɴᴛ\n` +
  `┃ ▢ ᴄʜᴀʀᴄᴏᴜɴᴛ\n` +
  `┃ ▢ ʀᴇᴠᴇʀsᴇ\n` +
  `┃ ▢ ᴜᴘᴘᴇʀ\n` +
  `┃ ▢ ʟᴏᴡᴇʀ\n` +
  `┃ ▢ ᴄᴀᴘɪᴛᴀʟɪᴢᴇ\n` +
  `┃ ▢ ғᴏɴᴛ\n` +
  `┃ ▢ sᴛʏʟᴇ\n` +
  `┃ ▢ ᴇᴍᴏᴊɪ\n` +
  `┃ ▢ sʏᴍʙᴏʟ\n` +
  `┃ ▢ ᴛʀᴀɴsʟᴀᴛᴇ\n` +
  `┃ ▢ ᴅᴇᴛᴇᴄᴛ\n` +
  `┃ ▢ ᴅɪᴄᴛ\n` +
  `┃ ▢ ᴅᴇғɪɴᴇ\n` +
  `┃ ▢ ᴡʜᴏɪs\n` +
  `┃ ▢ ᴜʀʟɪɴғᴏ\n` +
  `┃ ▢ ʟɪɴᴋ\n` +
  `┃ ▢ sʜᴏʀᴛ\n` +
  `┃ ▢ ǫʀ\n` +
  `┃ ▢ ʙᴀʀᴄᴏᴅᴇ\n` +
  `┃ ▢ ʙᴀsᴇ64\n` +
  `┃ ▢ ᴇɴᴄᴏᴅᴇ\n` +
  `┃ ▢ ᴅᴇᴄᴏᴅᴇ\n` +
  `┃ ▢ ᴊsᴏɴ\n` +
  `┃ ▢ ᴛᴇxᴛ\n` +
  `┃ ▢ ᴇᴄʜᴏ\n` +
  `┃ ▢ ʀᴇᴘᴇᴀᴛ\n` +
  `┃ ▢ ᴛʀɪᴍ\n` +
  `┃ ▢ sᴘᴀᴄᴇ\n` +
  `┃ ▢ ʀᴇᴘʟᴀᴄᴇ\n` +
  `┃ ▢ ᴛʀɪᴍᴇ\n` +
  `┃ ▢ ᴜɴɪx\n` +
  `┃ ▢ ᴛɪᴍᴇsᴛᴀᴍᴘ\n` +
  `┃ ▢ ᴄᴏɴᴠᴇʀᴛ\n` +
  `┃ ▢ ᴜɴɪᴛs\n` +
  `┃ ▢ ᴄᴜʀʀᴇɴᴄʏ\n` +
  `┃ ▢ ᴜᴘᴅᴀᴛᴇ\n` +
  `┃ ▢ ᴄʜᴇᴄᴋ\n` +
  `┃ ▢ ᴛᴇsᴛ\n` +
  `┃ ▢ ʟᴀᴛᴇɴᴄʏ\n` +
  `┃ ▢ ʀᴇᴘᴏʀᴛ\n` +
  `┃ ▢ sᴜᴘᴘᴏʀᴛ\n` +
  `┃ ▢ ᴄᴏɴᴛᴀᴄᴛ\n` +
  `┃ ▢ ᴄᴏᴍᴍᴀɴᴅs\n` +
  `┃ ▢ ᴠᴇʀsɪᴏɴ\n` +
  `┃ ▢ ᴘʀᴇғɪx\n` +
  `┃ ▢ ᴘʀᴏғɪʟᴇ\n` +
  `┃ ▢ sᴇᴛᴛɪɴɢs\n` +
  `┃ ▢ ʟᴀɴɢ\n` +
  `┃ ▢ ʟᴏɢ\n` +
  `┃ ▢ ᴄʟᴇᴀʀ\n` +
  `┃ ▢ ᴅᴇʟᴇᴛᴇ\n` +
  `┃ ▢ ᴘᴜʀɢᴇ\n` +
  `┃ ▢ ᴘɪɴ\n` +
  `┃ ▢ ᴜɴᴘɪɴ\n` +
  `┃ ▢ s\n` +
  `*╰⬤▱▱╾╸(ᴜᴛɪʟs)─▱╯*`;

async function createAllissaSticker(inputBuffer: Buffer): Promise<Buffer> {
  const webpBuffer = await sharp(inputBuffer)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 90 })
    .toBuffer();

  const img = new WebP.Image();
  await img.load(webpBuffer);

  const stickerMeta = {
    'sticker-pack-id': 'allissa-md-pack',
    'sticker-pack-name': 'ᴀʟʟɪssᴀ ᴍᴅ',
    'sticker-pack-publisher': '',
    emojis: ['✨'],
  };

  const exifHeader = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);
  const jsonBytes = Buffer.from(JSON.stringify(stickerMeta), 'utf-8');
  const exifBuffer = Buffer.concat([exifHeader, jsonBytes]);
  exifBuffer.writeUIntLE(jsonBytes.length, 14, 4);

  img.exif = exifBuffer;
  return await img.save(null);
}

// ONLY these utils commands come from the channel (120363412335206247@newsletter):
// ping, uptime, userinfo, groupinfo (handled in server.ts), info, avatar, pp, gcc / gcpp, qr, prefix
const CHANNEL_UTILS_CMDS = new Set([
  'ping',
  'uptime',
  'userinfo',
  'groupinfo',
  'ginfo',
  'info',
  'avatar',
  'pp',
  'gcc',
  'gcpp',
  'qr',
  'prefix',
]);

const PING_IMAGE_URL = 'https://imgg.fr/r/J1NmPZVM.jpg';
let cachedPingImageBuffer: Buffer | undefined;

async function getPingImageBuffer(
  fetchBufferFromUrl: (url: string) => Promise<Buffer | undefined>
): Promise<Buffer | undefined> {
  if (cachedPingImageBuffer) return cachedPingImageBuffer;
  const buf = await fetchBufferFromUrl(PING_IMAGE_URL);
  if (buf && buf.length > 0) {
    cachedPingImageBuffer = buf;
  }
  return cachedPingImageBuffer;
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(1, Math.floor(ms / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function getQuotedOrArgText(msg: any, argText: string): string {
  if (argText) return argText;
  const ctx =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo;
  const q = ctx?.quotedMessage;
  if (!q) return '';
  return (
    q.conversation ||
    q.extendedTextMessage?.text ||
    q.imageMessage?.caption ||
    q.videoMessage?.caption ||
    ''
  ).trim();
}

export async function handleUtilsCommand(params: {
  cmd: string;
  args: string[];
  argText: string;
  msg: any;
  sock: any;
  session: any;
  remoteJid: string;
  senderJid: string;
  isGroup: boolean;
  serverStartTime: number;
  toSmallCaps: (s: string) => string;
  getEnglishSmallCapsTimeAndDate: () => { time: string; date: string };
  getNewsletterContextInfo: (thumb?: Buffer, url?: string, mentions?: string[]) => any;
  fetchBufferFromUrl: (url: string) => Promise<Buffer | undefined>;
  getBotMenuImageBuffer: () => Promise<{ buffer?: Buffer; url: string }>;
  extractTargetUserJid: (msg: any, args: string[]) => string | null;
  saveSessionMetadata: (session: any) => void;
  downloadQuotedMediaBuffer: (
    mediaMsg: any,
    mediaType: 'image' | 'video' | 'audio' | 'sticker'
  ) => Promise<Buffer>;
  unwrapQuotedMessage: (quoted: any) => any;
}): Promise<boolean> {
  const {
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
  } = params;

  const isFromChannel = CHANNEL_UTILS_CMDS.has(cmd);

  const sendReply = async (text: string, mentions?: string[], customImg?: Buffer) => {
    const contextInfo = isFromChannel
      ? getNewsletterContextInfo(undefined, undefined, mentions)
      : undefined;

    if (customImg) {
      await sock.sendMessage(
        remoteJid,
        {
          image: customImg,
          caption: text,
          ...(mentions && mentions.length > 0 ? { mentions } : {}),
          ...(contextInfo ? { contextInfo } : {}),
        },
        isFromChannel ? undefined : { quoted: msg }
      );
    } else {
      await sock.sendMessage(
        remoteJid,
        {
          text,
          ...(mentions && mentions.length > 0 ? { mentions } : {}),
          ...(contextInfo ? { contextInfo } : {}),
        },
        isFromChannel ? undefined : { quoted: msg }
      );
    }
  };

  // 0. .help (In UTILS: does NOT react with 🕸, does NOT come from channel)
  if (cmd === 'help') {
    session.commandsCount += 1;
    const card =
      `*╭▱▱─〇 (ʜᴇʟᴘ) 〇─▱╮*\n` +
      `┃ ◉ ʙᴏᴛ : ᴀʟʟɪssᴀ ᴍᴅ\n` +
      `┃ ◉ ᴘʀᴇғɪx : .\n` +
      `┃ ◉ ᴍᴇɴᴜ : .ᴍᴇɴᴜ\n` +
      `┃ ◉ ᴏᴡɴᴇʀ : sᴀᴍʏᴄʜᴀʀʟᴇs\n` +
      `*╰⬤▱▱╾╸(ᴜᴛɪʟs)─▱╯*`;
    await sendReply(card);
    return true;
  }

  // 1. ping (WITH DESIGN + PHOTO https://imgg.fr/f/J1NmPZVM, FROM CHANNEL) vs latency / test / check (SIMPLE)
  if (cmd === 'ping' || cmd === 'latency' || cmd === 'test' || cmd === 'check') {
    session.commandsCount += 1;
    const msgTs = Number(msg.messageTimestamp || 0) * 1000;
    const diff = msgTs > 0 ? Math.max(12, Math.min(999, Date.now() - msgTs)) : 42;
    if (cmd === 'ping') {
      const card =
        `*╭▱▱─〇 (ᴘɪɴɢ) 〇─▱╮*\n` +
        `┃ ◉ ʙᴏᴛ : ᴀʟʟɪssᴀ ᴍᴅ\n` +
        `┃ ◉ sᴘᴇᴇᴅ : ${diff} ᴍs\n` +
        `┃ ◉ sᴛᴀᴛᴜs : ᴏɴʟɪɴᴇ\n` +
        `┃ ◉ ᴍᴏᴅᴇ : ${toSmallCaps(session.botMode)}\n` +
        `*╰⬤▱▱╾╸(ᴜᴛɪʟs)─▱╯*`;
      const pingImgBuf = await getPingImageBuffer(fetchBufferFromUrl);
      await sendReply(card, undefined, pingImgBuf);
    } else {
      await sendReply(`⚡ ${toSmallCaps(cmd)} : ${diff} ᴍs`);
    }
    return true;
  }

  // 2. uptime (WITH DESIGN + INFO, FROM CHANNEL)
  if (cmd === 'uptime') {
    session.commandsCount += 1;
    const up = toSmallCaps(formatDuration(Date.now() - (session.connectedAt || serverStartTime)));
    const { time, date } = getEnglishSmallCapsTimeAndDate();
    const card =
      `*╭▱▱─〇 (ᴜᴘᴛɪᴍᴇ) 〇─▱╮*\n` +
      `┃ ◉ ʙᴏᴛ : ᴀʟʟɪssᴀ ᴍᴅ\n` +
      `┃ ◉ ᴏᴡɴᴇʀ : sᴀᴍʏᴄʜᴀʀʟᴇs\n` +
      `┃ ◉ ᴜᴘᴛɪᴍᴇ : ${up}\n` +
      `┃ ◉ ᴍᴏᴅᴇ : ${toSmallCaps(session.botMode)}\n` +
      `┃ ◉ ᴄᴍᴅs : ${session.commandsCount}\n` +
      `┃ ◉ ᴅᴀᴛᴇ : ${date}\n` +
      `┃ ◉ ᴛɪᴍᴇ : ${time}\n` +
      `*╰⬤▱▱╾╸(ᴜᴛɪʟs)─▱╯*`;
    await sendReply(card);
    return true;
  }

  // 3. info (WITH DESIGN, FROM CHANNEL) vs prefix (SIMPLE, FROM CHANNEL) vs version / lang / support / contact / report / update / commands (SIMPLE)
  if (
    cmd === 'info' ||
    cmd === 'prefix' ||
    cmd === 'version' ||
    cmd === 'lang' ||
    cmd === 'support' ||
    cmd === 'contact' ||
    cmd === 'report' ||
    cmd === 'update' ||
    cmd === 'commands'
  ) {
    session.commandsCount += 1;
    const up = toSmallCaps(formatDuration(Date.now() - serverStartTime));

    if (cmd === 'info') {
      const card =
        `*╭▱▱─〇 (ɪɴғᴏ) 〇─▱╮*\n` +
        `┃ ◉ ʙᴏᴛ : ᴀʟʟɪssᴀ ᴍᴅ\n` +
        `┃ ◉ ᴏᴡɴᴇʀ : sᴀᴍʏᴄʜᴀʀʟᴇs\n` +
        `┃ ◉ ᴠᴇʀsɪᴏɴ : 2.6.0-ᴍᴅ\n` +
        `┃ ◉ ᴘʀᴇғɪx : .\n` +
        `┃ ◉ ᴜᴘᴛɪᴍᴇ : ${up}\n` +
        `*╰⬤▱▱╾╸(ᴜᴛɪʟs)─▱╯*`;
      const menuImg = await getBotMenuImageBuffer();
      await sendReply(card, undefined, menuImg.buffer);
      return true;
    }

    if (cmd === 'prefix') {
      await sendReply(`ᴘʀᴇғɪx : .`);
      return true;
    }
    if (cmd === 'version') {
      await sendReply(`ᴠᴇʀsɪᴏɴ : 2.6.0-ᴍᴅ`);
      return true;
    }
    if (cmd === 'lang') {
      await sendReply(`ʟᴀɴɢ : ᴇɴɢʟɪsʜ`);
      return true;
    }
    if (cmd === 'commands') {
      await sendReply(`ᴄᴏᴍᴍᴀɴᴅs : 115+ (ᴛʏᴘᴇ .ᴍᴇɴᴜ)`);
      return true;
    }
    if (cmd === 'update') {
      await sendReply(`ᴀʟʟɪssᴀ ᴍᴅ ɪs ᴜᴘ ᴛᴏ ᴅᴀᴛᴇ (2.6.0-ᴍᴅ)`);
      return true;
    }
    await sendReply(`ᴀʟʟɪssᴀ ᴍᴅ • ᴏᴡɴᴇʀ : sᴀᴍʏᴄʜᴀʀʟᴇs`);
    return true;
  }

  // 4. myid / id (SIMPLE)
  if (cmd === 'myid' || cmd === 'id') {
    session.commandsCount += 1;
    const targetJid = extractTargetUserJid(msg, args) || senderJid;
    await sendReply(`🆔 ${targetJid}`);
    return true;
  }

  // 5. pp / avatar / gcc / gcpp (WITH DESIGN, FROM CHANNEL with user/group photo)
  if (cmd === 'pp' || cmd === 'avatar' || cmd === 'gcc' || cmd === 'gcpp') {
    session.commandsCount += 1;
    const isGroupPic = cmd === 'gcc' || cmd === 'gcpp';
    const targetJid = isGroupPic
      ? remoteJid
      : extractTargetUserJid(msg, args) || senderJid;

    let picBuf: Buffer | undefined;
    try {
      const picUrl = await sock.profilePictureUrl(targetJid, 'image');
      if (picUrl) {
        picBuf = await fetchBufferFromUrl(picUrl);
      }
    } catch {
      // Fallback
    }
    if (!picBuf) {
      const fallback = await getBotMenuImageBuffer();
      picBuf = fallback.buffer;
    }

    const label = isGroupPic
      ? `*╭▱▱─〇 (ɢᴄᴄ) 〇─▱╮*\n┃ ◉ ${toSmallCaps('group profile picture')}\n*╰⬤▱▱╾╸(ᴜᴛɪʟs)─▱╯*`
      : `*╭▱▱─〇 (${toSmallCaps(cmd)}) 〇─▱╮*\n┃ ◉ ᴜsᴇʀ : @${targetJid.split('@')[0]}\n*╰⬤▱▱╾╸(ᴜᴛɪʟs)─▱╯*`;
    const mentions = isGroupPic ? [] : [targetJid];
    await sendReply(label, mentions, picBuf);
    return true;
  }

  // 6. userinfo (WITH DESIGN, FROM CHANNEL) vs profile / bio / joindate / whois (SIMPLE)
  if (
    cmd === 'userinfo' ||
    cmd === 'profile' ||
    cmd === 'bio' ||
    cmd === 'joindate' ||
    cmd === 'whois'
  ) {
    session.commandsCount += 1;
    const targetJid = extractTargetUserJid(msg, args) || senderJid;
    const num = targetJid.split('@')[0];

    let bioText = 'ɴᴏ ʙɪᴏ';
    let setAtText = 'ɴ/ᴀ';
    try {
      const statusRes: any = await sock.fetchStatus(targetJid);
      const st = Array.isArray(statusRes) ? statusRes[0]?.status : statusRes?.status;
      if (typeof st === 'string' && st.trim()) {
        bioText = toSmallCaps(st.trim());
      } else if (st?.status) {
        bioText = toSmallCaps(String(st.status));
      }
      const setAt = Array.isArray(statusRes) ? statusRes[0]?.setAt : statusRes?.setAt;
      if (setAt) {
        setAtText = toSmallCaps(new Date(setAt).toLocaleDateString('en-US'));
      }
    } catch {
      // Ignore status fetch error
    }

    if (cmd === 'userinfo') {
      let picBuf: Buffer | undefined;
      try {
        const picUrl = await sock.profilePictureUrl(targetJid, 'image');
        if (picUrl) picBuf = await fetchBufferFromUrl(picUrl);
      } catch {
        // Ignore
      }
      if (!picBuf) {
        const fallback = await getBotMenuImageBuffer();
        picBuf = fallback.buffer;
      }

      const card =
        `*╭▱▱─〇 (ᴜsᴇʀɪɴғᴏ) 〇─▱╮*\n` +
        `┃ ◉ ᴜsᴇʀ : @${num}\n` +
        `┃ ◉ ɴᴜᴍʙᴇʀ : +${num}\n` +
        `┃ ◉ ʙɪᴏ : ${bioText}\n` +
        `┃ ◉ ᴅᴀᴛᴇ : ${setAtText}\n` +
        `*╰⬤▱▱╾╸(ᴜᴛɪʟs)─▱╯*`;
      await sendReply(card, [targetJid], picBuf);
      return true;
    }

    if (cmd === 'bio') {
      await sendReply(`📝 ʙɪᴏ (@${num}) : ${bioText}`, [targetJid]);
      return true;
    }
    if (cmd === 'joindate') {
      await sendReply(`📅 ᴅᴀᴛᴇ (@${num}) : ${setAtText}`, [targetJid]);
      return true;
    }
    await sendReply(`👤 @${num} (+${num})\n📝 ʙɪᴏ : ${bioText}\n📅 ᴅᴀᴛᴇ : ${setAtText}`, [targetJid]);
    return true;
  }

  // 7. settings / log (SIMPLE)
  if (cmd === 'settings' || cmd === 'log') {
    session.commandsCount += 1;
    await sendReply(
      `⚙️ ᴍᴏᴅᴇ : ${toSmallCaps(session.botMode)} | ᴀᴜᴛᴏ sᴛᴀᴛᴜs : ${
        session.autoStatusView ? 'ᴏɴ' : 'ᴏғғ'
      } | ᴡᴏᴡᴏɴʟʏ : ${session.alwaysOnline ? 'ᴏɴ' : 'ᴏғғ'} | ᴄᴍᴅs : ${session.commandsCount}`
    );
    return true;
  }

  // 8. time / date / timezone / unix / timestamp (SIMPLE)
  if (
    cmd === 'time' ||
    cmd === 'date' ||
    cmd === 'timezone' ||
    cmd === 'unix' ||
    cmd === 'timestamp'
  ) {
    session.commandsCount += 1;
    const { time, date } = getEnglishSmallCapsTimeAndDate();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const unixSec = Math.floor(Date.now() / 1000);
    if (cmd === 'time') {
      await sendReply(`🕒 ᴛɪᴍᴇ : ${time}`);
    } else if (cmd === 'date') {
      await sendReply(`📅 ᴅᴀᴛᴇ : ${date}`);
    } else if (cmd === 'timezone') {
      await sendReply(`🌍 ᴛɪᴍᴇᴢᴏɴᴇ : ${toSmallCaps(tz)}`);
    } else {
      await sendReply(`⏱️ ᴜɴɪx : ${unixSec}`);
    }
    return true;
  }

  // 9. calc (SIMPLE)
  if (cmd === 'calc') {
    session.commandsCount += 1;
    const expr = getQuotedOrArgText(msg, argText).replace(/[^0-9+\-*/().%\s^]/g, '');
    if (!expr) {
      await sendReply(
        toSmallCaps('type .calc followed by a math expression, for example: .calc 25 * 4')
      );
      return true;
    }
    try {
      const safeExpr = expr.replace(/\^/g, '**');
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${safeExpr})`)();
      await sendReply(`🧮 ${expr} = ${result}`);
    } catch {
      await sendReply(toSmallCaps('invalid math expression'));
    }
    return true;
  }

  // 10. count / wordcount / charcount (SIMPLE)
  if (cmd === 'count' || cmd === 'wordcount' || cmd === 'charcount') {
    session.commandsCount += 1;
    const input = getQuotedOrArgText(msg, argText);
    if (!input) {
      await sendReply(
        toSmallCaps(`type .${cmd} followed by your text, or reply to a message with .${cmd}`)
      );
      return true;
    }
    const chars = input.length;
    const words = input.trim() ? input.trim().split(/\s+/).length : 0;
    const lines = input ? input.split(/\r?\n/).length : 0;
    if (cmd === 'wordcount') {
      await sendReply(`📝 ᴡᴏʀᴅs : ${words}`);
    } else if (cmd === 'charcount') {
      await sendReply(`📝 ᴄʜᴀʀs : ${chars}`);
    } else {
      await sendReply(`📝 ᴡᴏʀᴅs : ${words} | ᴄʜᴀʀs : ${chars} | ʟɪɴᴇs : ${lines}`);
    }
    return true;
  }

  // 11. reverse / upper / lower / capitalize / font / style / text / echo / repeat / trim / trime / space / replace (SIMPLE)
  if (
    cmd === 'reverse' ||
    cmd === 'upper' ||
    cmd === 'lower' ||
    cmd === 'capitalize' ||
    cmd === 'font' ||
    cmd === 'style' ||
    cmd === 'text' ||
    cmd === 'echo' ||
    cmd === 'repeat' ||
    cmd === 'trim' ||
    cmd === 'trime' ||
    cmd === 'space' ||
    cmd === 'replace'
  ) {
    session.commandsCount += 1;
    const input = getQuotedOrArgText(msg, argText);
    if (!input) {
      await sendReply(
        toSmallCaps(`type .${cmd} followed by your text, or reply to a message with .${cmd}`)
      );
      return true;
    }

    let out = input;
    if (cmd === 'reverse') {
      out = Array.from(input).reverse().join('');
    } else if (cmd === 'upper') {
      out = input.toUpperCase();
    } else if (cmd === 'lower') {
      out = input.toLowerCase();
    } else if (cmd === 'capitalize') {
      out = input.replace(/\b\w/g, (c) => c.toUpperCase());
    } else if (cmd === 'font' || cmd === 'style' || cmd === 'text') {
      out = toSmallCaps(input);
    } else if (cmd === 'repeat') {
      const count = Math.min(Math.max(parseInt(args[0] || '3', 10) || 3, 1), 20);
      const phrase = args.length > 1 ? args.slice(1).join(' ') : input;
      out = Array(count).fill(toSmallCaps(phrase)).join('\n');
    } else if (cmd === 'trim' || cmd === 'trime') {
      out = input.replace(/\s+/g, ' ').trim();
    } else if (cmd === 'space') {
      out = Array.from(input).join(' ');
    } else if (cmd === 'replace') {
      const [fromWord, toWord, ...rest] = args;
      const targetStr = rest.length > 0 ? rest.join(' ') : getQuotedOrArgText(msg, '');
      if (fromWord && targetStr) {
        out = targetStr.split(fromWord).join(toWord || '');
      }
    }

    await sendReply(out);
    return true;
  }

  // 12. emoji / symbol (SIMPLE)
  if (cmd === 'emoji' || cmd === 'symbol') {
    session.commandsCount += 1;
    const out =
      cmd === 'emoji'
        ? `⚡ 🔥 💀 👑 💎 🚀 🌙 ✨ 🎯`
        : `╭ ╮ ╰ ╯ ┃ ▱ 〇 ⬤ ╾ ╸ ▢ ◉ ❒`;
    await sendReply(out);
    return true;
  }

  // 13. base64 / encode / decode / json (SIMPLE)
  if (cmd === 'base64' || cmd === 'encode' || cmd === 'decode' || cmd === 'json') {
    session.commandsCount += 1;
    const input = getQuotedOrArgText(msg, argText);
    if (!input) {
      await sendReply(
        toSmallCaps(`type .${cmd} followed by the text you want to process, or reply to a message`)
      );
      return true;
    }
    try {
      let out = '';
      if (cmd === 'decode') {
        out = Buffer.from(input.trim(), 'base64').toString('utf-8');
      } else if (cmd === 'json') {
        out = JSON.stringify(JSON.parse(input), null, 2);
      } else {
        out = Buffer.from(input, 'utf-8').toString('base64');
      }
      await sendReply(out);
    } catch {
      await sendReply(toSmallCaps(`failed to process .${cmd} input`));
    }
    return true;
  }

  // 14. qr (WITH DESIGN, FROM CHANNEL) vs barcode (SIMPLE)
  if (cmd === 'qr' || cmd === 'barcode') {
    session.commandsCount += 1;
    const input = getQuotedOrArgText(msg, argText);
    if (!input) {
      await sendReply(
        toSmallCaps(`type .${cmd} followed by text or a link, for example: .${cmd} https://whatsapp.com`)
      );
      return true;
    }
    const apiUrl =
      cmd === 'qr'
        ? `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(input)}`
        : `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(input)}&scale=3&includetext`;

    const buf = await fetchBufferFromUrl(apiUrl);
    if (cmd === 'qr') {
      const qrCard =
        `*╭▱▱─〇 (ǫʀ) 〇─▱╮*\n` +
        `┃ ◉ ʙᴏᴛ : ᴀʟʟɪssᴀ ᴍᴅ\n` +
        `┃ ◉ ᴅᴀᴛᴀ : ${toSmallCaps(input.slice(0, 45))}\n` +
        `*╰⬤▱▱╾╸(ᴜᴛɪʟs)─▱╯*`;
      await sendReply(qrCard, undefined, buf);
    } else {
      await sendReply(toSmallCaps(input.slice(0, 60)), undefined, buf);
    }
    return true;
  }

  // 15. translate / detect / dict / define (SIMPLE)
  if (cmd === 'translate' || cmd === 'detect' || cmd === 'dict' || cmd === 'define') {
    session.commandsCount += 1;
    const input = getQuotedOrArgText(msg, argText);
    if (!input) {
      await sendReply(
        toSmallCaps(`type .${cmd} followed by a word or text, or reply to a message with .${cmd}`)
      );
      return true;
    }

    if (cmd === 'dict' || cmd === 'define') {
      const word = input.trim().split(/\s+/)[0];
      try {
        const res = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
        );
        if (res.ok) {
          const data: any = await res.json();
          const def =
            data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition || 'No definition found.';
          await sendReply(`📖 ${toSmallCaps(word)} : ${toSmallCaps(def)}`);
          return true;
        }
      } catch {
        // Fallback
      }
      await sendReply(toSmallCaps(`no definition found for "${word}"`));
      return true;
    }

    try {
      const targetLang = args.length > 1 && args[0].length <= 5 ? args[0] : 'en';
      const textToTranslate =
        args.length > 1 && args[0].length <= 5 ? args.slice(1).join(' ') : input;
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
        targetLang
      )}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        const translated = (data?.[0] || []).map((item: any) => item?.[0] || '').join('');
        const detectedLang = data?.[2] || 'auto';
        if (cmd === 'detect') {
          await sendReply(`🌐 ʟᴀɴɢ : ${toSmallCaps(String(detectedLang))}`);
        } else {
          await sendReply(toSmallCaps(translated || textToTranslate));
        }
        return true;
      }
    } catch {
      // Ignore
    }
    await sendReply(toSmallCaps(input));
    return true;
  }

  // 16. urlinfo / link / short (SIMPLE)
  if (cmd === 'urlinfo' || cmd === 'link' || cmd === 'short') {
    session.commandsCount += 1;
    if (cmd === 'link' && isGroup && !argText) {
      try {
        const code = await sock.groupInviteCode(remoteJid);
        await sendReply(`https://chat.whatsapp.com/${code}`);
        return true;
      } catch {
        // Fallback
      }
    }

    const inputUrl = getQuotedOrArgText(msg, argText);
    if (!inputUrl) {
      await sendReply(
        toSmallCaps(`type .${cmd} followed by a link, for example: .${cmd} https://example.com`)
      );
      return true;
    }
    const normalizedUrl = inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`;
    if (cmd === 'short') {
      try {
        const res = await fetch(
          `https://is.gd/create.php?format=simple&url=${encodeURIComponent(normalizedUrl)}`
        );
        if (res.ok) {
          const shortUrl = (await res.text()).trim();
          await sendReply(`🔗 ${shortUrl}`);
          return true;
        }
      } catch {
        // Fallback
      }
    }
    try {
      const parsed = new URL(normalizedUrl);
      await sendReply(
        `🌐 ʜᴏsᴛ : ${parsed.hostname} | ᴘʀᴏᴛᴏ : ${parsed.protocol.replace(':', '')} | ᴘᴀᴛʜ : ${parsed.pathname}`
      );
    } catch {
      await sendReply(toSmallCaps('invalid url provided'));
    }
    return true;
  }

  // 17. convert / units / currency (SIMPLE)
  if (cmd === 'convert' || cmd === 'units' || cmd === 'currency') {
    session.commandsCount += 1;
    if (args.length < 2) {
      await sendReply(
        toSmallCaps(
          `type .${cmd} followed by the amount and units, for example: .${cmd} 100 usd eur or .${cmd} 5 km m`
        )
      );
      return true;
    }
    const amount = parseFloat(args[0] || '1') || 1;
    const from = (args[1] || 'usd').toUpperCase();
    const to = (args[2] || 'eur').toUpperCase();

    const unitMap: Record<string, Record<string, number>> = {
      KM: { M: 1000, MI: 0.621371 },
      M: { KM: 0.001, CM: 100, FT: 3.28084 },
      KG: { G: 1000, LB: 2.20462 },
      LB: { KG: 0.453592 },
    };
    if (unitMap[from]?.[to]) {
      const conv = (amount * unitMap[from][to]).toFixed(2);
      await sendReply(`${amount} ${toSmallCaps(from)} = ${conv} ${toSmallCaps(to)}`);
      return true;
    }

    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`);
      if (res.ok) {
        const data: any = await res.json();
        const rate = data?.rates?.[to];
        if (rate) {
          const total = (amount * Number(rate)).toFixed(2);
          await sendReply(`💱 ${amount} ${toSmallCaps(from)} = ${total} ${toSmallCaps(to)}`);
          return true;
        }
      }
    } catch {
      // Fallback
    }
    await sendReply(
      toSmallCaps(`type .${cmd} 100 usd eur or .${cmd} 5 km m to convert`)
    );
    return true;
  }

  // 18. delete / clear (NOT from channel)
  if (cmd === 'delete' || cmd === 'clear') {
    session.commandsCount += 1;
    const ctx =
      msg.message?.extendedTextMessage?.contextInfo ||
      msg.message?.imageMessage?.contextInfo ||
      msg.message?.videoMessage?.contextInfo;
    if (!ctx?.stanzaId) {
      await sendReply(
        toSmallCaps(`reply to a message with .${cmd} to delete it`)
      );
      return true;
    }
    const delKey = {
      remoteJid,
      id: ctx.stanzaId,
      fromMe: ctx.participant ? false : true,
      ...(ctx.participant ? { participant: ctx.participant } : {}),
    };
    await sock.sendMessage(remoteJid, { delete: delKey }).catch(() => {});
    await sock.sendMessage(remoteJid, { delete: msg.key }).catch(() => {});
    return true;
  }

  // 19. pin / unpin (NOT from channel)
  if (cmd === 'pin' || cmd === 'unpin') {
    session.commandsCount += 1;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (!ctx?.stanzaId) {
      await sendReply(
        toSmallCaps(`reply to a message with .${cmd} to ${cmd === 'pin' ? 'pin' : 'unpin'} it`)
      );
      return true;
    }
    const targetKey = {
      remoteJid,
      id: ctx.stanzaId,
      fromMe: Boolean(ctx.participant === session.userJid),
      ...(ctx.participant ? { participant: ctx.participant } : {}),
    };
    await sock
      .sendMessage(remoteJid, {
        pin: targetKey,
        type: cmd === 'pin' ? 1 : 0,
        time: 86400,
      })
      .catch(() => {});
    await sendReply(
      toSmallCaps(cmd === 'pin' ? 'message pinned' : 'message unpinned')
    );
    return true;
  }

  // 20. s / sticker — Convert quoted or direct image to sticker with name ᴀʟʟɪssᴀ ᴍᴅ only (no author)
  if (cmd === 's' || cmd === 'sticker') {
    session.commandsCount += 1;
    const ctx =
      msg.message?.extendedTextMessage?.contextInfo ||
      msg.message?.imageMessage?.contextInfo ||
      msg.message?.videoMessage?.contextInfo;

    const quotedUnwrapped = unwrapQuotedMessage(ctx?.quotedMessage);
    const cachedFullMsg = ctx?.stanzaId ? session.messageCache?.get(ctx.stanzaId) : null;
    const cachedUnwrapped = cachedFullMsg?.message
      ? unwrapQuotedMessage(cachedFullMsg.message)
      : null;

    const targetImgMsg =
      msg.message?.imageMessage ||
      (quotedUnwrapped?.imageMessage?.mediaKey || quotedUnwrapped?.imageMessage?.url
        ? quotedUnwrapped.imageMessage
        : null) ||
      cachedUnwrapped?.imageMessage ||
      quotedUnwrapped?.imageMessage;

    const targetStickerMsg =
      quotedUnwrapped?.stickerMessage || cachedUnwrapped?.stickerMessage;

    if (!targetImgMsg && !targetStickerMsg) {
      await sendReply(
        toSmallCaps(`reply to an image with .${cmd} to turn it into an ᴀʟʟɪssᴀ ᴍᴅ sticker`)
      );
      return true;
    }

    try {
      const rawBuf = targetImgMsg
        ? await downloadQuotedMediaBuffer({ ...targetImgMsg, viewOnce: false }, 'image')
        : await downloadQuotedMediaBuffer(targetStickerMsg, 'sticker');
      const stickerBuf = await createAllissaSticker(rawBuf);
      await sock.sendMessage(
        remoteJid,
        {
          sticker: stickerBuf,
        },
        { quoted: msg }
      );
    } catch {
      await sendReply(toSmallCaps('failed to convert image to sticker'));
    }
    return true;
  }

  saveSessionMetadata(session);
  return false;
}
