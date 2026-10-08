export const FUN_MENU_SECTION =
  `*╭▱▱─〇 (ғᴜɴ) 〇─▱╮*\n` +
  `┃ ▢ ᴛʀᴜᴛʜ\n` +
  `┃ ▢ ᴅᴀʀᴇ\n` +
  `┃ ▢ sʜɪᴘ\n` +
  `┃ ▢ ʟᴏᴠᴇᴄᴀʟᴄ\n` +
  `┃ ▢ ʀᴀᴛᴇ\n` +
  `┃ ▢ 8ʙᴀʟʟ\n` +
  `┃ ▢ ᴊᴏᴋᴇ\n` +
  `┃ ▢ ғᴀᴄᴛ\n` +
  `┃ ▢ ǫᴜᴏᴛᴇ\n` +
  `┃ ▢ ʀᴏᴀsᴛ\n` +
  `┃ ▢ ᴄᴏᴍᴘʟɪᴍᴇɴᴛ\n` +
  `┃ ▢ ғʟɪᴘ\n` +
  `┃ ▢ ʀᴏʟʟ\n` +
  `┃ ▢ ᴘɪᴄᴋ\n` +
  `┃ ▢ ɪǫ\n` +
  `*╰⬤▱▱╾╸(ғᴜɴ)─▱╯*`;

const TRUTHS = [
  'What is your biggest secret in this group?',
  'Who was the last person you stalked on WhatsApp?',
  'Have you ever had a crush on someone in this group?',
  'What is the wildest lie you have ever told?',
  'What is your biggest unspoken fear?',
  'If you had to delete one contact from your phone, who would it be?',
  'What is the most embarrassing thing you have done recently?',
  'What would your friends say is your worst habit?',
];

const DARES = [
  'Send a voice note singing your favorite chorus in the group!',
  'Change your WhatsApp bio to "Number 1 fan of ᴀʟʟɪssᴀ ᴍᴅ" for 1 hour!',
  'Tag the 3rd person in your chat list and tell them they are amazing.',
  'Send a selfie or the last photo from your gallery in the group!',
  'Type your next 5 messages in ALL CAPS only.',
  'Compliment the group owner or an admin in 3 sentences.',
  'Tell a joke in a voice note without laughing!',
];

const EIGHT_BALL_ANSWERS = [
  'Yes, definitely! ✨',
  'It is 100% certain 🔥',
  'Without a doubt! ✅',
  'Most likely yes 🌟',
  'All signs point to yes 💫',
  'Ask again later ⏳',
  'Better not tell you now 🤫',
  'Cannot predict right now 🔮',
  'Do not count on it ❌',
  'My answer is no 🚫',
  'My sources say no 💀',
  'Very doubtful 🤔',
];

const JOKES = [
  'Why do programmers hate nature? Because it has too many bugs!',
  'Why did the developer go broke? Because they used up all their cache!',
  'Why do Java developers wear glasses? Because they cannot C#!',
  'How many programmers does it take to change a light bulb? None, that is a hardware problem.',
  'Two Wi-Fi antennas got married. The ceremony was okay, but the reception was amazing!',
  'Why was the math book sad? Because it had too many problems.',
];

const FACTS = [
  'A shrimp’s heart is located in its head.',
  'Octopuses have three hearts and blue blood.',
  'Honey never spoils: edible 3,000-year-old honey has been found in ancient tombs.',
  'Bananas are technically berries, while strawberries are not.',
  'An average cumulus cloud weighs around 500 tons.',
  'Dolphins have unique whistle names for each other.',
];

const QUOTES = [
  { author: 'Nelson Mandela', text: 'It always seems impossible until it is done.' },
  { author: 'Albert Einstein', text: 'Life is like riding a bicycle. To keep your balance, you must keep moving.' },
  { author: 'Steve Jobs', text: 'Stay hungry, stay foolish.' },
  { author: 'Confucius', text: 'Choose a job you love, and you will never have to work a day in your life.' },
  { author: 'Bruce Lee', text: 'Do not wait for opportunities, create them.' },
];

const ROASTS = [
  'Even Google cannot find any sense in what you just said.',
  'You are living proof that evolution sometimes takes a coffee break.',
  'Your brain Wi-Fi is still stuck on 2G.',
  'If laziness were an Olympic sport, you would have 10 gold medals by now.',
  'You bring everyone so much joy... whenever you leave the chat.',
];

const COMPLIMENTS = [
  'Your energy lights up the whole group with every message! ✨',
  'You have rare charisma and intelligence, never change! 👑',
  'This group is truly lucky to have you as a member! 💎',
  'Always stylish, always sharp, a true icon! 🔥',
  'Your presence makes every conversation ten times better! 🌟',
];

export async function handleFunCommand(params: {
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
    extractTargetUserJid,
    saveSessionMetadata,
  } = params;

  const sendSimpleFunReply = async (text: string, mentions?: string[]) => {
    await sock.sendMessage(
      remoteJid,
      {
        text,
        ...(mentions && mentions.length > 0 ? { mentions } : {}),
      },
      { quoted: msg }
    );
  };

  if (cmd === 'truth') {
    session.commandsCount += 1;
    saveSessionMetadata(session);
    const item = TRUTHS[Math.floor(Math.random() * TRUTHS.length)];
    await sendSimpleFunReply(`🎭 ${toSmallCaps('truth')} : ${toSmallCaps(item)}`);
    return true;
  }

  if (cmd === 'dare') {
    session.commandsCount += 1;
    saveSessionMetadata(session);
    const item = DARES[Math.floor(Math.random() * DARES.length)];
    await sendSimpleFunReply(`🔥 ${toSmallCaps('dare')} : ${toSmallCaps(item)}`);
    return true;
  }

  if (cmd === 'ship' || cmd === 'lovecalc') {
    session.commandsCount += 1;
    saveSessionMetadata(session);
    const targetJid = extractTargetUserJid(msg, args);
    if (!targetJid) {
      await sendSimpleFunReply(
        toSmallCaps(`mention a user or reply to their message with .${cmd} to test your compatibility.`)
      );
      return true;
    }
    const senderNum = senderJid.split('@')[0];
    const targetNum = targetJid.split('@')[0];
    const score = Math.floor(Math.random() * 101);
    const filled = Math.round(score / 10);
    const bar = '❤️'.repeat(filled) + '🖤'.repeat(10 - filled);
    const mentions = Array.from(new Set([senderJid, targetJid]));

    await sendSimpleFunReply(
      `💘 @${senderNum} x @${targetNum} : *${score}%*\n${bar}`,
      mentions
    );
    return true;
  }

  if (cmd === 'rate') {
    session.commandsCount += 1;
    saveSessionMetadata(session);
    const targetJid = extractTargetUserJid(msg, args);
    if (!targetJid && !argText) {
      await sendSimpleFunReply(
        toSmallCaps('mention a user or type something after .rate to get a rating out of 100.')
      );
      return true;
    }
    const score = Math.floor(Math.random() * 101);
    const subject = targetJid ? `@${targetJid.split('@')[0]}` : toSmallCaps(argText || 'you');
    const mentions = targetJid ? [targetJid] : [];

    await sendSimpleFunReply(`⭐ ${subject} : *${score}/100*`, mentions);
    return true;
  }

  if (cmd === '8ball') {
    session.commandsCount += 1;
    saveSessionMetadata(session);
    if (!argText) {
      await sendSimpleFunReply(
        toSmallCaps('ask a question after .8ball, for example: .8ball will i be rich?')
      );
      return true;
    }
    const ans = EIGHT_BALL_ANSWERS[Math.floor(Math.random() * EIGHT_BALL_ANSWERS.length)];
    await sendSimpleFunReply(`🎱 ${toSmallCaps(ans)}`);
    return true;
  }

  if (cmd === 'joke') {
    session.commandsCount += 1;
    saveSessionMetadata(session);
    const item = JOKES[Math.floor(Math.random() * JOKES.length)];
    await sendSimpleFunReply(`😂 ${toSmallCaps(item)}`);
    return true;
  }

  if (cmd === 'fact') {
    session.commandsCount += 1;
    saveSessionMetadata(session);
    const item = FACTS[Math.floor(Math.random() * FACTS.length)];
    await sendSimpleFunReply(`🧠 ${toSmallCaps(item)}`);
    return true;
  }

  if (cmd === 'quote') {
    session.commandsCount += 1;
    saveSessionMetadata(session);
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    await sendSimpleFunReply(`💬 "${toSmallCaps(q.text)}" — *${toSmallCaps(q.author)}*`);
    return true;
  }

  if (cmd === 'roast') {
    session.commandsCount += 1;
    saveSessionMetadata(session);
    const targetJid = extractTargetUserJid(msg, args);
    if (!targetJid) {
      await sendSimpleFunReply(
        toSmallCaps('mention a user or reply to their message with .roast to roast them.')
      );
      return true;
    }
    const targetNum = targetJid.split('@')[0];
    const item = ROASTS[Math.floor(Math.random() * ROASTS.length)];

    await sendSimpleFunReply(`🔥 @${targetNum} : ${toSmallCaps(item)}`, [targetJid]);
    return true;
  }

  if (cmd === 'compliment') {
    session.commandsCount += 1;
    saveSessionMetadata(session);
    const targetJid = extractTargetUserJid(msg, args);
    if (!targetJid) {
      await sendSimpleFunReply(
        toSmallCaps('mention a user or reply to their message with .compliment to compliment them.')
      );
      return true;
    }
    const targetNum = targetJid.split('@')[0];
    const item = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];

    await sendSimpleFunReply(`✨ @${targetNum} : ${toSmallCaps(item)}`, [targetJid]);
    return true;
  }

  if (cmd === 'flip') {
    session.commandsCount += 1;
    saveSessionMetadata(session);
    const side = Math.random() < 0.5 ? 'ʜᴇᴀᴅs' : 'ᴛᴀɪʟs';
    await sendSimpleFunReply(`🪙 ${side}`);
    return true;
  }

  if (cmd === 'roll') {
    session.commandsCount += 1;
    saveSessionMetadata(session);
    const max = Math.max(2, parseInt(args[0] || '6', 10) || 6);
    const val = Math.floor(Math.random() * max) + 1;
    await sendSimpleFunReply(`🎲 ${val} / ${max}`);
    return true;
  }

  if (cmd === 'pick') {
    session.commandsCount += 1;
    saveSessionMetadata(session);
    const choices = argText
      .split(/[,|/]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (choices.length < 2) {
      await sendSimpleFunReply(
        toSmallCaps('type .pick followed by options separated by commas, for example: .pick pizza, burger')
      );
      return true;
    }
    const chosen = choices[Math.floor(Math.random() * choices.length)];
    await sendSimpleFunReply(`🎯 ${toSmallCaps(chosen)}`);
    return true;
  }

  if (cmd === 'iq') {
    session.commandsCount += 1;
    saveSessionMetadata(session);
    const targetJid = extractTargetUserJid(msg, args) || senderJid;
    const targetNum = targetJid.split('@')[0];
    const score = Math.floor(Math.random() * 140) + 60;

    await sendSimpleFunReply(`🧠 @${targetNum} : *${score} ɪǫ*`, [targetJid]);
    return true;
  }

  return false;
}
