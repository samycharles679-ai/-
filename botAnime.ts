import sharp from 'sharp';

export const ANIME_MENU_SECTION =
  `*╭▱▱─〇 (ᴀɴɪᴍᴇ) 〇─▱╮*\n` +
  `┃ ▢ ᴀɴɪᴍᴇ\n` +
  `┃ ▢ ᴍᴀɴɢᴀ\n` +
  `┃ ▢ ᴄʜᴀʀᴀᴄᴛᴇʀ\n` +
  `┃ ▢ ᴛᴏᴘᴀɴɪᴍᴇ\n` +
  `┃ ▢ ᴀɴɪᴍᴇǫᴜᴏᴛᴇ\n` +
  `┃ ▢ ᴡᴀɪғᴜ\n` +
  `┃ ▢ ɴᴇᴋᴏ\n` +
  `┃ ▢ sʜɪɴᴏʙᴜ\n` +
  `┃ ▢ ᴍᴇɢᴜᴍɪɴ\n` +
  `┃ ▢ ʜᴜsʙᴀɴᴅᴏ\n` +
  `┃ ▢ ᴀɴɪᴍᴇᴡᴀʟʟ\n` +
  `┃ ▢ ʜᴜɢ\n` +
  `┃ ▢ ᴋɪss\n` +
  `┃ ▢ ᴘᴀᴛ\n` +
  `┃ ▢ sʟᴀᴘ\n` +
  `┃ ▢ ᴄʀʏ\n` +
  `┃ ▢ sᴍɪʟᴇ\n` +
  `*╰⬤▱▱╾╸(ᴀɴɪᴍᴇ)─▱╯*`;

const SAFEBOORU_TAG_MAP: Record<string, string> = {
  waifu: '1girl+solo+rating:general',
  neko: 'cat_ears+1girl+rating:general',
  shinobu: 'kochou_shinobu+rating:general',
  megumin: 'megumin+rating:general',
  husbando: '1boy+solo+rating:general',
  animewall: 'scenery+rating:general',
};

const OTAKU_REACTION_VERBS: Record<string, string> = {
  hug: 'hugs',
  kiss: 'kisses',
  pat: 'pats',
  slap: 'slaps',
  cry: 'is crying',
  smile: 'smiles at',
};

const ANIME_QUOTES = [
  {
    character: 'Itachi Uchiha',
    anime: 'Naruto Shippuden',
    quote: "People's lives don't end when they die. It ends when they lose faith.",
  },
  {
    character: 'Satoru Gojo',
    anime: 'Jujutsu Kaisen',
    quote: 'Throughout Heaven and Earth, I alone am the honored one.',
  },
  {
    character: 'Eren Yeager',
    anime: 'Attack on Titan',
    quote: 'If you win, you live. If you lose, you die. If you don’t fight, you can’t win!',
  },
  {
    character: 'Lelouch Vi Britannia',
    anime: 'Code Geass',
    quote: 'The only ones who should kill are those who are prepared to be killed.',
  },
  {
    character: 'Levi Ackerman',
    anime: 'Attack on Titan',
    quote: 'Give up on your dreams and die.',
  },
  {
    character: 'Monkey D. Luffy',
    anime: 'One Piece',
    quote: 'If you don’t take risks, you can’t create a future.',
  },
  {
    character: 'Madara Uchiha',
    anime: 'Naruto Shippuden',
    quote: 'Wake up to reality! Nothing ever goes as planned in this accursed world.',
  },
  {
    character: 'Roronoa Zoro',
    anime: 'One Piece',
    quote: 'When the world shoves you around, you just gotta stand up and shove back.',
  },
  {
    character: 'Light Yagami',
    anime: 'Death Note',
    quote: 'I am Justice! I protect the innocent and those who fear evil.',
  },
  {
    character: 'Edward Elric',
    anime: 'Fullmetal Alchemist: Brotherhood',
    quote: 'A lesson without pain is meaningless. That’s because no one can gain without sacrificing something.',
  },
];

async function fetchJsonWithTimeout(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 10000
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        ...headers,
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

async function normalizeImageBufferForWhatsApp(buf: Buffer): Promise<Buffer> {
  try {
    return await sharp(buf).jpeg({ quality: 92 }).toBuffer();
  } catch {
    return buf;
  }
}

async function fetchWaifuOrTagImageBuffer(
  cmd: string,
  customQuery: string,
  fetchBufferFromUrl: (url: string) => Promise<Buffer | undefined>
): Promise<Buffer | undefined> {
  if (!customQuery) {
    const nekosEndpointMap: Record<string, string> = {
      waifu: 'waifu',
      neko: 'neko',
      animewall: 'wallpaper',
    };
    const nekosTag = nekosEndpointMap[cmd];
    if (nekosTag) {
      const data = await fetchJsonWithTimeout(`https://nekos.life/api/v2/img/${nekosTag}`);
      if (data?.url) {
        const buf = await fetchBufferFromUrl(data.url);
        if (buf && buf.length > 512) {
          return await normalizeImageBufferForWhatsApp(buf);
        }
      }
    }
  }

  const tagQuery = customQuery
    ? `${customQuery.trim().replace(/\s+/g, '_')}+rating:general`
    : SAFEBOORU_TAG_MAP[cmd] || '1girl+rating:general';

  const sbUrl = `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=40&tags=${tagQuery}`;
  const posts = await fetchJsonWithTimeout(sbUrl);
  if (Array.isArray(posts) && posts.length > 0) {
    const chosen = posts[Math.floor(Math.random() * posts.length)];
    const imgUrl =
      chosen?.sample_url ||
      chosen?.file_url ||
      (chosen?.directory && chosen?.image
        ? `https://safebooru.org/images/${chosen.directory}/${chosen.image}`
        : null);
    if (imgUrl) {
      const buf = await fetchBufferFromUrl(imgUrl);
      if (buf && buf.length > 512) {
        return await normalizeImageBufferForWhatsApp(buf);
      }
    }
  }

  const fallback = await fetchJsonWithTimeout('https://nekos.life/api/v2/img/waifu');
  if (fallback?.url) {
    const buf = await fetchBufferFromUrl(fallback.url);
    if (buf && buf.length > 512) {
      return await normalizeImageBufferForWhatsApp(buf);
    }
  }
  return undefined;
}

export async function handleAnimeCommand(params: {
  cmd: string;
  args: string[];
  argText: string;
  msg: any;
  sock: any;
  session: any;
  remoteJid: string;
  senderJid: string;
  toSmallCaps: (s: string) => string;
  getNewsletterContextInfo: (thumb?: Buffer, url?: string, mentions?: string[]) => any;
  fetchBufferFromUrl: (url: string) => Promise<Buffer | undefined>;
  getBotMenuImageBuffer: () => Promise<{ buffer?: Buffer; url: string }>;
  extractTargetUserJid: (msg: any, args: string[]) => string | null;
  saveSessionMetadata: (session: any) => void;
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
    toSmallCaps,
    getNewsletterContextInfo,
    fetchBufferFromUrl,
    getBotMenuImageBuffer,
    extractTargetUserJid,
    saveSessionMetadata,
  } = params;

  // 1. .anime — Search Anime (sent from channel)
  if (cmd === 'anime') {
    session.commandsCount += 1;
    saveSessionMetadata(session);

    if (!argText) {
      await sock.sendMessage(remoteJid, {
        text: toSmallCaps('type .anime followed by the anime name, for example: .anime naruto'),
        contextInfo: getNewsletterContextInfo(),
      });
      return true;
    }

    const kitsuHeaders = { Accept: 'application/vnd.api+json' };
    const data = await fetchJsonWithTimeout(
      `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(argText)}&page[limit]=1`,
      kitsuHeaders
    );
    const animeItem: any = data?.data?.[0];

    if (!animeItem?.attributes) {
      await sock.sendMessage(remoteJid, {
        text: toSmallCaps('anime not found.'),
        contextInfo: getNewsletterContextInfo(),
      });
      return true;
    }

    const attr = animeItem.attributes;
    const title = attr.canonicalTitle || attr.titles?.en || attr.titles?.en_jp || 'Anime';
    const jpTitle = attr.titles?.ja_jp || '';
    const rating = attr.averageRating ? `${attr.averageRating}/100` : 'ɴ/ᴀ';
    const episodes = attr.episodeCount || 'ᴏɴɢᴏɪɴɢ';
    const status = attr.status || 'ɴ/ᴀ';
    const ageRating = attr.ageRating || 'ᴘɢ-13';
    const synopsis = (attr.synopsis || attr.description || 'No synopsis available.')
      .replace(/\r?\n+/g, ' ')
      .slice(0, 380);

    const posterUrl =
      attr.posterImage?.large || attr.posterImage?.original || attr.posterImage?.medium;
    const posterBuf = posterUrl ? await fetchBufferFromUrl(posterUrl) : undefined;
    const finalBuf = posterBuf
      ? await normalizeImageBufferForWhatsApp(posterBuf)
      : (await getBotMenuImageBuffer()).buffer;

    const card =
      `*╭▱▱─〇 (ᴀɴɪᴍᴇ) 〇─▱╮*\n` +
      `┃ ◉ ᴛɪᴛʟᴇ : ${toSmallCaps(title)}\n` +
      (jpTitle ? `┃ ◉ ᴊᴘ : ${jpTitle}\n` : '') +
      `┃ ◉ sᴄᴏʀᴇ : ${toSmallCaps(String(rating))}\n` +
      `┃ ◉ ᴇᴘɪsᴏᴅᴇs : ${toSmallCaps(String(episodes))}\n` +
      `┃ ◉ sᴛᴀᴛᴜs : ${toSmallCaps(String(status))}\n` +
      `┃ ◉ ʀᴀᴛɪɴɢ : ${toSmallCaps(String(ageRating))}\n` +
      `┃ ◉ sʏɴᴏᴘsɪs : ${toSmallCaps(synopsis)}...\n` +
      `*╰⬤▱▱╾╸(ᴀɴɪᴍᴇ)─▱╯*`;

    await sock.sendMessage(
      remoteJid,
      finalBuf
        ? {
            image: finalBuf,
            caption: card,
            contextInfo: getNewsletterContextInfo(),
          }
        : {
            text: card,
            contextInfo: getNewsletterContextInfo(),
          }
    );
    return true;
  }

  // 2. .manga — Search Manga (sent from channel)
  if (cmd === 'manga') {
    session.commandsCount += 1;
    saveSessionMetadata(session);

    if (!argText) {
      await sock.sendMessage(remoteJid, {
        text: toSmallCaps('type .manga followed by the manga name, for example: .manga one piece'),
        contextInfo: getNewsletterContextInfo(),
      });
      return true;
    }

    const kitsuHeaders = { Accept: 'application/vnd.api+json' };
    const url = `https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(argText)}&page[limit]=1`;
    const data = await fetchJsonWithTimeout(url, kitsuHeaders);
    const mangaItem = data?.data?.[0];

    if (!mangaItem?.attributes) {
      await sock.sendMessage(remoteJid, {
        text: toSmallCaps('manga not found.'),
        contextInfo: getNewsletterContextInfo(),
      });
      return true;
    }

    const attr = mangaItem.attributes;
    const title = attr.canonicalTitle || attr.titles?.en || attr.titles?.en_jp || 'Manga';
    const rating = attr.averageRating ? `${attr.averageRating}/100` : 'ɴ/ᴀ';
    const chapters = attr.chapterCount || 'ᴏɴɢᴏɪɴɢ';
    const volumes = attr.volumeCount || 'ɴ/ᴀ';
    const status = attr.status || 'ɴ/ᴀ';
    const synopsis = (attr.synopsis || attr.description || 'No synopsis available.')
      .replace(/\r?\n+/g, ' ')
      .slice(0, 380);

    const posterUrl =
      attr.posterImage?.large || attr.posterImage?.original || attr.posterImage?.medium;
    const posterBuf = posterUrl ? await fetchBufferFromUrl(posterUrl) : undefined;
    const finalBuf = posterBuf
      ? await normalizeImageBufferForWhatsApp(posterBuf)
      : (await getBotMenuImageBuffer()).buffer;

    const card =
      `*╭▱▱─〇 (ᴍᴀɴɢᴀ) 〇─▱╮*\n` +
      `┃ ◉ ᴛɪᴛʟᴇ : ${toSmallCaps(title)}\n` +
      `┃ ◉ sᴄᴏʀᴇ : ${toSmallCaps(String(rating))}\n` +
      `┃ ◉ ᴄʜᴀᴘᴛᴇʀs : ${toSmallCaps(String(chapters))}\n` +
      `┃ ◉ ᴠᴏʟᴜᴍᴇs : ${toSmallCaps(String(volumes))}\n` +
      `┃ ◉ sᴛᴀᴛᴜs : ${toSmallCaps(String(status))}\n` +
      `┃ ◉ sʏɴᴏᴘsɪs : ${toSmallCaps(synopsis)}...\n` +
      `*╰⬤▱▱╾╸(ᴀɴɪᴍᴇ)─▱╯*`;

    await sock.sendMessage(
      remoteJid,
      finalBuf
        ? {
            image: finalBuf,
            caption: card,
            contextInfo: getNewsletterContextInfo(),
          }
        : {
            text: card,
            contextInfo: getNewsletterContextInfo(),
          }
    );
    return true;
  }

  // 3. .character / .char — Search Anime Character (sent from channel)
  if (cmd === 'character' || cmd === 'char') {
    session.commandsCount += 1;
    saveSessionMetadata(session);

    if (!argText) {
      await sock.sendMessage(remoteJid, {
        text: toSmallCaps(
          `type .${cmd} followed by the character name, for example: .${cmd} gojo satoru`
        ),
        contextInfo: getNewsletterContextInfo(),
      });
      return true;
    }

    const query = argText;
    const kitsuHeaders = { Accept: 'application/vnd.api+json' };
    const data = await fetchJsonWithTimeout(
      `https://kitsu.io/api/edge/characters?filter[name]=${encodeURIComponent(query)}&page[limit]=1`,
      kitsuHeaders
    );
    const charItem = data?.data?.[0];

    if (!charItem?.attributes) {
      await sock.sendMessage(remoteJid, {
        text: toSmallCaps(`character "${query}" not found.`),
        contextInfo: getNewsletterContextInfo(),
      });
      return true;
    }

    const attr = charItem.attributes;
    const name = attr.canonicalName || attr.names?.en || query;
    const jpName = attr.names?.ja_jp || '';
    const desc = (attr.description || 'No biography available.')
      .replace(/<[^>]+>/g, '')
      .replace(/\r?\n+/g, ' ')
      .slice(0, 400);

    const imgUrl = attr.image?.original || attr.image?.large || attr.image?.medium;
    const charBuf = imgUrl ? await fetchBufferFromUrl(imgUrl) : undefined;
    const finalBuf = charBuf
      ? await normalizeImageBufferForWhatsApp(charBuf)
      : (await getBotMenuImageBuffer()).buffer;

    const card =
      `*╭▱▱─〇 (ᴄʜᴀʀᴀᴄᴛᴇʀ) 〇─▱╮*\n` +
      `┃ ◉ ɴᴀᴍᴇ : ${toSmallCaps(name)}\n` +
      (jpName ? `┃ ◉ ᴊᴘ : ${jpName}\n` : '') +
      `┃ ◉ ʙɪᴏ : ${toSmallCaps(desc)}...\n` +
      `*╰⬤▱▱╾╸(ᴀɴɪᴍᴇ)─▱╯*`;

    await sock.sendMessage(
      remoteJid,
      finalBuf
        ? {
            image: finalBuf,
            caption: card,
            contextInfo: getNewsletterContextInfo(),
          }
        : {
            text: card,
            contextInfo: getNewsletterContextInfo(),
          }
    );
    return true;
  }

  // 4. .topanime — Trending / Top 10 Anime (sent from channel)
  if (cmd === 'topanime') {
    session.commandsCount += 1;
    saveSessionMetadata(session);

    const kitsuHeaders = { Accept: 'application/vnd.api+json' };
    const data = await fetchJsonWithTimeout(
      'https://kitsu.io/api/edge/trending/anime?limit=10',
      kitsuHeaders
    );
    const list: any[] = data?.data || [];
    if (list.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: toSmallCaps('unable to fetch top anime right now.'),
        contextInfo: getNewsletterContextInfo(),
      });
      return true;
    }

    const lines = list
      .map((item, idx) => {
        const t = item?.attributes?.canonicalTitle || 'Anime';
        const score = item?.attributes?.averageRating
          ? ` (${item.attributes.averageRating}%)`
          : '';
        return `┃ ${idx + 1}. ${toSmallCaps(t)}${score}`;
      })
      .join('\n');

    const card =
      `*╭▱▱─〇 (ᴛᴏᴘ ᴀɴɪᴍᴇ) 〇─▱╮*\n` +
      `${lines}\n` +
      `*╰⬤▱▱╾╸(ᴀɴɪᴍᴇ)─▱╯*`;

    const firstPoster = list[0]?.attributes?.posterImage?.large;
    const posterBuf = firstPoster ? await fetchBufferFromUrl(firstPoster) : undefined;
    if (posterBuf) {
      await sock.sendMessage(remoteJid, {
        image: await normalizeImageBufferForWhatsApp(posterBuf),
        caption: card,
        contextInfo: getNewsletterContextInfo(),
      });
    } else {
      await sock.sendMessage(remoteJid, {
        text: card,
        contextInfo: getNewsletterContextInfo(),
      });
    }
    return true;
  }

  // 5. .animequote — Iconic Anime Quotes (sent from channel, WITHOUT box design)
  if (cmd === 'animequote' || cmd === 'quoteanime') {
    session.commandsCount += 1;
    saveSessionMetadata(session);

    const q = ANIME_QUOTES[Math.floor(Math.random() * ANIME_QUOTES.length)];
    const msgText = `💬 "${toSmallCaps(q.quote)}"\n— *${toSmallCaps(q.character)}* (${toSmallCaps(q.anime)})`;
    await sock.sendMessage(remoteJid, {
      text: msgText,
      contextInfo: getNewsletterContextInfo(),
    });
    return true;
  }

  // 6. Waifu & Character Image Commands (.waifu, .neko, .shinobu, .megumin, .husbando, .animewall) (sent from channel, WITHOUT box design)
  if (SAFEBOORU_TAG_MAP[cmd]) {
    session.commandsCount += 1;
    saveSessionMetadata(session);

    const imgBuf = await fetchWaifuOrTagImageBuffer(cmd, argText, fetchBufferFromUrl);
    const finalBuf = imgBuf || (await getBotMenuImageBuffer()).buffer;
    const caption = `✨ ${toSmallCaps(cmd)}`;

    if (finalBuf) {
      await sock.sendMessage(remoteJid, {
        image: finalBuf,
        caption,
        contextInfo: getNewsletterContextInfo(),
      });
    } else {
      await sock.sendMessage(remoteJid, {
        text: caption,
        contextInfo: getNewsletterContextInfo(),
      });
    }
    return true;
  }

  // 7. Essential Anime Reaction Commands (.hug, .kiss, .pat, .slap, .cry, .smile) (sent from channel, WITHOUT box design)
  if (OTAKU_REACTION_VERBS[cmd]) {
    session.commandsCount += 1;
    saveSessionMetadata(session);

    const targetJid = extractTargetUserJid(msg, args);
    const senderNum = senderJid.split('@')[0];
    const targetNum = targetJid ? targetJid.split('@')[0] : null;
    const verb = OTAKU_REACTION_VERBS[cmd];

    const actionLine = targetNum
      ? `✨ @${senderNum} ${toSmallCaps(verb)} @${targetNum}`
      : `✨ @${senderNum} (${toSmallCaps(cmd)})`;
    const mentions = targetJid
      ? Array.from(new Set([senderJid, targetJid]))
      : [senderJid];

    let mediaUrl: string | null = null;
    const nekosReactionSet = new Set(['hug', 'kiss', 'pat', 'slap']);
    if (nekosReactionSet.has(cmd)) {
      const nk = await fetchJsonWithTimeout(`https://nekos.life/api/v2/img/${cmd}`);
      if (nk?.url) mediaUrl = nk.url;
    }
    if (!mediaUrl) {
      const otaku = await fetchJsonWithTimeout(
        `https://api.otakugifs.xyz/gif?reaction=${encodeURIComponent(cmd)}`
      );
      if (otaku?.url) mediaUrl = otaku.url;
    }

    let imgBuf: Buffer | undefined;
    if (mediaUrl) {
      const rawBuf = await fetchBufferFromUrl(mediaUrl);
      if (rawBuf && rawBuf.length > 512) {
        imgBuf = await normalizeImageBufferForWhatsApp(rawBuf);
      }
    }
    if (!imgBuf) {
      imgBuf = await fetchWaifuOrTagImageBuffer('waifu', '', fetchBufferFromUrl);
    }

    if (imgBuf) {
      await sock.sendMessage(remoteJid, {
        image: imgBuf,
        caption: actionLine,
        mentions,
        contextInfo: getNewsletterContextInfo(undefined, undefined, mentions),
      });
    } else {
      await sock.sendMessage(remoteJid, {
        text: actionLine,
        mentions,
        contextInfo: getNewsletterContextInfo(undefined, undefined, mentions),
      });
    }
    return true;
  }

  return false;
}
