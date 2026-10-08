const DOWNLOAD_HUB_BASE = 'https://your-download-hub.vercel.app';

export const DOWNLOAD_MENU_SECTION =
  `*╭▱▱─〇 (ᴅᴏᴡɴʟᴏᴀᴅ) 〇─▱╮*\n` +
  `┃ ▢ ʏᴛᴍᴘ𝟹\n` +
  `┃ ▢ ʏᴛᴍᴘ𝟺\n` +
  `┃ ▢ ᴛɪᴋᴛᴏᴋ\n` +
  `┃ ▢ ɪɴsᴛᴀ\n` +
  `┃ ▢ ғᴀᴄᴇʙᴏᴏᴋ\n` +
  `┃ ▢ ᴛᴡɪᴛᴛᴇʀ\n` +
  `┃ ▢ ᴘɪɴᴛᴇʀᴇsᴛ\n` +
  `┃ ▢ ᴛᴇʟᴇɢʀᴀᴍ\n` +
  `┃ ▢ ʀᴇᴇʟ\n` +
  `┃ ▢ sʜᴏʀᴛs\n` +
  `┃ ▢ sᴛᴏʀʏ\n` +
  `┃ ▢ ᴍᴜsɪᴄ\n` +
  `┃ ▢ ᴠɪᴅᴇᴏ\n` +
  `┃ ▢ ᴀᴜᴅɪᴏ\n` +
  `┃ ▢ ᴘʜᴏᴛᴏ\n` +
  `┃ ▢ ᴍᴇᴅɪᴀ\n` +
  `┃ ▢ ʟɪɴᴋ\n` +
  `┃ ▢ ᴜʀʟ\n` +
  `*╰⬤▱▱╾╸(ᴅᴏᴡɴʟᴏᴀᴅ)─▱╯*`;

const DOWNLOAD_COMMANDS = new Set([
  'ytmp3',
  'ytmp4',
  'tiktok',
  'tt',
  'insta',
  'instagram',
  'ig',
  'facebook',
  'fb',
  'twitter',
  'x',
  'pinterest',
  'telegram',
  'tg',
  'reel',
  'reels',
  'shorts',
  'story',
  'stories',
  'music',
  'song',
  'play',
  'video',
  'audio',
  'photo',
  'media',
  'dl',
  'download',
  'link',
  'url',
]);

interface NormalizedMediaItem {
  label: string;
  url: string;
  type: 'video' | 'audio' | 'image' | 'file';
}

interface DownloadHubResult {
  success: boolean;
  platform: string;
  url: string;
  title: string;
  thumbnail?: string;
  duration?: string | number | null;
  author?: string | null;
  views?: string | number | null;
  medias: NormalizedMediaItem[];
}

function getInputOrQuotedText(msg: any, argText: string): string {
  if (argText && argText.trim()) return argText.trim();
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

function extractFirstUrl(text: string): string | null {
  if (!text) return null;
  const m = text.match(/https?:\/\/[^\s<>"]+/i);
  return m ? m[0] : null;
}

function extractYouTubeVideoId(url: string): string | null {
  const m =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/i);
  return m ? m[1] : null;
}

function detectPlatformFromCmdOrUrl(cmd: string, url: string): string {
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('facebook.com') || u.includes('fb.watch') || u.includes('fb.com'))
    return 'facebook';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  if (u.includes('pinterest.') || u.includes('pin.it')) return 'pinterest';
  if (u.includes('threads.net')) return 'threads';
  if (u.includes('spotify.com')) return 'spotify';
  if (u.includes('soundcloud.com')) return 'soundcloud';
  if (u.includes('reddit.com') || u.includes('redd.it')) return 'reddit';
  if (u.includes('mediafire.com')) return 'mediafire';
  if (u.includes('drive.google.com')) return 'gdrive';
  if (u.includes('capcut.com')) return 'capcut';

  if (cmd === 'ytmp3' || cmd === 'ytmp4' || cmd === 'shorts' || cmd === 'music') return 'youtube';
  if (cmd === 'tiktok' || cmd === 'tt') return 'tiktok';
  if (cmd === 'insta' || cmd === 'instagram' || cmd === 'ig' || cmd === 'reel' || cmd === 'reels' || cmd === 'story')
    return 'instagram';
  if (cmd === 'facebook' || cmd === 'fb') return 'facebook';
  if (cmd === 'twitter' || cmd === 'x') return 'twitter';
  if (cmd === 'pinterest') return 'pinterest';
  return 'auto';
}

function buildProxyUrl(mediaUrl: string, filename: string): string {
  return `${DOWNLOAD_HUB_BASE}/api/proxy?url=${encodeURIComponent(
    mediaUrl
  )}&filename=${encodeURIComponent(filename)}`;
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 15000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function downloadMediaViaHubProxy(
  mediaUrl: string,
  filename: string,
  fetchBufferFromUrl: (url: string) => Promise<Buffer | undefined>
): Promise<{ buffer?: Buffer; proxyUrl: string }> {
  const proxyUrl = buildProxyUrl(mediaUrl, filename);
  const proxyBuf = await fetchBufferFromUrl(proxyUrl);
  if (proxyBuf && proxyBuf.length > 512) {
    return { buffer: proxyBuf, proxyUrl };
  }
  const directBuf = await fetchBufferFromUrl(mediaUrl);
  if (directBuf && directBuf.length > 512) {
    return { buffer: directBuf, proxyUrl };
  }
  return { proxyUrl };
}

function normalizeRawPlatformData(
  rawResp: any,
  targetUrl: string,
  platform: string
): DownloadHubResult | null {
  if (!rawResp || !rawResp.success) return null;
  if (Array.isArray(rawResp.medias) && rawResp.medias.length > 0) {
    return {
      success: true,
      platform: rawResp.platform || platform,
      url: rawResp.url || targetUrl,
      title: rawResp.title || 'Media',
      thumbnail: rawResp.thumbnail,
      duration: rawResp.duration,
      author: rawResp.author,
      medias: rawResp.medias,
    };
  }

  const d = rawResp.data || rawResp.result || rawResp;
  const medias: NormalizedMediaItem[] = [];

  const pushUrls = (val: any, type: 'video' | 'audio' | 'image', labelPrefix: string) => {
    if (!val) return;
    const arr = Array.isArray(val) ? val : [val];
    arr.forEach((item: any, idx: number) => {
      const u = typeof item === 'string' ? item : item?.url || item?.link || item?.download;
      if (typeof u === 'string' && u.startsWith('http')) {
        medias.push({
          label: `${labelPrefix} ${idx + 1}`,
          url: u,
          type,
        });
      }
    });
  };

  pushUrls(d?.video || d?.videos || d?.mp4 || d?.hd || d?.sd, 'video', 'mp4');
  pushUrls(d?.audio || d?.audios || d?.mp3 || d?.music, 'audio', 'mp3');
  pushUrls(d?.image || d?.images || d?.photo || d?.photos, 'image', 'jpg');

  if (medias.length === 0 && typeof d?.url === 'string' && d.url.startsWith('http')) {
    medias.push({ label: 'media', url: d.url, type: 'video' });
  }

  if (medias.length === 0) return null;

  return {
    success: true,
    platform: rawResp.platform || platform,
    url: rawResp.url || targetUrl,
    title: d?.title || d?.desc || rawResp.title || 'Media',
    thumbnail: d?.thumbnail || d?.cover || d?.image || rawResp.thumbnail,
    duration: d?.duration || rawResp.duration || null,
    author:
      typeof d?.author === 'string'
        ? d.author
        : d?.author?.name || d?.author?.nickname || rawResp.author || null,
    medias,
  };
}

async function resolveFromDownloadHub(
  input: string,
  cmd: string
): Promise<DownloadHubResult | null> {
  let targetUrl = extractFirstUrl(input);
  let searchMeta: {
    title?: string;
    thumbnail?: string;
    duration?: string;
    author?: string;
    views?: number | string;
    videoId?: string;
  } | null = null;

  // If user typed a search query instead of a URL (e.g. .ytmp3 Alan Walker Faded or .music Faded)
  if (!targetUrl) {
    const searchUrl = `${DOWNLOAD_HUB_BASE}/api/search/youtube?q=${encodeURIComponent(
      input
    )}&limit=5`;
    const searchData = await fetchJsonWithTimeout(searchUrl, 12000);
    const firstVideo = searchData?.videos?.[0];
    if (!firstVideo?.url) {
      return null;
    }
    targetUrl = firstVideo.url;
    searchMeta = {
      title: firstVideo.title,
      thumbnail: firstVideo.thumbnail,
      duration: firstVideo.duration,
      author: firstVideo.author,
      views: firstVideo.views,
      videoId: firstVideo.videoId,
    };
  }

  if (!targetUrl) return null;

  const platformHint = detectPlatformFromCmdOrUrl(cmd, targetUrl);
  const ytId = extractYouTubeVideoId(targetUrl) || searchMeta?.videoId || null;

  // Fetch /api/auto and (if YouTube) /api/search/youtube/video/:videoId in parallel
  const autoEndpoint = `${DOWNLOAD_HUB_BASE}/api/auto?url=${encodeURIComponent(
    targetUrl
  )}&platform=${encodeURIComponent(platformHint)}`;

  const [autoResp, ytDetailResp] = await Promise.all([
    fetchJsonWithTimeout(autoEndpoint, 18000),
    ytId
      ? fetchJsonWithTimeout(
          `${DOWNLOAD_HUB_BASE}/api/search/youtube/video/${encodeURIComponent(ytId)}`,
          8000
        )
      : Promise.resolve(null),
  ]);

  let normalized = normalizeRawPlatformData(autoResp, targetUrl, platformHint);

  // Fallback to /api/download/:platform?url=<lien> if /api/auto did not return medias
  if (!normalized) {
    const specificPlatform = platformHint === 'auto' ? 'aio' : platformHint;
    const dlEndpoint = `${DOWNLOAD_HUB_BASE}/api/download/${encodeURIComponent(
      specificPlatform
    )}?url=${encodeURIComponent(targetUrl)}`;
    const rawDlResp = await fetchJsonWithTimeout(dlEndpoint, 18000);
    normalized = normalizeRawPlatformData(rawDlResp, targetUrl, specificPlatform);
  }

  if (!normalized) return null;

  const ytVideo = ytDetailResp?.video;
  return {
    ...normalized,
    title: normalized.title || ytVideo?.title || searchMeta?.title || 'Media',
    thumbnail:
      normalized.thumbnail || ytVideo?.thumbnail || ytVideo?.image || searchMeta?.thumbnail,
    duration:
      normalized.duration ||
      ytVideo?.timestamp ||
      ytVideo?.duration?.timestamp ||
      searchMeta?.duration ||
      null,
    author:
      normalized.author ||
      (typeof ytVideo?.author === 'string' ? ytVideo.author : ytVideo?.author?.name) ||
      searchMeta?.author ||
      null,
    views: ytVideo?.views || searchMeta?.views || null,
  };
}

export async function handleDownloadCommand(params: {
  cmd: string;
  args: string[];
  argText: string;
  msg: any;
  sock: any;
  session: any;
  remoteJid: string;
  toSmallCaps: (s: string) => string;
  getNewsletterContextInfo: (thumb?: Buffer, url?: string, mentions?: string[]) => any;
  fetchBufferFromUrl: (url: string) => Promise<Buffer | undefined>;
  getBotMenuImageBuffer: () => Promise<{ buffer?: Buffer; url: string }>;
  saveSessionMetadata: (session: any) => void;
}): Promise<boolean> {
  const {
    cmd,
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
  } = params;

  if (!DOWNLOAD_COMMANDS.has(cmd)) {
    return false;
  }

  session.commandsCount += 1;
  saveSessionMetadata(session);

  // All DOWNLOAD category messages MUST come from the channel (120363412335206247@newsletter)
  const channelCtx = getNewsletterContextInfo();

  const input = getInputOrQuotedText(msg, argText);

  // Special subcommand: check API health & supported platforms (/api/health & /api/download/platforms)
  if (
    input.toLowerCase() === 'platforms' ||
    input.toLowerCase() === 'health'
  ) {
    const [health, platformsResp] = await Promise.all([
      fetchJsonWithTimeout(`${DOWNLOAD_HUB_BASE}/api/health`, 8000),
      fetchJsonWithTimeout(`${DOWNLOAD_HUB_BASE}/api/download/platforms`, 8000),
    ]);
    const list: string[] = platformsResp?.platforms || [];
    const statusStr = health?.status === 'ok' ? 'ᴏɴʟɪɴᴇ' : 'ᴀᴄᴛɪᴠᴇ';
    await sock.sendMessage(remoteJid, {
      text: `ᴀᴘɪ : ${statusStr} (${list.length || 38} ᴘʟᴀᴛғᴏʀᴍs)\n${toSmallCaps(
        list.join(', ')
      )}`,
      contextInfo: channelCtx,
    });
    return true;
  }

  if (!input) {
    const isSearchCapable =
      cmd === 'ytmp3' ||
      cmd === 'ytmp4' ||
      cmd === 'music' ||
      cmd === 'song' ||
      cmd === 'play' ||
      cmd === 'video' ||
      cmd === 'audio' ||
      cmd === 'shorts';
    const directMessage = isSearchCapable
      ? `type .${cmd} followed by a link or song title, for example: .${cmd} alan walker faded`
      : `type .${cmd} followed by a media link, or reply to a message containing a link with .${cmd}`;
    await sock.sendMessage(remoteJid, {
      text: toSmallCaps(directMessage),
      contextInfo: channelCtx,
    });
    return true;
  }

  const resolved = await resolveFromDownloadHub(input, cmd);
  if (!resolved || resolved.medias.length === 0) {
    await sock.sendMessage(remoteJid, {
      text: toSmallCaps('media not found or link unavailable.'),
      contextInfo: channelCtx,
    });
    return true;
  }

  const wantsAudioOnly =
    cmd === 'ytmp3' || cmd === 'music' || cmd === 'song' || cmd === 'play' || cmd === 'audio';
  const wantsPhotoOnly = cmd === 'photo';
  const wantsLinkCard = cmd === 'link' || cmd === 'url';

  const videoMedia = resolved.medias.find((m) => m.type === 'video');
  const audioMedia = resolved.medias.find((m) => m.type === 'audio');
  const imageMedia = resolved.medias.find((m) => m.type === 'image');

  let chosenMedia: NormalizedMediaItem = resolved.medias[0];
  if (wantsAudioOnly && audioMedia) {
    chosenMedia = audioMedia;
  } else if (wantsPhotoOnly && imageMedia) {
    chosenMedia = imageMedia;
  } else if (!wantsAudioOnly && videoMedia) {
    chosenMedia = videoMedia;
  } else if (imageMedia) {
    chosenMedia = imageMedia;
  } else if (audioMedia) {
    chosenMedia = audioMedia;
  }

  const cleanSlug =
    (resolved.title || 'jin-hee-media')
      .replace(/[^\w.-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'jin-hee-media';

  const ext =
    chosenMedia.type === 'audio' || wantsAudioOnly
      ? '.mp3'
      : chosenMedia.type === 'image' || wantsPhotoOnly
      ? '.jpg'
      : '.mp4';
  const filename = `${cleanSlug}${ext}`;
  const proxyDownloadUrl = buildProxyUrl(chosenMedia.url, filename);

  const simpleTitle = toSmallCaps((resolved.title || 'media').slice(0, 80));
  const simpleCaption = wantsLinkCard
    ? `${simpleTitle}\n🔗 ${proxyDownloadUrl}`
    : simpleTitle;

  // 1. PHOTO mode (.photo or image media)
  if (wantsPhotoOnly || chosenMedia.type === 'image') {
    const imgTargetUrl = imageMedia?.url || resolved.thumbnail || chosenMedia.url;
    const { buffer: imgBuf } = await downloadMediaViaHubProxy(
      imgTargetUrl,
      `${cleanSlug}.jpg`,
      fetchBufferFromUrl
    );
    const finalImgBuf = imgBuf || (await getBotMenuImageBuffer()).buffer;
    if (finalImgBuf) {
      await sock.sendMessage(remoteJid, {
        image: finalImgBuf,
        caption: simpleCaption,
        contextInfo: channelCtx,
      });
    } else {
      await sock.sendMessage(remoteJid, {
        text: `${simpleTitle}\n🔗 ${proxyDownloadUrl}`,
        contextInfo: channelCtx,
      });
    }
    return true;
  }

  // 2. AUDIO mode (.ytmp3, .music, .audio, or audio-only media)
  if (wantsAudioOnly || chosenMedia.type === 'audio') {
    const targetAudioUrl = (audioMedia || chosenMedia).url;
    const audioResult = await downloadMediaViaHubProxy(
      targetAudioUrl,
      `${cleanSlug}.mp3`,
      fetchBufferFromUrl
    );

    if (audioResult.buffer) {
      await sock.sendMessage(remoteJid, {
        audio: audioResult.buffer,
        mimetype: 'audio/mpeg',
        ptt: false,
        fileName: `${cleanSlug}.mp3`,
        contextInfo: channelCtx,
      });
    } else {
      await sock.sendMessage(remoteJid, {
        text: `${simpleTitle}\n🔗 ${audioResult.proxyUrl}`,
        contextInfo: channelCtx,
      });
    }
    return true;
  }

  // 3. VIDEO / MEDIA / LINK / URL mode (.ytmp4, .tiktok, .insta, .facebook, .twitter, .pinterest, .telegram, .reel, .shorts, .story, .video, .media, .link, .url)
  const { buffer: videoBuf, proxyUrl } = await downloadMediaViaHubProxy(
    chosenMedia.url,
    `${cleanSlug}.mp4`,
    fetchBufferFromUrl
  );

  if (videoBuf) {
    await sock.sendMessage(remoteJid, {
      video: videoBuf,
      caption: simpleCaption,
      mimetype: 'video/mp4',
      contextInfo: channelCtx,
    });
  } else {
    const thumbBuf = resolved.thumbnail
      ? await fetchBufferFromUrl(resolved.thumbnail)
      : undefined;
    const fallbackCaption = `${simpleTitle}\n🔗 ${proxyUrl}`;
    if (thumbBuf) {
      await sock.sendMessage(remoteJid, {
        image: thumbBuf,
        caption: fallbackCaption,
        contextInfo: channelCtx,
      });
    } else {
      await sock.sendMessage(remoteJid, {
        text: fallbackCaption,
        contextInfo: channelCtx,
      });
    }
  }

  return true;
}
