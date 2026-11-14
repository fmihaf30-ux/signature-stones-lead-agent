const express = require('express');
const path = require('path');
const { getConfig, hasCloudApi, hasSmtp, updateEnv } = require('./config');
const { load, save, emit, eventsSince, lastEventId, log, sleep } = require('./store');
const { runScout } = require('./agents/sarah_scout');
const { runDispatcher, markSent, buildPitch } = require('./agents/david_dispatcher');
const { runEmailAgent, buildEmail } = require('./agents/emma_email');
const { handleClientMessage } = require('./agents/grace_assistant');
const { getAll, getThread, appendMessage, resetThread } = require('./agents/conversations');
const {
  sendText,
  waLink,
  getWaSessionStatus,
  connectPersonalWhatsApp,
  disconnectPersonalWhatsApp,
  setInboundHandler
} = require('./whatsapp');

setInboundHandler(handleClientMessage);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Live agent states & current office shift ("working" | "break" | "huddle")
let officeShift = 'working';
const agentStates = {
  sarah:   { status: 'Scouting Kampala Sites', desk: 'sarah', bubble: 'Scanning new-build listings...' },
  david:   { status: 'Dispatching WhatsApp Pitches', desk: 'david', bubble: 'Preparing client pitches...' },
  emma:    { status: 'B2B Email Outreach', desk: 'emma', bubble: 'Checking contractor emails...' },
  grace:   { status: 'Online - Company Assistant', desk: 'grace', bubble: 'Monitoring client replies' },
  manager: { status: 'Executive Suite', desk: 'manager', bubble: 'Reviewing stone quotes' }
};

function setAgentState(agent, patch) {
  if (!agentStates[agent]) return;
  Object.assign(agentStates[agent], patch);
  emit({ type: 'agent_state', agent, ...agentStates[agent] });
}

// Seed initial Ugandan construction & property leads on first run
function seedIfEmpty() {
  const leads = load('leads.json', []);
  if (leads.length > 0) return;

  const initialLeads = [
    {
      id: 'L-KIRA-01',
      name: 'Eng. Ronald Mukasa (Kira Heights)',
      phone: '+256772419820',
      email: '',
      suburb: 'Kira',
      project: 'Newly built 5-Bedroom Storey House & Perimeter Wall at Finishing Stage',
      type: 'Site Developer',
      source: 'realestatedatabase.net',
      channel: 'whatsapp',
      status: 'New',
      createdAt: new Date().toISOString()
    },
    {
      id: 'L-NAJJERA-02',
      name: 'Agent Denis (Najjera Estates)',
      phone: '+256704882315',
      email: '',
      suburb: 'Najjera',
      project: '4 Executive Townhouses for Sale (Needs Compound Cobblestones & Cladding)',
      type: 'Property Agent',
      source: 'realestatedatabase.net',
      channel: 'whatsapp',
      status: 'New',
      createdAt: new Date().toISOString()
    },
    {
      id: 'L-MUNYONYO-03',
      name: 'Hajji Sulaiman (Munyonyo Villa)',
      phone: '+256758610492',
      email: '',
      suburb: 'Munyonyo',
      project: 'Luxury Lake-View Mansion (Exterior Facade & Kitchen Countertops)',
      type: 'Home Builder',
      source: 'realestatedatabase.net',
      channel: 'whatsapp',
      status: 'New',
      createdAt: new Date().toISOString()
    },
    {
      id: 'L-KYANJA-04',
      name: 'Patricia Namubiru (Kyanja Homes)',
      phone: '+256782904113',
      email: '',
      suburb: 'Kyanja',
      project: 'Brand New 4-Bedroom Bungalow for Sale (UGX 480M)',
      type: 'Property Agent',
      source: 'realestatedatabase.net',
      channel: 'whatsapp',
      status: 'New',
      createdAt: new Date().toISOString()
    },
    {
      id: 'L-LUBOWA-05',
      name: 'Arch. Kenneth Otim (Lubowa Ridge)',
      phone: '+256776331098',
      email: '',
      suburb: 'Lubowa',
      project: 'Double-Storey Residence (Gate Pillars & 140 sqm Driveway Paving)',
      type: 'Architect / Builder',
      source: 'realestatedatabase.net',
      channel: 'whatsapp',
      status: 'New',
      createdAt: new Date().toISOString()
    },
    {
      id: 'L-EMAIL-01',
      name: 'Symbion Uganda Architects',
      phone: '',
      email: 'kampala@symbion-int.com',
      suburb: 'Kololo, Kampala',
      project: 'Commercial & Residential Architectural Projects',
      type: 'Architecture Firm',
      source: 'B2B Directory',
      channel: 'email',
      status: 'New',
      createdAt: new Date().toISOString()
    },
    {
      id: 'L-EMAIL-02',
      name: 'Roko Construction Purchasing',
      phone: '',
      email: 'info@roko.com',
      suburb: 'Kawempe, Kampala',
      project: 'Civil & Building Finishing Procurement',
      type: 'Construction Contractor',
      source: 'B2B Directory',
      channel: 'email',
      status: 'New',
      createdAt: new Date().toISOString()
    },
    {
      id: 'L-EMAIL-03',
      name: 'Tirupati Development Uganda',
      phone: '',
      email: 'info@tirupatidevelopment.com',
      suburb: 'Naguru, Kampala',
      project: 'Housing Estates & Commercial Complexes',
      type: 'Real Estate Developer',
      source: 'B2B Directory',
      channel: 'email',
      status: 'New',
      createdAt: new Date().toISOString()
    },
    {
      id: 'L-EMAIL-04',
      name: 'Kalinabiri Estates & Builders',
      phone: '',
      email: 'sales@ugandapropertycentre.com',
      suburb: 'Ntinda, Kampala',
      project: 'Residential Apartments & Villas',
      type: 'Property Developer',
      source: 'B2B Directory',
      channel: 'email',
      status: 'New',
      createdAt: new Date().toISOString()
    }
  ];

  save('leads.json', initialLeads);
  log('Sarah', 'Initialised office with 5 WhatsApp construction/agent leads and 4 B2B contractor/architect email leads.', 'scout');
}

seedIfEmpty();

// ---- GET /api/state ----
app.get('/api/state', (req, res) => {
  const since = Number(req.query.since || 0);
  const c = getConfig();
  const leads = load('leads.json', []).map(l => ({
    ...l,
    pitchPreview: l.pitch || (l.channel === 'whatsapp' ? buildPitch(l) : buildEmail(l).text),
    waLink: l.waLink || (l.phone ? waLink(l.phone, l.pitch || buildPitch(l)) : null)
  }));
  const deals = load('deals.json', []);
  const logs = load('activity.json', []);
  const conversations = getAll();

  const waLeads = leads.filter(l => l.channel === 'whatsapp');
  const emailLeads = leads.filter(l => l.channel === 'email');

  res.json({
    officeShift,
    config: {
      business: c.business,
      tiktok: c.tiktok,
      dispatcherPhone: c.dispatcherPhone,
      managerPhone: c.managerPhone,
      managerName: c.managerName,
      managerEmail: c.managerEmail,
      smtpEmail: c.smtpEmail,
      hasSmtp: hasSmtp(c),
      hasCloudApi: hasCloudApi(c),
      hasGemini: Boolean(c.geminiKey)
    },
    waSession: getWaSessionStatus(),
    metrics: {
      totalLeads: leads.length,
      waLeadsTotal: waLeads.length,
      waNew: waLeads.filter(l => l.status === 'New').length,
      waPitched: waLeads.filter(l => l.status === 'Pitched' || l.status === 'Pitch Ready').length,
      emailLeadsTotal: emailLeads.length,
      emailNew: emailLeads.filter(l => l.status === 'New').length,
      emailSent: emailLeads.filter(l => l.status === 'Emailed').length,
      activeChats: Object.keys(conversations).length,
      hotDeals: deals.length
    },
    agentStates,
    leads: leads.slice().reverse(),
    deals,
    logs: logs.slice(0, 60),
    conversations,
    events: eventsSince(since),
    lastEventId: lastEventId()
  });
});

// ---- POST /api/scout (Desk 1: Sarah scouts & walks reports to Desk 2 & Desk 3) ----
app.post('/api/scout', async (req, res) => {
  try {
    officeShift = 'working';
    setAgentState('sarah', { status: 'Scanning Kampala New Builds...', bubble: 'Searching real estate & site listings...' });
    const fresh = await runScout(msg => {
      setAgentState('sarah', { status: msg, bubble: msg });
    });

    const waCount = fresh.filter(l => l.channel === 'whatsapp').length;
    const emCount = fresh.filter(l => l.channel === 'email').length;

    setAgentState('sarah', { status: 'Delivering Report to David (Desk 2)', bubble: `Taking ${waCount || 'updated'} WhatsApp leads to David` });
    emit({
      type: 'walk',
      agent: 'sarah',
      from: 'sarah',
      to: 'david',
      item: 'WA LEADS',
      bubble: `Here are ${waCount || 'the'} WhatsApp site leads, David!`
    });

    setTimeout(() => {
      emit({
        type: 'walk',
        agent: 'sarah',
        from: 'david',
        to: 'emma',
        item: 'B2B EMAILS',
        bubble: `Emma, here are the contractor emails!`
      });
    }, 3200);

    setTimeout(() => {
      setAgentState('sarah', { status: 'Monitoring Kampala Sites', bubble: 'Reports delivered to Desk 2 & Desk 3' });
      setAgentState('david', { status: 'Received Sarah\'s Report', bubble: 'Got Sarah\'s WhatsApp report!' });
      setAgentState('emma', { status: 'Received Sarah\'s Report', bubble: 'Got Sarah\'s B2B email list!' });
    }, 6400);

    res.json({ ok: true, found: fresh.length, waCount, emCount, leads: fresh });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---- POST /api/dispatch (Desk 2: David prepares/sends WhatsApp pitches & walks to Grace at Desk 4) ----
app.post('/api/dispatch', async (req, res) => {
  try {
    officeShift = 'working';
    const limit = Number(req.body?.limit || 5);
    const c = getConfig();
    setAgentState('david', {
      status: `Pitching from ${c.dispatcherPhone || 'Dispatcher WhatsApp'}...`,
      bubble: 'Preparing WhatsApp pitches...'
    });

    const out = await runDispatcher(limit, msg => {
      setAgentState('david', { status: msg, bubble: msg });
    });

    emit({
      type: 'walk',
      agent: 'david',
      from: 'david',
      to: 'grace',
      item: 'PITCH LIST',
      bubble: `Grace, I pitched ${out.count || 'our'} clients—watch their replies!`
    });

    setTimeout(() => {
      setAgentState('david', {
        status: out.count ? `Prepared ${out.count} WhatsApp Pitches` : 'All Leads Pitched',
        bubble: out.count ? `${out.count} pitches ready/sent` : 'Queue clear'
      });
      setAgentState('grace', {
        status: 'Watching Pitched Clients',
        bubble: 'Ready to reply to David\'s clients!'
      });
    }, 3000);

    res.json({ ok: true, ...out });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---- POST /api/dispatch/mark-sent ----
app.post('/api/dispatch/mark-sent', (req, res) => {
  const { leadId } = req.body || {};
  const lead = markSent(leadId);
  if (!lead) return res.status(404).json({ ok: false, error: 'Lead not found' });
  emit({
    type: 'walk',
    agent: 'david',
    from: 'david',
    to: 'grace',
    item: 'WA SENT',
    bubble: `Grace, I just messaged ${lead.name} on WhatsApp!`
  });
  res.json({ ok: true, lead });
});

// ---- POST /api/email (Desk 3: Emma sends B2B emails to contractors & architects) ----
app.post('/api/email', async (req, res) => {
  try {
    officeShift = 'working';
    const limit = Number(req.body?.limit || 4);
    setAgentState('emma', { status: 'Sending B2B Emails...', bubble: 'Sending stone portfolio to architects...' });

    const out = await runEmailAgent(limit, msg => {
      setAgentState('emma', { status: msg, bubble: msg });
    });

    if (out.noSmtp) {
      setAgentState('emma', {
        status: `${out.waiting} Emails Ready (Set SMTP)`,
        bubble: `${out.waiting} B2B emails drafted`
      });
    } else {
      emit({
        type: 'walk',
        agent: 'emma',
        from: 'emma',
        to: 'grace',
        item: 'EMAIL LOG',
        bubble: `Sent ${out.sent} B2B emails to contractors!`
      });
      setTimeout(() => {
        setAgentState('emma', { status: `Sent ${out.sent} B2B Emails`, bubble: `${out.sent} emails delivered` });
      }, 3000);
    }

    res.json({ ok: true, ...out });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---- POST /api/office/break (Triggers a Staff Lounge & Coffee Break) ----
app.post('/api/office/break', (req, res) => {
  startOfficeBreak();
  res.json({ ok: true, officeShift });
});

function startOfficeBreak() {
  officeShift = 'break';
  log('Office', 'Staff taking a short coffee & lounge break before the next scouting shift.', 'info');
  setAgentState('sarah', { status: 'Coffee Break in Lounge', bubble: 'Grabbing fresh Kampala roast coffee' });
  setAgentState('david', { status: 'Relaxing on Lounge Sofa', bubble: 'Chatting in the staff lounge' });
  setAgentState('emma', { status: 'Tea Break in Lounge', bubble: 'Taking a quick 5-min break' });
  setAgentState('grace', { status: 'Water Cooler Break', bubble: 'Refilling water, phone still active' });
  emit({ type: 'office_break', durationMs: 18000 });

  setTimeout(() => {
    officeShift = 'working';
    setAgentState('sarah', { status: 'Scouting Kampala Sites', bubble: 'Back at Desk 1 — scanning listings' });
    setAgentState('david', { status: 'WhatsApp Dispatcher Active', bubble: 'Back at Desk 2 — checking queue' });
    setAgentState('emma', { status: 'B2B Email Agent Active', bubble: 'Back at Desk 3 — checking outbox' });
    setAgentState('grace', { status: 'Online - Company Assistant', bubble: 'Back at Desk 4 — watching replies' });
    emit({ type: 'office_resume' });
  }, 18000);
}

// ---- POST /api/workflow/run (Full animated office cycle) ----
let workflowRunning = false;
async function executeAutonomousCycle() {
  if (workflowRunning) return { skipped: true };
  workflowRunning = true;
  try {
    officeShift = 'working';
    log('Office', 'Autonomous shift started: Sarah (Scout) → David (WhatsApp) & Emma (Email) → Grace (Assistant)', 'info');

    setAgentState('sarah', { status: 'Scanning Kampala New Builds...', bubble: 'Scouting new construction sites...' });
    const fresh = await runScout(msg => setAgentState('sarah', { status: msg, bubble: msg }));

    emit({
      type: 'walk',
      agent: 'sarah',
      from: 'sarah',
      to: 'david',
      item: 'WA LEADS',
      bubble: 'David, here are the new WhatsApp leads!'
    });
    await sleep(3200);

    emit({
      type: 'walk',
      agent: 'sarah',
      from: 'david',
      to: 'emma',
      item: 'B2B EMAILS',
      bubble: 'Emma, here are the B2B email leads!'
    });
    await sleep(3200);
    setAgentState('sarah', { status: 'Reports Delivered', bubble: 'Delivered reports to Desk 2 & Desk 3' });

    setAgentState('david', { status: 'Pitching WhatsApp Leads...', bubble: 'Preparing WhatsApp outreach...' });
    const dispatchRes = await runDispatcher(5);
    emit({
      type: 'walk',
      agent: 'david',
      from: 'david',
      to: 'grace',
      item: 'PITCH LIST',
      bubble: `Grace, I pitched ${dispatchRes.count || 'our'} clients—watch replies!`
    });

    setAgentState('emma', { status: 'Processing B2B Emails...', bubble: 'Processing B2B contractor emails...' });
    const emailRes = await runEmailAgent(3);
    setAgentState('emma', {
      status: emailRes.noSmtp ? `${emailRes.waiting} B2B Emails Ready` : `Sent ${emailRes.sent} B2B Emails`,
      bubble: emailRes.noSmtp ? `${emailRes.waiting} B2B emails ready` : `Sent ${emailRes.sent} B2B emails`
    });

    await sleep(2800);
    setAgentState('david', { status: `Pitched ${dispatchRes.count} Leads`, bubble: 'Handed client threads to Grace' });
    setAgentState('grace', { status: 'Handling Client Replies', bubble: 'Ready for client questions & site visits' });

    return { ok: true, scouted: fresh.length, dispatched: dispatchRes.count, emailed: emailRes.sent };
  } finally {
    workflowRunning = false;
  }
}

app.post('/api/workflow/run', async (req, res) => {
  try {
    const out = await executeAutonomousCycle();
    res.json(out);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---- POST /api/chat/inbound (Desk 4: Grace Company Assistant handles client WhatsApp messages) ----
app.post('/api/chat/inbound', async (req, res) => {
  try {
    const { phone = '+256772419820', text = '', name = 'Eng. Ronald Mukasa' } = req.body || {};
    if (!text.trim()) return res.status(400).json({ ok: false, error: 'Empty message' });

    setAgentState('grace', { status: `Replying to ${name}...`, bubble: `Replying to ${name.split(' ')[0]}...` });
    const out = await handleClientMessage({ phone, text, name });

    if (out.escalated) {
      setAgentState('grace', {
        status: 'Escalating Hot Lead to Manager!',
        bubble: `Taking ${name.split(' ')[0]}'s file to Boss!`
      });
      setAgentState('manager', {
        status: `Hot Deal: ${name}`,
        bubble: `Calling ${name.split(' ')[0]} for site visit!`
      });
    } else if (out.optOut) {
      setAgentState('grace', {
        status: 'Polite Close (Opt-out Respected)',
        bubble: `Closed ${name.split(' ')[0]} politely`
      });
    } else {
      setAgentState('grace', {
        status: 'Online - Company Assistant',
        bubble: `Replied to ${name.split(' ')[0]}`
      });
    }

    res.json({ ok: true, ...out });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---- POST /api/chat/pitch-first ----
app.post('/api/chat/pitch-first', (req, res) => {
  const { phone = '+256772419820', name = 'Eng. Ronald Mukasa', suburb = 'Kira' } = req.body || {};
  resetThread(phone);
  const pitch = buildPitch({ name, suburb });
  const thread = appendMessage(phone, { from: 'david', text: pitch }, { name, suburb });
  emit({
    type: 'walk',
    agent: 'david',
    from: 'david',
    to: 'grace',
    item: 'PITCH SENT',
    bubble: `Pitched ${name.split(' ')[0]} (${suburb})—Grace on standby!`
  });
  res.json({ ok: true, thread });
});

// ---- POST /api/chat/reset ----
app.post('/api/chat/reset', (req, res) => {
  const { phone = '+256772419820' } = req.body || {};
  resetThread(phone);
  setAgentState('grace', { status: 'Online - Company Assistant', bubble: 'Chat reset & ready' });
  res.json({ ok: true });
});

// ---- POST /api/settings ----
app.post('/api/settings', (req, res) => {
  const {
    dispatcherPhone,
    managerPhone,
    managerName,
    managerEmail,
    smtpEmail,
    smtpPass,
    geminiKey
  } = req.body || {};

  const pairs = {};
  if (dispatcherPhone !== undefined) pairs.WHATSAPP_DISPATCHER_PHONE = dispatcherPhone.trim();
  if (managerPhone !== undefined) pairs.SALES_MANAGER_PHONE = managerPhone.trim();
  if (managerName !== undefined) pairs.SALES_MANAGER_NAME = managerName.trim();
  if (managerEmail !== undefined) pairs.SALES_MANAGER_EMAIL = managerEmail.trim();
  if (smtpEmail !== undefined) pairs.SMTP_EMAIL = smtpEmail.trim();
  if (smtpPass !== undefined && smtpPass.trim() !== '') pairs.SMTP_APP_PASSWORD = smtpPass.trim();
  if (geminiKey !== undefined && geminiKey.trim() !== '') pairs.GEMINI_API_KEY = geminiKey.trim();

  updateEnv(pairs);
  const c = getConfig();
  log('Office', `Updated office numbers: Dispatcher=${c.dispatcherPhone || 'not set'}, ${c.managerName}=${c.managerPhone || 'not set'}`, 'info');
  res.json({ ok: true, config: c });
});

// ---- Personal WhatsApp QR Link Endpoints ----
app.post('/api/wa/connect', async (req, res) => {
  const status = await connectPersonalWhatsApp();
  res.json({ ok: true, waSession: status });
});

app.post('/api/wa/disconnect', async (req, res) => {
  const status = await disconnectPersonalWhatsApp();
  res.json({ ok: true, waSession: status });
});

// ---- Meta WhatsApp Cloud API Webhook ----
app.get('/webhook/whatsapp', (req, res) => {
  const c = getConfig();
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === c.waVerify) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});

app.post('/webhook/whatsapp', async (req, res) => {
  res.sendStatus(200);
  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    if (!msg || msg.type !== 'text') return;
    const from = '+' + String(msg.from).replace(/[^0-9]/g, '');
    const name = value?.contacts?.[0]?.profile?.name || 'WhatsApp Client';
    const text = msg.text?.body || '';
    const out = await handleClientMessage({ phone: from, text, name });
    if (out.reply) await sendText(from, out.reply);
  } catch (err) {
    log('Grace', `Webhook error: ${err.message}`, 'warn');
  }
});

// ============================================================================
// AUTONOMOUS BACKGROUND OFFICE ROUTINE (Runs continuously while server is up)
// Alternates between active scouting/outreach handoffs and realistic staff
// coffee/lounge breaks so the office lives & works on its own.
// ============================================================================
let autoStep = 0;
setInterval(async () => {
  if (workflowRunning) return;
  autoStep = (autoStep + 1) % 4;
  if (autoStep === 1) {
    // Run a real autonomous scouting + outreach cycle
    executeAutonomousCycle().catch(() => {});
  } else if (autoStep === 2) {
    // Staff take a short coffee & lounge break
    startOfficeBreak();
  } else if (autoStep === 3) {
    // Sarah walks fresh site notes to David & David updates Grace
    emit({
      type: 'walk',
      agent: 'sarah',
      from: 'sarah',
      to: 'david',
      item: 'SITE REPORT',
      bubble: 'David, new finishing-stage houses in Kira!'
    });
    setTimeout(() => {
      emit({
        type: 'walk',
        agent: 'david',
        from: 'david',
        to: 'grace',
        item: 'CLIENT LIST',
        bubble: 'Grace, keep an eye on these WhatsApp leads!'
      });
    }, 4200);
  } else {
    // Emma checks in with Manager
    emit({
      type: 'walk',
      agent: 'emma',
      from: 'emma',
      to: 'manager',
      item: 'B2B SUMMARY',
      bubble: 'Boss, here is the B2B contractor email report.'
    });
  }
}, 45000);

// Run first autonomous shift shortly after boot
setTimeout(() => {
  executeAutonomousCycle().catch(() => {});
}, 3000);

const PORT = getConfig().port;
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`SIGNATURE STONES UGANDA - AUTONOMOUS OFFICE SERVER`);
  console.log(`Live Office URL: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
