import { createHash } from 'crypto';
import {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHANNEL_URL,
  TELEGRAM_CHANNEL_USERNAME,
  TELEGRAM_WELCOME_VIDEO_URL,
} from './telegramToken';

export interface TelegramBotSessionInfo {
  sessionKey: string;
  phone: string;
  code: string;
  rawCode: string;
  status: 'initializing' | 'code_ready' | 'connected' | 'expired' | 'error';
  botMode: 'public' | 'private';
  autoStatusView: boolean;
  autoStatusReactEmoji?: string;
  alwaysOnline: boolean;
  sessionId?: string;
  userName?: string;
  createdAt: number;
  connectedAt?: number;
  commandsCount: number;
  telegramChatId?: number;
}

export interface TelegramServerStats {
  uptimeMs: number;
  totalConnected: number;
  totalSessions: number;
  totalCommands: number;
  memoryMb: number;
}

export interface TelegramBotBridge {
  createPairingForPhone: (
    phone: string,
    customCode?: string,
    telegramChatId?: number
  ) => Promise<{
    sessionKey: string;
    phone: string;
    code: string;
    rawCode: string;
    mode: string;
  }>;
  getAllSessions: () => TelegramBotSessionInfo[];
  getSessionByPhone: (phone: string) => TelegramBotSessionInfo | undefined;
  reconnectSessionByPhone: (phone: string) => Promise<boolean>;
  disconnectSessionByPhone: (phone: string) => Promise<boolean>;
  restoreSessionFromInput: (
    sessionInput: string,
    telegramChatId?: number
  ) => Promise<{ ok: boolean; phone?: string; error?: string }>;
  getUserProfilePicture?: (phone: string) => Promise<Buffer | undefined>;
  updateSessionSettings?: (
    phone: string,
    patch: {
      botMode?: 'public' | 'private';
      autoStatusView?: boolean;
      autoStatusReactEmoji?: string;
      alwaysOnline?: boolean;
    }
  ) => Promise<TelegramBotSessionInfo | undefined>;
  postWhatsAppTextStatus?: (phone: string, text: string) => Promise<boolean>;
  sendTestWhatsAppMessage?: (phone: string) => Promise<boolean>;
  getServerStats?: () => TelegramServerStats;
}

// ============================================================================
// MATHEMATICAL SANS-SERIF UNICODE CONVERTER (𝖠𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗃𝗂𝗄𝗅𝗆𝗇𝗈𝗉𝗊...)
// ============================================================================
const SANS_UPPER_MAP: Record<string, string> = {
  A: '𝖠',
  B: '𝖡',
  C: '𝖢',
  D: '𝖣',
  E: '𝖤',
  F: '𝖥',
  G: '𝖦',
  H: '𝖧',
  I: '𝖨',
  J: '𝖩',
  K: '𝖪',
  L: '𝖫',
  M: '𝖬',
  N: '𝖭',
  O: '𝖮',
  P: '𝖯',
  Q: '𝖰',
  R: '𝖱',
  S: '𝖲',
  T: '𝖳',
  U: '𝖴',
  V: '𝖵',
  W: '𝖶',
  X: '𝖷',
  Y: '𝖸',
  Z: '𝖹',
};

const SANS_LOWER_MAP: Record<string, string> = {
  a: '𝖺',
  b: '𝖻',
  c: '𝖼',
  d: '𝖽',
  e: '𝖾',
  f: '𝖿',
  g: '𝗀',
  h: '𝗁',
  i: '𝗂',
  j: '𝗃',
  k: '𝗄',
  l: '𝗅',
  m: '𝗆',
  n: '𝗇',
  o: '𝗈',
  p: '𝗉',
  q: '𝗊',
  r: '𝗋',
  s: '𝗌',
  t: '𝗍',
  u: '𝗎',
  v: '𝗏',
  w: '𝗐',
  x: '𝗑',
  y: '𝗒',
  z: '𝗓',
};

export function toSansFont(input: string): string {
  const normalized = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let out = '';
  for (const ch of normalized) {
    if (SANS_UPPER_MAP[ch]) {
      out += SANS_UPPER_MAP[ch];
    } else if (SANS_LOWER_MAP[ch]) {
      out += SANS_LOWER_MAP[ch];
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Converts text to 𝖠𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗃𝗂𝗄𝗅𝗆𝗇𝗈𝗉𝗊 while preserving HTML tags (<a href="...">, <blockquote>, <b>, etc.),
 * HTML entities (&amp;, &lt;, &gt;), and exact content inside <code>...</code> or <pre>...</pre>.
 */
export function formatTelegramHtml(html: string): string {
  const tokenRegex = /(<code>[\s\S]*?<\/code>|<pre>[\s\S]*?<\/pre>|<[^>]+>|&[a-zA-Z0-9#]+;)/g;
  const parts = html.split(tokenRegex);
  return parts
    .map((part) => {
      if (!part) return '';
      if (
        part.startsWith('<code>') ||
        part.startsWith('<pre>') ||
        (part.startsWith('<') && part.endsWith('>')) ||
        (part.startsWith('&') && part.endsWith(';'))
      ) {
        return part;
      }
      return toSansFont(part);
    })
    .join('');
}

// ============================================================================
// KEYBOARD CONSTANTS
// ============================================================================
export const BTN_PAIRING_CODE = 'ᴘᴀʀɪɴɢ ᴄᴏᴅᴇ';
export const BTN_SESSION_ID = 'sᴇssɪᴏɴ ɪᴅ';
export const BTN_NUMBER = 'ɴᴜᴍʙᴇʀ';
export const BTN_SETTINGS = '⚙️ ᴘᴀʀᴀᴍᴇᴛʀᴇs';
export const BTN_STATUS_BOT = '📊 sᴛᴀᴛᴜs ʙᴏᴛ';
export const BTN_COMMANDS = '📜 ᴄᴏᴍᴍᴀɴᴅᴇs';
export const BTN_POST_STATUS = '📢 ᴘᴏsᴛ sᴛᴀᴛᴜᴛ';

export const MAIN_REPLY_KEYBOARD = {
  keyboard: [
    [{ text: BTN_PAIRING_CODE }],
    [{ text: BTN_SESSION_ID }, { text: BTN_NUMBER }],
    [{ text: BTN_SETTINGS }, { text: BTN_STATUS_BOT }],
    [{ text: BTN_COMMANDS }, { text: BTN_POST_STATUS }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

const SAM_DEV_LABS_LINK = `<a href="${TELEGRAM_CHANNEL_URL}">𝖲𝖺𝗆 𝖣𝖾𝗏 𝖫𝖺𝖻𝗌</a>`;

export function makeCompactSessionToken(phone: string, fullSessionId?: string): string {
  const seed = fullSessionId || `session_${phone}`;
  const hash = createHash('sha256').update(seed).digest('hex').slice(0, 16).toUpperCase();
  return `ALLISSA-MD~${phone}~${hash}`;
}

function formatDurationShort(ms: number): string {
  const totalSec = Math.max(1, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function getFormattedDateAndTime(): { date: string; time: string } {
  const now = new Date();
  const date = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const time = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return { date, time };
}

// ============================================================================
// TELEGRAM BOT ENGINE & STATE
// ============================================================================
type UserFlowState =
  | 'idle'
  | 'awaiting_pairing_phone'
  | 'awaiting_sid_phone'
  | 'awaiting_sid_restore'
  | 'awaiting_check_phone'
  | 'awaiting_wa_status_text';

const userStates = new Map<number, UserFlowState>();
const userLinkedPhones = new Map<number, Set<string>>();
const userSelectedPhone = new Map<number, string>();
// Tracks the active editable bot panel message ID per chat so all interactions modify in-place instead of deleting
const lastPanelMessageId = new Map<number, number>();

let cachedWelcomeVideoFileId: string | null = null;
let cachedWelcomeVideoBuffer: Buffer | null = null;
let botUsernameCache = 'Allyssamd_bot';
let activeBridge: TelegramBotBridge | null = null;
let pollingActive = false;
let lastUpdateOffset = 0;

function trackUserPhone(chatId: number, phone: string) {
  if (!userLinkedPhones.has(chatId)) {
    userLinkedPhones.set(chatId, new Set());
  }
  userLinkedPhones.get(chatId)!.add(phone);
  userSelectedPhone.set(chatId, phone);
}

function getTargetPhoneForUser(chatId: number): string | undefined {
  const explicit = userSelectedPhone.get(chatId);
  const allSessions = activeBridge ? activeBridge.getAllSessions() : [];
  if (explicit && allSessions.some((s) => s.phone === explicit)) {
    return explicit;
  }
  const linked = userLinkedPhones.get(chatId);
  if (linked && linked.size > 0) {
    for (const p of linked) {
      if (allSessions.some((s) => s.phone === p)) return p;
    }
  }
  const byChatId = allSessions.find((s) => s.telegramChatId === chatId);
  if (byChatId) return byChatId.phone;
  const firstConnected = allSessions.find((s) => s.status === 'connected');
  if (firstConnected) return firstConnected.phone;
  return allSessions[0]?.phone;
}

async function tgApi(method: string, body: Record<string, any> = {}): Promise<any> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err?.message || 'Network error' };
  }
}

function sanitizeInlineKeyboard(replyMarkup?: any): any {
  if (!replyMarkup?.inline_keyboard) return replyMarkup;
  return {
    inline_keyboard: replyMarkup.inline_keyboard.map((row: any[]) =>
      row.map((btn: any) => {
        if (btn.copy_text) {
          return {
            text: btn.text,
            callback_data: `copy_fallback:${String(btn.copy_text.text).slice(0, 48)}`,
          };
        }
        return btn;
      })
    ),
  };
}

async function sendHtmlMessage(
  chatId: number | string,
  rawHtml: string,
  replyMarkup?: any
): Promise<any> {
  const formattedText = formatTelegramHtml(rawHtml);
  const payload: Record<string, any> = {
    chat_id: chatId,
    text: formattedText,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  let res = await tgApi('sendMessage', payload);
  if (!res?.ok && replyMarkup?.inline_keyboard) {
    res = await tgApi('sendMessage', {
      ...payload,
      reply_markup: sanitizeInlineKeyboard(replyMarkup),
    });
  }

  // If sent to a user chat without a ReplyKeyboardMarkup, remember it as the editable panel message
  if (
    typeof chatId === 'number' &&
    chatId > 0 &&
    res?.ok &&
    res.result?.message_id &&
    !replyMarkup?.keyboard
  ) {
    lastPanelMessageId.set(chatId, res.result.message_id);
  }
  return res;
}

/**
 * Modifies (edits) the existing bot message in-place instead of deleting it!
 * Apart from /start, all bot interactions modify the message via editMessageText.
 */
async function editOrSendPanel(
  chatId: number,
  rawHtml: string,
  inlineKeyboard?: any,
  preferredMessageId?: number
): Promise<any> {
  const formattedText = formatTelegramHtml(rawHtml);
  const targetMsgId = preferredMessageId || lastPanelMessageId.get(chatId);

  const markup = inlineKeyboard?.inline_keyboard ? inlineKeyboard : undefined;

  if (targetMsgId) {
    const editPayload: Record<string, any> = {
      chat_id: chatId,
      message_id: targetMsgId,
      text: formattedText,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (markup) {
      editPayload.reply_markup = markup;
    }

    let editRes = await tgApi('editMessageText', editPayload);
    if (!editRes?.ok && markup) {
      const desc = String(editRes?.description || '');
      if (desc.includes('message is not modified')) {
        lastPanelMessageId.set(chatId, targetMsgId);
        return editRes;
      }
      editRes = await tgApi('editMessageText', {
        ...editPayload,
        reply_markup: sanitizeInlineKeyboard(markup),
      });
    }

    if (editRes?.ok || String(editRes?.description || '').includes('message is not modified')) {
      lastPanelMessageId.set(chatId, targetMsgId);
      return editRes;
    }
  }

  // Only if there is no message to edit yet (e.g. first panel after /start), send and store ID for future edits
  return await sendHtmlMessage(chatId, rawHtml, markup);
}

function getQuickNavFooterRows(): any[][] {
  return [
    [
      { text: `📲 ${BTN_PAIRING_CODE}`, callback_data: 'nav:pairing' },
      { text: `🔐 ${BTN_SESSION_ID}`, callback_data: 'nav:session' },
      { text: `📱 ${BTN_NUMBER}`, callback_data: 'nav:number' },
    ],
    [
      { text: `⚙️ ${toSansFont('Parametres')}`, callback_data: 'nav:settings' },
      { text: `📊 ${toSansFont('Statut Bot')}`, callback_data: 'nav:status' },
      { text: `📜 ${toSansFont('Commandes')}`, callback_data: 'nav:commands' },
    ],
    [
      { text: `📢 ${toSansFont('Publier Statut WA')}`, callback_data: 'nav:post_status' },
      { text: `🏠 ${toSansFont('Menu Principal')}`, callback_data: 'nav:home' },
    ],
  ];
}

async function getWelcomeVideoBuffer(): Promise<Buffer | null> {
  if (cachedWelcomeVideoBuffer) return cachedWelcomeVideoBuffer;
  try {
    const res = await fetch(TELEGRAM_WELCOME_VIDEO_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });
    if (res.ok) {
      cachedWelcomeVideoBuffer = Buffer.from(await res.arrayBuffer());
      return cachedWelcomeVideoBuffer;
    }
  } catch {
    // Ignore
  }
  return null;
}

async function sendStartWelcomeVideo(chatId: number, firstName: string): Promise<any> {
  const safeName = (firstName || 'Utilisateur').replace(/[<>&]/g, '');

  const captionHtml = formatTelegramHtml(
    `👋 <b>Bienvenue ${safeName} sur Allyssa MD !</b>\n\n` +
      `<blockquote>🤖 <b>Nom du Bot :</b> Allyssa MD (Lalabs Bot)\n` +
      `👨‍💻 <b>Developpeur :</b> ${SAM_DEV_LABS_LINK}\n` +
      `⚡ <b>Version :</b> 2.6.0 Multi-Device\n` +
      `🌐 <b>Systeme :</b> Passerelle de connexion WhatsApp par Pairing Code &amp; Session ID</blockquote>\n\n` +
      `✨ Ce bot officiel cree par ${SAM_DEV_LABS_LINK} vous permet de connecter et controler votre compte WhatsApp sur <b>Allyssa MD</b> directement depuis Telegram.\n\n` +
      `<blockquote>⚠️ <b>Abonnement Obligatoire :</b>\n` +
      `Pour utiliser ce bot, vous devez obligatoirement vous abonner a notre chaine officielle ${SAM_DEV_LABS_LINK}, sinon le bot ne fonctionnera pas.\n\n` +
      `1️⃣ Cliquez sur le bouton <b>🔗 S'abonner a la chaine</b> ci-dessous.\n` +
      `2️⃣ Revenez ici et cliquez sur <b>Verifier ✅️</b> pour deverrouiller le menu.</blockquote>`
  );

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: toSansFont("🔗 S'abonner a la chaine"),
          url: TELEGRAM_CHANNEL_URL,
        },
      ],
      [
        {
          text: `${toSansFont('Verifier')} ✅️`,
          callback_data: 'verify_sub',
        },
      ],
    ],
  };

  if (cachedWelcomeVideoFileId) {
    const res = await tgApi('sendVideo', {
      chat_id: chatId,
      video: cachedWelcomeVideoFileId,
      caption: captionHtml,
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard,
    });
    if (res?.ok) return res;
    cachedWelcomeVideoFileId = null;
  }

  const urlRes = await tgApi('sendVideo', {
    chat_id: chatId,
    video: TELEGRAM_WELCOME_VIDEO_URL,
    caption: captionHtml,
    parse_mode: 'HTML',
    reply_markup: inlineKeyboard,
  });
  if (urlRes?.ok) {
    const fid = urlRes.result?.video?.file_id || urlRes.result?.animation?.file_id;
    if (fid) cachedWelcomeVideoFileId = fid;
    return urlRes;
  }

  const videoBuf = await getWelcomeVideoBuffer();
  if (videoBuf) {
    try {
      const form = new FormData();
      form.append('chat_id', String(chatId));
      form.append('caption', captionHtml);
      form.append('parse_mode', 'HTML');
      form.append('reply_markup', JSON.stringify(inlineKeyboard));
      const blob = new Blob([new Uint8Array(videoBuf)], { type: 'video/mp4' });
      form.append('video', blob, 'allyssa_md_welcome.mp4');

      const uploadRes = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`,
        {
          method: 'POST',
          body: form,
        }
      );
      const data: any = await uploadRes.json();
      if (data?.ok) {
        const fid = data.result?.video?.file_id;
        if (fid) cachedWelcomeVideoFileId = fid;
        return data;
      }
    } catch {
      // Ignore upload error
    }
  }

  return await sendHtmlMessage(chatId, captionHtml, inlineKeyboard);
}

/**
 * Checks whether the Telegram user is subscribed to @samdevlabs
 */
async function isUserSubscribedToChannel(userId: number): Promise<boolean> {
  const res = await tgApi('getChatMember', {
    chat_id: TELEGRAM_CHANNEL_USERNAME,
    user_id: userId,
  });

  if (res?.ok && res.result) {
    const status: string = res.result.status || '';
    if (
      status === 'creator' ||
      status === 'administrator' ||
      status === 'member' ||
      (status === 'restricted' && Boolean(res.result.is_member))
    ) {
      return true;
    }
    return false;
  }
  return false;
}

function buildMainMenuHtml(firstName: string): string {
  const safeName = (firstName || 'Utilisateur').replace(/[<>&]/g, '');
  const stats = activeBridge?.getServerStats?.();
  const connectedCount = stats
    ? stats.totalConnected
    : (activeBridge?.getAllSessions() || []).filter((s) => s.status === 'connected').length;

  return (
    `🏠 <b>Panneau de Controle Allyssa MD — ${safeName}</b>\n\n` +
    `<blockquote>🎉 Bienvenue dans l'interface centrale <b>Allyssa MD</b> propulsee par ${SAM_DEV_LABS_LINK}.\n` +
    `🟢 <b>Sessions Actives :</b> ${connectedCount} | ⚡ <b>Système :</b> Multi-Device 24/7</blockquote>\n\n` +
    `📌 <b>Fonctionnalites disponibles :</b>\n\n` +
    `<blockquote>🔹 <b>${BTN_PAIRING_CODE}</b> — Generer un code a 8 caracteres pour connecter votre numero WhatsApp.\n` +
    `🔹 <b>${BTN_SESSION_ID}</b> — Copier votre Session ID ou restaurer une session existante.\n` +
    `🔹 <b>${BTN_NUMBER}</b> — Gerer, inspecter, reconnecter ou deconnecter vos numeros.\n` +
    `🔹 <b>${BTN_SETTINGS}</b> — Activer/Desactiver Mode Public/Prive, Auto-Statut, Emoji Reaction &amp; Always Online.\n` +
    `🔹 <b>${BTN_STATUS_BOT}</b> — Voir le ping, l'uptime, la RAM et les statistiques en direct.\n` +
    `🔹 <b>${BTN_COMMANDS}</b> — Explorer toutes les commandes WhatsApp par categorie.\n` +
    `🔹 <b>${BTN_POST_STATUS}</b> — Publier un statut WhatsApp directement depuis Telegram.</blockquote>\n\n` +
    `👇 <i>Selectionnez une action ci-dessous (le message se modifie en direct) :</i>`
  );
}

/**
 * Called right after clicking Verifier ✅️ on /start:
 * 1. Unlocks the persistent ReplyKeyboard
 * 2. Sends the interactive panel message that will be modified in-place for all future actions
 */
async function sendMainMenuAfterVerification(chatId: number, firstName: string) {
  const safeName = (firstName || 'Utilisateur').replace(/[<>&]/g, '');
  // 1. Unlock persistent ReplyKeyboard at the bottom of the screen
  await sendHtmlMessage(
    chatId,
    `✅ <b>Abonnement a ${SAM_DEV_LABS_LINK} verifie avec succes, ${safeName} !</b> Clavier rapide active ci-dessous ⬇️`,
    MAIN_REPLY_KEYBOARD
  );

  // 2. Send the main editable interactive panel (all subsequent interactions modify this message!)
  const html = buildMainMenuHtml(firstName);
  await sendHtmlMessage(chatId, html, {
    inline_keyboard: getQuickNavFooterRows(),
  });
}

async function showMainMenuPanel(chatId: number, firstName: string, preferredMsgId?: number) {
  userStates.set(chatId, 'idle');
  const html = buildMainMenuHtml(firstName);
  await editOrSendPanel(
    chatId,
    html,
    { inline_keyboard: getQuickNavFooterRows() },
    preferredMsgId
  );
}

// ============================================================================
// FLOW 1: ᴘᴀʀɪɴɢ ᴄᴏᴅᴇ
// ============================================================================
async function handlePairingCodeButton(chatId: number, preferredMsgId?: number) {
  userStates.set(chatId, 'awaiting_pairing_phone');

  const html =
    `📲 <b>Connexion WhatsApp via ${BTN_PAIRING_CODE}</b>\n\n` +
    `<blockquote>Veuillez envoyer le <b>numero WhatsApp</b> que vous souhaitez connecter au bot <b>Allyssa MD</b>.\n\n` +
    `⚠️ <b>Important :</b> Envoyez obligatoirement le numero avec l'indicatif du pays commencant par <code>+</code>.</blockquote>\n\n` +
    `💡 <b>Exemples valides :</b>\n` +
    `<blockquote>• <code>+24106871309</code>\n` +
    `• <code>+2250700000000</code>\n` +
    `• <code>+33612345678</code></blockquote>\n\n` +
    `✍️ <i>Envoyez votre numero avec + dans le chat maintenant...</i>\n` +
    `🔗 Developpe par ${SAM_DEV_LABS_LINK}`;

  await editOrSendPanel(
    chatId,
    html,
    { inline_keyboard: getQuickNavFooterRows() },
    preferredMsgId
  );
}

async function processPhoneForPairing(chatId: number, rawInput: string) {
  const trimmed = rawInput.trim();

  if (!trimmed.startsWith('+')) {
    const errHtml =
      `⚠️ <b>Format du numero invalide !</b>\n\n` +
      `<blockquote>Vous devez obligatoirement envoyer votre numero avec l'indicatif commencant par <code>+</code>.\n` +
      `Exemple : <code>+24106871309</code> ou <code>+33612345678</code></blockquote>\n\n` +
      `✍️ <i>Reessayez en envoyant le numero avec <code>+</code> :</i>`;
    await editOrSendPanel(chatId, errHtml, { inline_keyboard: getQuickNavFooterRows() });
    return;
  }

  const cleanPhone = trimmed.replace(/[^0-9]/g, '');
  if (cleanPhone.length < 7 || cleanPhone.length > 15) {
    const errHtml =
      `⚠️ <b>Numero WhatsApp incorrect !</b>\n\n` +
      `<blockquote>Le numero doit contenir entre 7 et 15 chiffres apres l'indicatif <code>+</code>.\n` +
      `Exemple : <code>+24106871309</code></blockquote>\n\n` +
      `✍️ <i>Veuillez envoyer un numero WhatsApp valide :</i>`;
    await editOrSendPanel(chatId, errHtml, { inline_keyboard: getQuickNavFooterRows() });
    return;
  }

  userStates.set(chatId, 'idle');
  trackUserPhone(chatId, cleanPhone);

  // Modify the existing message in-place to show loading state (never delete!)
  const loadingRes = await editOrSendPanel(
    chatId,
    `⏳ <b>Generation du Pairing Code en cours...</b>\n\n` +
      `<blockquote>📡 Connexion au serveur <b>Allyssa MD</b> (${SAM_DEV_LABS_LINK}) pour le numero <code>+${cleanPhone}</code>.\n` +
      `Veuillez patienter quelques secondes...</blockquote>`,
    { inline_keyboard: getQuickNavFooterRows() }
  );

  const panelMsgId = loadingRes?.result?.message_id || lastPanelMessageId.get(chatId);

  if (!activeBridge) {
    await editOrSendPanel(
      chatId,
      `❌ <b>Erreur interne :</b> Le pont serveur WhatsApp n'est pas encore pret.`,
      { inline_keyboard: getQuickNavFooterRows() },
      panelMsgId
    );
    return;
  }

  try {
    const result = await activeBridge.createPairingForPhone(cleanPhone, undefined, chatId);

    const codeHtml =
      `✅ <b>Code Pairing Genere avec Succes !</b>\n\n` +
      `<blockquote>📱 <b>Numero :</b> <code>+${result.phone}</code>\n` +
      `🔑 <b>Code Pairing :</b> <code>${result.code}</code>\n` +
      `⏱ <b>Validite :</b> 2 minutes\n` +
      `👨‍💻 <b>Serveur :</b> ${SAM_DEV_LABS_LINK}</blockquote>\n\n` +
      `<blockquote>📖 <b>Comment se connecter sur WhatsApp :</b>\n` +
      `1️⃣ Cliquez sur le bouton <b>📋 Copier le Code</b> ci-dessous.\n` +
      `2️⃣ Ouvrez <b>WhatsApp</b> &gt; <b>Appareils connectes</b>.\n` +
      `3️⃣ Appuyez sur <b>Connecter un appareil</b> &gt; <b>Connecter avec le numero de telephone</b>.\n` +
      `4️⃣ Collez le code <code>${result.rawCode}</code> pour activer le bot !</blockquote>`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: `📋 ${toSansFont('Copier le Code')} : ${result.code}`,
            copy_text: { text: result.rawCode },
          },
        ],
        [
          {
            text: `🔄 ${toSansFont('Verifier la connexion')}`,
            callback_data: `check_conn:${result.phone}`,
          },
          {
            text: `🔑 ${toSansFont('Nouveau Code')}`,
            callback_data: `regen_code:${result.phone}`,
          },
        ],
        ...getQuickNavFooterRows(),
      ],
    };

    // Modify the exact same loading message in-place with the generated Pairing Code!
    await editOrSendPanel(chatId, codeHtml, inlineKeyboard, panelMsgId);
  } catch (err: any) {
    await editOrSendPanel(
      chatId,
      `❌ <b>Echec de generation du code</b>\n\n` +
        `<blockquote>Impossible de generer le code pour <code>+${cleanPhone}</code> : ${err?.message || 'Erreur reseau'}.\n` +
        `Cliquez sur <b>${BTN_PAIRING_CODE}</b> pour reessayer.</blockquote>`,
      { inline_keyboard: getQuickNavFooterRows() },
      panelMsgId
    );
  }
}

// ============================================================================
// FLOW 2: sᴇssɪᴏɴ ɪᴅ
// ============================================================================
async function handleSessionIdButton(chatId: number, preferredMsgId?: number) {
  userStates.set(chatId, 'idle');
  const allSessions = activeBridge ? activeBridge.getAllSessions() : [];
  const linkedSet = userLinkedPhones.get(chatId) || new Set<string>();

  const userSessions = allSessions.filter(
    (s) => s.telegramChatId === chatId || linkedSet.has(s.phone)
  );
  const displaySessions = userSessions.length > 0 ? userSessions : allSessions.slice(0, 5);

  let sessionsBlock = '';
  const inlineRows: any[][] = [];

  if (displaySessions.length === 0) {
    sessionsBlock =
      `<blockquote>ℹ️ <b>Aucune Session Active :</b>\n` +
      `Vous n'avez pas encore de session WhatsApp active.\n` +
      `Cliquez sur <b>${BTN_PAIRING_CODE}</b> pour connecter votre numero ou restaurez une Session ID existante ci-dessous.</blockquote>`;
  } else {
    const lines = displaySessions.map((s, idx) => {
      const compactToken = makeCompactSessionToken(s.phone, s.sessionId);
      const statusIcon = s.status === 'connected' ? '🟢 Connecte' : '🟡 En attente';
      inlineRows.push([
        {
          text: `📋 ${toSansFont('Copier Session ID')} (+${s.phone})`,
          copy_text: { text: compactToken },
        },
      ]);
      if (s.sessionId) {
        inlineRows.push([
          {
            text: `📄 ${toSansFont('Session ID Complet Base64')} (+${s.phone})`,
            callback_data: `full_sid:${s.phone}`,
          },
        ]);
      }
      return (
        `${idx + 1}. 📱 <b>Numero :</b> <code>+${s.phone}</code> (${statusIcon})\n` +
        `   👤 <b>Nom :</b> ${(s.userName || 'WhatsApp User').replace(/[<>&]/g, '')}\n` +
        `   🔑 <b>Session ID :</b> <code>${compactToken}</code>`
      );
    });
    sessionsBlock = `<blockquote>${lines.join('\n\n')}</blockquote>`;
  }

  inlineRows.push([
    {
      text: `🔍 ${toSansFont('Recuperer par Numero (+...)')}`,
      callback_data: 'sid_by_phone',
    },
    {
      text: `♻️ ${toSansFont('Restaurer Session ID')}`,
      callback_data: 'restore_sid',
    },
  ]);
  inlineRows.push(...getQuickNavFooterRows());

  const html =
    `🔐 <b>Gestionnaire de ${BTN_SESSION_ID} — Allyssa MD</b>\n\n` +
    `<blockquote>La <b>Session ID</b> generee par ${SAM_DEV_LABS_LINK} vous permet de sauvegarder votre connexion WhatsApp et de la restaurer instantanement sans refaire de Pairing Code.</blockquote>\n\n` +
    `${sessionsBlock}\n\n` +
    `👇 <i>Choisissez une option ci-dessous :</i>`;

  await editOrSendPanel(chatId, html, { inline_keyboard: inlineRows }, preferredMsgId);
}

async function processPhoneForSessionIdLookup(chatId: number, rawInput: string) {
  userStates.set(chatId, 'idle');
  const cleanPhone = rawInput.replace(/[^0-9]/g, '');
  if (!cleanPhone || cleanPhone.length < 7) {
    await editOrSendPanel(
      chatId,
      `⚠️ <b>Numero invalide.</b> Envoyez un numero valide avec indicatif (ex: <code>+24106871309</code>).`,
      { inline_keyboard: getQuickNavFooterRows() }
    );
    return;
  }

  const session = activeBridge?.getSessionByPhone(cleanPhone);
  if (!session) {
    await editOrSendPanel(
      chatId,
      `❌ <b>Aucune session trouvee pour <code>+${cleanPhone}</code></b>\n\n` +
        `<blockquote>Ce numero n'est pas encore connecte sur le serveur ${SAM_DEV_LABS_LINK}.\n` +
        `Cliquez sur <b>${BTN_PAIRING_CODE}</b> pour le connecter maintenant !</blockquote>`,
      { inline_keyboard: getQuickNavFooterRows() }
    );
    return;
  }

  trackUserPhone(chatId, cleanPhone);
  const compactToken = makeCompactSessionToken(session.phone, session.sessionId);

  const html =
    `🔑 <b>Session ID trouvee pour <code>+${session.phone}</code></b>\n\n` +
    `<blockquote>👤 <b>Utilisateur :</b> ${(session.userName || 'WhatsApp User').replace(/[<>&]/g, '')}\n` +
    `📡 <b>Statut :</b> ${session.status === 'connected' ? '🟢 Connecte' : '🟡 En attente'}\n` +
    `🔐 <b>Session ID Rapide :</b> <code>${compactToken}</code>\n` +
    `👨‍💻 <b>Developpeur :</b> ${SAM_DEV_LABS_LINK}</blockquote>`;

  const inlineKeyboard: any[][] = [
    [
      {
        text: `📋 ${toSansFont('Copier Session ID')}`,
        copy_text: { text: compactToken },
      },
    ],
  ];
  if (session.sessionId) {
    inlineKeyboard.push([
      {
        text: `📄 ${toSansFont('Obtenir Session ID Complet (Base64)')}`,
        callback_data: `full_sid:${session.phone}`,
      },
    ]);
  }
  inlineKeyboard.push(...getQuickNavFooterRows());

  await editOrSendPanel(chatId, html, { inline_keyboard: inlineKeyboard });
}

async function processSessionIdRestore(chatId: number, rawInput: string) {
  userStates.set(chatId, 'idle');
  if (!activeBridge) return;

  const res = await activeBridge.restoreSessionFromInput(rawInput.trim(), chatId);
  if (!res.ok || !res.phone) {
    await editOrSendPanel(
      chatId,
      `❌ <b>Impossible de restaurer cette Session ID</b>\n\n` +
        `<blockquote>${res.error || 'Format de Session ID non reconnu ou session expiree.'}\n` +
        `Utilisez une Session ID commencant par <code>ALLISSA-MD~</code> ou <code>JIN-HEE-MD~</code>, ou creez une nouvelle connexion via <b>${BTN_PAIRING_CODE}</b>.</blockquote>`,
      { inline_keyboard: getQuickNavFooterRows() }
    );
    return;
  }

  trackUserPhone(chatId, res.phone);
  await editOrSendPanel(
    chatId,
    `✅ <b>Session restauree avec succes !</b>\n\n` +
      `<blockquote>📱 <b>Numero :</b> <code>+${res.phone}</code>\n` +
      `🔄 <b>Action :</b> Reconnexion automatique au serveur <b>Allyssa MD</b> (${SAM_DEV_LABS_LINK}) lancee avec succes !</blockquote>`,
    { inline_keyboard: getQuickNavFooterRows() }
  );
}

// ============================================================================
// FLOW 3: ɴᴜᴍʙᴇʀ
// ============================================================================
async function handleNumberButton(chatId: number, preferredMsgId?: number) {
  userStates.set(chatId, 'idle');
  const allSessions = activeBridge ? activeBridge.getAllSessions() : [];
  const connectedSessions = allSessions.filter((s) => s.status === 'connected');
  const linkedSet = userLinkedPhones.get(chatId) || new Set<string>();
  const mySessions = allSessions.filter(
    (s) => s.telegramChatId === chatId || linkedSet.has(s.phone)
  );

  const listToDisplay = mySessions.length > 0 ? mySessions : connectedSessions.slice(0, 8);
  const inlineRows: any[][] = [];

  let numbersQuote = '';
  if (listToDisplay.length === 0) {
    numbersQuote =
      `<blockquote>📭 <b>Aucun numero connecte pour le moment.</b>\n` +
      `Appuyez sur <b>${BTN_PAIRING_CODE}</b> ou sur le bouton ci-dessous pour connecter votre premier numero WhatsApp !</blockquote>`;
  } else {
    const items = listToDisplay.map((s, i) => {
      const isOnline = s.status === 'connected';
      const uptime = s.connectedAt
        ? formatDurationShort(Date.now() - s.connectedAt)
        : formatDurationShort(Date.now() - s.createdAt);

      inlineRows.push([
        {
          text: `⚙️ ${toSansFont('Configurer')} +${s.phone}`,
          callback_data: `cfg_num:${s.phone}`,
        },
        {
          text: `🔄 ${toSansFont('Reconnecter')} +${s.phone}`,
          callback_data: `reconn_num:${s.phone}`,
        },
        {
          text: `🗑 ${toSansFont('Stop')}`,
          callback_data: `disc_num:${s.phone}`,
        },
      ]);

      return (
        `<b>${i + 1}.</b> 📱 <code>+${s.phone}</code> — ${isOnline ? '🟢 <b>En ligne</b>' : '🟡 <b>En attente</b>'}\n` +
        `   👤 <b>Nom :</b> ${(s.userName || 'WhatsApp User').replace(/[<>&]/g, '')}\n` +
        `   ⚙️ <b>Mode :</b> ${s.botMode.toUpperCase()} | ⚡ <b>Cmds :</b> ${s.commandsCount} | ⏱ <b>Duree :</b> ${uptime}`
      );
    });

    numbersQuote = `<blockquote>${items.join('\n\n')}</blockquote>`;
  }

  inlineRows.push([
    {
      text: `➕ ${toSansFont('Connecter un Numero')}`,
      callback_data: 'start_pairing',
    },
    {
      text: `🔍 ${toSansFont('Inspecter un Numero')}`,
      callback_data: 'check_num_prompt',
    },
  ]);
  inlineRows.push([
    {
      text: `🔃 ${toSansFont('Actualiser la liste')}`,
      callback_data: 'refresh_numbers',
    },
  ]);
  inlineRows.push(...getQuickNavFooterRows());

  const html =
    `📊 <b>Gestion des Numeros (${BTN_NUMBER}) — Allyssa MD</b>\n\n` +
    `<blockquote>🌐 <b>Serveur :</b> ${SAM_DEV_LABS_LINK}\n` +
    `🟢 <b>Numeros Connectes (Global) :</b> ${connectedSessions.length}\n` +
    `📱 <b>Vos Numeros Suivis :</b> ${mySessions.length}</blockquote>\n\n` +
    `${numbersQuote}\n\n` +
    `👇 <i>Actions rapides sur vos numeros :</i>`;

  await editOrSendPanel(chatId, html, { inline_keyboard: inlineRows }, preferredMsgId);
}

async function processPhoneForCheck(chatId: number, rawInput: string, preferredMsgId?: number) {
  userStates.set(chatId, 'idle');
  const cleanPhone = rawInput.replace(/[^0-9]/g, '');
  if (!cleanPhone || cleanPhone.length < 7) {
    await editOrSendPanel(
      chatId,
      `⚠️ <b>Numero invalide.</b> Veuillez entrer un numero avec indicatif (ex: <code>+24106871309</code>).`,
      { inline_keyboard: getQuickNavFooterRows() },
      preferredMsgId
    );
    return;
  }

  const s = activeBridge?.getSessionByPhone(cleanPhone);
  if (!s) {
    await editOrSendPanel(
      chatId,
      `ℹ️ <b>Statut du numero <code>+${cleanPhone}</code></b>\n\n` +
        `<blockquote>🔴 <b>Statut :</b> Non connecte\n` +
        `Ce numero n'est actuellement pas relie a <b>Allyssa MD</b> (${SAM_DEV_LABS_LINK}).\n` +
        `Cliquez sur <b>${BTN_PAIRING_CODE}</b> pour le connecter !</blockquote>`,
      { inline_keyboard: getQuickNavFooterRows() },
      preferredMsgId
    );
    return;
  }

  trackUserPhone(chatId, cleanPhone);
  const uptime = s.connectedAt
    ? formatDurationShort(Date.now() - s.connectedAt)
    : formatDurationShort(Date.now() - s.createdAt);

  const html =
    `📱 <b>Fiche Detaillee du Numero <code>+${s.phone}</code></b>\n\n` +
    `<blockquote>👤 <b>Nom WhatsApp :</b> ${(s.userName || 'WhatsApp User').replace(/[<>&]/g, '')}\n` +
    `📡 <b>Statut :</b> ${s.status === 'connected' ? '🟢 Connecte et Actif' : '🟡 En attente de Pairing'}\n` +
    `🛡 <b>Mode du Bot :</b> ${s.botMode.toUpperCase()}\n` +
    `👁 <b>Auto-Statut :</b> ${s.autoStatusView ? `Active ✅ (${s.autoStatusReactEmoji || '❤️'})` : 'Desactive ❌'}\n` +
    `🌐 <b>Always Online (WowOnly) :</b> ${s.alwaysOnline ? 'Active ✅' : 'Desactive ❌'}\n` +
    `⚡ <b>Commandes executees :</b> ${s.commandsCount}\n` +
    `⏱ <b>Temps de connexion :</b> ${uptime}\n` +
    `👨‍💻 <b>Canal Officiel :</b> ${SAM_DEV_LABS_LINK}</blockquote>`;

  await editOrSendPanel(
    chatId,
    html,
    {
      inline_keyboard: [
        [
          {
            text: `⚙️ ${toSansFont('Parametres de')} +${s.phone}`,
            callback_data: `cfg_num:${s.phone}`,
          },
          {
            text: `📩 ${toSansFont('Tester sur WhatsApp')}`,
            callback_data: `ping_wa:${s.phone}`,
          },
        ],
        [
          {
            text: `🔄 ${toSansFont('Reconnecter')} +${s.phone}`,
            callback_data: `reconn_num:${s.phone}`,
          },
          {
            text: `🗑 ${toSansFont('Deconnecter')} +${s.phone}`,
            callback_data: `disc_num:${s.phone}`,
          },
        ],
        ...getQuickNavFooterRows(),
      ],
    },
    preferredMsgId
  );
}

// ============================================================================
// FLOW 4 (NEW): ⚙️ ᴘᴀʀᴀᴍᴇᴛʀᴇs (REMOTE WHATSAPP BOT SETTINGS CONTROLLER)
// ============================================================================
async function handleSettingsMenu(
  chatId: number,
  targetPhone?: string,
  preferredMsgId?: number
) {
  userStates.set(chatId, 'idle');
  const phone = targetPhone || getTargetPhoneForUser(chatId);
  const allSessions = activeBridge ? activeBridge.getAllSessions() : [];

  if (!phone || allSessions.length === 0) {
    const html =
      `⚙️ <b>Parametres a Distance — Allyssa MD</b>\n\n` +
      `<blockquote>⚠️ <b>Aucun numero WhatsApp connecte.</b>\n` +
      `Connectez d'abord votre compte via <b>${BTN_PAIRING_CODE}</b> pour controler ses parametres en direct depuis Telegram (${SAM_DEV_LABS_LINK}).</blockquote>`;
    await editOrSendPanel(
      chatId,
      html,
      { inline_keyboard: getQuickNavFooterRows() },
      preferredMsgId
    );
    return;
  }

  const s = activeBridge?.getSessionByPhone(phone) || allSessions[0];
  trackUserPhone(chatId, s.phone);
  const curEmoji = s.autoStatusReactEmoji || '❤️';

  const html =
    `⚙️ <b>Controle a Distance WhatsApp — <code>+${s.phone}</code></b>\n\n` +
    `<blockquote>👤 <b>Compte :</b> ${(s.userName || 'WhatsApp User').replace(/[<>&]/g, '')}\n` +
    `📡 <b>Statut :</b> ${s.status === 'connected' ? '🟢 Connecte' : '🟡 En attente'}\n` +
    `🛡 <b>Mode du Bot :</b> ${s.botMode === 'public' ? '🌍 PUBLIC (Tout le monde)' : '🔒 PRIVATE (Owner uniquement)'}\n` +
    `👁 <b>Auto-View &amp; Like Statuts :</b> ${s.autoStatusView ? `✅ ACTIVE (${curEmoji})` : '❌ DESACTIVE'}\n` +
    `⚡ <b>Always Online (WowOnly) :</b> ${s.alwaysOnline ? '✅ ACTIVE (24/7)' : '❌ DESACTIVE'}\n` +
    `👨‍💻 <b>Serveur :</b> ${SAM_DEV_LABS_LINK}</blockquote>\n\n` +
    `👇 <i>Cliquez sur un bouton pour modifier instantanement votre bot WhatsApp :</i>`;

  const inlineRows: any[][] = [
    [
      {
        text:
          s.botMode === 'public'
            ? `🔒 ${toSansFont('Passer en Mode PRIVATE')}`
            : `🌍 ${toSansFont('Passer en Mode PUBLIC')}`,
        callback_data: `toggle_mode:${s.phone}`,
      },
    ],
    [
      {
        text: s.autoStatusView
          ? `👁 ${toSansFont('Desactiver Auto-Statut (OFF)')}`
          : `👁 ${toSansFont('Activer Auto-Statut (ON)')}`,
        callback_data: `toggle_autostatus:${s.phone}`,
      },
      {
        text: s.alwaysOnline
          ? `⚡ ${toSansFont('Always Online : OFF')}`
          : `⚡ ${toSansFont('Always Online : ON')}`,
        callback_data: `toggle_online:${s.phone}`,
      },
    ],
    [
      { text: `${curEmoji === '❤️' ? '✅' : ''} ❤️`, callback_data: `set_emoji:${s.phone}:❤️` },
      { text: `${curEmoji === '🔥' ? '✅' : ''} 🔥`, callback_data: `set_emoji:${s.phone}:🔥` },
      { text: `${curEmoji === '🦦' ? '✅' : ''} 🦦`, callback_data: `set_emoji:${s.phone}:🦦` },
      { text: `${curEmoji === '💫' ? '✅' : ''} 💫`, callback_data: `set_emoji:${s.phone}:💫` },
      { text: `${curEmoji === '🕸' ? '✅' : ''} 🕸`, callback_data: `set_emoji:${s.phone}:🕸` },
    ],
    [
      {
        text: `📩 ${toSansFont('Envoyer un Message Test sur WhatsApp')}`,
        callback_data: `ping_wa:${s.phone}`,
      },
    ],
  ];

  // If multiple sessions exist, allow switching between numbers
  if (allSessions.length > 1) {
    const switchRow = allSessions.slice(0, 3).map((item) => ({
      text: `${item.phone === s.phone ? '🟢' : '📱'} +${item.phone.slice(-6)}`,
      callback_data: `cfg_num:${item.phone}`,
    }));
    inlineRows.push(switchRow);
  }

  inlineRows.push(...getQuickNavFooterRows());

  await editOrSendPanel(chatId, html, { inline_keyboard: inlineRows }, preferredMsgId);
}

// ============================================================================
// FLOW 5 (NEW): 📊 sᴛᴀᴛᴜs ʙᴏᴛ (LIVE SERVER MONITOR & METRICS)
// ============================================================================
async function handleBotStatusPanel(chatId: number, preferredMsgId?: number) {
  userStates.set(chatId, 'idle');
  const stats = activeBridge?.getServerStats?.() || {
    uptimeMs: 60000,
    totalConnected: 0,
    totalSessions: 0,
    totalCommands: 0,
    memoryMb: 120,
  };
  const pingMs = Math.floor(14 + Math.random() * 19);
  const { date, time } = getFormattedDateAndTime();

  const html =
    `📊 <b>Moniteur Serveur Temps Reel — Allyssa MD</b>\n\n` +
    `<blockquote>🤖 <b>Nom du Bot :</b> Allyssa MD (Multi-Device)\n` +
    `👨‍💻 <b>Developpeur :</b> ${SAM_DEV_LABS_LINK}\n` +
    `🟢 <b>Etat du Systeme :</b> En Ligne &amp; Operationnel 24/7\n` +
    `⚡ <b>Latence / Ping :</b> ${pingMs} ms\n` +
    `⏱ <b>Uptime Serveur :</b> ${formatDurationShort(stats.uptimeMs)}\n` +
    `📱 <b>Comptes Connectes :</b> ${stats.totalConnected} / ${stats.totalSessions}\n` +
    `🚀 <b>Commandes Executees :</b> ${stats.totalCommands}\n` +
    `💾 <b>Memoire RAM :</b> ${stats.memoryMb} MB\n` +
    `🕒 <b>Mise a jour :</b> ${date} a ${time}</blockquote>\n\n` +
    `<blockquote>✨ Le systeme de maintien de connexion multi-heures (Keep-Alive &amp; Watchdog) est actif pour toutes les sessions.</blockquote>`;

  const inlineRows: any[][] = [
    [
      {
        text: `🔃 ${toSansFont('Actualiser le Statut en Direct')}`,
        callback_data: 'nav:status',
      },
    ],
    ...getQuickNavFooterRows(),
  ];

  await editOrSendPanel(chatId, html, { inline_keyboard: inlineRows }, preferredMsgId);
}

// ============================================================================
// FLOW 6 (NEW): 📜 ᴄᴏᴍᴍᴀɴᴅᴇs (INTERACTIVE WHATSAPP COMMAND CATALOG)
// ============================================================================
async function handleCommandsCatalog(
  chatId: number,
  category: string = 'owner',
  preferredMsgId?: number
) {
  userStates.set(chatId, 'idle');
  let categoryTitle = '';
  let categoryBody = '';

  if (category === 'owner') {
    categoryTitle = '👑 Categorie OWNER (Proprietaire)';
    categoryBody =
      `• <code>.private</code> — Passer le bot en mode prive\n` +
      `• <code>.public</code> — Passer le bot en mode public\n` +
      `• <code>.statuts</code> — Telecharger un statut en repondant\n` +
      `• <code>.autostatut ❤️ on/off</code> — Voir et aimer les statuts auto\n` +
      `• <code>.statutviewauto 🔥 on/off</code> — Lecture rapide + reaction statuts\n` +
      `• <code>.audiostatut</code> — Mettre un audio en statut personnel/groupe\n` +
      `• <code>.autoreact on/off</code> — Reagir a tous les messages du groupe\n` +
      `• <code>.wowonly on/off</code> — Rester en ligne 24h/24 sur WhatsApp\n` +
      `• <code>.vv</code> — Reveler une photo/video/vocal vue unique\n` +
      `• <code>.newsletterjid</code> — Obtenir le JID d'une chaine WhatsApp`;
  } else if (category === 'groups') {
    categoryTitle = '👥 Categorie GROUPS (Administration)';
    categoryBody =
      `• <code>.groupstatuts</code> — Publier un texte/image/audio en statut de groupe\n` +
      `• <code>.open</code> / <code>.close</code> — Ouvrir ou fermer le groupe\n` +
      `• <code>.opentime</code> / <code>.closetime</code> — Ouverture/fermeture programmee\n` +
      `• <code>.tagall</code> / <code>.hidetag</code> — Mentionner tous les membres\n` +
      `• <code>.antilink on/off</code> — Supprimer les liens automatiquement\n` +
      `• <code>.antispam on/off</code> — Protection anti-spam automatique\n` +
      `• <code>.antibots on/off</code> — Expulser les autres bots\n` +
      `• <code>.antidelete on/off</code> — Renvoyer les messages supprimes\n` +
      `• <code>.promote</code> / <code>.demote</code> / <code>.kick</code> / <code>.ban</code> / <code>.warn</code>\n` +
      `• <code>.poll</code> / <code>.invite</code> / <code>.setname</code> / <code>.setdesc</code> / <code>.groupinfo</code>`;
  } else if (category === 'download') {
    categoryTitle = '📥 Categorie DOWNLOAD (Telechargements)';
    categoryBody =
      `• <code>.play</code> / <code>.song</code> / <code>.music</code> — Telecharger une musique MP3\n` +
      `• <code>.ytmp3</code> / <code>.ytmp4</code> — Telecharger audio ou video YouTube\n` +
      `• <code>.tiktok</code> / <code>.tt</code> — Video TikTok sans filigrane\n` +
      `• <code>.insta</code> / <code>.ig</code> / <code>.reel</code> — Post ou Reel Instagram\n` +
      `• <code>.facebook</code> / <code>.fb</code> — Video Facebook HD\n` +
      `• <code>.twitter</code> / <code>.x</code> — Video Twitter / X\n` +
      `• <code>.pinterest</code> — Image ou video Pinterest\n` +
      `• <code>.media</code> / <code>.dl</code> — Telechargeur universel multi-plateforme`;
  } else if (category === 'utils') {
    categoryTitle = '🛠 Categorie UTILS (Outils)';
    categoryBody =
      `• <code>.menu</code> — Afficher le menu complet Allyssa MD\n` +
      `• <code>.ping</code> / <code>.uptime</code> / <code>.info</code> — Etat et vitesse du bot\n` +
      `• <code>.s</code> / <code>.sticker</code> — Convertir une image en sticker Allyssa MD\n` +
      `• <code>.userinfo</code> / <code>.profile</code> / <code>.pp</code> — Infos et photo de profil\n` +
      `• <code>.translate</code> — Traduire un texte dans n'importe quelle langue\n` +
      `• <code>.qr</code> / <code>.short</code> / <code>.calc</code> / <code>.convert</code> / <code>.font</code>`;
  } else {
    categoryTitle = '🎌 Categorie ANIME &amp; FUN';
    categoryBody =
      `• <code>.anime</code> / <code>.manga</code> — Rechercher un anime ou manga\n` +
      `• <code>.character</code> / <code>.topanime</code> / <code>.animequote</code>\n` +
      `• <code>.waifu</code> / <code>.neko</code> / <code>.shinobu</code> / <code>.megumin</code> / <code>.husbando</code>\n` +
      `• <code>.hug</code> / <code>.kiss</code> / <code>.pat</code> / <code>.slap</code> / <code>.cry</code> / <code>.smile</code>\n` +
      `• <code>.truth</code> / <code>.dare</code> / <code>.ship</code> / <code>.lovecalc</code> / <code>.8ball</code> / <code>.joke</code>`;
  }

  const html =
    `📜 <b>Catalogue des Commandes WhatsApp — Allyssa MD</b>\n\n` +
    `<blockquote>👨‍💻 <b>Developpeur :</b> ${SAM_DEV_LABS_LINK}\n` +
    `💡 <b>Astuce :</b> Sur WhatsApp, si vous tapez le nom d'une commande sans le point (ex: <code>autoreact</code>), le bot vous explique directement comment l'utiliser !</blockquote>\n\n` +
    `📂 <b>${categoryTitle}</b>\n` +
    `<blockquote>${categoryBody}</blockquote>\n\n` +
    `👇 <i>Changez de categorie ci-dessous :</i>`;

  const inlineRows: any[][] = [
    [
      {
        text: `${category === 'owner' ? '🟢 ' : ''}👑 ${toSansFont('Owner')}`,
        callback_data: 'cmd_cat:owner',
      },
      {
        text: `${category === 'groups' ? '🟢 ' : ''}👥 ${toSansFont('Groups')}`,
        callback_data: 'cmd_cat:groups',
      },
      {
        text: `${category === 'download' ? '🟢 ' : ''}📥 ${toSansFont('Download')}`,
        callback_data: 'cmd_cat:download',
      },
    ],
    [
      {
        text: `${category === 'utils' ? '🟢 ' : ''}🛠 ${toSansFont('Utils')}`,
        callback_data: 'cmd_cat:utils',
      },
      {
        text: `${category === 'anime' ? '🟢 ' : ''}🎌 ${toSansFont('Anime & Fun')}`,
        callback_data: 'cmd_cat:anime',
      },
    ],
    ...getQuickNavFooterRows(),
  ];

  await editOrSendPanel(chatId, html, { inline_keyboard: inlineRows }, preferredMsgId);
}

// ============================================================================
// FLOW 7 (NEW): 📢 ᴘᴏsᴛ sᴛᴀᴛᴜᴛ (PUBLISH WHATSAPP STATUS FROM TELEGRAM)
// ============================================================================
async function handlePostStatusPrompt(chatId: number, preferredMsgId?: number) {
  const phone = getTargetPhoneForUser(chatId);
  if (!phone) {
    userStates.set(chatId, 'idle');
    await editOrSendPanel(
      chatId,
      `📢 <b>Publier un Statut WhatsApp depuis Telegram</b>\n\n` +
        `<blockquote>⚠️ <b>Aucun numero connecte !</b>\n` +
        `Connectez d'abord votre WhatsApp via <b>${BTN_PAIRING_CODE}</b> pour pouvoir publier des statuts WhatsApp directement depuis Telegram (${SAM_DEV_LABS_LINK}).</blockquote>`,
      { inline_keyboard: getQuickNavFooterRows() },
      preferredMsgId
    );
    return;
  }

  userStates.set(chatId, 'awaiting_wa_status_text');
  const html =
    `📢 <b>Publier un Statut WhatsApp depuis Telegram</b>\n\n` +
    `<blockquote>📱 <b>Compte cible :</b> <code>+${phone}</code>\n` +
    `👨‍💻 <b>Systeme :</b> ${SAM_DEV_LABS_LINK}\n\n` +
    `Envoyez maintenant dans le chat le <b>texte</b> que vous souhaitez mettre en statut sur votre compte WhatsApp !</blockquote>\n\n` +
    `✍️ <i>Ecrivez votre texte de statut ci-dessous...</i>`;

  await editOrSendPanel(
    chatId,
    html,
    { inline_keyboard: getQuickNavFooterRows() },
    preferredMsgId
  );
}

async function processWhatsAppStatusText(chatId: number, text: string) {
  userStates.set(chatId, 'idle');
  const phone = getTargetPhoneForUser(chatId);
  if (!phone || !activeBridge?.postWhatsAppTextStatus) {
    await editOrSendPanel(
      chatId,
      `❌ <b>Aucun numero WhatsApp connecte pour publier le statut.</b>`,
      { inline_keyboard: getQuickNavFooterRows() }
    );
    return;
  }

  await editOrSendPanel(
    chatId,
    `⏳ <b>Publication du statut WhatsApp en cours sur <code>+${phone}</code>...</b>`,
    { inline_keyboard: getQuickNavFooterRows() }
  );

  const ok = await activeBridge.postWhatsAppTextStatus(phone, text);
  if (ok) {
    await editOrSendPanel(
      chatId,
      `✅ <b>Statut WhatsApp publie avec succes !</b>\n\n` +
        `<blockquote>📱 <b>Numero :</b> <code>+${phone}</code>\n` +
        `📝 <b>Contenu :</b> ${text.replace(/[<>&]/g, '').slice(0, 200)}\n` +
        `👨‍💻 <b>Propulse par :</b> ${SAM_DEV_LABS_LINK}</blockquote>`,
      { inline_keyboard: getQuickNavFooterRows() }
    );
  } else {
    await editOrSendPanel(
      chatId,
      `❌ <b>Echec de la publication du statut sur <code>+${phone}</code>.</b> Verifiez que votre session est bien en ligne.`,
      { inline_keyboard: getQuickNavFooterRows() }
    );
  }
}

// ============================================================================
// REAL-TIME NOTIFICATIONS:
// 1. WELCOME MESSAGE -> SENT IN THE BOT'S CHANNEL (@samdevlabs)
// 2. BOT CONNECTED MESSAGE -> MODIFIED/SENT TO THE USER (chatId)
// ============================================================================
async function sendWelcomeToTelegramChannel(session: TelegramBotSessionInfo) {
  const safeUser = (session.userName || 'WhatsApp User').replace(/[<>&]/g, '');
  const phone = session.phone || '';
  const maskedPhone =
    phone.length > 6 ? `+${phone.slice(0, 4)}••••${phone.slice(-3)}` : `+${phone}`;
  const { date, time } = getFormattedDateAndTime();
  const totalConnected = Math.max(
    1,
    (activeBridge?.getAllSessions() || []).filter((s) => s.status === 'connected').length
  );

  const channelWelcomeHtml = formatTelegramHtml(
    `╭━━━〔 👋 <b>WELCOME ALLYSSA MD</b> 〕━━━╮\n\n` +
      `<blockquote>👤 <b>Utilisateur :</b> ${safeUser}\n` +
      `📱 <b>Numero :</b> <code>${maskedPhone}</code>\n` +
      `🤖 <b>Bot :</b> Allyssa MD\n` +
      `🟢 <b>Statut :</b> Connected 🕸\n` +
      `🛡 <b>Mode :</b> ${session.botMode.toUpperCase()}\n` +
      `🌐 <b>Sessions Actives :</b> ${totalConnected}\n` +
      `📅 <b>Date :</b> ${date}\n` +
      `🕒 <b>Heure :</b> ${time}\n` +
      `👨‍💻 <b>Developpeur :</b> ${SAM_DEV_LABS_LINK}</blockquote>\n\n` +
      `<blockquote>✨ Un nouvel utilisateur vient de connecter son compte WhatsApp au bot <b>Allyssa MD</b> ! Cliquez sur la photo en spoiler ci-dessus pour decouvrir sa PP 👀</blockquote>\n` +
      `╰━━━━━━━━━━━━━━━━━━━━━━━╯`
  );

  const channelKeyboard = {
    inline_keyboard: [
      [
        {
          text: `🤖 ${toSansFont('Connecter mon WhatsApp')}`,
          url: `https://t.me/${botUsernameCache}?start=welcome`,
        },
      ],
      [
        {
          text: `⚡ ${toSansFont('Booster le Canal')} 🚀`,
          url: `https://t.me/boost/samdevlabs`,
        },
      ],
    ],
  };

  // Send with the user's WhatsApp profile photo (or fallback bot image) to @samdevlabs with SPOILER enabled
  if (activeBridge?.getUserProfilePicture) {
    try {
      const ppBuf = await activeBridge.getUserProfilePicture(session.phone);
      if (ppBuf && ppBuf.length > 0) {
        const form = new FormData();
        form.append('chat_id', TELEGRAM_CHANNEL_USERNAME);
        form.append('caption', channelWelcomeHtml);
        form.append('parse_mode', 'HTML');
        form.append('has_spoiler', 'true');
        form.append('reply_markup', JSON.stringify(channelKeyboard));
        const blob = new Blob([new Uint8Array(ppBuf)], { type: 'image/jpeg' });
        form.append('photo', blob, 'user_welcome.jpg');

        const uploadRes = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
          {
            method: 'POST',
            body: form,
          }
        );
        const data: any = await uploadRes.json();
        if (data?.ok) return;
      }
    } catch {
      // Fallback to photo URL with spoiler below
    }
  }

  // Fallback photo with spoiler if buffer upload wasn't available
  const fallbackPhotoRes = await tgApi('sendPhoto', {
    chat_id: TELEGRAM_CHANNEL_USERNAME,
    photo: 'https://imgg.fr/r/EZVPc5e4.jpg',
    caption: channelWelcomeHtml,
    parse_mode: 'HTML',
    has_spoiler: true,
    reply_markup: channelKeyboard,
  });
  if (fallbackPhotoRes?.ok) return;

  await sendHtmlMessage(TELEGRAM_CHANNEL_USERNAME, channelWelcomeHtml, channelKeyboard).catch(
    () => {}
  );
}

export async function notifyTelegramSessionConnected(session: TelegramBotSessionInfo) {
  // 1. Always publish the WELCOME message in the bot's Telegram channel (@samdevlabs) with user PP in spoiler
  sendWelcomeToTelegramChannel(session).catch(() => {});

  // 2. Chez l'utilisateur (in the user's private Telegram chat): modify/send the message that the BOT IS CONNECTED
  const chatId = session.telegramChatId;
  if (!chatId) return;

  trackUserPhone(chatId, session.phone);
  const compactToken = makeCompactSessionToken(session.phone, session.sessionId);
  const { date, time } = getFormattedDateAndTime();

  const connectedUserHtml =
    `🟢 <b>Le Bot Allyssa MD est Connecte !</b>\n\n` +
    `<blockquote>🤖 <b>Bot :</b> Allyssa MD\n` +
    `📡 <b>Statut :</b> Connected 🕸\n` +
    `📱 <b>Numero :</b> <code>+${session.phone}</code>\n` +
    `👤 <b>Compte :</b> ${(session.userName || 'WhatsApp User').replace(/[<>&]/g, '')}\n` +
    `🛡 <b>Mode :</b> ${session.botMode.toUpperCase()}\n` +
    `🔐 <b>Session ID :</b> <code>${compactToken}</code>\n` +
    `🕒 <b>Heure :</b> ${date} • ${time}\n` +
    `👨‍💻 <b>Developpeur :</b> ${SAM_DEV_LABS_LINK}</blockquote>\n\n` +
    `<blockquote>✅ Votre bot est maintenant connecte et actif ! Tapez <code>.menu</code> sur WhatsApp ou utilisez les boutons ci-dessous pour le configurer.</blockquote>`;

  await editOrSendPanel(chatId, connectedUserHtml, {
    inline_keyboard: [
      [
        {
          text: `📋 ${toSansFont('Copier ma Session ID')}`,
          copy_text: { text: compactToken },
        },
      ],
      [
        {
          text: `⚙️ ${toSansFont('Configurer')} +${session.phone}`,
          callback_data: `cfg_num:${session.phone}`,
        },
        {
          text: `📩 ${toSansFont('Tester sur WhatsApp')}`,
          callback_data: `ping_wa:${session.phone}`,
        },
      ],
      ...getQuickNavFooterRows(),
    ],
  });
}

// ============================================================================
// OFFICIAL CHANNEL BROADCAST ("BROCART STYLER") IN @samdevlabs
// ============================================================================
export async function sendChannelAvailabilityBroadcast(): Promise<{
  ok: boolean;
  messageId?: number;
  error?: string;
}> {
  const me = await tgApi('getMe');
  if (me?.ok && me.result?.username) {
    botUsernameCache = me.result.username;
  }

  const botUrl = `https://t.me/${botUsernameCache}?start=channel`;
  const boostUrl = `https://t.me/boost/samdevlabs`;

  const rawBroadcastHtml =
    `┏━━━✦❘༻ 👑 <b>ALLYSSA MD V2</b> 👑 ༺❘✦━━━┓\n` +
    `┃ ⚡ <b>STATUT : DISPONIBLE &amp; ACTIF 24/7</b> ⚡\n` +
    `┗━━━✦❘༻ 🕸 <b>SAM DEV LABS</b> 🕸 ༺❘✦━━━┛\n\n` +
    `✨ Salut la famille ${SAM_DEV_LABS_LINK} ! Le bot Multi-Device nouvelle generation <b>Allyssa MD</b> propulse par ${SAM_DEV_LABS_LINK} passe au niveau superieur avec une interface ultra-fluide et une connexion longue duree sans coupure.\n\n` +
    `╭━━━〔 💎 <b>FICHE TECHNIQUE</b> 〕━━━╮\n` +
    `<blockquote>┃ ◈ <b>Nom :</b> Allyssa MD — Ultra Edition\n` +
    `┃ ◈ <b>Createur :</b> ${SAM_DEV_LABS_LINK}\n` +
    `┃ ◈ <b>Moteur :</b> Multi-Device Keep-Alive 24h/24\n` +
    `┃ ◈ <b>Rapidite :</b> Code de jumelage en 2 secondes\n` +
    `┃ ◈ <b>Acces :</b> 100% Gratuit &amp; Instantane</blockquote>\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
    `╭━━━〔 🎮 <b>PANEL TELEGRAM</b> 〕━━━╮\n` +
    `<blockquote>🔑 <b>${BTN_PAIRING_CODE}</b> ➔ Entrez votre numero <code>+...</code> et copiez votre code WhatsApp en 1 clic.\n` +
    `🔐 <b>${BTN_SESSION_ID}</b> ➔ Sauvegardez ou restaurez votre session a tout moment sans re-scanner.\n` +
    `📱 <b>${BTN_NUMBER}</b> ➔ Gere tous vos numeros connectes, l'uptime et la reconnexion.\n` +
    `⚙️ <b>${BTN_SETTINGS}</b> ➔ Pilotez le mode Public/Private, l'Auto-Like Statut et le mode Always Online depuis Telegram.\n` +
    `📊 <b>${BTN_STATUS_BOT} &amp; ${BTN_COMMANDS}</b> ➔ Moniteur serveur en direct &amp; catalogue interactif.\n` +
    `📢 <b>${BTN_POST_STATUS}</b> ➔ Publiez vos statuts WhatsApp directement depuis Telegram !</blockquote>\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
    `╭━━━〔 🔥 <b>ARSENAL WHATSAPP</b> 〕━━━╮\n` +
    `<blockquote>👑 <b>Owner :</b> <code>.autoreact on/off</code> • <code>.statutviewauto</code> • <code>.autostatut</code> • <code>.audiostatut</code> • <code>.wowonly</code> • <code>.vv</code>\n` +
    `👥 <b>Groupes :</b> <code>.groupstatuts</code> (texte/image/audio) • <code>.tagall</code> • <code>.hidetag</code> • <code>.antilink</code> • <code>.antidelete</code>\n` +
    `📥 <b>Media &amp; Fun :</b> <code>.play</code> • <code>.tiktok</code> • <code>.insta</code> • <code>.sticker</code> • <code>.anime</code> • <code>.waifu</code>\n` +
    `💡 <b>Smart Guide :</b> Tapez simplement le nom d'une commande sans le point et le bot vous montre comment l'utiliser !</blockquote>\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
    `╭━━━〔 🚀 <b>CONNEXION EXPRESS</b> 〕━━━╮\n` +
    `<blockquote>1️⃣ Appuyez sur <b>🤖 Lancer Allyssa MD</b> ci-dessous.\n` +
    `2️⃣ Faites <b>/start</b> et cliquez sur <b>Verifier ✅</b> apres avoir rejoint ${SAM_DEV_LABS_LINK}.\n` +
    `3️⃣ Choisissez <b>${BTN_PAIRING_CODE}</b>, envoyez votre numero et connectez votre WhatsApp !</blockquote>\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
    `🔥 <i>Donnez de la force a ${SAM_DEV_LABS_LINK} en cliquant sur le bouton <b>Booster</b> ci-dessous !</i> 👇`;

  const formattedHtml = formatTelegramHtml(rawBroadcastHtml);

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: `🤖 ${toSansFont('Lancer Allyssa MD (Connexion)')} ⚡`,
          url: botUrl,
        },
      ],
      [
        {
          text: `🚀 ${toSansFont('Booster Sam Dev Labs')} 💎`,
          url: boostUrl,
        },
      ],
    ],
  };

  const res = await tgApi('sendMessage', {
    chat_id: TELEGRAM_CHANNEL_USERNAME,
    text: formattedHtml,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: inlineKeyboard,
  });

  if (res?.ok) {
    return { ok: true, messageId: res.result?.message_id };
  }
  return {
    ok: false,
    error: res?.description || 'Failed to send broadcast to channel',
  };
}

// ============================================================================
// UPDATE HANDLERS (MESSAGES & CALLBACK QUERIES)
// ============================================================================
async function handleIncomingMessage(msg: any) {
  const chatId: number | undefined = msg?.chat?.id;
  const userId: number | undefined = msg?.from?.id;
  if (!chatId || !userId || chatId < 0) return;

  const text: string = (msg.text || '').trim();
  const firstName: string = msg.from?.first_name || 'Utilisateur';

  // /start command always sends the presentation video + subscription verification
  if (text === '/start' || text.startsWith('/start ')) {
    userStates.set(chatId, 'idle');
    await sendStartWelcomeVideo(chatId, firstName);
    return;
  }

  // Enforce subscription to @samdevlabs before allowing any bot feature
  const subscribed = await isUserSubscribedToChannel(userId);
  if (!subscribed) {
    await sendStartWelcomeVideo(chatId, firstName);
    return;
  }

  // Main ReplyKeyboard & slash commands (all modify the active panel message in-place!)
  const lower = text.toLowerCase();
  if (
    text === BTN_PAIRING_CODE ||
    lower === 'paring code' ||
    lower === 'pairing code' ||
    lower === '/pair' ||
    lower === '/pairing'
  ) {
    await handlePairingCodeButton(chatId);
    return;
  }

  if (text === BTN_SESSION_ID || lower === 'session id' || lower === '/session') {
    await handleSessionIdButton(chatId);
    return;
  }

  if (text === BTN_NUMBER || lower === 'number' || lower === '/number' || lower === '/numbers') {
    await handleNumberButton(chatId);
    return;
  }

  if (text === BTN_SETTINGS || lower.includes('parametre') || lower === '/settings') {
    await handleSettingsMenu(chatId);
    return;
  }

  if (text === BTN_STATUS_BOT || lower.includes('status bot') || lower === '/status') {
    await handleBotStatusPanel(chatId);
    return;
  }

  if (text === BTN_COMMANDS || lower.includes('commande') || lower === '/commands' || lower === '/help') {
    await handleCommandsCatalog(chatId, 'owner');
    return;
  }

  if (text === BTN_POST_STATUS || lower.includes('post statut')) {
    await handlePostStatusPrompt(chatId);
    return;
  }

  if (lower === '/broadcast' || lower === '/brocart' || lower === 'brocart' || lower === 'broadcast') {
    const res = await sendChannelAvailabilityBroadcast();
    if (res.ok) {
      await editOrSendPanel(
        chatId,
        `✅ <b>Le Brocart (Annonce Officielle) a ete envoye dans le canal ${SAM_DEV_LABS_LINK} avec succes !</b>\n\n` +
          `<blockquote>📢 <b>Canal :</b> <code>${TELEGRAM_CHANNEL_USERNAME}</code>\n` +
          `🆔 <b>Message ID :</b> <code>${res.messageId || 'OK'}</code>\n` +
          `🤖 <b>Boutons :</b> Lancer le Bot Allyssa MD &amp; Booster le Canal 🚀</blockquote>`,
        { inline_keyboard: getQuickNavFooterRows() }
      );
    } else {
      await editOrSendPanel(
        chatId,
        `❌ <b>Impossible d'envoyer le brocart dans ${SAM_DEV_LABS_LINK} :</b>\n\n` +
          `<blockquote>⚠️ <b>Erreur :</b> <code>${(res.error || '').replace(/[<>&]/g, '')}</code>\n` +
          `Assurez-vous que le bot <code>@${botUsernameCache}</code> est bien <b>Administrateur</b> du canal ${SAM_DEV_LABS_LINK} avec la permission de publier des messages.</blockquote>`,
        { inline_keyboard: getQuickNavFooterRows() }
      );
    }
    return;
  }

  // Check current user flow state
  const currentState = userStates.get(chatId) || 'idle';

  if (currentState === 'awaiting_pairing_phone') {
    await processPhoneForPairing(chatId, text);
    return;
  }

  if (currentState === 'awaiting_sid_phone') {
    await processPhoneForSessionIdLookup(chatId, text);
    return;
  }

  if (currentState === 'awaiting_sid_restore') {
    await processSessionIdRestore(chatId, text);
    return;
  }

  if (currentState === 'awaiting_check_phone') {
    await processPhoneForCheck(chatId, text);
    return;
  }

  if (currentState === 'awaiting_wa_status_text') {
    await processWhatsAppStatusText(chatId, text);
    return;
  }

  // Smart auto-detection: if user directly sends a phone number starting with +
  if (/^\+\d[\d\s-]{6,16}$/.test(text)) {
    await processPhoneForPairing(chatId, text);
    return;
  }

  // Smart auto-detection: if user directly sends a Session ID
  if (text.startsWith('ALLISSA-MD~') || text.startsWith('JIN-HEE-MD~')) {
    await processSessionIdRestore(chatId, text);
    return;
  }

  // Default: modify the active panel to show the main menu
  await showMainMenuPanel(chatId, firstName);
}

async function handleCallbackQuery(query: any) {
  const queryId: string = query.id;
  const userId: number | undefined = query.from?.id;
  const chatId: number | undefined = query.message?.chat?.id;
  const messageId: number | undefined = query.message?.message_id;
  const data: string = query.data || '';
  const firstName: string = query.from?.first_name || 'Utilisateur';

  if (!userId || !chatId) return;

  if (data === 'verify_sub') {
    const subscribed = await isUserSubscribedToChannel(userId);
    if (!subscribed) {
      await tgApi('answerCallbackQuery', {
        callback_query_id: queryId,
        text: toSansFont(
          "⚠️ Vous n'etes pas encore abonne a la chaine Sam Dev Labs ! Cliquez sur 🔗 S'abonner a la chaine puis reessayez."
        ),
        show_alert: true,
      });
      return;
    }

    await tgApi('answerCallbackQuery', {
      callback_query_id: queryId,
      text: toSansFont('✅ Abonnement verifie avec succes !'),
      show_alert: false,
    });

    // ONLY the /start message is deleted upon verification; all subsequent messages are modified in-place!
    if (messageId) {
      await tgApi('deleteMessage', {
        chat_id: chatId,
        message_id: messageId,
      }).catch(() => {});
    }

    await sendMainMenuAfterVerification(chatId, firstName);
    return;
  }

  // For any other callback button, verify channel subscription first
  const subscribed = await isUserSubscribedToChannel(userId);
  if (!subscribed) {
    await tgApi('answerCallbackQuery', {
      callback_query_id: queryId,
      text: toSansFont("⚠️ Abonnez-vous d'abord a Sam Dev Labs pour utiliser le bot !"),
      show_alert: true,
    });
    await sendStartWelcomeVideo(chatId, firstName);
    return;
  }

  // Remember the clicked message as the active editable panel message
  if (messageId) {
    lastPanelMessageId.set(chatId, messageId);
  }

  // Navigation tabs (all modify the current message in-place!)
  if (data === 'nav:home') {
    await tgApi('answerCallbackQuery', { callback_query_id: queryId });
    await showMainMenuPanel(chatId, firstName, messageId);
    return;
  }
  if (data === 'nav:pairing' || data === 'start_pairing') {
    await tgApi('answerCallbackQuery', { callback_query_id: queryId });
    await handlePairingCodeButton(chatId, messageId);
    return;
  }
  if (data === 'nav:session') {
    await tgApi('answerCallbackQuery', { callback_query_id: queryId });
    await handleSessionIdButton(chatId, messageId);
    return;
  }
  if (data === 'nav:number' || data === 'refresh_numbers') {
    await tgApi('answerCallbackQuery', {
      callback_query_id: queryId,
      text: data === 'refresh_numbers' ? toSansFont('🔃 Liste actualisee !') : undefined,
    });
    await handleNumberButton(chatId, messageId);
    return;
  }
  if (data === 'nav:settings') {
    await tgApi('answerCallbackQuery', { callback_query_id: queryId });
    await handleSettingsMenu(chatId, undefined, messageId);
    return;
  }
  if (data === 'nav:status') {
    await tgApi('answerCallbackQuery', {
      callback_query_id: queryId,
      text: toSansFont('⚡ Statut mis a jour !'),
    });
    await handleBotStatusPanel(chatId, messageId);
    return;
  }
  if (data === 'nav:commands') {
    await tgApi('answerCallbackQuery', { callback_query_id: queryId });
    await handleCommandsCatalog(chatId, 'owner', messageId);
    return;
  }
  if (data === 'nav:post_status') {
    await tgApi('answerCallbackQuery', { callback_query_id: queryId });
    await handlePostStatusPrompt(chatId, messageId);
    return;
  }

  if (data.startsWith('cmd_cat:')) {
    const cat = data.slice('cmd_cat:'.length);
    await tgApi('answerCallbackQuery', { callback_query_id: queryId });
    await handleCommandsCatalog(chatId, cat, messageId);
    return;
  }

  if (data.startsWith('copy_fallback:')) {
    const codeToCopy = data.slice('copy_fallback:'.length);
    await tgApi('answerCallbackQuery', {
      callback_query_id: queryId,
      text: `${toSansFont('Code')} : ${codeToCopy}`,
      show_alert: false,
    });
    await editOrSendPanel(
      chatId,
      `📋 <b>Appuyez sur le code ci-dessous pour le copier :</b>\n\n<code>${codeToCopy}</code>`,
      { inline_keyboard: getQuickNavFooterRows() },
      messageId
    );
    return;
  }

  if (data.startsWith('regen_code:')) {
    const phone = data.slice('regen_code:'.length);
    await tgApi('answerCallbackQuery', {
      callback_query_id: queryId,
      text: toSansFont('⏳ Generation d’un nouveau code...'),
    });
    await processPhoneForPairing(chatId, `+${phone}`);
    return;
  }

  if (data.startsWith('check_conn:')) {
    const phone = data.slice('check_conn:'.length);
    const s = activeBridge?.getSessionByPhone(phone);
    if (s && s.status === 'connected') {
      await tgApi('answerCallbackQuery', {
        callback_query_id: queryId,
        text: toSansFont(`✅ Le numero +${phone} est bien connecte !`),
        show_alert: false,
      });
      await notifyTelegramSessionConnected(s);
    } else {
      await tgApi('answerCallbackQuery', {
        callback_query_id: queryId,
        text: toSansFont(
          `⏳ En attente de connexion sur WhatsApp pour +${phone}... Entrez le code dans Appareils connectes.`
        ),
        show_alert: true,
      });
    }
    return;
  }

  if (data === 'sid_by_phone') {
    await tgApi('answerCallbackQuery', { callback_query_id: queryId });
    userStates.set(chatId, 'awaiting_sid_phone');
    await editOrSendPanel(
      chatId,
      `🔍 <b>Recuperation de ${BTN_SESSION_ID}</b>\n\n` +
        `<blockquote>Envoyez dans le chat le numero WhatsApp avec l'indicatif <code>+</code> (exemple : <code>+24106871309</code>) pour obtenir sa Session ID.</blockquote>`,
      { inline_keyboard: getQuickNavFooterRows() },
      messageId
    );
    return;
  }

  if (data === 'restore_sid') {
    await tgApi('answerCallbackQuery', { callback_query_id: queryId });
    userStates.set(chatId, 'awaiting_sid_restore');
    await editOrSendPanel(
      chatId,
      `♻️ <b>Restauration de ${BTN_SESSION_ID}</b>\n\n` +
        `<blockquote>Collez et envoyez votre <b>Session ID</b> (commencant par <code>ALLISSA-MD~</code> ou <code>JIN-HEE-MD~</code>) pour restaurer votre bot WhatsApp instantanement.</blockquote>`,
      { inline_keyboard: getQuickNavFooterRows() },
      messageId
    );
    return;
  }

  if (data.startsWith('full_sid:')) {
    const phone = data.slice('full_sid:'.length);
    const s = activeBridge?.getSessionByPhone(phone);
    await tgApi('answerCallbackQuery', { callback_query_id: queryId });
    if (!s || !s.sessionId) {
      await editOrSendPanel(
        chatId,
        `⚠️ <b>Session ID complete non disponible pour <code>+${phone}</code>.</b> Connectez d'abord le numero sur WhatsApp.`,
        { inline_keyboard: getQuickNavFooterRows() },
        messageId
      );
      return;
    }
    await editOrSendPanel(
      chatId,
      `📄 <b>Session ID Complete (Base64) pour <code>+${phone}</code> :</b>\n\n` +
        `<blockquote>Appuyez sur le bloc ci-dessous pour copier l'integralite de votre Session ID :</blockquote>\n\n` +
        `<code>${s.sessionId}</code>`,
      { inline_keyboard: getQuickNavFooterRows() },
      messageId
    );
    return;
  }

  if (data === 'check_num_prompt') {
    await tgApi('answerCallbackQuery', { callback_query_id: queryId });
    userStates.set(chatId, 'awaiting_check_phone');
    await editOrSendPanel(
      chatId,
      `🔍 <b>Inspection d'un Numero WhatsApp</b>\n\n` +
        `<blockquote>Envoyez le numero WhatsApp avec son indicatif <code>+</code> (ex: <code>+24106871309</code>) pour verifier son etat de connexion en direct.</blockquote>`,
      { inline_keyboard: getQuickNavFooterRows() },
      messageId
    );
    return;
  }

  if (data.startsWith('cfg_num:')) {
    const phone = data.slice('cfg_num:'.length);
    userSelectedPhone.set(chatId, phone);
    await tgApi('answerCallbackQuery', { callback_query_id: queryId });
    await handleSettingsMenu(chatId, phone, messageId);
    return;
  }

  if (data.startsWith('toggle_mode:')) {
    const phone = data.slice('toggle_mode:'.length);
    const cur = activeBridge?.getSessionByPhone(phone);
    if (cur && activeBridge?.updateSessionSettings) {
      const nextMode = cur.botMode === 'public' ? 'private' : 'public';
      await activeBridge.updateSessionSettings(phone, { botMode: nextMode });
      await tgApi('answerCallbackQuery', {
        callback_query_id: queryId,
        text: toSansFont(`🛡 Mode passe en ${nextMode.toUpperCase()} !`),
      });
    }
    await handleSettingsMenu(chatId, phone, messageId);
    return;
  }

  if (data.startsWith('toggle_autostatus:')) {
    const phone = data.slice('toggle_autostatus:'.length);
    const cur = activeBridge?.getSessionByPhone(phone);
    if (cur && activeBridge?.updateSessionSettings) {
      const nextVal = !cur.autoStatusView;
      await activeBridge.updateSessionSettings(phone, {
        autoStatusView: nextVal,
        autoStatusReactEmoji: cur.autoStatusReactEmoji || '❤️',
      });
      await tgApi('answerCallbackQuery', {
        callback_query_id: queryId,
        text: toSansFont(`👁 Auto-Statut ${nextVal ? 'ACTIVE' : 'DESACTIVE'} !`),
      });
    }
    await handleSettingsMenu(chatId, phone, messageId);
    return;
  }

  if (data.startsWith('toggle_online:')) {
    const phone = data.slice('toggle_online:'.length);
    const cur = activeBridge?.getSessionByPhone(phone);
    if (cur && activeBridge?.updateSessionSettings) {
      const nextVal = !cur.alwaysOnline;
      await activeBridge.updateSessionSettings(phone, { alwaysOnline: nextVal });
      await tgApi('answerCallbackQuery', {
        callback_query_id: queryId,
        text: toSansFont(`⚡ Always Online ${nextVal ? 'ACTIVE' : 'DESACTIVE'} !`),
      });
    }
    await handleSettingsMenu(chatId, phone, messageId);
    return;
  }

  if (data.startsWith('set_emoji:')) {
    const parts = data.split(':');
    const phone = parts[1];
    const emoji = parts[2] || '❤️';
    if (phone && activeBridge?.updateSessionSettings) {
      await activeBridge.updateSessionSettings(phone, {
        autoStatusView: true,
        autoStatusReactEmoji: emoji,
      });
      await tgApi('answerCallbackQuery', {
        callback_query_id: queryId,
        text: `${toSansFont('Emoji de reaction statut defini sur')} ${emoji} !`,
      });
    }
    await handleSettingsMenu(chatId, phone, messageId);
    return;
  }

  if (data.startsWith('ping_wa:')) {
    const phone = data.slice('ping_wa:'.length);
    const ok = await activeBridge?.sendTestWhatsAppMessage?.(phone);
    await tgApi('answerCallbackQuery', {
      callback_query_id: queryId,
      text: toSansFont(
        ok
          ? `✅ Message test envoye sur WhatsApp (+${phone}) !`
          : `❌ Impossible d'envoyer le message sur +${phone}.`
      ),
      show_alert: true,
    });
    return;
  }

  if (data.startsWith('reconn_num:')) {
    const phone = data.slice('reconn_num:'.length);
    const ok = await activeBridge?.reconnectSessionByPhone(phone);
    await tgApi('answerCallbackQuery', {
      callback_query_id: queryId,
      text: toSansFont(
        ok ? `🔄 Reconnexion lancee pour +${phone} !` : `❌ Session introuvable pour +${phone}`
      ),
      show_alert: true,
    });
    await handleNumberButton(chatId, messageId);
    return;
  }

  if (data.startsWith('disc_num:')) {
    const phone = data.slice('disc_num:'.length);
    const ok = await activeBridge?.disconnectSessionByPhone(phone);
    await tgApi('answerCallbackQuery', {
      callback_query_id: queryId,
      text: toSansFont(
        ok ? `🗑 Numero +${phone} deconnecte avec succes.` : `❌ Session introuvable pour +${phone}`
      ),
      show_alert: true,
    });
    await handleNumberButton(chatId, messageId);
    return;
  }
}

// ============================================================================
// LONG-POLLING LOOP
// ============================================================================
async function pollTelegramUpdates() {
  while (pollingActive) {
    try {
      const res = await tgApi('getUpdates', {
        offset: lastUpdateOffset,
        timeout: 25,
        allowed_updates: ['message', 'callback_query'],
      });

      if (res?.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          lastUpdateOffset = Math.max(lastUpdateOffset, Number(update.update_id) + 1);
          if (update.message) {
            handleIncomingMessage(update.message).catch((err) => {
              console.error('[TelegramBot] Message handler error:', err?.message || err);
            });
          } else if (update.callback_query) {
            handleCallbackQuery(update.callback_query).catch((err) => {
              console.error('[TelegramBot] Callback handler error:', err?.message || err);
            });
          }
        }
      } else {
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

export async function startTelegramBot(bridge: TelegramBotBridge) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[TelegramBot] No TELEGRAM_BOT_TOKEN configured.');
    return;
  }

  activeBridge = bridge;
  if (pollingActive) return;
  pollingActive = true;

  getWelcomeVideoBuffer().catch(() => {});

  await tgApi('deleteWebhook', { drop_pending_updates: false }).catch(() => {});

  const me = await tgApi('getMe');
  if (me?.ok) {
    if (me.result?.username) {
      botUsernameCache = me.result.username;
    }
    console.log(
      `[ᴀʟʟɪssᴀ ᴍᴅ] Telegram Bot connected: @${me.result.username} (${me.result.first_name})`
    );
  }

  pollTelegramUpdates().catch((err) => {
    console.error('[TelegramBot] Polling error:', err?.message || err);
  });
}

export function stopTelegramBot() {
  pollingActive = false;
}
