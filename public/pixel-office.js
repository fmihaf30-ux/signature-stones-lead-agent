// ============================================================================
// AUTHENTIC PIXEL-AGENTS 2D OFFICE WORKFLOOR ENGINE (pixel-office.js)
// Uses the official pixel-agents PNG assets (/pa-assets/floors, /pa-assets/furniture,
// /pa-assets/pets) + the authentic pixel-agents 128x96 8-frame Character Wardrobe
// Compositor (window.PAWardrobe: walk1..3, type1..2, read1..2, seated).
//
// Operates on a real 3-Phase Office Cycle:
//   1. ACTIVE WORK SHIFT ('working') -> Staff at desks with animated PCs ON,
//      typing/reading & walking real folders between desks.
//   2. TIMED BREAK ('short_break' / 'long_break') -> PCs turn OFF; staff walk
//      to the Kitchen Coffee Bar & Sofa Lounge to rest.
//   3. END-OF-BREAK BOARDROOM MEETING ('boardroom') -> Staff gather around the
//      Conference Boardroom Table & Whiteboard to review WHAT'S NEW that was
//      added, sent, blocked/stopped, and replied before returning to work!
// ============================================================================
(function () {
  const canvas = document.getElementById('pixelOfficeCanvas') || document.getElementById('officeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Logical pixel-art resolution: 34 cols x 20 rows of 16x16 tiles = 544 x 320
  // Rendered at 2x scale on a 1088 x 640 canvas for razor-sharp pixel art!
  const TILE = 16;
  const COLS = 34;
  const ROWS = 20;
  const SCALE = 2;
  const W = COLS * TILE * SCALE; // 1088
  const H = ROWS * TILE * SCALE; // 640
  canvas.width = W;
  canvas.height = H;

  const AGENTS_META = window.OFFICE_AGENTS_META || {
    sarah:   { name: 'Sarah', role: 'Lead Scout',           deskLabel: 'DESK 1 • SARAH (SCOUT)',       badgeColor: '#3b82f6' },
    david:   { name: 'David', role: 'WhatsApp Dispatcher',  deskLabel: 'DESK 2 • DAVID (WHATSAPP)',    badgeColor: '#10b981' },
    emma:    { name: 'Emma',  role: 'Email Agent',          deskLabel: 'DESK 3 • EMMA (EMAIL)',        badgeColor: '#a855f7' },
    grace:   { name: 'Grace', role: 'Company Assistant',    deskLabel: 'DESK 4 • GRACE (REPLIES)',     badgeColor: '#14b8a6' },
    manager: { name: 'Fahim', role: 'Sales Manager (Boss)', deskLabel: 'EXEC OFFICE • FAHIM (BOSS)',   badgeColor: '#f59e0b' }
  };

  // ---- Load Official pixel-agents PNG Assets ----
  const ASSET_PATHS = {
    floor_1: '/pa-assets/floors/floor_1.png',
    floor_2: '/pa-assets/floors/floor_2.png',
    floor_3: '/pa-assets/floors/floor_3.png',
    floor_7: '/pa-assets/floors/floor_7.png',
    floor_8: '/pa-assets/floors/floor_8.png',
    DESK_FRONT: '/pa-assets/furniture/DESK/DESK_FRONT.png',
    TABLE_FRONT: '/pa-assets/furniture/TABLE_FRONT/TABLE_FRONT.png',
    SMALL_TABLE_FRONT: '/pa-assets/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png',
    COFFEE_TABLE: '/pa-assets/furniture/COFFEE_TABLE/COFFEE_TABLE.png',
    COFFEE: '/pa-assets/furniture/COFFEE/COFFEE.png',
    PC_ON_1: '/pa-assets/furniture/PC/PC_FRONT_ON_1.png',
    PC_ON_2: '/pa-assets/furniture/PC/PC_FRONT_ON_2.png',
    PC_ON_3: '/pa-assets/furniture/PC/PC_FRONT_ON_3.png',
    PC_OFF: '/pa-assets/furniture/PC/PC_FRONT_OFF.png',
    PC_BACK: '/pa-assets/furniture/PC/PC_BACK.png',
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
  const tintedFloors = {};

  function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = h / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r1 = 0, g1 = 0, b1 = 0;
    if (hp < 1) { r1 = c; g1 = x; }
    else if (hp < 2) { r1 = x; g1 = c; }
    else if (hp < 3) { g1 = c; b1 = x; }
    else if (hp < 4) { g1 = x; b1 = c; }
    else if (hp < 5) { r1 = x; b1 = c; }
    else { r1 = c; b1 = x; }
    const m = l - c / 2;
    return [
      Math.max(0, Math.min(255, Math.round((r1 + m) * 255))),
      Math.max(0, Math.min(255, Math.round((g1 + m) * 255))),
      Math.max(0, Math.min(255, Math.round((b1 + m) * 255)))
    ];
  }

  // Exact pixel-agents floor tile colorizer
  function buildTintedFloorTile(img, h, s, b, c) {
    const off = document.createElement('canvas');
    off.width = 16;
    off.height = 16;
    const octx = off.getContext('2d');
    octx.drawImage(img, 0, 0, 16, 16);
    const id = octx.getImageData(0, 0, 16, 16);
    const d = id.data;
    const contrastFactor = (100 + c) / 100;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      let lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      if (c !== 0) lum = 0.5 + (lum - 0.5) * contrastFactor;
      if (b !== 0) lum += b / 200;
      lum = Math.max(0, Math.min(1, lum));
      const [r, g, bl] = hslToRgb(h, s / 100, lum);
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = bl;
    }
    octx.putImageData(id, 0, 0);
    return off;
  }

  let floorBuffer = null;

  function rebuildFloorBuffer() {
    if (!images.floor_7 || !images.floor_1 || !images.floor_2 || !images.floor_8 || !images.floor_3) return;
    tintedFloors.woodMain    = buildTintedFloorTile(images.floor_7, 31, 46, 8, 14);   // Warm oak workfloor
    tintedFloors.woodExec    = buildTintedFloorTile(images.floor_2, 25, 50, -6, 18);  // Executive walnut parquet
    tintedFloors.boardCarpet = buildTintedFloorTile(images.floor_1, 214, 38, -8, 12); // Boardroom slate-blue carpet
    tintedFloors.kitchenTile = buildTintedFloorTile(images.floor_8, 38, 22, 26, 16);  // Kitchen cream ceramic tile
    tintedFloors.loungeRug   = buildTintedFloorTile(images.floor_3, 225, 42, -2, 14); // Lounge woven blue carpet

    const off = document.createElement('canvas');
    off.width = COLS * TILE;
    off.height = ROWS * TILE;
    const octx = off.getContext('2d');
    octx.imageSmoothingEnabled = false;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let tile = tintedFloors.woodMain;
        // Executive Office (top center: cols 13..20, rows 0..8)
        if (c >= 13 && c <= 20 && r <= 8) {
          tile = tintedFloors.woodExec;
        }
        // Conference Boardroom (top right: cols 21..33, rows 0..9)
        else if (c >= 21 && r <= 9) {
          tile = tintedFloors.boardCarpet;
        }
        // Kitchen & Coffee Bar (middle right: cols 21..33, rows 10..13)
        else if (c >= 21 && r >= 10 && r <= 13) {
          tile = tintedFloors.kitchenTile;
        }
        // Staff Sofa Lounge (bottom right: cols 21..33, rows 14..19)
        else if (c >= 21 && r >= 14) {
          tile = tintedFloors.loungeRug;
        }
        octx.drawImage(tile, c * TILE, r * TILE);
      }
    }
    floorBuffer = off;
  }

  for (const [k, url] of Object.entries(ASSET_PATHS)) {
    const img = new Image();
    img.onload = () => {
      images[k] = img;
      rebuildFloorBuffer();
    };
    img.src = url;
  }

  // ---- Load Authentic pixel-agents Character Wardrobe Spritesheets ----
  // Profiles directly modeled after pixel-agents' official Z5 defaults + office roles
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
        top:     { h: 210, s: 78, b: 14,  c: 10,  colorize: true },
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

  // ---- Room Coordinates (in logical 544x320 pixel space, scaled by SCALE=2) ----
  // Desk stations (agent sits behind desk facing DOWN towards monitor/desk)
  // In logical space:
  //   Desk 1 (Sarah):   col 3..4, row 5..6   -> agent at (x: 64,  y: 78)
  //   Desk 2 (David):   col 8..9, row 5..6   -> agent at (x: 144, y: 78)
  //   Desk 3 (Emma):    col 3..4, row 13..14 -> agent at (x: 64,  y: 206)
  //   Desk 4 (Grace):   col 8..9, row 13..14 -> agent at (x: 144, y: 206)
  //   Desk 5 (Fahim):   col 16..17, row 4..5 -> agent at (x: 272, y: 62)
  const DESKS = {
    sarah:   { id: 'sarah',   col: 3,  row: 5,  seatX: 64,  seatY: 82,  facing: 'down', label: AGENTS_META.sarah.deskLabel,   accent: AGENTS_META.sarah.badgeColor },
    david:   { id: 'david',   col: 8,  row: 5,  seatX: 144, seatY: 82,  facing: 'down', label: AGENTS_META.david.deskLabel,   accent: AGENTS_META.david.badgeColor },
    emma:    { id: 'emma',    col: 3,  row: 13, seatX: 64,  seatY: 210, facing: 'down', label: AGENTS_META.emma.deskLabel,    accent: AGENTS_META.emma.badgeColor },
    grace:   { id: 'grace',   col: 8,  row: 13, seatX: 144, seatY: 210, facing: 'down', label: AGENTS_META.grace.deskLabel,   accent: AGENTS_META.grace.badgeColor },
    manager: { id: 'manager', col: 16, row: 4,  seatX: 272, seatY: 66,  facing: 'down', label: AGENTS_META.manager.deskLabel, accent: AGENTS_META.manager.badgeColor }
  };

  // Kitchen & Sofa Lounge spots during timed breaks (cols 22..32, rows 11..18)
  const BREAK_SPOTS = {
    sarah:   { x: 392, y: 196, facing: 'down',  pose: 'stand', mug: true  }, // At Kitchen Espresso Bar
    david:   { x: 420, y: 266, facing: 'down',  pose: 'sit',   mug: true  }, // On Top Sofa (left)
    emma:    { x: 438, y: 266, facing: 'down',  pose: 'sit',   mug: true  }, // On Top Sofa (right)
    grace:   { x: 394, y: 284, facing: 'right', pose: 'sit',   mug: false }, // On Left Armchair
    manager: { x: 444, y: 196, facing: 'left',  pose: 'stand', mug: true  }  // By Kitchen Water Cooler
  };

  // Conference Boardroom Meeting spots (cols 22..32, rows 2..8)
  // Boardroom table is at cols 25..28 (x: 400..464), rows 4..5 (y: 64..96)
  // Whiteboard is on the north wall at cols 26..27 (x: 416..448, y: 14)
  const BOARDROOM_SPOTS = {
    manager: { x: 404, y: 54,  facing: 'down',  pose: 'stand' }, // Standing by Whiteboard chairing the meeting
    sarah:   { x: 412, y: 64,  facing: 'down',  pose: 'sit'   }, // Top-left boardroom chair
    emma:    { x: 444, y: 64,  facing: 'down',  pose: 'sit'   }, // Top-right boardroom chair
    david:   { x: 412, y: 102, facing: 'up',    pose: 'sit'   }, // Bottom-left boardroom chair
    grace:   { x: 444, y: 102, facing: 'up',    pose: 'sit'   }  // Bottom-right boardroom chair
  };

  // Live Character Runtime State
  const actors = {};
  for (const k of Object.keys(DESKS)) {
    const d = DESKS[k];
    actors[k] = {
      id: k,
      x: d.seatX,
      y: d.seatY,
      facing: 'down',
      mode: 'working', // 'working' | 'walking' | 'break' | 'boardroom'
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

  // Office Pets (Claudio & GitCat from pixel-agents)
  const pets = [
    { key: 'PET_CLAUDIO', name: 'Claudio', x: 188, y: 152, vx: 10, vy: 0, dir: 1, timer: 3.5, state: 'walk' },
    { key: 'PET_GITCAT',  name: 'GitCat',  x: 472, y: 286, vx: 0,  vy: 0, dir: -1, timer: 6.0, state: 'sleep' }
  ];

  let currentPhase = 'working'; // 'working' | 'short_break' | 'long_break' | 'boardroom'
  let boardroomReport = null;
  let hoveredAgentId = null;

  // Smart Waypoint Pathfinder through doorways
  function buildPath(x1, y1, x2, y2) {
    const pts = [];
    // Central horizontal corridor is at y = 152 (row 9.5)
    // Doorway into Executive Office is at x = 272, y = 144
    // Doorway between Left Workfloor & Right Wing (Boardroom/Kitchen/Lounge) is at x = 336, y = 152
    const inRightWing1 = x1 >= 336;
    const inRightWing2 = x2 >= 336;
    const inExec1 = x1 >= 208 && x1 < 336 && y1 < 140;
    const inExec2 = x2 >= 208 && x2 < 336 && y2 < 140;

    if (Math.hypot(x2 - x1, y2 - y1) < 18) {
      pts.push({ x: x2, y: y2 });
      return pts;
    }

    if (inExec1) {
      pts.push({ x: 272, y: 150 });
    } else if (!inRightWing1 && Math.abs(y1 - 150) > 20) {
      pts.push({ x: 184, y: y1 });
      pts.push({ x: 184, y: 150 });
    } else if (inRightWing1 && Math.abs(y1 - 150) > 20) {
      pts.push({ x: 368, y: y1 });
      pts.push({ x: 368, y: 150 });
    }

    if (inRightWing1 !== inRightWing2) {
      pts.push({ x: 336, y: 150 });
    }

    if (inExec2) {
      pts.push({ x: 272, y: 150 });
      pts.push({ x: 272, y: y2 });
    } else if (inRightWing2) {
      pts.push({ x: 368, y: 150 });
      pts.push({ x: 368, y: y2 });
    } else {
      pts.push({ x: 184, y: 150 });
      pts.push({ x: 184, y: y2 });
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

    const dropX = targetDesk.seatX + 20;
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

  // ---- Drawing Helpers (All coordinates in logical 544x320 space) ----
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

  // Draw 3D Pixel-Agents Walls & Room Dividers
  function drawWallsAndArchitecture() {
    // Top outer 3D wall across entire building (rows 0..1, height 32px)
    pxRect(0, 0, 544, 8, '#161722');   // Top wall cap
    pxRect(0, 8, 544, 20, '#2c3044');  // Wall plaster face
    pxRect(0, 26, 544, 3, '#3e445e');  // Wainscoting trim
    pxRect(0, 29, 544, 3, '#1b1d29');  // Baseboard shadow

    // Outer Left, Right & Bottom borders
    pxRect(0, 0, 6, 320, '#161722');
    pxRect(538, 0, 6, 320, '#161722');
    pxRect(0, 314, 544, 6, '#161722');

    // Vertical wall between Open Workfloor and Executive Office (x = 206, y = 0..136)
    pxRect(204, 0, 6, 134, '#161722');
    pxRect(205, 8, 4, 124, '#2c3044');

    // Bottom wall of Executive Office (x = 204..336, y = 130..138) with doorway at x = 256..288
    pxRect(204, 128, 52, 5, '#161722');
    pxRect(204, 133, 52, 5, '#2c3044');
    pxRect(288, 128, 50, 5, '#161722');
    pxRect(288, 133, 50, 5, '#2c3044');

    // Vertical wall between Left Wing & Right Wing (Boardroom / Kitchen / Lounge) at x = 334
    // Doorway into Boardroom at y = 104..136, Doorway into Kitchen/Lounge at y = 140..174
    pxRect(334, 0, 6, 102, '#161722');
    pxRect(335, 8, 4, 92, '#2c3044');
    pxRect(334, 174, 6, 146, '#161722');
    pxRect(335, 176, 4, 138, '#2c3044');

    // Horizontal divider wall between Conference Boardroom (top-right) and Kitchen/Coffee Bar (middle-right)
    // at y = 154, x = 334..540 with wide open archway at x = 354..394
    pxRect(334, 152, 20, 6, '#161722');
    pxRect(334, 158, 20, 6, '#2c3044');
    pxRect(394, 152, 146, 6, '#161722');
    pxRect(394, 158, 146, 6, '#2c3044');

    // Room Zone Header Pills (Crisp Pixel Labels on Top Walls)
    drawZoneSign(14, 10, 'OPEN WORKFLOOR (DESKS 1–4)', '#38bdf8');
    drawZoneSign(214, 10, 'EXECUTIVE OFFICE', '#fbbf24');
    drawZoneSign(346, 10, 'CONFERENCE BOARDROOM ("WHAT\'S NEW")', '#a855f7');
    drawZoneSign(402, 154, 'KITCHEN & LOUNGE', '#10b981');
  }

  function drawZoneSign(x, y, text, color) {
    ctx.save();
    ctx.font = 'bold 10px "Press Start 2P", "Courier New", monospace';
    const tw = ctx.measureText(text).width / SCALE;
    pxRect(x, y, tw + 8, 11, 'rgba(13, 16, 26, 0.85)');
    pxRect(x, y, 2, 11, color);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(text, Math.round((x + 5) * SCALE), Math.round((y + 8.5) * SCALE));
    ctx.restore();
  }

  // Draw Wall Decor, Paintings, Bookshelves, Clocks, Whiteboards & Kitchen Counters
  function drawWallAndBackgroundFurniture() {
    // Open Workfloor North Wall: Bookshelves, Paintings, Clock, Hanging Plants
    drawAsset('DOUBLE_BOOKSHELF', 14, 2);
    drawAsset('LARGE_PAINTING', 56, 3);
    drawAsset('CLOCK', 96, 6);
    drawAsset('DOUBLE_BOOKSHELF', 120, 2);
    drawAsset('SMALL_PAINTING', 162, 5);
    drawAsset('HANGING_PLANT', 184, 3);

    // Executive Office North Wall: Bookshelf, Painting, Whiteboard
    drawAsset('BOOKSHELF', 214, 2);
    drawAsset('SMALL_PAINTING_2', 240, 5);
    drawAsset('WHITEBOARD', 268, 4);
    drawAsset('PLANT', 310, 16);

    // Conference Boardroom North Wall: Grand Whiteboard + Clock + Bookshelf + Plants
    drawAsset('BOOKSHELF', 346, 2);
    drawAsset('WHITEBOARD', 404, 3);
    drawAsset('WHITEBOARD', 436, 3);
    drawAsset('CLOCK', 474, 6);
    drawAsset('LARGE_PLANT', 506, 6);

    // Kitchen & Coffee Bar (Middle-Right, along y = 164..188, x = 400..526)
    drawKitchenAppliances();
  }

  // Pixel-Art Kitchen Counter, Espresso Machine, Fridge & Vending Machine (matching Screenshot.jpg)
  function drawKitchenAppliances() {
    // Stainless Refrigerator (x: 498, y: 160, w: 22, h: 34)
    pxRect(498, 160, 22, 34, '#cbd5e1');
    pxRect(499, 161, 20, 14, '#e2e8f0');
    pxRect(499, 176, 20, 17, '#e2e8f0');
    pxRect(498, 175, 22, 1, '#64748b');
    pxRect(516, 165, 2, 7, '#475569');
    pxRect(516, 179, 2, 9, '#475569');

    // Snack & Drink Vending Machine (x: 470, y: 158, w: 24, h: 36)
    pxRect(470, 158, 24, 36, '#1e293b');
    pxRect(472, 160, 15, 22, '#0f172a');
    // Colorful pixel drinks inside vending machine
    pxRect(474, 162, 3, 4, '#ef4444');
    pxRect(478, 162, 3, 4, '#3b82f6');
    pxRect(482, 162, 3, 4, '#10b981');
    pxRect(474, 168, 3, 4, '#f59e0b');
    pxRect(478, 168, 3, 4, '#a855f7');
    pxRect(482, 168, 3, 4, '#ec4899');
    pxRect(474, 174, 3, 4, '#22d3ee');
    pxRect(478, 174, 3, 4, '#84cc16');
    pxRect(482, 174, 3, 4, '#f97316');
    pxRect(488, 164, 4, 8, '#334155');
    pxRect(489, 166, 2, 2, '#22c55e');
    pxRect(473, 185, 14, 6, '#090d16');

    // Wooden Kitchen Counter & Sink + Espresso Coffee Station (x: 400..466, y: 168..192)
    pxRect(400, 168, 66, 24, '#5c3a21'); // Counter cabinet base
    pxRect(400, 166, 66, 6, '#d6c7b2');  // Marble countertop
    pxRect(402, 174, 19, 16, '#7c5032'); // Cabinet door 1
    pxRect(423, 174, 19, 16, '#7c5032'); // Cabinet door 2
    pxRect(444, 174, 20, 16, '#7c5032'); // Cabinet door 3
    // Espresso Machine on counter (x: 405, y: 156)
    pxRect(405, 156, 14, 12, '#334155');
    pxRect(406, 157, 12, 4, '#ef4444');
    pxRect(409, 163, 4, 4, '#f8fafc');
    // Fresh Coffee Pot & Mugs on counter
    drawAsset('COFFEE', 424, 156);
    drawAsset('COFFEE', 436, 157);
    // Water Cooler (x: 452, y: 154)
    pxRect(452, 153, 10, 10, '#38bdf8');
    pxRect(451, 163, 12, 14, '#f1f5f9');
    pxRect(454, 166, 2, 3, '#ef4444');
    pxRect(457, 166, 2, 3, '#3b82f6');
  }

  // Build Depth-Sorted Renderables (Chairs, Desks, Boardroom Table, Sofas, Plants, Pets, Characters)
  function drawSceneDepthSorted(nowSec) {
    const items = [];
    const pcFrameIdx = (Math.floor(nowSec * 4) % 3) + 1;
    const isWorkingPhase = currentPhase === 'working';

    // 1. All 5 Agent Workstations (Desk + Chair + PC + Desk Props)
    for (const d of Object.values(DESKS)) {
      const dx = d.col * TILE;
      const dy = d.row * TILE;

      // Chair behind desk (drawn before character sitting on it)
      items.push({
        y: dy + 4,
        draw: () => {
          drawAsset(d.id === 'manager' ? 'CUSHIONED_FRONT' : 'CHAIR_FRONT', dx + 8, dy - 10);
        }
      });

      // Desk & animated PC Monitor in front of character
      items.push({
        y: dy + 32,
        draw: () => {
          drawAsset('DESK_FRONT', dx, dy);
          // Monitor ON with animated code/dashboard during work shift, OFF during breaks & boardroom
          const pcKey = isWorkingPhase ? `PC_ON_${pcFrameIdx}` : 'PC_OFF';
          drawAsset(pcKey, dx + 2, dy - 5);
          drawAsset('COFFEE', dx + 20, dy - 2);

          // Hover highlight around desk
          if (hoveredAgentId === d.id) {
            ctx.save();
            ctx.strokeStyle = d.accent;
            ctx.lineWidth = 2;
            ctx.strokeRect((dx - 4) * SCALE, (dy - 14) * SCALE, 40 * SCALE, 48 * SCALE);
            ctx.restore();
          }

          // Crisp pixel nameplate below each desk
          drawDeskTag(dx + 16, dy + 34, d.label, d.accent);
        }
      });
    }

    // Extra side tables, bookshelves & plants in Open Workfloor
    items.push({ y: 96,  draw: () => drawAsset('PLANT', 16, 76) });
    items.push({ y: 96,  draw: () => drawAsset('BIN', 112, 82) });
    items.push({ y: 224, draw: () => drawAsset('LARGE_PLANT', 12, 196) });
    items.push({ y: 224, draw: () => drawAsset('CACTUS', 112, 206) });
    items.push({ y: 120, draw: () => drawAsset('BENCH', 222, 96) });

    // 2. Conference Boardroom Table & Chairs (Top-Right: x = 400..464, y = 68..100)
    // Top row of boardroom chairs (behind table)
    items.push({
      y: 66,
      draw: () => {
        drawAsset('CHAIR_FRONT', 404, 54);
        drawAsset('CHAIR_FRONT', 436, 54);
      }
    });
    // Side chairs
    items.push({
      y: 88,
      draw: () => {
        drawAsset('CHAIR_SIDE', 386, 72);
        drawAssetFlipped('CHAIR_SIDE', 462, 72, 16, 16);
      }
    });
    // Joined 64x32 Conference Boardroom Table + Coffee & Briefs on table
    items.push({
      y: 98,
      draw: () => {
        drawAsset('TABLE_FRONT', 400, 68);
        drawAsset('TABLE_FRONT', 432, 68);
        drawAsset('COFFEE', 410, 68);
        drawAsset('COFFEE', 442, 68);
        // Folder stack on Boardroom table
        pxRect(424, 73, 10, 7, '#fbbf24');
        pxRect(425, 74, 8, 5, '#fef08a');
      }
    });
    // Bottom row of boardroom chairs (in front of table, facing UP)
    items.push({
      y: 116,
      draw: () => {
        drawAsset('CHAIR_BACK', 404, 94);
        drawAsset('CHAIR_BACK', 436, 94);
      }
    });

    // 3. Staff Sofa Lounge (Bottom-Right: x = 388..516, y = 248..304)
    items.push({
      y: 266,
      draw: () => {
        drawAsset('SOFA_FRONT', 412, 250);
        drawAsset('LARGE_PLANT', 488, 232);
      }
    });
    items.push({
      y: 290,
      draw: () => {
        drawAsset('SOFA_SIDE', 390, 268);
        drawAssetFlipped('SOFA_SIDE', 456, 268, 16, 32);
        drawAsset('COFFEE_TABLE', 412, 272);
        drawAsset('COFFEE', 418, 270);
        drawAsset('COFFEE', 430, 272);
      }
    });
    items.push({
      y: 308,
      draw: () => {
        drawAsset('SOFA_BACK', 412, 292);
        drawAsset('PLANT_2', 504, 282);
      }
    });

    // 4. Office Pets (Claudio & GitCat)
    for (const p of pets) {
      items.push({
        y: p.y + 8,
        draw: () => drawPetSprite(p, nowSec)
      });
    }

    // 5. All 5 Staff Characters (Authentic 16x32 pixel-agents sprites!)
    for (const a of Object.values(actors)) {
      items.push({
        y: a.y + 12,
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
    ctx.font = 'bold 9px "Courier New", monospace';
    const tw = ctx.measureText(text).width / SCALE;
    const bx = cx - (tw + 8) / 2;
    pxRect(bx, y, tw + 8, 10, 'rgba(15, 23, 42, 0.92)');
    pxRect(bx, y, 2, 10, accentColor);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(text, Math.round((bx + 4) * SCALE), Math.round((y + 7.5) * SCALE));
    ctx.restore();
  }

  // Draw Office Pet from 128x96 pixel-agents pet spritesheet
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

  // Draw Character using Authentic pixel-agents 128x96 Wardrobe Sheet
  // Columns 0..7 (16px wide each):
  //   0: walk1, 1: walk2 (idle), 2: walk3, 3: type1, 4: type2, 5: read1 (glasses+paper), 6: read2, 7: seated
  // Rows 0..2 (32px tall each):
  //   0: down, 1: up, 2: right (flip horizontally for left)
  function drawCharacterActor(a, nowSec) {
    const sheet = charSheets[a.id];
    const meta = AGENTS_META[a.id] || { name: a.id, badgeColor: '#38bdf8' };

    // Determine frame index (0..7) and direction row (0..2)
    let frameCol = 1; // idle standing/sitting
    let facing = a.facing || 'down';

    if (a.mode === 'walking') {
      const walkCycle = [0, 1, 2, 1];
      frameCol = walkCycle[Math.floor(nowSec * 7) % 4];
    } else if (a.mode === 'working') {
      if (a.workPose === 'read') {
        frameCol = 5 + (Math.floor(nowSec * 2.5) % 2); // read1 / read2 (with glasses & paper!)
      } else {
        frameCol = 3 + (Math.floor(nowSec * 5.5) % 2); // type1 / type2
      }
    } else if (a.mode === 'boardroom') {
      const isSpeaking = boardroomReport && boardroomReport.speaker === a.id;
      if (isSpeaking) {
        frameCol = a.id === 'manager' ? (Math.floor(nowSec * 3.5) % 2) : (5 + (Math.floor(nowSec * 3) % 2));
      } else {
        frameCol = a.id === 'manager' ? 1 : 7; // seated around boardroom table
      }
    } else if (a.mode === 'break') {
      const sp = BREAK_SPOTS[a.id];
      frameCol = sp && sp.pose === 'sit' ? 7 : 1;
    }

    const rowMap = { down: 0, up: 1, right: 2, left: 2 };
    const rowIdx = rowMap[facing] ?? 0;

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.ellipse(
      Math.round(a.x * SCALE),
      Math.round((a.y + 8) * SCALE),
      6 * SCALE,
      2.5 * SCALE,
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

    // Carried Folder / Document Packet while walking between desks
    if (a.carryItem && a.mode === 'walking') {
      pxRect(a.x + 5, a.y - 9, 9, 7, '#fbbf24');
      pxRect(a.x + 6, a.y - 8, 7, 5, '#fef08a');
    }

    // Coffee Mug in hand during Lounge/Kitchen Break
    if (a.mode === 'break' && BREAK_SPOTS[a.id]?.mug) {
      drawAsset('COFFEE', a.x + 4, a.y - 12, 12, 12);
    }

    // Active Speaker Halo in Boardroom Meeting
    if (currentPhase === 'boardroom' && boardroomReport && boardroomReport.speaker === a.id) {
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.round((a.x - 10) * SCALE), Math.round((a.y - 24) * SCALE), 20 * SCALE, 34 * SCALE);
      ctx.restore();
    }

    // Character Name Pill
    ctx.save();
    ctx.font = 'bold 9px "Courier New", monospace';
    const nameStr = meta.name;
    const nw = ctx.measureText(nameStr).width / SCALE;
    const nx = a.x - (nw + 6) / 2;
    const ny = a.y - 29;
    pxRect(nx, ny, nw + 6, 8, 'rgba(15, 23, 42, 0.88)');
    pxRect(nx, ny, 2, 8, meta.badgeColor);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(nameStr, Math.round((nx + 3.5) * SCALE), Math.round((ny + 6.2) * SCALE));
    ctx.restore();
  }

  // Draw Live Boardroom Whiteboard Overlay & Active Speech Bubbles on Top
  function drawOverlaysAndSpeechBubbles() {
    // When in Boardroom Meeting phase, draw the live "WHAT'S NEW" Whiteboard projection card
    if (currentPhase === 'boardroom' && boardroomReport) {
      const bx = 342;
      const by = 114;
      const bw = 192;
      const bh = 35;
      pxRect(bx, by, bw, bh, 'rgba(15, 23, 42, 0.94)');
      pxRect(bx, by, bw, 2, '#a855f7');
      pxRect(bx, by, 2, bh, '#a855f7');

      ctx.save();
      ctx.font = 'bold 9.5px "Courier New", monospace';
      ctx.fillStyle = '#e9d5ff';
      ctx.fillText(
        `📋 BOARDROOM REVIEW (SHIFT #${boardroomReport.shiftNumber || 1})`,
        Math.round((bx + 6) * SCALE),
        Math.round((by + 10) * SCALE)
      );
      ctx.fillStyle = '#86efac';
      const bCount = (boardroomReport.bouncedStoppedEmails || []).length || 10;
      ctx.fillText(
        `+${boardroomReport.newB2BDiscovered || 0} New B2B • +${boardroomReport.newEmailsSent || 0} Sent • ${bCount} Bounces Stopped`,
        Math.round((bx + 6) * SCALE),
        Math.round((by + 20) * SCALE)
      );
      ctx.fillStyle = '#fde68a';
      ctx.fillText(
        `Hot Replies: Dream Architects & Cassia Lodge!`,
        Math.round((bx + 6) * SCALE),
        Math.round((by + 30) * SCALE)
      );
      ctx.restore();
    }

    // Speech Bubbles (Show active boardroom speaker or walking/working bubbles)
    const now = Date.now();
    for (const a of Object.values(actors)) {
      const isBoardroomSpeaker = currentPhase === 'boardroom' && boardroomReport && boardroomReport.speaker === a.id;
      const showBubble = isBoardroomSpeaker || (a.bubble && (now < a.bubbleUntil || hoveredAgentId === a.id));
      if (!showBubble || !a.bubble) continue;

      ctx.save();
      ctx.font = 'bold 10px "Segoe UI", sans-serif';
      const text = a.bubble.length > 58 ? a.bubble.slice(0, 56) + '…' : a.bubble;
      const tw = Math.min(240, ctx.measureText(text).width / SCALE + 12);
      const bx = Math.max(8, Math.min(544 - tw - 8, a.x - tw / 2));
      const by = Math.max(6, a.y - 43);

      pxRect(bx, by, tw, 12, isBoardroomSpeaker ? '#fef3c7' : '#ffffff');
      pxRect(bx, by, tw, 1.5, isBoardroomSpeaker ? '#f59e0b' : (AGENTS_META[a.id]?.badgeColor || '#3b82f6'));
      ctx.fillStyle = '#0f172a';
      ctx.fillText(text, Math.round((bx + 5) * SCALE), Math.round((by + 8.8) * SCALE));
      ctx.restore();
    }
  }

  // ---- Physics & Animation Loop ----
  let lastTs = performance.now();

  function tick(ts) {
    const dt = Math.min(0.08, (ts - lastTs) / 1000);
    lastTs = ts;
    const nowSec = ts / 1000;

    // Update character movement & poses
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
        const speed = 78; // logical pixels per second

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

    // Update Office Pets (Claudio patrols the hallway)
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
        if (claudio.x < 168) { claudio.x = 168; claudio.dir = 1; }
        if (claudio.x > 310) { claudio.x = 310; claudio.dir = -1; }
      }
    }

    // Render Frame
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);

    if (floorBuffer) {
      ctx.drawImage(floorBuffer, 0, 0, W, H);
    } else {
      pxRect(0, 0, 544, 320, '#2a241e');
    }

    drawWallsAndArchitecture();
    drawWallAndBackgroundFurniture();
    drawSceneDepthSorted(nowSec);
    drawOverlaysAndSpeechBubbles();

    requestAnimationFrame(tick);
  }

  // Hover detection on canvas
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

  // Expose Public API for app.js (both Fitbit Interiors & Signature Stones)
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
      if (actors[id]) {
        actors[id].statusText = st.status || '';
        if (st.bubble && st.bubble !== actors[id].bubble) {
          actors[id].bubble = st.bubble;
          actors[id].bubbleUntil = Date.now() + 9000;
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
        for (const [id, st] of Object.entries(data.agentStates)) {
          if (actors[id]) {
            actors[id].statusText = st.status || '';
            if (st.bubble && st.bubble !== actors[id].bubble) {
              actors[id].bubble = st.bubble;
              actors[id].bubbleUntil = Date.now() + 9000;
            }
          }
        }
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
