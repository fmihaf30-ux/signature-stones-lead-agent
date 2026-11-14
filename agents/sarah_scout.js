// SARAH - Site Scout. Finds real property agents/developers selling newly built houses
// (houses at finishing stage = need wall cladding, pavers, countertops).
const https = require('https');
const fs = require('fs');
const path = require('path');
const { load, save, log, digits } = require('../store');

const SUBURBS = [
  'Kira', 'Najjera', 'Kyanja', 'Naalya', 'Namugongo', 'Gayaza', 'Lubowa', 'Muyenga', 'Munyonyo',
  'Kololo', 'Naguru', 'Bukoto', 'Ntinda', 'Kisaasi', 'Entebbe', 'Buziga', 'Makindye', 'Seeta',
  'Mukono', 'Kitende', 'Bweyogerere', 'Kireka', 'Matugga', 'Wakiso'
];

// Listings worth targeting for stone work: new builds, houses for sale, villas, storeyed houses
const RELEVANT = /(new|brand|built|complet|for sale|villa|mansion|storey|storied|bungalow|estate|duplex|maisonette|ongoing|shell)/i;

function fetchHtml(url, timeoutMs = 25000) {
  return new Promise(resolve => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36' }, timeout: timeoutMs, rejectUnauthorized: false }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchHtml(new URL(res.headers.location, url).href, timeoutMs));
      }
      let data = '';
      res.on('data', c => { if (data.length < 6000000) data += c; });
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
  });
}

const isUgMobile = p => /^2567[0456789]\d{7}$/.test(digits(p));

function parseRealEstateDatabase(html, suburb) {
  const out = [];
  const re = /AgentImagePanel_(\d+)"[^>]*title="([^:"]+)\s*:\s*([^"\s]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const idx = m[1];
    let d = digits(m[3]);
    if (d.startsWith('0')) d = '256' + d.slice(1);
    if (!d.startsWith('256')) d = '256' + d;
    if (!isUgMobile(d)) continue;
    const title = (html.match(new RegExp(`ManualTitleLabel_${idx}"[^>]*title="([^"]+)"`, 'i')) || [])[1] || '';
    const loc = (html.match(new RegExp(`Location_${idx}">([^<]+)<`, 'i')) || [])[1] || suburb;
    const price = (html.match(new RegExp(`Shillings_${idx}"[^>]*>([^<]+)<`, 'i')) || [])[1] || '';
    if (!RELEVANT.test(title)) continue;
    out.push({
      name: m[2].trim().replace(/&amp;/g, '&').replace(/\.$/, ''),
      phone: '+' + d,
      email: '',
      suburb: loc.trim(),
      project: `${title.trim()}${price ? ' (' + price.trim() + ')' : ''}`,
      type: 'Property Agent',
      source: 'realestatedatabase.net'
    });
  }
  return out;
}

/** One-time import of architects / developers / contractors with emails (for Emma). */
function importEmailContacts(leads) {
  const state = load('scout_state.json', { cursor: 0, imported: false });
  if (state.imported) return 0;
  const src = path.join(__dirname, '..', '..', 'fitbit-interior-lead-agent', 'leads.json');
  let added = 0;
  if (fs.existsSync(src)) {
    try {
      const list = JSON.parse(fs.readFileSync(src, 'utf8'));
      const seen = new Set(leads.map(l => (l.email || '').toLowerCase()).filter(Boolean));
      for (const l of list) {
        if (!/(architect|construction|contractor|real estate|developer|interior designer)/i.test(l.category || '')) continue;
        const em = (l.email || '').toLowerCase().trim();
        if (!em.includes('@') || seen.has(em)) continue;
        seen.add(em);
        leads.push(newLead({ name: l.name, phone: '', email: em, suburb: l.city || 'Kampala', project: l.category, type: l.category, source: 'B2B directory' }));
        added++;
      }
    } catch {}
  }
  state.imported = true;
  save('scout_state.json', state);
  return added;
}

function newLead(base) {
  return {
    id: 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ...base,
    channel: base.phone ? 'whatsapp' : 'email',
    status: 'New',
    createdAt: new Date().toISOString()
  };
}

/** Runs one scouting pass over the next few suburbs. Returns newly found leads. */
async function runScout(onProgress = () => {}) {
  const leads = load('leads.json', []);
  const state = load('scout_state.json', { cursor: 0, imported: false });
  const knownPhones = new Set(leads.map(l => digits(l.phone)).filter(Boolean));
  const fresh = [];

  const before = leads.length;
  importEmailContacts(leads);
  for (const l of leads.slice(before)) fresh.push(l);

  const batch = [0, 1, 2].map(i => SUBURBS[(state.cursor + i) % SUBURBS.length]);
  for (const suburb of batch) {
    onProgress(`Scanning new-build listings in ${suburb}...`);
    const url = `https://www.realestatedatabase.net/FindAHouse/Houselist.aspx?PropertyType=House&Location=${encodeURIComponent(suburb)}&Title=Houses+for+rent+and+sale`;
    const html = await fetchHtml(url);
    const found = parseRealEstateDatabase(html, suburb);
    let n = 0;
    for (const f of found) {
      const d = digits(f.phone);
      if (knownPhones.has(d)) continue;
      knownPhones.add(d);
      const lead = newLead(f);
      leads.push(lead);
      fresh.push(lead);
      n++;
    }
    log('Sarah', `${suburb}: ${n} new agents with new-build listings`, 'scout');
  }

  state.cursor = (state.cursor + batch.length) % SUBURBS.length;
  save('scout_state.json', state);
  save('leads.json', leads);
  return fresh;
}

module.exports = { runScout, SUBURBS };
