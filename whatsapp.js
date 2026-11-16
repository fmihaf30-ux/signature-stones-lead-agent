// ============================================================================
// WHATSAPP TRANSPORT LAYER
// Supports 3 modes seamlessly:
// 1. Personal / Work WhatsApp Linked via QR Code (@whiskeysockets/baileys)
//    -> Sends David's pitches & Grace's replies directly from the personal number!
// 2. Meta WhatsApp Business Cloud API (if WA_CLOUD_TOKEN is set)
// 3. 1-Click wa.me fallback links
// ============================================================================
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const pino = require('pino');
const { getConfig, hasCloudApi } = require('./config');
const { digits, log, emit } = require('./store');

const AUTH_DIR = path.join(__dirname, 'data', 'wa_auth');
const waLink = (phone, text) => `https://wa.me/${digits(phone)}?text=${encodeURIComponent(text)}`;

let sock = null;
let waStatus = {
  state: 'disconnected', // 'disconnected' | 'qr' | 'connected' | 'connecting'
  qrDataUrl: null,
  connectedPhone: null,
  lastError: null
};
let inboundHandler = null;
// Anti-ban safeguard: track consecutive unanswered outbound messages per number (max 3 before waiting for client reply)
const unansweredByPhone = new Map();

function setInboundHandler(fn) {
  inboundHandler = fn;
}

function getWaSessionStatus() {
  return waStatus;
}

async function connectPersonalWhatsApp() {
  if (waStatus.state === 'connected' && sock) return waStatus;
  try {
    const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    waStatus = { state: 'connecting', qrDataUrl: null, connectedPhone: null, lastError: null };

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Signature Stones Office', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async update => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        waStatus.state = 'qr';
        waStatus.qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 220 });
        emit({ type: 'wa_status', ...waStatus });
      }
      if (connection === 'open') {
        const me = sock?.user?.id ? '+' + digits(sock.user.id.split(':')[0]) : getConfig().dispatcherPhone;
        waStatus = { state: 'connected', qrDataUrl: null, connectedPhone: me, lastError: null };
        log('David', `Personal WhatsApp (${me}) connected! Outbound pitches & Grace's replies are now 100% automatic.`, 'info');
        emit({ type: 'wa_status', ...waStatus });
      }
      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        if (loggedOut) {
          try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
        }
        sock = null;
        waStatus = {
          state: 'disconnected',
          qrDataUrl: null,
          connectedPhone: null,
          lastError: loggedOut ? 'Logged out from phone' : 'Disconnected'
        };
        emit({ type: 'wa_status', ...waStatus });
      }
    });

    // Listen for real incoming client replies on the linked personal WhatsApp!
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify' || !inboundHandler) return;
      for (const m of messages) {
        if (!m.message || m.key.fromMe) continue;
        const jid = m.key.remoteJid || '';
        if (!jid.endsWith('@s.whatsapp.net')) continue;
        const text =
          m.message.conversation ||
          m.message.extendedTextMessage?.text ||
          '';
        if (!text.trim()) continue;
        const phone = '+' + digits(jid.split('@')[0]);
        const name = m.pushName || 'WhatsApp Client';
        // Client replied -> reset unanswered counter to 0
        unansweredByPhone.set(digits(phone), 0);
        try {
          const out = await inboundHandler({ phone, text, name });
          if (out && out.reply && sock && waStatus.state === 'connected') {
            await sock.sendMessage(jid, { text: out.reply });
            unansweredByPhone.set(digits(phone), 1);
          }
        } catch (err) {
          log('Grace', `Auto-reply error for ${phone}: ${err.message}`, 'warn');
        }
      }
    });

    return waStatus;
  } catch (err) {
    waStatus = { state: 'disconnected', qrDataUrl: null, connectedPhone: null, lastError: err.message };
    return waStatus;
  }
}

async function disconnectPersonalWhatsApp() {
  try {
    if (sock) await sock.logout();
  } catch {}
  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  } catch {}
  sock = null;
  waStatus = { state: 'disconnected', qrDataUrl: null, connectedPhone: null, lastError: null };
  return waStatus;
}

// Auto-reconnect on boot if credentials already exist in data/wa_auth
if (fs.existsSync(path.join(AUTH_DIR, 'creds.json'))) {
  connectPersonalWhatsApp().catch(() => {});
}

async function callGraph(body) {
  const c = getConfig();
  const res = await fetch(`https://graph.facebook.com/v21.0/${c.waPhoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.waToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...body })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data;
}

/** Sends a WhatsApp text message via Linked Personal WhatsApp -> or Cloud API -> or wa.me link */
async function sendText(phone, text) {
  const d = digits(phone);
  const unanswered = unansweredByPhone.get(d) || 0;
  if (unanswered >= 3) {
    log('Grace', `Paused auto-send to ${phone} after 3 unanswered messages until client replies.`, 'info');
    return { sent: false, paused: true, link: waLink(phone, text) };
  }
  // 1. Linked Personal WhatsApp (for warm/inbound conversations & Boss alerts)
  if (sock && waStatus.state === 'connected') {
    try {
      await sock.sendMessage(`${d}@s.whatsapp.net`, { text });
      unansweredByPhone.set(d, unanswered + 1);
      return { sent: true, via: 'personal_wa' };
    } catch (err) {
      log('David', `Personal WA send error (${phone}): ${err.message}`, 'warn');
    }
  }
  // 2. Meta Cloud API
  const c = getConfig();
  if (hasCloudApi(c)) {
    try {
      await callGraph({ to: d, type: 'text', text: { body: text } });
      unansweredByPhone.set(d, unanswered + 1);
      return { sent: true, via: 'cloud_api' };
    } catch (err) {
      return { sent: false, error: err.message, link: waLink(phone, text) };
    }
  }
  // 3. 1-Click wa.me link fallback
  return { sent: false, link: waLink(phone, text) };
}

/**
 * Sends David's first-touch outreach pitch:
 * Uses Meta Cloud API or safe 1-Click wa.me links by default (preventing cold Baileys
 * first-touch blasts from risking a WhatsApp number ban), while Grace handles all
 * replies automatically once the conversation starts!
 */
async function sendPitch(phone, text, params = []) {
  const d = digits(phone);
  const unanswered = unansweredByPhone.get(d) || 0;
  if (unanswered >= 3) {
    return { sent: false, paused: true, link: waLink(phone, text) };
  }
  // 1. Meta Cloud API template (safe for cold outreach)
  const c = getConfig();
  if (hasCloudApi(c) && c.waTemplate) {
    try {
      await callGraph({
        to: d,
        type: 'template',
        template: {
          name: c.waTemplate,
          language: { code: c.waTemplateLang },
          components: params.length ? [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: String(p) })) }] : []
        }
      });
      unansweredByPhone.set(d, unanswered + 1);
      return { sent: true, via: 'cloud_api' };
    } catch (err) {
      return { sent: false, error: err.message, link: waLink(phone, text) };
    }
  }
  // 2. Safe 1-Click wa.me link for first-touch outreach (protects QR-linked number from cold-blast bans)
  return { sent: false, link: waLink(phone, text) };
}

module.exports = {
  sendText,
  sendPitch,
  waLink,
  getWaSessionStatus,
  connectPersonalWhatsApp,
  disconnectPersonalWhatsApp,
  setInboundHandler
};
