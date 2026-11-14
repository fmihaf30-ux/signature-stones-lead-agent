// ============================================================================
// GRACE — SIGNATURE STONES UGANDA COMPANY ASSISTANT
// Natural, context-aware WhatsApp assistant that handles clients pitched by
// David & Emma. Remembers conversation history, answers any question about
// stone types, prices, installation, locations & samples, respects "no"
// without nagging, and immediately re-engages if a client asks a question later.
// ============================================================================
const { getConfig } = require('../config');
const { log } = require('../store');
const { appendMessage, getThread, updateThread } = require('./conversations');
const { escalate } = require('./escalation');

const STONE_CATALOG = `We supply and install:
1. Natural Wall Cladding: Golden Quartzite, Black Slate, Rustic Split-Face, White/Grey Strip Stone & Sandstone
2. Compound & Driveway Pavers: Natural Granite Cobblestones & Tumbled Pavers
3. Kitchen & Interior: Granite & Quartz Countertops, plus 3D Stone Feature/TV Walls`;

const PRICE_GUIDE = `Here are our standard rates:
• Wall Cladding Stones: UGX 45,000 – 65,000 per m² (stone only) or UGX 80,000 – 110,000 per m² (supplied & installed)
• Cobblestone Pavers: UGX 85,000 – 120,000 per m² supplied & installed
• Granite / Quartz Countertops: from UGX 280,000 per running metre`;

const LOCATIONS = [
  'kira', 'najjera', 'kyanja', 'naalya', 'namugongo', 'gayaza', 'lubowa', 'muyenga',
  'munyonyo', 'kololo', 'naguru', 'bukoto', 'ntinda', 'kisaasi', 'entebbe', 'buziga',
  'makindye', 'seeta', 'mukono', 'kitende', 'bweyogerere', 'kireka', 'matugga', 'wakiso',
  'kampala', 'jinja', 'mbarara', 'masaka', 'gulu', 'mbale', 'kajjansi', 'nansana',
  'kawempe', 'bugolobi', 'kansanga', 'ggaba', 'salaama', 'kigo', 'garuga', 'bulindo',
  'kasangati', 'kungu', 'kulambiro', 'mutungo', 'luzira', 'nakawa', 'rubaga', 'mengo',
  'nsambya', 'lungujja', 'kakiri', 'mpigi', 'lugazi', 'luweero', 'hoima', 'fort portal'
];

const RX = {
  // Hard opt-out / stop
  optout: /(not interested|don'?t want|do not want|dont need|don'?t need|do not need|stop messag|stop texting|^stop$|unsubscribe|leave me|remove me|wrong number|never message)/i,
  // Simple "no" / "noo" / "not now"
  no: /^(no+|nope|nah|not really|no thanks|no thank you|sorry no|not yet|not now|no sir|no madam|maybe later)\b/i,
  // Affirmative
  yes: /^(yes+|yeah|yea|yep|sure|ok(ay)?|alright|please|go ahead|send( it)?|why not|of course|definitely|yes please|share( it)?|let me see)\b/i,
  // Apologies / soft conversational turns ("sorry", "oh sorry", "my bad", "wait")
  apology: /^(sorry|oh sorry|so sorry|apologies|my bad|excuse me|pardon|oops|wait)\b/i,
  // Gratitude / acknowledgements
  thanks: /^(thanks|thank you|thank u|thx|well received|received|appreciated|webale|ebale)\b/i,
  // Greetings
  greet: /^(hi+|hello+|hey+|good (morning|afternoon|evening)|habari|oli otya|gyebale|how are you|greetings|morning|afternoon|evening)\b/i,
  // Asking what stones / products / types / colors we have
  stones: /(which stone|what stone|what type|which type|types of stone|kind of stone|what do you (have|sell|supply|offer)|what products|which products|stone options|what colors|what colours|do you have)/i,
  // Asking who this is
  who: /(who (is|are) (this|you)|what company|where did you get my (number|contact)|how did you get my)/i,
  // Price / cost / rate / budget
  price: /(price|how much|cost|rate|charge|ssente|budget|expensive|cheap|per m|per square|per metre|per meter|price list|price guide|pricing)/i,
  // Formal quote / estimate
  quote: /(quote|quotation|proforma|invoice|estimate|bill of quantities|boq)/i,
  // Site visit / measurement
  visit: /(come (and )?(see|measure|check|visit)|site visit|visit (my|the) site|measure|survey|inspect|bring (the )?samples|come to (my|the) site)/i,
  // Asking to speak to manager / call
  human: /(call me|talk to|speak (to|with)|manager|boss|director|real person|human|your number|phone number|contact person|can i call)/i,
  // Installation / fixing / labour
  install: /(install|fix(ing)?|fitting|mason|fundi|labou?r|workmanship|supply only|do you also fix)/i,
  // Photos / samples / videos / catalogue
  samples: /(sample|photo|picture|pics|catalog|catalogue|brochure|portfolio|see your work|video|tiktok|show me)/i,
  // Office / showroom location
  where: /(where are you|where is your|your (office|yard|showroom|location|shop)|address|located where|find you)/i,
  // Delivery / upcountry
  delivery: /(deliver|transport|upcountry|outside kampala|far|countrywide)/i,
  // Duration / timeline
  time: /(how long|how many days|duration|when can you (start|come)|timeline|take long)/i,
  // Payment terms
  pay: /(pay|deposit|payment|mobile money|momo|installment|credit|terms)/i,
  // Agent referral commission
  commission: /(commission|referral|refer|agent fee|my cut|10%|ten percent)/i,
  // Durability / weather / maintenance
  durability: /(last|durable|fade|maintenance|rain|clean|quality|guarantee|warranty|seal|waterproof|moss)/i
};

function extractSlots(text) {
  const t = text.toLowerCase();
  const slots = {};

  // Match square metres even if written as "95 sqm", "95m2", "95 square meters", or standalone number when stage expects sqm
  const sqm = t.match(/(\d{1,5})\s*(sqm|sq\.?\s*m|square\s*met(er|re)s?|m2|m²|metres? square|meters? square)/i);
  if (sqm) slots.sqm = Number(sqm[1]);

  const loc = LOCATIONS.find(l => new RegExp(`\\b${l}\\b`, 'i').test(t));
  if (loc) slots.location = loc.charAt(0).toUpperCase() + loc.slice(1);

  if (/(cladding|wall|fence|pillar|facade|gate|perimeter|front of (the|my) house|exterior)/i.test(t)) {
    slots.need = 'Wall cladding';
  } else if (/(paver|paving|cobble|compound|driveway|parking|walkway|pavement)/i.test(t)) {
    slots.need = 'Compound paving';
  } else if (/(counter|kitchen|granite|quartz top|vanity|worktop)/i.test(t)) {
    slots.need = 'Granite / quartz tops';
  } else if (/(tv wall|fireplace|feature wall|interior|inside)/i.test(t)) {
    slots.need = 'Interior feature wall';
  }

  return slots;
}

function nextQuestion(st) {
  if (!st.need) return 'Which area are you looking to finish — exterior walls/fence, compound paving, or kitchen countertops?';
  if (!st.location) return `Nice choice (${st.need.toLowerCase()}). Which area/suburb is your site located in?`;
  if (!st.sqm) return `Roughly how many square metres (m²) is the area in ${st.location}? (Even a rough estimate is fine.)`;
  st.pendingCall = true;
  return `Would you like our Sales Manager to arrange a free site visit in ${st.location} with physical stone samples?`;
}

// ------------------------- Conversational Rule Engine -------------------------
function ruleReply(thread, text) {
  const c = getConfig();
  const st = thread.state;
  const raw = String(text || '').trim();
  const t = raw.toLowerCase();
  const slots = extractSlots(raw);

  // If Grace previously asked for square metres and client replies with a plain number like "80" or "about 120"
  if (!slots.sqm && st.lastAsked === 'sqm') {
    const plainNum = t.match(/^(?:about|around|roughly|approx|like)?\s*(\d{2,4})\s*$/);
    if (plainNum) slots.sqm = Number(plainNum[1]);
  }

  const gotSlots = Object.keys(slots).length > 0;
  Object.assign(st, Object.fromEntries(Object.entries(slots).filter(([, v]) => v)));

  // Check if the client is asking ANY question or showing interest (even if the chat was previously closed!)
  const isQuestionOrTopic =
    RX.stones.test(t) ||
    RX.price.test(t) ||
    RX.quote.test(t) ||
    RX.visit.test(t) ||
    RX.human.test(t) ||
    RX.install.test(t) ||
    RX.samples.test(t) ||
    RX.where.test(t) ||
    RX.delivery.test(t) ||
    RX.time.test(t) ||
    RX.pay.test(t) ||
    RX.commission.test(t) ||
    RX.durability.test(t) ||
    RX.who.test(t) ||
    gotSlots ||
    t.includes('?');

  // If the thread was previously marked closed, RE-OPEN IT immediately if the client asks a question or re-engages!
  if (st.stage === 'closed') {
    if (isQuestionOrTopic || RX.yes.test(t) || RX.greet.test(t) || RX.apology.test(t)) {
      st.stage = 'engaged';
      st.declines = 0;
    } else if (RX.no.test(t) || RX.optout.test(t) || RX.thanks.test(t)) {
      return { reply: `You're welcome! Feel free to reach out anytime in the future if a project comes up. Have a great day!` };
    }
  }

  // 1. Explicit Opt-Out ("no i don't want", "not interested", "stop")
  if (RX.optout.test(t)) {
    st.stage = 'closed';
    st.pendingCall = false;
    return {
      reply: `Understood, thank you for letting me know. We won't message you again, and if you ever need stone finishing in the future you can reach us anytime. Have a great day!`,
      optOut: true
    };
  }

  // 2. Simple "no" / "noo" / "not now"
  if (RX.no.test(t) && !gotSlots && !isQuestionOrTopic) {
    st.declines = (st.declines || 0) + 1;
    // If Grace just asked if they want a manager call, don't close the whole chat—just offer to help here in chat
    if (st.pendingCall) {
      st.pendingCall = false;
      return {
        reply: `No problem at all — we don't have to call. You can ask me anything right here about our stone types, prices per m², or installation.`
      };
    }
    // Otherwise, respect "no" immediately on the first time without nagging!
    st.stage = 'closed';
    return {
      reply: `No problem at all! Thank you for your time. Whenever you or a client need wall cladding stones, compound cobblestones, or granite tops in the future, just message us here. Have a great day!`,
      optOut: true
    };
  }

  // 3. Apologies ("sorry", "oh sorry", "my bad", "wait")
  if (RX.apology.test(t) && !isQuestionOrTopic) {
    st.stage = 'engaged';
    return {
      reply: `No worries at all! 😊 How can I help you today — would you like to see the types of stones we have, or check our prices per m²?`
    };
  }

  // 4. Asking what stones / products we have ("which stone do u have", "what types of stone", etc.)
  if (RX.stones.test(t) && !RX.price.test(t) && !RX.visit.test(t)) {
    st.stage = 'engaged';
    const followUp = gotSlots ? nextQuestion(st) : 'Which one are you considering for your project — wall cladding, compound pavers, or kitchen tops?';
    return {
      reply: `${STONE_CATALOG}\n\nYou can also view our finished installations here: ${c.tiktok}\n\n${followUp}`
    };
  }

  // 5. Asking who we are
  if (RX.who.test(t)) {
    return {
      reply: `I'm Grace, the company assistant at ${c.business}. We supply and install natural wall cladding stones, cobblestone pavers, and granite countertops across Uganda. How can I assist you today?`
    };
  }

  // 6. Ready for Site Visit / Quote / Manager Call -> Escalate to Sales Manager (Desk 5)
  const wantsHuman = RX.human.test(t);
  const wantsVisit = RX.visit.test(t) || RX.quote.test(t);
  const yesToCall = RX.yes.test(t) && st.pendingCall;
  const enoughInfo = Boolean(st.location && (st.need || st.sqm) && (gotSlots || wantsVisit));

  if (!st.escalated && (wantsHuman || yesToCall || (wantsVisit && st.location) || enoughInfo)) {
    st.escalated = true;
    st.stage = 'escalated';
    st.pendingCall = false;
    const summary = [st.need, st.location, st.sqm ? `${st.sqm} m²` : null].filter(Boolean).join(', ');
    return {
      reply: `Perfect, thank you! I have forwarded your project details${summary ? ' (' + summary + ')' : ''} to our ${c.managerName}. They will call you shortly on this number to arrange a free site visit with physical stone samples.`,
      escalate: true
    };
  }

  if (wantsVisit && !st.location) {
    st.stage = 'engaged';
    return {
      reply: `We'd be glad to bring physical stone samples and measure your site for free. Which area/suburb is the site located in?`
    };
  }

  if (st.escalated && (wantsHuman || wantsVisit || yesToCall || (RX.yes.test(t) && !RX.price.test(t)))) {
    return {
      reply: `Great! Our ${c.managerName} already has your project details and will call you shortly${c.managerPhone ? ' (or you can reach them directly on ' + c.managerPhone + ')' : ''}.`
    };
  }

  // 7. Price / Cost / Rate questions OR "Yes" to David's initial price-guide offer
  if (RX.price.test(t) || (RX.yes.test(t) && !gotSlots)) {
    st.stage = 'engaged';
    const q = nextQuestion(st);
    if (!st.sqm && st.location && st.need) st.lastAsked = 'sqm';
    return {
      reply: `${PRICE_GUIDE}\n\nRecent projects: ${c.tiktok}\n\n${q}`
    };
  }

  // 8. Commission / Referral questions
  if (RX.commission.test(t)) {
    st.stage = 'engaged';
    return {
      reply: `Yes — we pay a 10% referral commission on every client or project you connect us with, paid via Mobile Money or cash as soon as the client confirms the job. Do you have a client looking for stone work right now?`
    };
  }

  // 9. Installation vs Supply-Only
  if (RX.install.test(t)) {
    st.stage = 'engaged';
    return {
      reply: `Yes, we do both: you can buy the stone only, or have our experienced masons handle the full installation (cutting, adhesive, grouting, and waterproof sealing). ${nextQuestion(st)}`
    };
  }

  // 10. Samples / Photos / Portfolio
  if (RX.samples.test(t)) {
    st.stage = 'engaged';
    return {
      reply: `You can see videos of our recent stone installations here: ${c.tiktok}\nWhen we visit your site for measurement, we also bring physical stone boards so you can compare them on your wall. ${nextQuestion(st)}`
    };
  }

  // 11. Office / Location
  if (RX.where.test(t)) {
    st.stage = 'engaged';
    return {
      reply: `We are based in Kampala and work on sites across all of Uganda. For most clients, we bring our physical stone sample boards directly to your site for a free assessment. ${nextQuestion(st)}`
    };
  }

  // 12. Delivery / Upcountry
  if (RX.delivery.test(t)) {
    st.stage = 'engaged';
    return {
      reply: `Yes, we deliver stone and send our installation teams anywhere in Uganda. Transport is calculated based on your site location and quantity. ${nextQuestion(st)}`
    };
  }

  // 13. Timeline / How long installation takes
  if (RX.time.test(t)) {
    st.stage = 'engaged';
    return {
      reply: `A typical house facade or compound takes 3 to 7 days to complete once materials are on site. ${nextQuestion(st)}`
    };
  }

  // 14. Payment Terms
  if (RX.pay.test(t)) {
    st.stage = 'engaged';
    return {
      reply: `We work with a standard deposit when delivering the stone to site, and the balance upon completion. Mobile Money, bank, and cash are all accepted. ${nextQuestion(st)}`
    };
  }

  // 15. Durability / Weather / Fading
  if (RX.durability.test(t)) {
    st.stage = 'engaged';
    return {
      reply: `Because it is 100% natural quarried stone, it never fades or peels like paint. We also apply a protective stone sealer so rain and dust don't stain it. ${nextQuestion(st)}`
    };
  }

  // 16. Client shared project slots (Location, SqM, or Need)
  if (gotSlots) {
    st.stage = 'engaged';
    const parts = [];
    if (slots.need) parts.push(slots.need);
    if (slots.location) parts.push(`in ${slots.location}`);
    if (slots.sqm) parts.push(`(${slots.sqm} m²)`);
    const ack = `Got it — ${parts.join(' ')}.`;
    const q = nextQuestion(st);
    if (!st.sqm && st.location && st.need) st.lastAsked = 'sqm';
    return { reply: `${ack} ${q}` };
  }

  // 17. Greetings ("hello", "hi", "good morning")
  if (RX.greet.test(t)) {
    st.stage = 'engaged';
    return {
      reply: `Hello! 👋 This is Grace from ${c.business}. We supply and install natural wall cladding stones, compound cobblestones, and granite countertops. How can I help you today?`
    };
  }

  // 18. Thanks
  if (RX.thanks.test(t)) {
    return {
      reply: `You're very welcome! Let me know anytime if you need stone prices or a free site measurement.`
    };
  }

  // 19. Helpful Conversational Fallback (Never pushes a random call unless asked)
  st.fallbacks = (st.fallbacks || 0) + 1;
  if (st.fallbacks === 1) {
    return {
      reply: `I'd be happy to help with that! Are you looking for our stone types (wall cladding, cobblestones, granite tops), our prices per m², or a free site visit?`
    };
  }
  return {
    reply: `${STONE_CATALOG}\n\n${PRICE_GUIDE}\n\nLet me know which stone you're interested in or share your site location so we can advise you properly!`
  };
}

// ------------------------- Optional Gemini Enhancement -------------------------
async function geminiReply(thread, text) {
  const c = getConfig();
  const history = thread.messages
    .slice(-14)
    .map(m => `${m.from === 'client' ? 'CLIENT' : m.from.toUpperCase()}: ${m.text}`)
    .join('\n');

  const prompt = `You are Grace, the polite, intelligent WhatsApp Company Assistant for ${c.business} in Kampala, Uganda.
Products: ${STONE_CATALOG.replace(/\n/g, ' ')}
Prices: ${PRICE_GUIDE.replace(/\n/g, ' ')}
Portfolio: ${c.tiktok}. We offer free site visits with physical stone samples and pay 10% referral commission to property agents.
Rules:
1. Keep replies concise (1-3 short paragraphs max), natural, human, and directly responsive to what the client just said.
2. If the client says "no" to a pitch, politely thank them and stop pushing (optOut=true) — NEVER re-offer the price guide right after they said "no" to the price guide!
3. If the client asks a question later (even after saying no earlier), answer their question warmly and thoroughly!
4. Set escalate=true ONLY when the client asks for a site visit, quote, call, or has shared both their site location and stone need.
Known state: need=${thread.state.need || '?'}, location=${thread.state.location || '?'}, sqm=${thread.state.sqm || '?'}, escalated=${thread.state.escalated}.
Conversation so far:
${history}
CLIENT: ${text}
Return ONLY valid JSON: {"reply":"...","escalate":false,"optOut":false,"location":null,"sqm":null,"need":null}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${c.geminiModel}:generateContent?key=${c.geminiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.35 }
    }),
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const out = JSON.parse(raw);
  const st = thread.state;
  if (out.location) st.location = out.location;
  if (out.sqm) st.sqm = Number(out.sqm) || st.sqm;
  if (out.need) st.need = out.need;
  if (out.optOut) st.stage = 'closed';
  if (out.escalate && st.escalated) out.escalate = false;
  if (out.escalate) {
    st.escalated = true;
    st.stage = 'escalated';
  }
  return { reply: out.reply, escalate: Boolean(out.escalate), optOut: Boolean(out.optOut) };
}

/** Main entry: handle a client's WhatsApp reply */
async function handleClientMessage({ phone, text, name }) {
  const thread = appendMessage(phone, { from: 'client', text }, { name });
  const c = getConfig();
  let result;
  if (c.geminiKey) {
    try {
      result = await geminiReply(thread, text);
    } catch (err) {
      log('Grace', `Using built-in conversational brain (${err.message})`, 'warn');
    }
  }
  if (!result) result = ruleReply(thread, text);

  updateThread(phone, { state: thread.state });
  if (result.reply) appendMessage(phone, { from: 'grace', text: result.reply });

  log('Grace', `${thread.name}: "${text.slice(0, 40)}" → replied`, 'chat');

  let deal = null;
  if (result.escalate) {
    deal = await escalate({
      phone,
      name: thread.name,
      location: thread.state.location,
      sqm: thread.state.sqm,
      need: thread.state.need,
      lastMessage: text
    });
  }
  return {
    reply: result.reply,
    escalated: Boolean(result.escalate),
    optOut: Boolean(result.optOut),
    deal,
    thread: getThread(phone)
  };
}

module.exports = { handleClientMessage, ruleReply, extractSlots };
