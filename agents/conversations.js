const { load, save, digits } = require('../store');

function getAll() {
  return load('conversations.json', {});
}

function getThread(phone) {
  return getAll()[digits(phone)] || null;
}

function appendMessage(phone, msg, meta = {}) {
  const all = getAll();
  const key = digits(phone);
  if (!all[key]) {
    all[key] = {
      phone: '+' + key,
      name: meta.name || 'Client',
      suburb: meta.suburb || '',
      leadId: meta.leadId || null,
      state: { stage: 'new', declines: 0, fallbacks: 0, location: null, sqm: null, need: null, pendingCall: false, escalated: false },
      messages: []
    };
  }
  if (meta.name && all[key].name === 'Client') all[key].name = meta.name;
  all[key].messages.push({ ...msg, at: new Date().toISOString() });
  all[key].updatedAt = new Date().toISOString();
  save('conversations.json', all);
  return all[key];
}

function updateThread(phone, patch) {
  const all = getAll();
  const key = digits(phone);
  if (!all[key]) return null;
  all[key] = { ...all[key], ...patch, state: { ...all[key].state, ...(patch.state || {}) } };
  save('conversations.json', all);
  return all[key];
}

function resetThread(phone) {
  const all = getAll();
  const key = digits(phone);
  delete all[key];
  save('conversations.json', all);
}

module.exports = { getAll, getThread, appendMessage, updateThread, resetThread };
