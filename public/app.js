// Signature Stones Uganda — Autonomous 2D Pixel Agent Office Controller
let lastEventId = 0;
let officeState = null;
let selectedPhone = '+256772419820';
let selectedName = 'Eng. Ronald Mukasa (Kira Heights)';
let selectedSuburb = 'Kira';

function animateWalk({ agent, to, item = 'REPORT', bubble = 'Delivering report...' }) {
  if (window.pixelOfficeWalk) {
    const cleanItem = String(item || 'REPORT').replace(/[^\x20-\x7E]/g, '').trim() || 'REPORT';
    const cleanBubble = String(bubble || '').replace(/[^\x20-\x7E]/g, '').trim();
    window.pixelOfficeWalk({ agent, to, item: cleanItem, bubble: cleanBubble });
  }
}

function highlightDesk(deskKey) {
  if (window.pixelOfficeFlashDesk) window.pixelOfficeFlashDesk(deskKey);
}

/** Demo relay button so user can watch the office report handoff anytime */
function demoWalkRelay() {
  if (window.pixelOfficeResumeWork) window.pixelOfficeResumeWork();
  animateWalk({
    agent: 'sarah',
    to: 'david',
    item: 'WA LEADS',
    bubble: 'David, here are 5 Kampala site leads!'
  });
  setTimeout(() => {
    animateWalk({
      agent: 'sarah',
      to: 'emma',
      item: 'B2B EMAILS',
      bubble: 'Emma, email these contractors!'
    });
  }, 4200);
  setTimeout(() => {
    animateWalk({
      agent: 'david',
      to: 'grace',
      item: 'PITCH LIST',
      bubble: 'Grace, I pitched them-watch replies!'
    });
  }, 8400);
  setTimeout(() => {
    animateWalk({
      agent: 'grace',
      to: 'manager',
      item: 'HOT DEAL',
      bubble: 'Boss! 95 sqm Kira site visit ready!'
    });
  }, 12600);
}

async function triggerOfficeBreak() {
  if (window.pixelOfficeStartBreak) window.pixelOfficeStartBreak();
  await fetch('/api/office/break', { method: 'POST' });
  await fetchState();
}

// ---- Poll Server State ----
async function fetchState() {
  try {
    const res = await fetch(`/api/state?since=${lastEventId}`);
    const data = await res.json();
    officeState = data;
    if (data.lastEventId) lastEventId = data.lastEventId;

    renderTopAndKpis(data);
    renderWaSession(data.waSession || {});
    renderAgentStates(data.agentStates || {});
    renderEvents(data.events || []);
    renderOfficeLogs(data.logs || []);
    renderLeadSelector(data.leads || []);
    renderCurrentChat(data.conversations || {});
    renderQueues(data);
  } catch (err) {
    console.error('State poll error:', err);
  }
}

function renderTopAndKpis(data) {
  const c = data.config || {};
  const m = data.metrics || {};

  const shiftDot = document.getElementById('shiftDot');
  const shiftLabel = document.getElementById('shiftLabel');
  if (shiftDot && shiftLabel) {
    if (data.officeShift === 'break') {
      shiftDot.classList.add('break');
      shiftLabel.textContent = 'Auto-Running • Staff Lounge Coffee Break';
    } else {
      shiftDot.classList.remove('break');
      shiftLabel.textContent = 'Auto-Running • Active Work Shift';
    }
  }

  document.getElementById('topDispatcherPhone').textContent = c.dispatcherPhone || 'Not Set';
  document.getElementById('topManagerPhone').textContent = c.managerPhone ? `${c.managerName}: ${c.managerPhone}` : 'Not Set';
  document.getElementById('topSmtpEmail').textContent = c.smtpEmail || 'Set SMTP';

  const mgrNameEl = document.getElementById('deskManagerName');
  if (mgrNameEl) mgrNameEl.textContent = `Desk 5 • ${c.managerName || 'Manager'}`;

  document.getElementById('queueDispatcherNum').textContent = c.dispatcherPhone || 'Dispatcher WhatsApp';
  document.getElementById('queueManagerNum').textContent = `${c.managerName || 'Sales Manager'} (${c.managerPhone || 'no number'})`;

  document.getElementById('kpiTotalLeads').textContent = m.totalLeads ?? 0;
  document.getElementById('kpiWaPitched').textContent = m.waPitched ?? 0;
  document.getElementById('kpiWaNew').textContent = m.waNew ?? 0;
  document.getElementById('kpiEmailTotal').textContent = m.emailLeadsTotal ?? 0;
  document.getElementById('kpiEmailSent').textContent = m.emailSent ?? 0;
  document.getElementById('kpiEmailNew').textContent = m.emailNew ?? 0;
  document.getElementById('kpiActiveChats').textContent = m.activeChats ?? 0;
  document.getElementById('kpiHotDeals').textContent = m.hotDeals ?? 0;
}

function renderWaSession(ws) {
  const badge = document.getElementById('waConnBadge');
  const statusText = document.getElementById('waLinkStatusText');
  const qrBox = document.getElementById('waQrBox');

  if (badge) {
    if (ws.state === 'connected') {
      badge.textContent = 'Linked';
      badge.classList.add('connected');
    } else if (ws.state === 'qr') {
      badge.textContent = 'Scan QR';
      badge.classList.remove('connected');
    } else {
      badge.textContent = '1-Click / QR';
      badge.classList.remove('connected');
    }
  }

  if (statusText) {
    if (ws.state === 'connected') {
      statusText.innerHTML = `<strong style="color:#6ee7b7">Connected to Personal WhatsApp (${escapeHtml(ws.connectedPhone || 'Active')})!</strong> David sends pitches &amp; Grace replies automatically from this number.`;
    } else if (ws.state === 'qr') {
      statusText.textContent = 'Open WhatsApp on your phone → Linked Devices → Link a Device, and scan the QR code on the right.';
    } else if (ws.state === 'connecting') {
      statusText.textContent = 'Generating WhatsApp link session...';
    }
  }

  if (qrBox) {
    if (ws.state === 'connected') {
      qrBox.innerHTML = `<span style="color:#6ee7b7;font-weight:700">WhatsApp Linked ✓<br/>${escapeHtml(ws.connectedPhone || '')}</span>`;
    } else if (ws.qrDataUrl) {
      qrBox.innerHTML = `<img src="${ws.qrDataUrl}" alt="WhatsApp QR Code" />`;
    } else if (ws.state === 'connecting') {
      qrBox.innerHTML = `<span>Loading QR...</span>`;
    } else {
      qrBox.innerHTML = `<span>Click "Generate WhatsApp QR Code" to link your phone</span>`;
    }
  }
}

function renderAgentStates(states) {
  for (const [agent, st] of Object.entries(states)) {
    const statusEl = document.getElementById(`status-${agent}`);
    if (statusEl && st.status) statusEl.textContent = st.status;
    if (window.pixelOfficeSetBubble && st.bubble) {
      const cleanBubble = String(st.bubble).replace(/[^\x20-\x7E]/g, '').trim();
      window.pixelOfficeSetBubble(agent, cleanBubble);
    }
  }
}

function renderEvents(events) {
  for (const ev of events) {
    if (ev.type === 'walk') {
      animateWalk({
        agent: ev.agent,
        to: ev.to,
        item: ev.item || 'REPORT',
        bubble: ev.bubble || 'Handing over report...'
      });
    } else if (ev.type === 'office_break') {
      if (window.pixelOfficeStartBreak) window.pixelOfficeStartBreak();
    } else if (ev.type === 'office_resume') {
      if (window.pixelOfficeResumeWork) window.pixelOfficeResumeWork();
    }
  }
}

function renderOfficeLogs(logs) {
  const box = document.getElementById('officeLogs');
  if (!box) return;
  box.innerHTML = logs.slice(0, 12).map(l =>
    `<div class="ticker-item"><strong>[${escapeHtml(l.time || '')} ${escapeHtml(l.agent)}]</strong> ${escapeHtml(l.message)}</div>`
  ).join('');
}

// ---- Simulator Lead Selector & Conversation Thread ----
function renderLeadSelector(leads) {
  const sel = document.getElementById('simLeadSelect');
  if (!sel) return;
  const waLeads = leads.filter(l => l.channel === 'whatsapp');
  if (sel.options.length === waLeads.length && waLeads.length > 0) return;

  sel.innerHTML = waLeads.map(l => {
    const selected = l.phone === selectedPhone ? 'selected' : '';
    return `<option value="${escapeHtml(l.phone)}" data-name="${escapeHtml(l.name)}" data-suburb="${escapeHtml(l.suburb || 'Kampala')}" ${selected}>
      ${escapeHtml(l.name)} — ${escapeHtml(l.suburb || 'Kampala')} (${escapeHtml(l.phone)})
    </option>`;
  }).join('');
}

function onSelectSimLead() {
  const sel = document.getElementById('simLeadSelect');
  const opt = sel.options[sel.selectedIndex];
  if (!opt) return;
  selectedPhone = opt.value;
  selectedName = opt.getAttribute('data-name') || 'Client';
  selectedSuburb = opt.getAttribute('data-suburb') || 'Kampala';
  if (officeState) renderCurrentChat(officeState.conversations || {});
}

function renderCurrentChat(conversations) {
  const key = String(selectedPhone).replace(/[^0-9]/g, '');
  const thread = conversations[key];
  const box = document.getElementById('waMessages');
  if (!box) return;

  const st = thread?.state || { stage: 'new', need: null, location: null, sqm: null };
  document.getElementById('memStage').textContent = `Stage: ${st.stage || 'new'}`;
  document.getElementById('memNeed').textContent = `Need: ${st.need || '?'}`;
  document.getElementById('memLoc').textContent = `Site: ${st.location || '?'}`;
  document.getElementById('memSqm').textContent = `Size: ${st.sqm ? st.sqm + ' m²' : '?'}`;

  if (!thread || !thread.messages || thread.messages.length === 0) {
    box.innerHTML = `
      <div class="wa-sys-note">
        Chatting as <strong>${escapeHtml(selectedName)}</strong> (${escapeHtml(selectedPhone)}).<br/>
        Click <strong>"Show David's Pitch"</strong> above or type any question below (e.g. <code>"which stone do u have"</code>, <code>"how much per sqm"</code>, or <code>"wall cladding in Kira"</code>).
      </div>
    `;
    return;
  }

  box.innerHTML = thread.messages.map(m => {
    if (m.from === 'client') {
      return `<div class="wa-bubble wa-from-client"><span class="wa-bubble-sender">${escapeHtml(selectedName)} (Client)</span>${escapeHtml(m.text)}</div>`;
    }
    if (m.from === 'david') {
      return `<div class="wa-bubble wa-from-david"><span class="wa-bubble-sender">David (WhatsApp Dispatcher)</span>${escapeHtml(m.text)}</div>`;
    }
    return `<div class="wa-bubble wa-from-grace"><span class="wa-bubble-sender">Grace (Signature Stones Assistant)</span>${escapeHtml(m.text)}</div>`;
  }).join('');

  box.scrollTop = box.scrollHeight;
}

async function submitSimChat(e) {
  e.preventDefault();
  const input = document.getElementById('waInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await sendQuickChat(text);
}

async function sendQuickChat(text) {
  highlightDesk('grace');
  await fetch('/api/chat/inbound', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: selectedPhone, name: selectedName, text })
  });
  await fetchState();
}

async function seedDavidPitch() {
  await fetch('/api/chat/pitch-first', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: selectedPhone, name: selectedName, suburb: selectedSuburb })
  });
  await fetchState();
}

async function resetSimulatorChat() {
  await fetch('/api/chat/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: selectedPhone })
  });
  await fetchState();
}

function focusSimulator() {
  const input = document.getElementById('waInput');
  if (input) input.focus();
}

// ---- Render Bottom Queues ----
function renderQueues(data) {
  const leads = data.leads || [];
  const deals = data.deals || [];

  const waBox = document.getElementById('waLeadsList');
  const waLeads = leads.filter(l => l.channel === 'whatsapp');
  waBox.innerHTML = waLeads.map(l => {
    const statusClass = (l.status === 'Pitched' || l.status === 'Pitch Ready') ? 'ready' : '';
    return `
      <div class="q-item">
        <div class="q-item-top">
          <strong>${escapeHtml(l.name)}</strong>
          <span class="q-status ${statusClass}">${escapeHtml(l.status)}</span>
        </div>
        <div class="q-sub">${escapeHtml(l.suburb)} • ${escapeHtml(l.phone)} • ${escapeHtml(l.project || '')}</div>
        <div class="q-actions">
          ${l.waLink ? `<a class="q-link" href="${escapeHtml(l.waLink)}" target="_blank" rel="noopener" onclick="markPitchSent('${escapeHtml(l.id)}')">Send via Dispatcher WhatsApp</a>` : ''}
          <button class="btn-xs" onclick="selectLeadInSim('${escapeHtml(l.phone)}', '${escapeHtml(l.name)}', '${escapeHtml(l.suburb || 'Kampala')}')">Simulate Reply</button>
        </div>
      </div>
    `;
  }).join('') || '<div class="q-sub">No WhatsApp leads yet.</div>';

  const emBox = document.getElementById('emailLeadsList');
  const emLeads = leads.filter(l => l.channel === 'email');
  emBox.innerHTML = emLeads.map(l => {
    const statusClass = l.status === 'Emailed' ? 'emailed' : '';
    return `
      <div class="q-item">
        <div class="q-item-top">
          <strong>${escapeHtml(l.name)}</strong>
          <span class="q-status ${statusClass}">${escapeHtml(l.status)}</span>
        </div>
        <div class="q-sub">${escapeHtml(l.email)} • ${escapeHtml(l.suburb || 'Kampala')} (${escapeHtml(l.type || 'B2B')})</div>
      </div>
    `;
  }).join('') || '<div class="q-sub">No B2B email leads yet.</div>';

  const dealBox = document.getElementById('hotDealsList');
  dealBox.innerHTML = deals.map(d => `
    <div class="q-item">
      <div class="q-item-top">
        <strong>${escapeHtml(d.clientName)} (${escapeHtml(d.clientPhone)})</strong>
        <span class="q-status hot">${escapeHtml(d.notified || 'Escalated')}</span>
      </div>
      <div class="q-sub"><strong>${escapeHtml(d.need)}</strong> • ${escapeHtml(d.location)} • ${escapeHtml(d.size)}</div>
      <div class="q-sub">"${escapeHtml(d.lastMessage || '')}"</div>
      <div class="q-actions">
        ${d.managerLink ? `<a class="q-link q-link-gold" href="${escapeHtml(d.managerLink)}" target="_blank" rel="noopener">Alert Sales Manager on WhatsApp</a>` : ''}
      </div>
    </div>
  `).join('') || '<div class="q-sub">No hot deals escalated yet.</div>';
}

function selectLeadInSim(phone, name, suburb) {
  selectedPhone = phone;
  selectedName = name;
  selectedSuburb = suburb;
  const sel = document.getElementById('simLeadSelect');
  if (sel) sel.value = phone;
  if (officeState) renderCurrentChat(officeState.conversations || {});
  focusSimulator();
}

async function markPitchSent(leadId) {
  await fetch('/api/dispatch/mark-sent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId })
  });
  setTimeout(fetchState, 600);
}

// ---- Office Action Triggers ----
async function triggerScout() {
  highlightDesk('sarah');
  await fetch('/api/scout', { method: 'POST' });
  await fetchState();
}

async function triggerDispatch() {
  highlightDesk('david');
  await fetch('/api/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 5 }) });
  await fetchState();
}

async function triggerEmail() {
  highlightDesk('emma');
  await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 4 }) });
  await fetchState();
}

// ---- Personal WhatsApp QR Link & Settings Modal ----
async function startPersonalWaLink() {
  await fetch('/api/wa/connect', { method: 'POST' });
  await fetchState();
}

async function disconnectPersonalWa() {
  await fetch('/api/wa/disconnect', { method: 'POST' });
  await fetchState();
}

function openSettingsModal() {
  const c = officeState?.config || {};
  document.getElementById('setDispatcherPhone').value = c.dispatcherPhone || '';
  document.getElementById('setManagerName').value = c.managerName || 'Sales Manager';
  document.getElementById('setManagerPhone').value = c.managerPhone || '';
  document.getElementById('setSmtpEmail').value = c.smtpEmail || '';
  document.getElementById('setSmtpPass').value = '';
  document.getElementById('setManagerEmail').value = c.managerEmail || '';
  document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettingsModal() {
  document.getElementById('settingsModal').style.display = 'none';
}

async function saveSettings(e) {
  e.preventDefault();
  const payload = {
    dispatcherPhone: document.getElementById('setDispatcherPhone').value,
    managerName: document.getElementById('setManagerName').value,
    managerPhone: document.getElementById('setManagerPhone').value,
    smtpEmail: document.getElementById('setSmtpEmail').value,
    smtpPass: document.getElementById('setSmtpPass').value,
    managerEmail: document.getElementById('setManagerEmail').value
  };
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  closeSettingsModal();
  await fetchState();
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Expose globals for pixel canvas clicks
window.triggerScout = triggerScout;
window.triggerDispatch = triggerDispatch;
window.triggerEmail = triggerEmail;
window.triggerOfficeBreak = triggerOfficeBreak;
window.focusSimulator = focusSimulator;
window.openSettingsModal = openSettingsModal;

fetchState();
setInterval(fetchState, 1600);
