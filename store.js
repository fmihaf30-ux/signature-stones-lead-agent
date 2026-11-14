const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const file = name => path.join(DATA_DIR, name);

function load(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file(name), 'utf8'));
  } catch {
    return fallback;
  }
}

function save(name, value) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file(name), JSON.stringify(value, null, 2), 'utf8');
}

// ---- In-memory event stream that drives the animated office ----
let events = [];
let nextId = 1;

function emit(event) {
  const ev = { id: nextId++, at: Date.now(), ...event };
  events.push(ev);
  if (events.length > 400) events = events.slice(-400);
  return ev;
}

const eventsSince = id => events.filter(e => e.id > id);
const lastEventId = () => nextId - 1;

function log(agent, message, kind = 'info') {
  const logs = load('activity.json', []);
  logs.unshift({ agent, message, kind, time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) });
  save('activity.json', logs.slice(0, 200));
  emit({ type: 'log', agent, message, kind });
}

const digits = p => String(p || '').replace(/[^0-9]/g, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = { load, save, emit, eventsSince, lastEventId, log, digits, sleep };
