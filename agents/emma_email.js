// EMMA - Email Agent. Sends short, professional emails to Sarah's email leads.
const nodemailer = require('nodemailer');
const { getConfig, hasSmtp } = require('../config');
const { load, save, log, sleep } = require('../store');

function buildEmail(lead) {
  const c = getConfig();
  const subject = `Natural stone cladding & pavers for your projects | ${c.business}`;
  const text = `Hello ${lead.name} team,

I'm reaching out from ${c.business}. We supply and install natural wall cladding stones (quartzite, slate, split-face), cobblestone compound pavers and granite/quartz countertops for homes and commercial buildings across Uganda.

For your current or upcoming projects, we offer:
- Free site visits with physical stone samples
- Supply-only or full supply & installation
- Trade rates for architects, contractors and developers

You can see our recent work here: ${c.tiktok}

Would you like our price guide, or a free visit to one of your sites?

Kind regards,
${c.business}${c.managerPhone ? '\nCall / WhatsApp: ' + c.managerPhone : ''}`;
  return { subject, text };
}

async function runEmailAgent(limit = 5, onProgress = () => {}) {
  const c = getConfig();
  const leads = load('leads.json', []);
  const queue = leads.filter(l => l.email && l.status === 'New' && l.channel === 'email').slice(0, limit);
  if (!queue.length) return { sent: 0, waiting: 0 };

  if (!hasSmtp(c)) {
    log('Emma', `${queue.length} email leads waiting. Add the Gmail address + app password in Settings to start sending`, 'warn');
    return { sent: 0, waiting: queue.length, noSmtp: true };
  }

  const transporter = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: c.smtpEmail, pass: c.smtpPass } });
  let sent = 0;
  for (const lead of queue) {
    onProgress(`Emailing ${lead.name}`);
    const { subject, text } = buildEmail(lead);
    try {
      await transporter.sendMail({ from: `"${c.business}" <${c.smtpEmail}>`, to: lead.email, subject, text });
      lead.status = 'Emailed';
      lead.emailedAt = new Date().toISOString();
      sent++;
    } catch (err) {
      lead.status = 'Email Failed';
      lead.error = err.message.slice(0, 80);
    }
    save('leads.json', leads);
    await sleep(3000);
  }
  log('Emma', `Sent ${sent} intro emails`, 'outreach');
  return { sent, waiting: 0 };
}

/** Optional email copy of hot-deal alerts to the sales manager */
async function emailManager(subject, text) {
  const c = getConfig();
  if (!hasSmtp(c) || !c.managerEmail) return false;
  try {
    const t = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: c.smtpEmail, pass: c.smtpPass } });
    await t.sendMail({ from: `"${c.business} Office" <${c.smtpEmail}>`, to: c.managerEmail, subject, text });
    return true;
  } catch {
    return false;
  }
}

module.exports = { runEmailAgent, emailManager, buildEmail };
