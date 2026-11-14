// Hot-deal escalation to the Sales Manager
const { getConfig } = require('../config');
const { load, save, log, emit } = require('../store');
const { sendText, waLink } = require('../whatsapp');
const { emailManager } = require('./emma_email');

async function escalate({ phone, name, location, sqm, need, lastMessage }) {
  const c = getConfig();
  const deals = load('deals.json', []);
  const deal = {
    id: 'D' + Date.now().toString(36).toUpperCase(),
    clientName: name || 'Client',
    clientPhone: phone,
    location: location || 'Not given yet',
    size: sqm ? `${sqm} m²` : 'To measure on site',
    need: need || 'Stone finishing',
    lastMessage,
    status: 'New - call client',
    createdAt: new Date().toISOString()
  };

  const alert = `HOT LEAD - ${c.business}
Client: ${deal.clientName} (${deal.clientPhone})
Needs: ${deal.need}
Location: ${deal.location}
Size: ${deal.size}
Last message: "${lastMessage}"

Please call the client to book the free site visit.`;

  deal.managerAlert = alert;
  let notified = false;
  if (c.managerPhone) {
    const res = await sendText(c.managerPhone, alert);
    notified = res.sent;
    deal.managerLink = res.link || waLink(c.managerPhone, alert);
  }
  const emailed = await emailManager(`Hot lead: ${deal.clientName} - ${deal.location}`, alert);
  deal.notified = notified ? 'WhatsApp sent' : emailed ? 'Emailed' : c.managerPhone ? 'Click to alert' : 'Set manager number';

  deals.unshift(deal);
  save('deals.json', deals);

  log('Grace', `Hot lead: ${deal.clientName} (${deal.location}, ${deal.size}) handed to ${c.managerName}`, 'escalation');
  emit({ type: 'walk', agent: 'grace', to: 'manager', bubble: `🔥 Hot lead: ${deal.clientName}` });
  emit({ type: 'deal', deal });
  return deal;
}

module.exports = { escalate };
