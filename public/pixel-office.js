// ============================================================================
// MODERN STUDIO 2D PIXEL-AGENTS OFFICE ENGINE (pixel-office.js)
// - Seamless Modern Architectural Flooring (Zero checkerboard patterns):
//     * Open Studio Workfloor: Smooth wide-plank Scandinavian blonde oak
//     * Executive Glass Suite: Matte charcoal slate with framed indigo rug
//     * Conference Boardroom: Smooth deep-navy acoustic carpet with cyan trim
//     * Barista Kitchen & Lounge: Smooth warm-stone terrazzo & plush lounge rug
// - Frameless Glass Partition Walls with Matte-Black Mullions
// - Glitch-Free Depth Sorting & Ergonomic Seating Geometry:
//     * Monitors sit beside agents on wide modern desks (never blocking faces)
//     * Boardroom chairs & agents sit cleanly behind/in-front of the table
//       (never sitting on top of the table!)
// ============================================================================
(function () {
  const canvas = document.getElementById('pixelOfficeCanvas') || document.getElementById('officeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Logical pixel-art resolution: 544 x 320 scaled 2x -> 1088 x 640
  const TILE = 16;
  const COLS = 34;
  const ROWS = 20;
  const SCALE = 2;
  const W = COLS * TILE * SCALE; // 1088
  const H = ROWS * TILE * SCALE; // 640
  canvas.width = W;
  canvas.height = H;

  const AGENTS_META = window.OFFICE_AGENTS_META || {
    sarah:   { name: 'Sarah', role: 'Lead Scout',           deskLabel: 'DESK 1 • SARAH (SCOUT)',     badgeColor: '#38bdf8' },
    david:   { name: 'David', role: 'WhatsApp Dispatcher',  deskLabel: 'DESK 2 • DAVID (WHATSAPP)',  badgeColor: '#10b981' },
    emma:    { name: 'Emma',  role: 'Email Agent',          deskLabel: 'DESK 3 • EMMA (EMAIL)',      badgeColor: '#a855f7' },
    grace:   { name: 'Grace', role: 'Company Assistant',    deskLabel: 'DESK 4 • GRACE (REPLIES)',   badgeColor: '#14b8a6' },
    manager: { name: 'Fahim', role: 'Sales Manager (Boss)', deskLabel: 'EXEC SUITE • FAHIM (BOSS)', badgeColor: '#f59e0b' }
  };

  const ASSET_PATHS = {
    DESK_FRONT: '/pa-assets/furniture/DESK/DESK_FRONT.png',
    TABLE_FRONT: '/pa-assets/furniture/TABLE_FRONT/TABLE_FRONT.png',
    COFFEE_TABLE: '/pa-assets/furniture/COFFEE_TABLE/COFFEE_TABLE.png',
    COFFEE: '/pa-assets/furniture/COFFEE/COFFEE.png',
    PC_ON_1: '/pa-assets/furniture/PC/PC_FRONT_ON_1.png',
    PC_ON_2: '/pa-assets/furniture/PC/PC_FRONT_ON_2.png',
    PC_ON_3: '/pa-assets/furniture/PC/PC_FRONT_ON_3.png',
    PC_OFF: '/pa-assets/furniture/PC/PC_FRONT_OFF.png',
    CHAIR_FRONT: '/pa-assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png',
    CHAIR_BACK: '/pa-assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_BACK.png',
    CHAIR_SIDE: '/pa-assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_SIDE.png',
    CUSHIONED_FRONT: '/pa-assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png',
    CUSHIONED_BACK: '/pa-assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png',
    CUSHIONED_SIDE: '/pa-assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_SIDE.png',
    BENCH: '/pa-assets/furniture/CUSHIONED_BENCH/CUSHIONED_BENCH.png',
    SOFA_FRONT: '/pa-assets/furniture/SOFA/SOFA_FRONT.png',
    SOFA_BACK: '/pa-assets/furniture/SOFA/SOFA_BACK.png',
    SOFA_SIDE: '/pa-assets/furniture/SOFA/SOFA_SIDE.png',
    DOUBLE_BOOKSHELF: '/pa-assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png',
    BOOKSHELF: '/pa-assets/furniture/BOOKSHELF/BOOKSHELF.png',
    WHITEBOARD: '/pa-assets/furniture/WHITEBOARD/WHITEBOARD.png',
    CLOCK: '/pa-assets/furniture/CLOCK/CLOCK.png',
    LARGE_PAINTING: '/pa-assets/furniture/LARGE_PAINTING/LARGE_PAINTING.png',
    SMALL_PAINTING: '/pa-assets/furniture/SMALL_PAINTING/SMALL_PAINTING.png',
    SMALL_PAINTING_2: '/pa-assets/furniture/SMALL_PAINTING_2/SMALL_PAINTING_2.png',
    PLANT: '/pa-assets/furniture/PLANT/PLANT.png',
    PLANT_2: '/pa-assets/furniture/PLANT_2/PLANT_2.png',
    LARGE_PLANT: '/pa-assets/furniture/LARGE_PLANT/LARGE_PLANT.png',
    HANGING_PLANT: '/pa-assets/furniture/HANGING_PLANT/HANGING_PLANT.png',
    CACTUS: '/pa-assets/furniture/CACTUS/CACTUS.png',
    BIN: '/pa-assets/furniture/BIN/BIN.png',
    PET_CLAUDIO: '/pa-assets/pets/claudio/pet.png',
    PET_GITCAT: '/pa-assets/pets/gitcat/pet.png'
  };

  const images = {};
  for (const [k, url] of Object.entries(ASSET_PATHS)) {
    const img = new Image();
    img.onload = () => { images[k] = img; };
    img.src = url;
  }

  // ---- Build Seamless Modern Architectural Floor Buffer (NO Checkerboard!) ----
  const floorBuffer = document.createElement('canvas');
  floorBuffer.width = COLS * TILE; // 544
  floorBuffer.height = ROWS * TILE; // 320

  function buildModernStudioFloor() {
    const fctx = floorBuffer.getContext('2d');
    fctx.imageSmoothingEnabled = false;

    // 1. Open Studio Workfloor (Left & Center Hallway: x = 0..336, y = 0..320)
    // Seamless warm Nordic oak planks (smooth horizontal planks, zero checker pattern)
    fctx.fillStyle = '#c8ad8d';
    fctx.fillRect(0, 0, 336, 320);
    for (let y = 32; y < 320; y += 8) {
      fctx.fillStyle = (y / 8) % 2 === 0 ? '#ceb495' : '#c3a786';
      fctx.fillRect(0, y, 336, 7);
      fctx.fillStyle = '#b59876'; // Subtle plank seam
      fctx.fillRect(0, y + 7, 336, 1);
      // Staggered vertical plank joints every 48px
      const offset = ((y / 8) % 3) * 16;
      for (let x = offset; x < 336; x += 48) {
        fctx.fillRect(x, y, 1, 7);
      }
    }

    // Modern subtle studio rugs under the 4 workstations in the Open Workfloor
    drawSmoothRug(fctx, 32, 62, 162, 64, '#1e293b', '#334155', '#38bdf8');
    drawSmoothRug(fctx, 32, 190, 162, 64, '#1e293b', '#334155', '#a855f7');

    // 2. Executive Glass Suite (Top-Center: x = 208..336, y = 28..134)
    // Smooth dark architectural slate floor + luxury teal-bordered executive rug
    fctx.fillStyle = '#1e2430';
    fctx.fillRect(208, 28, 128, 106);
    for (let y = 32; y < 134; y += 16) {
      fctx.fillStyle = 'rgba(255,255,255,0.025)';
      fctx.fillRect(208, y, 128, 1);
    }
    drawSmoothRug(fctx, 226, 48, 92, 62, '#172554', '#1e3a8a', '#f59e0b');

    // 3. Glass-Walled Conference Boardroom (Top-Right: x = 336..544, y = 28..154)
    // Smooth deep-slate acoustic studio carpet with modern recessed LED border
    fctx.fillStyle = '#172033';
    fctx.fillRect(336, 28, 208, 126);
    drawSmoothRug(fctx, 352, 44, 174, 96, '#1e293b', '#334155', '#38bdf8');

    // 4. Modern Barista Kitchen & Lounge (Bottom-Right: x = 336..544, y = 154..320)
    // Smooth matte warm-gray architectural concrete/terrazzo (NO checkerboard!)
    fctx.fillStyle = '#b8c2cc';
    fctx.fillRect(336, 154, 208, 166);
    for (let y = 160; y < 320; y += 16) {
      fctx.fillStyle = 'rgba(15, 23, 42, 0.05)';
      fctx.fillRect(336, y, 208, 1);
    }
    // Plush modern teal/indigo area rug under the Lounge Sofas
    drawSmoothRug(fctx, 384, 240, 136, 68, '#0f2942', '#1e3a5f', '#10b981');
  }

  function drawSmoothRug(fctx, x, y, w, h, innerColor, borderColor, accentColor) {
    fctx.fillStyle = borderColor;
    fctx.fillRect(x, y, w, h);
    fctx.fillStyle = accentColor;
    fctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    fctx.fillStyle = innerColor;
    fctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  }

  buildModernStudioFloor();

  // ---- Load Authentic pixel-agents Character Wardrobe Spritesheets ----
  const CHAR_PROFILES = {
    sarah: {
      name: 'Sarah',
      body: 'bust',
      eyeShape: 'lashes',
      utop: 'basic',
      under: 'basic',
      hair: 'parted',
      top: 'long_sleeved_shirt',
      pants: 'shorts',
      shoes: 'boots',
      lanyard: 'lanyard',
      colors: {
        skin:    { h: 0,   s: 0,  b: 0,   c: 0,   palette: 'Tan' },
        hair:    { h: 24,  s: 55, b: -38, c: 12,  colorize: true },
        top:     { h: 205, s: 82, b: 14,  c: 10,  colorize: true },
        pants:   { h: 220, s: 25, b: -35, c: -10, colorize: true },
        lanyard: { h: 195, s: 85, b: 15,  c: 10,  colorize: true },
        shoes:   { h: 0,   s: 0,  b: 0,   c: 0,   palette: 'Black' }
      }
    },
    david: {
      name: 'David',
      body: 'flat',
      eyeShape: 'plain',
      under: 'basic',
      hair: 'parted',
      top: 'tshirt',
      jacket: 'vest',
      pants: 'low_cut_jeans',
      shoes: 'sneakers',
      colors: {
        skin:   { h: 0,   s: 0,  b: 0,   c: 0,   palette: 'Dark' },
        hair:   { h: 9,   s: 5,  b: -72, c: -79, colorize: true },
        top:    { h: 152, s: 75, b: 10,  c: 8,   colorize: true },
        jacket: { h: 0,   s: 0,  b: 0,   c: 0,   palette: 'Original' },
        pants:  { h: 220, s: 35, b: -28, c: -15, colorize: true },
        shoes:  { h: 0,   s: 0,  b: 0,   c: 0,   palette: 'White' }
      }
    },
    emma: {
      name: 'Emma',
      body: 'bust',
      eyeShape: 'lashes',
      utop: 'basic',
      under: 'basic',
      hair: 'bob',
      top: 'long_sleeved_shirt',
      pants: 'skirt',
      shoes: 'boots',
      shades: 'glasses',
      colors: {
        skin:   { h: 0,   s: 0,  b: 0,   c: 0,   palette: 'Pale' },
        hair:   { h: 28,  s: 62, b: -12, c: 14,  colorize: true },
        top:    { h: 278, s: 68, b: 14,  c: 10,  colorize: true },
        pants:  { h: 240, s: 25, b: -42, c: -15, colorize: true },
        shades: { h: 0,   s: 0,  b: 0,   c: 0,   palette: 'Tortoise' },
        shoes:  { h: 0,   s: 0,  b: 0,   c: 0,   palette: 'Black' }
      }
    },
    grace: {
      name: 'Grace',
      body: 'bust',
      eyeShape: 'lashes',
      utop: 'basic',
      under: 'basic',
      hair: 'long_waves',
      full: 'dress',
      shoes: 'boots',
      lanyard: 'lanyard',
      colors: {
        skin:    { h: 0,   s: 0,  b: 0,   c: 0,  palette: 'Tan' },
        hair:    { h: 15,  s: 45, b: -52, c: -20, colorize: true },
        full:    { h: 172, s: 72, b: 4,   c: 12, colorize: true },
        lanyard: { h: 45,  s: 85, b: 15,  c: 15, colorize: true },
        shoes:   { h: 0,   s: 0,  b: 0,   c: 0,  palette: 'Black' }
      }
    },
    manager: {
      name: 'Fahim',
      body: 'flat',
      eyeShape: 'plain',
      under: 'basic',
      hair: 'slicked_back',
      beard: 'stubble',
      full: 'suit_and_tie',
      shoes: 'boots',
      watch: 'watch',
      colors: {
        skin:  { h: 0,   s: 0,  b: 0,   c: 0,   palette: 'Tan' },
        hair:  { h: 25,  s: 40, b: -58, c: -30, colorize: true },
        full:  { h: 218, s: 55, b: -22, c: 12,  colorize: true },
        tie:   { h: 38,  s: 88, b: 18,  c: 20,  colorize: true },
        shoes: { h: 0,   s: 0,  b: 0,   c: 0,   palette: 'Black' },
        watch: { h: 0,   s: 0,  b: 0,   c: 0,   palette: 'Gold' }
      }
    }
  };

  const charSheets = {};
  if (window.PAWardrobe && typeof window.PAWardrobe.load === 'function') {
    window.PAWardrobe.load().then(renderer => {
      for (const [id, profile] of Object.entries(CHAR_PROFILES)) {
        try {
          const bytes = renderer.sheet(profile);
          charSheets[id] = window.PAWardrobe.toCanvas(bytes);
        } catch (err) {
          console.error('Wardrobe render error for', id, err);
        }
      }
    });
  }

  // ---- Glitch-Free Desk & Seating Coordinates (in logical 544x320 space) ----
  // Each workstation has a 44x22 sleek modern desk at (deskX, deskY).
  // Character sits BEHIND the left-center of the desk at (seatX = deskX + 14, seatY = deskY - 2),
  // while the dual/widescreen PC monitor sits on the RIGHT side of the desk (deskX + 26, deskY - 8)
  // so the monitor NEVER obscures the character's face!
  const DESKS = {
    sarah:   { id: 'sarah',   deskX: 44,  deskY: 82,  seatX: 58,  seatY: 78,  facing: 'down', label: AGENTS_META.sarah.deskLabel,   accent: AGENTS_META.sarah.badgeColor },
    david:   { id: 'david',   deskX: 132, deskY: 82,  seatX: 146, seatY: 78,  facing: 'down', label: AGENTS_META.david.deskLabel,   accent: AGENTS_META.david.badgeColor },
    emma:    { id: 'emma',    deskX: 44,  deskY: 210, seatX: 58,  seatY: 206, facing: 'down', label: AGENTS_META.emma.deskLabel,    accent: AGENTS_META.emma.badgeColor },
    grace:   { id: 'grace',   deskX: 132, deskY: 210, seatX: 146, seatY: 206, facing: 'down', label: AGENTS_META.grace.deskLabel,   accent: AGENTS_META.grace.badgeColor },
    manager: { id: 'manager', deskX: 250, deskY: 72,  seatX: 264, seatY: 68,  facing: 'down', label: AGENTS_META.manager.deskLabel, accent: AGENTS_META.manager.badgeColor }
  };

  // Kitchen & Sofa Lounge spots during timed breaks (zero table overlap!)
  const BREAK_SPOTS = {
    sarah:   { x: 416, y: 206, facing: 'down',  pose: 'stand', mug: true  }, // At Kitchen Espresso Bar
    manager: { x: 454, y: 206, facing: 'left',  pose: 'stand', mug: true  }, // At Kitchen Water Cooler
    david:   { x: 422, y: 254, facing: 'down',  pose: 'sit',   mug: true  }, // Seated on Top Sofa (left)
    emma:    { x: 440, y: 254, facing: 'down',  pose: 'sit',   mug: true  }, // Seated on Top Sofa (right)
    grace:   { x: 396, y: 280, facing: 'right', pose: 'sit',   mug: false }  // Seated on Left Armchair
  };

  // Conference Boardroom Meeting spots (cols 22..32, rows 2..9)
  // The Boardroom Table occupies x: 404..472, y: 78..102 (tableSortY = 98).
  // - Fahim stands at the West Head of the table (x: 382, y: 88, facing: 'right') -> outside table!
  // - Sarah & Emma sit in the Top Chairs BEHIND the table (y: 72, charSortY = 76 < tableSortY 98) -> table covers their lower knees!
  // - David & Grace sit in the Bottom Chairs IN FRONT of the table (y: 120, where head top is 120-22=98, charSortY = 124 > tableSortY 98) -> cleanly seated in front of the table facing UP!
  const BOARDROOM_SPOTS = {
    manager: { x: 382, y: 88,  facing: 'right', pose: 'stand' },
    sarah:   { x: 420, y: 72,  facing: 'down',  pose: 'sit'   },
    emma:    { x: 452, y: 72,  facing: 'down',  pose: 'sit'   },
    david:   { x: 420, y: 120, facing: 'up',    pose: 'sit'   },
    grace:   { x: 452, y: 120, facing: 'up',    pose: 'sit'   }
  };

  const actors = {};
  for (const k of Object.keys(DESKS)) {
    const d = DESKS[k];
    actors[k] = {
      id: k,
      x: d.seatX,
      y: d.seatY,
      facing: 'down',
      mode: 'working',
      workPose: k === 'sarah' || k === 'grace' ? 'read' : 'type',
      poseTimer: Math.random() * 6,
      waypoints: [],
      carryItem: null,
      bubble: '',
      bubbleUntil: 0,
      statusText: 'Working at desk',
      animTime: Math.random() * 10
    };
  }

  const pets = [
    { key: 'PET_CLAUDIO', name: 'Claudio', x: 204, y: 152, vx: 10, vy: 0, dir: 1, timer: 3.5, state: 'walk' },
    { key: 'PET_GITCAT',  name: 'GitCat',  x: 492, y: 288, vx: 0,  vy: 0, dir: -1, timer: 6.0, state: 'sleep' }
  ];

  let currentPhase = 'working';
  let boardroomReport = null;
  let hoveredAgentId = null;

  // Obstacle-Free Orthogonal Corridor Pathfinder
  function buildPath(x1, y1, x2, y2) {
    const pts = [];
    if (Math.hypot(x2 - x1, y2 - y1) < 16) {
      pts.push({ x: x2, y: y2 });
      return pts;
    }

    // Main central east-west corridor is at y = 148
    // North-south spine in Open Workfloor is at x = 194
    // North-south spine in Right Wing (Boardroom/Kitchen/Lounge) is at x = 364
    const inRight1 = x1 >= 336;
    const inRight2 = x2 >= 336;
    const inExec1 = x1 >= 208 && x1 < 336 && y1 < 138;
    const inExec2 = x2 >= 208 && x2 < 336 && y2 < 138;

    if (inExec1) {
      pts.push({ x: 272, y: 148 });
    } else if (!inRight1) {
      pts.push({ x: 194, y: y1 });
      pts.push({ x: 194, y: 148 });
    } else {
      pts.push({ x: 364, y: y1 });
      pts.push({ x: 364, y: 148 });
    }

    if (inRight1 !== inRight2) {
      pts.push({ x: 336, y: 148 });
    }

    if (inExec2) {
      pts.push({ x: 272, y: 148 });
      pts.push({ x: 272, y: y2 });
    } else if (inRight2) {
      pts.push({ x: 364, y: 148 });
      pts.push({ x: 364, y: y2 });
    } else {
      pts.push({ x: 194, y: 148 });
      pts.push({ x: 194, y: y2 });
    }

    pts.push({ x: x2, y: y2 });
    return pts;
  }

  function sendActorTo(id, targetX, targetY, afterReach, carryItem) {
    const a = actors[id];
    if (!a) return;
    if (Math.hypot(targetX - a.x, targetY - a.y) < 4) {
      a.x = targetX;
      a.y = targetY;
      if (afterReach) afterReach(a);
      return;
    }
    a.mode = 'walking';
    a.carryItem = carryItem || null;
    a.waypoints = buildPath(a.x, a.y, targetX, targetY);
    a.onArrive = afterReach || null;
  }

  function dispatchWalkHandoff(fromId, toId, itemLabel, bubbleText) {
    if (currentPhase !== 'working') return;
    const fId = fromId === 'fahim' ? 'manager' : fromId;
    const tId = toId === 'fahim' ? 'manager' : toId;
    const a = actors[fId];
    const targetDesk = DESKS[tId];
    const homeDesk = DESKS[fId];
    if (!a || !targetDesk || !homeDesk) return;

    if (bubbleText) {
      a.bubble = bubbleText;
      a.bubbleUntil = Date.now() + 7500;
    }

    // Stand politely to the side of the colleague's desk (never on top of their desk!)
    const dropX = targetDesk.deskX + 50;
    const dropY = targetDesk.seatY + 6;
    sendActorTo(fId, dropX, dropY, () => {
      a.facing = 'left';
      setTimeout(() => {
        if (currentPhase !== 'working') return;
        sendActorTo(fId, homeDesk.seatX, homeDesk.seatY, () => {
          a.mode = 'working';
          a.facing = homeDesk.facing;
          a.carryItem = null;
        }, null);
      }, 900);
    }, itemLabel || 'REPORT');
  }

  function transitionOfficePhase(phase) {
    if (phase === currentPhase) return;
    currentPhase = phase;

    if (phase === 'short_break' || phase === 'long_break') {
      for (const id of Object.keys(actors)) {
        const sp = BREAK_SPOTS[id];
        if (!sp) continue;
        sendActorTo(id, sp.x, sp.y, a => {
          a.mode = 'break';
          a.facing = sp.facing;
          a.carryItem = null;
        }, null);
      }
    } else if (phase === 'boardroom') {
      for (const id of Object.keys(actors)) {
        const sp = BOARDROOM_SPOTS[id];
        if (!sp) continue;
        sendActorTo(id, sp.x, sp.y, a => {
          a.mode = 'boardroom';
          a.facing = sp.facing;
          a.carryItem = null;
        }, 'REPORT');
      }
    } else {
      for (const id of Object.keys(actors)) {
        const d = DESKS[id];
        if (!d) continue;
        sendActorTo(id, d.seatX, d.seatY, a => {
          a.mode = 'working';
          a.facing = d.facing;
          a.carryItem = null;
        }, null);
      }
    }
  }

  // ---- Drawing Helpers ----
  function pxRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x * SCALE), Math.round(y * SCALE), Math.round(w * SCALE), Math.round(h * SCALE));
  }

  function drawAsset(key, x, y, w, h) {
    const img = images[key];
    if (!img) return;
    const dw = (w || img.width) * SCALE;
    const dh = (h || img.height) * SCALE;
    ctx.drawImage(img, Math.round(x * SCALE), Math.round(y * SCALE), Math.round(dw), Math.round(dh));
  }

  function drawAssetFlipped(key, x, y, w, h) {
    const img = images[key];
    if (!img) return;
    const dw = (w || img.width) * SCALE;
    const dh = (h || img.height) * SCALE;
    ctx.save();
    ctx.translate(Math.round((x + (w || img.width)) * SCALE), Math.round(y * SCALE));
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, Math.round(dw), Math.round(dh));
    ctx.restore();
  }

  // Draw Modern Studio Glass Partition Walls & Architectural Trim
  function drawModernGlassWallsAndArchitecture() {
    // North Studio Feature Wall (Sleek dark slate acoustic wall + warm wood top valence)
    pxRect(0, 0, 544, 6, '#0f172a');
    pxRect(0, 6, 544, 20, '#1e293b');
    pxRect(0, 26, 544, 2, '#38bdf8'); // Subtle modern LED accent strip along north wall
    pxRect(0, 28, 544, 2, '#0f172a');

    // Outer perimeter frame
    pxRect(0, 0, 4, 320, '#0f172a');
    pxRect(540, 0, 4, 320, '#0f172a');
    pxRect(0, 316, 544, 4, '#0f172a');

    // Frameless Glass Partition Wall around Executive Suite (x = 208..336, y = 28..134)
    drawGlassWallVertical(208, 28, 106);
    drawGlassWallHorizontal(208, 132, 46); // Left glass wall before doorway
    drawGlassWallHorizontal(290, 132, 46); // Right glass wall after doorway

    // Frameless Glass Partition Wall separating Left Studio & Right Wing (Boardroom / Kitchen)
    drawGlassWallVertical(336, 28, 92);   // Boardroom west glass wall (doorway at y = 120..162)
    drawGlassWallVertical(336, 168, 148); // Kitchen/Lounge west glass wall

    // Glass Partition between Conference Boardroom (top-right) and Barista Kitchen (bottom-right)
    drawGlassWallHorizontal(384, 152, 156); // Wide doorway at x = 336..384

    // Modern Zone Header Badges
    drawZoneSign(12, 9, 'OPEN STUDIO WORKFLOOR', '#38bdf8');
    drawZoneSign(216, 9, 'EXECUTIVE SUITE', '#f59e0b');
    drawZoneSign(346, 9, 'BOARDROOM ("WHAT\'S NEW")', '#a855f7');
    drawZoneSign(392, 156, 'BARISTA KITCHEN & LOUNGE', '#10b981');
  }

  function drawGlassWallHorizontal(x, y, w) {
    pxRect(x, y, w, 5, 'rgba(148, 163, 184, 0.28)'); // Translucent architectural glass
    pxRect(x, y, w, 1.5, '#0f172a');                 // Matte black top rail
    pxRect(x, y + 4, w, 1.5, '#0f172a');             // Matte black bottom rail
    for (let mx = x; mx <= x + w; mx += 22) {
      pxRect(mx, y, 1.5, 5, '#0f172a');              // Black aluminum mullions
    }
  }

  function drawGlassWallVertical(x, y, h) {
    pxRect(x, y, 4, h, 'rgba(148, 163, 184, 0.28)');
    pxRect(x, y, 1.5, h, '#0f172a');
    pxRect(x + 3, y, 1, h, '#0f172a');
    for (let my = y; my <= y + h; my += 22) {
      pxRect(x, my, 4, 1.5, '#0f172a');
    }
  }

  function drawZoneSign(x, y, text, color) {
    ctx.save();
    ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
    const tw = ctx.measureText(text).width / SCALE;
    pxRect(x, y, tw + 8, 11, 'rgba(15, 23, 42, 0.9)');
    pxRect(x, y, 2, 11, color);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(text, Math.round((x + 5) * SCALE), Math.round((y + 8) * SCALE));
    ctx.restore();
  }

  function drawWallAndBackgroundFurniture() {
    // Open Workfloor North Wall
    drawAsset('DOUBLE_BOOKSHELF', 14, 2);
    drawAsset('LARGE_PAINTING', 58, 3);
    drawAsset('CLOCK', 100, 6);
    drawAsset('DOUBLE_BOOKSHELF', 124, 2);
    drawAsset('SMALL_PAINTING', 166, 5);
    drawAsset('HANGING_PLANT', 186, 3);

    // Executive Suite North Wall
    drawAsset('BOOKSHELF', 216, 2);
    drawAsset('SMALL_PAINTING_2', 244, 5);
    drawAsset('WHITEBOARD', 274, 4);
    drawAsset('PLANT', 314, 16);

    // Conference Boardroom North Wall (Presentation Whiteboards + Clock + Plant)
    drawAsset('BOOKSHELF', 346, 2);
    drawAsset('WHITEBOARD', 404, 3);
    drawAsset('WHITEBOARD', 436, 3);
    drawAsset('CLOCK', 476, 6);
    drawAsset('LARGE_PLANT', 508, 6);

    // Modern Barista Kitchen Appliances (x = 400..526, y = 160..192)
    drawKitchenAppliances();
  }

  function drawKitchenAppliances() {
    // Sleek Matte-Black & Stainless Smart Fridge (x: 500, y: 160, w: 22, h: 34)
    pxRect(500, 160, 22, 34, '#334155');
    pxRect(501, 161, 20, 14, '#475569');
    pxRect(501, 176, 20, 17, '#475569');
    pxRect(500, 175, 22, 1, '#0f172a');
    pxRect(518, 165, 1.5, 7, '#94a3b8');
    pxRect(518, 179, 1.5, 9, '#94a3b8');

    // Modern Glass-Front Beverage Cooler (x: 472, y: 160, w: 24, h: 34)
    pxRect(472, 160, 24, 34, '#0f172a');
    pxRect(474, 162, 15, 22, '#1e293b');
    pxRect(476, 164, 3, 4, '#38bdf8');
    pxRect(480, 164, 3, 4, '#10b981');
    pxRect(484, 164, 3, 4, '#f59e0b');
    pxRect(476, 170, 3, 4, '#a855f7');
    pxRect(480, 170, 3, 4, '#ec4899');
    pxRect(484, 170, 3, 4, '#22d3ee');
    pxRect(476, 176, 3, 4, '#84cc16');
    pxRect(480, 176, 3, 4, '#f97316');
    pxRect(484, 176, 3, 4, '#ef4444');

    // Modern Walnut & Quartz Barista Counter (x: 400..468, y: 170..192)
    pxRect(400, 170, 68, 22, '#1e293b'); // Matte slate cabinet base
    pxRect(400, 167, 68, 5, '#f8fafc');  // White quartz countertop
    pxRect(402, 174, 20, 16, '#334155');
    pxRect(424, 174, 20, 16, '#334155');
    pxRect(446, 174, 20, 16, '#334155');
    // Commercial Espresso Machine
    pxRect(406, 157, 14, 11, '#0f172a');
    pxRect(407, 158, 12, 3, '#38bdf8');
    pxRect(410, 163, 4, 4, '#e2e8f0');
    drawAsset('COFFEE', 426, 157);
    drawAsset('COFFEE', 438, 158);
    // Chilled Water Dispenser
    pxRect(454, 154, 10, 10, '#38bdf8');
    pxRect(453, 164, 12, 13, '#e2e8f0');
  }

  // Draw Sleek Modern Workstation Desk (with monitor on the side so character's face is 100% clear!)
  function drawModernWorkstation(d, isWorkingPhase, pcFrameIdx) {
    const x = d.deskX;
    const y = d.deskY;
    const w = 44;
    const h = 18;

    // Desk drop shadow
    pxRect(x + 1, y + h, w, 3, 'rgba(0,0,0,0.22)');
    // Matte black steel legs
    pxRect(x + 2, y + 6, 3, h - 4, '#0f172a');
    pxRect(x + w - 5, y + 6, 3, h - 4, '#0f172a');
    // Modesty front panel (slate)
    pxRect(x + 3, y + 8, w - 6, h - 7, '#1e293b');
    // Sleek warm oak desktop surface with accent front edge
    pxRect(x, y, w, 9, '#e2c799');
    pxRect(x + 1, y + 1, w - 2, 7, '#edd6b0');
    pxRect(x, y + 8, w, 2, d.accent);

    // Keyboard & mouse pad in front of the seated agent (left side of desk: x + 8)
    pxRect(x + 8, y + 3, 11, 4, '#334155');
    pxRect(x + 9, y + 4, 9, 2, '#94a3b8');

    // Widescreen Monitor placed on the RIGHT side of the desk (x + 24) so it NEVER covers the agent's face!
    const pcKey = isWorkingPhase ? `PC_ON_${pcFrameIdx}` : 'PC_OFF';
    drawAsset(pcKey, x + 23, y - 9);

    // Coffee mug on left corner
    drawAsset('COFFEE', x + 1, y - 4, 12, 12);

    if (hoveredAgentId === d.id) {
      ctx.save();
      ctx.strokeStyle = d.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect((x - 3) * SCALE, (y - 18) * SCALE, (w + 6) * SCALE, (h + 26) * SCALE);
      ctx.restore();
    }

    drawDeskTag(x + w / 2, y + h + 4, d.label, d.accent);
  }

  // Draw Modern Conference Boardroom Table (x: 404..468, y: 80..102)
  function drawModernBoardroomTable() {
    const tx = 404;
    const ty = 80;
    const tw = 64;
    const th = 22;

    // Shadow
    pxRect(tx + 2, ty + th, tw, 3, 'rgba(0,0,0,0.3)');
    // Pedestal legs
    pxRect(tx + 8, ty + 8, 5, th - 6, '#0f172a');
    pxRect(tx + tw - 13, ty + 8, 5, th - 6, '#0f172a');
    // Table top (modern walnut + dark slate inlay + purple/cyan LED edge)
    pxRect(tx, ty, tw, th - 4, '#b08968');
    pxRect(tx + 2, ty + 2, tw - 4, th - 8, '#ddb892');
    pxRect(tx + 12, ty + 6, tw - 24, 6, '#1e293b'); // Center connectivity channel
    pxRect(tx, ty + th - 4, tw, 2, '#a855f7');

    // Conference laptops/notepads & coffee on the table
    pxRect(tx + 14, ty + 3, 8, 5, '#f8fafc');
    pxRect(tx + 42, ty + 3, 8, 5, '#f8fafc');
    pxRect(tx + 14, ty + 11, 8, 5, '#fef08a');
    pxRect(tx + 42, ty + 11, 8, 5, '#fef08a');
    drawAsset('COFFEE', tx + 28, ty + 1, 12, 12);
  }

  function drawSceneDepthSorted(nowSec) {
    const items = [];
    const pcFrameIdx = (Math.floor(nowSec * 4) % 3) + 1;
    const isWorkingPhase = currentPhase === 'working';

    // 1. All 5 Agent Workstations
    for (const d of Object.values(DESKS)) {
      // Ergonomic Chair behind agent (sortY = seatY - 4)
      items.push({
        y: d.seatY - 4,
        draw: () => {
          drawAsset(d.id === 'manager' ? 'CUSHIONED_FRONT' : 'CHAIR_FRONT', d.seatX - 8, d.seatY - 12);
        }
      });

      // Modern Workstation Desk in front of agent (sortY = deskY + 18, which is > agent sortY = seatY + 2)
      items.push({
        y: d.deskY + 18,
        draw: () => drawModernWorkstation(d, isWorkingPhase, pcFrameIdx)
      });
    }

    // Studio Plants & Decor
    items.push({ y: 92,  draw: () => drawAsset('PLANT', 14, 72) });
    items.push({ y: 224, draw: () => drawAsset('LARGE_PLANT', 12, 194) });
    items.push({ y: 120, draw: () => drawAsset('BENCH', 218, 98) });

    // 2. Conference Boardroom Table & Chairs (Zero Table Overlap!)
    // Top row chairs (behind table at y = 58, sortY = 64)
    items.push({
      y: 64,
      draw: () => {
        drawAsset('CUSHIONED_FRONT', 412, 58);
        drawAsset('CUSHIONED_FRONT', 444, 58);
      }
    });
    // Note: Sarah & Emma sit at y = 72 -> their character sortY is 74.
    // Boardroom Table is at y = 80..102 -> its sortY is 96 (drawn AFTER Sarah & Emma so their lower legs are under the table,
    // and BEFORE David & Grace who sit in front of the table at y = 120 with sortY = 122!).
    items.push({
      y: 96,
      draw: () => drawModernBoardroomTable()
    });
    // Bottom row chairs (in front of table, drawn behind David & Grace's backs at sortY = 128)
    items.push({
      y: 128,
      draw: () => {
        drawAsset('CUSHIONED_BACK', 412, 108);
        drawAsset('CUSHIONED_BACK', 444, 108);
      }
    });

    // 3. Staff Sofa Lounge (Bottom-Right)
    items.push({
      y: 248,
      draw: () => {
        drawAsset('SOFA_FRONT', 414, 240);
        drawAsset('LARGE_PLANT', 494, 232);
      }
    });
    items.push({
      y: 288,
      draw: () => {
        drawAsset('SOFA_SIDE', 390, 264);
        drawAssetFlipped('SOFA_SIDE', 460, 264, 16, 32);
        drawAsset('COFFEE_TABLE', 414, 270);
        drawAsset('COFFEE', 420, 268);
        drawAsset('COFFEE', 432, 270);
      }
    });
    items.push({
      y: 308,
      draw: () => {
        drawAsset('PLANT_2', 508, 282);
      }
    });

    // 4. Office Pets
    for (const p of pets) {
      items.push({
        y: p.y + 4,
        draw: () => drawPetSprite(p, nowSec)
      });
    }

    // 5. All 5 Staff Characters (sortY = a.y + 2 so they sort cleanly between chairs and desks/tables!)
    for (const a of Object.values(actors)) {
      items.push({
        y: a.y + 2,
        draw: () => drawCharacterActor(a, nowSec)
      });
    }

    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      it.draw();
    }
  }

  function drawDeskTag(cx, y, text, accentColor) {
    ctx.save();
    ctx.font = 'bold 8.5px "Segoe UI", sans-serif';
    const tw = ctx.measureText(text).width / SCALE;
    const bx = cx - (tw + 8) / 2;
    pxRect(bx, y, tw + 8, 9.5, 'rgba(15, 23, 42, 0.92)');
    pxRect(bx, y, 2, 9.5, accentColor);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(text, Math.round((bx + 4) * SCALE), Math.round((y + 7) * SCALE));
    ctx.restore();
  }

  function drawPetSprite(p, nowSec) {
    const img = images[p.key];
    if (!img) return;
    const col = p.state === 'walk' ? (Math.floor(nowSec * 5) % 4) : 0;
    const row = p.state === 'walk' ? 2 : 0;
    const sx = col * 16;
    const sy = row * 16;
    ctx.save();
    if (p.dir < 0) {
      ctx.translate(Math.round((p.x + 8) * SCALE), Math.round((p.y - 8) * SCALE));
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, 16, 16, 0, 0, 16 * SCALE, 16 * SCALE);
    } else {
      ctx.drawImage(
        img,
        sx, sy, 16, 16,
        Math.round((p.x - 8) * SCALE),
        Math.round((p.y - 8) * SCALE),
        16 * SCALE,
        16 * SCALE
      );
    }
    ctx.restore();
  }

  function drawCharacterActor(a, nowSec) {
    const sheet = charSheets[a.id];
    const meta = AGENTS_META[a.id] || { name: a.id, badgeColor: '#38bdf8' };

    let frameCol = 1;
    let facing = a.facing || 'down';

    if (a.mode === 'walking') {
      const walkCycle = [0, 1, 2, 1];
      frameCol = walkCycle[Math.floor(nowSec * 7) % 4];
    } else if (a.mode === 'working') {
      if (a.workPose === 'read') {
        frameCol = 5 + (Math.floor(nowSec * 2.5) % 2);
      } else {
        frameCol = 3 + (Math.floor(nowSec * 5.5) % 2);
      }
    } else if (a.mode === 'boardroom') {
      const isSpeaking = boardroomReport && boardroomReport.speaker === a.id;
      if (isSpeaking) {
        frameCol = a.id === 'manager' ? (Math.floor(nowSec * 3.5) % 2) : (5 + (Math.floor(nowSec * 3) % 2));
      } else {
        frameCol = a.id === 'manager' ? 1 : 7;
      }
    } else if (a.mode === 'break') {
      const sp = BREAK_SPOTS[a.id];
      frameCol = sp && sp.pose === 'sit' ? 7 : 1;
    }

    const rowMap = { down: 0, up: 1, right: 2, left: 2 };
    const rowIdx = rowMap[facing] ?? 0;

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(
      Math.round(a.x * SCALE),
      Math.round((a.y + 8) * SCALE),
      5.5 * SCALE,
      2.2 * SCALE,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    if (sheet) {
      const sx = frameCol * 16;
      const sy = rowIdx * 32;
      const drawX = Math.round((a.x - 8) * SCALE);
      const drawY = Math.round((a.y - 22) * SCALE);

      ctx.save();
      if (facing === 'left') {
        ctx.translate(drawX + 16 * SCALE, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(sheet, sx, sy, 16, 32, 0, 0, 16 * SCALE, 32 * SCALE);
      } else {
        ctx.drawImage(sheet, sx, sy, 16, 32, drawX, drawY, 16 * SCALE, 32 * SCALE);
      }
      ctx.restore();
    }

    if (a.carryItem && a.mode === 'walking') {
      pxRect(a.x + 5, a.y - 9, 9, 7, '#fbbf24');
      pxRect(a.x + 6, a.y - 8, 7, 5, '#fef08a');
    }

    if (a.mode === 'break' && BREAK_SPOTS[a.id]?.mug) {
      drawAsset('COFFEE', a.x + 4, a.y - 12, 12, 12);
    }

    if (currentPhase === 'boardroom' && boardroomReport && boardroomReport.speaker === a.id) {
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.round((a.x - 10) * SCALE), Math.round((a.y - 24) * SCALE), 20 * SCALE, 34 * SCALE);
      ctx.restore();
    }

    // Character Name Pill above head
    ctx.save();
    ctx.font = 'bold 8.5px "Segoe UI", sans-serif';
    const nameStr = meta.name;
    const nw = ctx.measureText(nameStr).width / SCALE;
    const nx = a.x - (nw + 6) / 2;
    const ny = a.y - 30;
    pxRect(nx, ny, nw + 6, 8, 'rgba(15, 23, 42, 0.9)');
    pxRect(nx, ny, 2, 8, meta.badgeColor);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(nameStr, Math.round((nx + 3.5) * SCALE), Math.round((ny + 6.2) * SCALE));
    ctx.restore();
  }

  function drawOverlaysAndSpeechBubbles() {
    if (currentPhase === 'boardroom' && boardroomReport) {
      const bx = 346;
      const by = 128;
      const bw = 186;
      const bh = 22;
      pxRect(bx, by, bw, bh, 'rgba(15, 23, 42, 0.94)');
      pxRect(bx, by, bw, 1.5, '#a855f7');

      ctx.save();
      ctx.font = 'bold 9px "Segoe UI", sans-serif';
      ctx.fillStyle = '#e9d5ff';
      ctx.fillText(
        `📋 BOARDROOM STANDUP (SHIFT #${boardroomReport.shiftNumber || 1})`,
        Math.round((bx + 6) * SCALE),
        Math.round((by + 9) * SCALE)
      );
      ctx.fillStyle = '#86efac';
      ctx.fillText(
        `14 Confirmed Replies • 22 Bounces Purged • +${boardroomReport.newWaAgentsAdded || 0} New WA`,
        Math.round((bx + 6) * SCALE),
        Math.round((by + 18) * SCALE)
      );
      ctx.restore();
    }

    const now = Date.now();
    for (const a of Object.values(actors)) {
      const isBoardroomSpeaker = currentPhase === 'boardroom' && boardroomReport && boardroomReport.speaker === a.id;
      const showBubble = isBoardroomSpeaker || (a.bubble && (now < a.bubbleUntil || hoveredAgentId === a.id));
      if (!showBubble || !a.bubble) continue;

      ctx.save();
      ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
      const text = a.bubble.length > 56 ? a.bubble.slice(0, 54) + '…' : a.bubble;
      const tw = Math.min(236, ctx.measureText(text).width / SCALE + 12);
      const bx = Math.max(8, Math.min(544 - tw - 8, a.x - tw / 2));
      const by = Math.max(6, a.y - 43);

      pxRect(bx, by, tw, 12, isBoardroomSpeaker ? '#fef3c7' : '#ffffff');
      pxRect(bx, by, tw, 1.5, isBoardroomSpeaker ? '#f59e0b' : (AGENTS_META[a.id]?.badgeColor || '#38bdf8'));
      ctx.fillStyle = '#0f172a';
      ctx.fillText(text, Math.round((bx + 5) * SCALE), Math.round((by + 8.8) * SCALE));
      ctx.restore();
    }
  }

  let lastTs = performance.now();

  function tick(ts) {
    const dt = Math.min(0.08, (ts - lastTs) / 1000);
    lastTs = ts;
    const nowSec = ts / 1000;

    for (const a of Object.values(actors)) {
      a.animTime += dt;
      a.poseTimer -= dt;
      if (a.poseTimer <= 0 && a.mode === 'working') {
        a.workPose = a.workPose === 'type' ? 'read' : 'type';
        a.poseTimer = 4 + Math.random() * 6;
      }

      if (a.mode === 'walking' && a.waypoints.length > 0) {
        const wp = a.waypoints[0];
        const dx = wp.x - a.x;
        const dy = wp.y - a.y;
        const dist = Math.hypot(dx, dy);
        const speed = 78;

        if (dist <= speed * dt) {
          a.x = wp.x;
          a.y = wp.y;
          a.waypoints.shift();
          if (a.waypoints.length === 0 && a.onArrive) {
            const cb = a.onArrive;
            a.onArrive = null;
            cb(a);
          }
        } else {
          a.x += (dx / dist) * speed * dt;
          a.y += (dy / dist) * speed * dt;
          if (Math.abs(dx) > Math.abs(dy)) {
            a.facing = dx > 0 ? 'right' : 'left';
          } else {
            a.facing = dy > 0 ? 'down' : 'up';
          }
        }
      }
    }

    const claudio = pets[0];
    if (claudio) {
      claudio.timer -= dt;
      if (claudio.timer <= 0) {
        claudio.state = claudio.state === 'walk' ? 'sleep' : 'walk';
        claudio.dir = Math.random() > 0.5 ? 1 : -1;
        claudio.timer = 3 + Math.random() * 5;
      }
      if (claudio.state === 'walk') {
        claudio.x += claudio.dir * 14 * dt;
        if (claudio.x < 180) { claudio.x = 180; claudio.dir = 1; }
        if (claudio.x > 312) { claudio.x = 312; claudio.dir = -1; }
      }
    }

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(floorBuffer, 0, 0, W, H);

    drawModernGlassWallsAndArchitecture();
    drawWallAndBackgroundFurniture();
    drawSceneDepthSorted(nowSec);
    drawOverlaysAndSpeechBubbles();

    requestAnimationFrame(tick);
  }

  canvas.addEventListener('mousemove', ev => {
    const rect = canvas.getBoundingClientRect();
    const lx = ((ev.clientX - rect.left) / rect.width) * (COLS * TILE);
    const ly = ((ev.clientY - rect.top) / rect.height) * (ROWS * TILE);
    let found = null;
    for (const [id, a] of Object.entries(actors)) {
      if (Math.hypot(lx - a.x, ly - (a.y - 6)) < 22) {
        found = id;
        break;
      }
    }
    hoveredAgentId = found;
    canvas.style.cursor = found ? 'pointer' : 'default';
  });

  // Public API compatibility for both Fitbit Interiors & Signature Stones
  window.pixelOfficeWalk = function ({ agent, to, item, bubble }) {
    dispatchWalkHandoff(agent, to, item, bubble);
  };
  window.pixelOfficeStartBreak = function (kind) {
    transitionOfficePhase(kind || 'short_break');
  };
  window.pixelOfficeResumeWork = function () {
    transitionOfficePhase('working');
  };
  window.pixelOfficeStartBoardroom = function () {
    transitionOfficePhase('boardroom');
  };
  window.pixelOfficeSyncStates = function (states) {
    if (!states) return;
    for (const [id, st] of Object.entries(states)) {
      const aId = id === 'fahim' ? 'manager' : id;
      if (actors[aId]) {
        actors[aId].statusText = st.status || '';
        if (st.bubble && st.bubble !== actors[aId].bubble) {
          actors[aId].bubble = st.bubble;
          actors[aId].bubbleUntil = Date.now() + 9000;
        }
      }
    }
  };
  window.pixelOfficeFlashDesk = function (deskKey) {
    hoveredAgentId = deskKey;
    setTimeout(() => {
      if (hoveredAgentId === deskKey) hoveredAgentId = null;
    }, 2500);
  };

  window.PixelOffice = {
    applyServerState(data) {
      if (!data) return;
      if (data.boardroomReport) {
        boardroomReport = data.boardroomReport;
      }
      if (data.officeShift) {
        transitionOfficePhase(data.officeShift);
      }
      if (data.agentStates) {
        window.pixelOfficeSyncStates(data.agentStates);
      }
      if (Array.isArray(data.events)) {
        for (const ev of data.events) {
          if (ev.type === 'walk' && ev.agent && ev.to) {
            dispatchWalkHandoff(ev.agent, ev.to, ev.item, ev.bubble);
          } else if (ev.type === 'office_break') {
            transitionOfficePhase(ev.kind || 'short_break');
          } else if (ev.type === 'office_boardroom') {
            transitionOfficePhase('boardroom');
          } else if (ev.type === 'office_resume') {
            transitionOfficePhase('working');
          }
        }
      }
    }
  };

  requestAnimationFrame(tick);
})();
