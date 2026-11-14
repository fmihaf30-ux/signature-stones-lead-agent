// DAVID - WhatsApp Dispatcher. Pitches Sarah's leads from the dispatcher's WhatsApp number.
const { getConfig } = require('../config');
const { load, save, log, digits } = require('../store');
const { sendPitch } = require('../whatsapp');
const { appendMessage } = require('./conversations');

const firstName = n => String(n || '').split(/[\s(/]/)[0] || 'there';

function buildPitch(lead) {
  const c = getConfig();
  return `Hello ${firstName(lead.name)}, this is ${c.business}. We supply and install natural wall cladding stones, cobblestone pavers and granite tops for new houses around ${lead.suburb || 'Kampala'}.

If you or your clients have a house at finishing stage, we do a free site visit with stone samples, and we pay 10% commission on every job you refer.

Our work: ${c.tiktok}
Can I send you our price guide?`;
}

/** Pitches up to `limit` new WhatsApp leads. Returns { sent, ready } */
async function runDispatcher(limit = 5, onProgress = () => {}) {
  const leads = load('leads.json', []);
  const queue = leads.filter(l => l.channel === 'whatsapp' && l.status === 'New').slice(0, limit);
  let sent = 0, ready = 0;

  for (const lead of queue) {
    onProgress(`Pitching ${lead.name} (${lead.suburb})`);
    const text = buildPitch(lead);
    const res = await sendPitch(lead.phone, text, [firstName(lead.name), lead.suburb || 'Kampala']);
    lead.pitch = text;
    lead.pitchedAt = new Date().toISOString();
    if (res.sent) {
      lead.status = 'Pitched';
      sent++;
    } else {
      lead.status = 'Pitch Ready';
      lead.waLink = res.link;
      ready++;
    }
    appendMessage(lead.phone, { from: 'david', text }, { name: lead.name, suburb: lead.suburb, leadId: lead.id });
  }

  save('leads.json', leads);
  if (queue.length) {
    log('David', sent ? `Sent ${sent} WhatsApp pitches automatically` : `Prepared ${ready} WhatsApp pitches, ready to send from the dispatcher's WhatsApp`, 'outreach');
  }
  return { sent, ready, count: queue.length };
}

function markSent(leadId) {
  const leads = load('leads.json', []);
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return null;
  lead.status = 'Pitched';
  save('leads.json', leads);
  log('David', `Pitch sent to ${lead.name} (${lead.phone})`, 'outreach');
  return lead;
}

module.exports = { runDispatcher, markSent, buildPitch };
