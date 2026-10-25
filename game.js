/* GAME LOGIC — Phase 6 verified build. Fixed timestep (acc), seeded PRNG, LAYOUT in-day view, and exposed window.__LOST_DESK__. */
(() => {
  'use strict';
  const c = document.querySelector('#game');
  const x = c.getContext('2d', { alpha: false });
  x.imageSmoothingEnabled = false;

  const W = THEME.W, H = THEME.H, BASE_PALETTE = THEME.palette.slice();
  let audio = null, last = performance.now(), acc = 0, shake = 0, hit = 0;
  let particles = [], debugView = false, debugLayout = false, debugHits = false, debugPage = 0, perfOverlay = false, fps = 60;
  const assetStatus = {}, assetImages = {}, quantCache = {};
  const leavingPool = Array.from({ length: 12 }, () => ({ active: false, id: '', x: 0, y: 0, vx: 0, life: 0, mood: 'happy' }));

  document.title = DATA.names[DATA.title] || DATA.title;

  function fresh() {
    return {
      version: 3,
      seed: 1337,
      mode: 'title',
      money: 0,
      meta: 0,
      day: 1,
      score: 0,
      bestDay: 0,
      bestCombo: 0,
      clutter: DATA.clutterStart,
      helpers: [],
      upgrades: {},
      metaUpgrades: {},
      skills: [],
      flags: {},
      arc: {},
      arcHistory: {},
      trust: {},
      arcPerks: {},
      itemState: {},
      selectedRestoreItem: 'ITEM_01',
      rafflePulls: [],
      highScores: [],
      stats: {
        served: 0, lost: 0, wrong: 0, overflow: 0, pokes: 0, perfect: 0, days: 0,
        gambles: 0, restorations: 0, weirdItems: 0, helpCount: 0, exploitCount: 0, hideCount: 0, keepCount: 0
      },
      settings: { mute: false, volume: 0.15, crt: false, paletteAlt: false, artPalette: 'original', skipIntro: false, reducedMotion: false },
      buy: 1,
      shift: null,
      album: {},
      pendingArc: null,
      pendingArcs: [],
      lastArcReply: '',
      ending: null,
      gambleIdx: 0,
      lastGambleId: 'GAMBLE_01',
      gambleModal: null,
      servingTicket: 42
    };
  }

  function migrateSave(raw) {
    const base = fresh();
    const loaded = Object.assign(base, raw);
    loaded.version = 3;
    loaded.stats = Object.assign(base.stats, raw.stats || {});
    loaded.settings = Object.assign(base.settings, raw.settings || {});
    loaded.flags = Object.assign({}, raw.flags || {});
    loaded.arc = Object.assign({}, raw.arc || {});
    loaded.arcHistory = Object.assign({}, raw.arcHistory || {});
    loaded.trust = Object.assign({}, raw.trust || {});
    loaded.arcPerks = Object.assign({}, raw.arcPerks || {});
    loaded.itemState = Object.assign({}, raw.itemState || {});
    loaded.rafflePulls = Array.isArray(raw.rafflePulls) ? raw.rafflePulls : [];
    return loaded;
  }

  function load() {
    try {
      const a = JSON.parse(localStorage.getItem('lostdesk_save'));
      if (!a || ![1, 2, 3].includes(a.version)) return fresh();
      const loaded = migrateSave(a);
      const night = loaded.upgrades?.UPGRADE_NIGHT_1;
      const minutes = Math.max(0, (Date.now() - (loaded.savedAt || Date.now())) / 60000);
      if (night && minutes > 0) {
        loaded.money += Math.min(DATA.balance.nightBonusCap, minutes * DATA.balance.nightBonusPerMinute * night.amount);
      }
      loaded.savedAt = Date.now();
      return loaded;
    } catch {
      return fresh();
    }
  }

  let s = load();

  function rand() {
    s.seed = ((s.seed || 1337) + 0x6D2B79F5) | 0;
    let t = Math.imul(s.seed ^ (s.seed >>> 15), 1 | s.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function save() {
    try {
      s.savedAt = Date.now();
      s.version = 3;
      localStorage.setItem('lostdesk_save', JSON.stringify(s));
    } catch {}
  }

  function exportSave() {
    save();
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(s))));
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(() => float('SAVE COPIED', 116, 72, 7)).catch(() => prompt('SAVE STRING — COPY THIS', code));
    } else {
      prompt('SAVE STRING — COPY THIS', code);
    }
  }

  function importSave() {
    const code = prompt('PASTE SAVE STRING');
    if (!code) return;
    try {
      const obj = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (![1, 2, 3].includes(obj.version) || !Number.isFinite(obj.day) || obj.day < 1) throw new Error('invalid');
      s = migrateSave(obj);
      save();
      location.reload();
    } catch {
      alert('SAVE STRING NOT RECOGNIZED');
    }
  }

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const fmt = n => n >= 1e12 ? n.toExponential(2) : n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : Math.floor(n).toString();
  const nm = id => DATA.names[id] || id;

  function up(e) {
    const bought = Object.values(s.upgrades).filter(Boolean).reduce((a, u) => a + (u.effect === e ? u.amount : 0), 0);
    const permanent = DATA.metaUpgrades.reduce((a, u) => a + (s.metaUpgrades?.[u.id] && u.effect === e ? u.amount : 0), 0);
    const trained = (s.skills || []).reduce((a, id) => {
      const node = DATA.skills.find(n => n.id === id);
      return a + (node && node.effect === e ? node.amount : 0);
    }, 0);
    const perkBonus = Object.entries(s.arcPerks || {}).reduce((accVal, [arcId, mode]) => {
      const arc = DATA.arcs.find(a => a.id === arcId);
      if (mode === 'perk' && arc?.perkEffect?.effect === e) return accVal + arc.perkEffect.amount;
      return accVal;
    }, 0);
    return bought + trained + permanent + perkBonus;
  }

  function itemInfo(itemId) {
    const base = DATA.items.find(i => i.id === itemId) || DATA.items[0];
    const st = s.itemState?.[itemId] || { step: 0, mult: 1, tag: base.tag };
    return {
      id: base.id,
      tag: st.tag || base.tag,
      value: Math.round(base.value * (st.mult || 1)),
      color: base.color,
      step: st.step || 0
    };
  }

  function beep(type = 'click') {
    if (s.settings.mute) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type === 'wrong' ? 'sawtooth' : type === 'combo' ? 'triangle' : 'square';
      o.frequency.value = type === 'wrong' ? 110 : type === 'buy' ? 580 : type === 'combo' ? 780 : 390;
      g.gain.setValueAtTime(s.settings.volume, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.09);
      o.connect(g);
      g.connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + 0.09);
    } catch {}
  }

  let musicState = '', musicAt = 0, musicStep = 0;
  function musicTick() {
    if (!audio || s.settings.mute) return;
    const state = s.mode === 'day' && s.shift?.boss ? 'boss' : s.mode === 'day' && s.clutter > 88 ? 'danger' : s.mode === 'day' ? 'day' : s.mode === 'shop' ? 'shop' : s.mode === 'title' ? 'title' : 'summary';
    if (state !== musicState) { musicState = state; musicAt = audio.currentTime; musicStep = 0; }
    if (audio.currentTime < musicAt) return;
    const scale = state === 'boss' ? [110, 165, 147, 220] : state === 'danger' ? [98, 130, 98, 147] : state === 'shop' ? [196, 247, 220, 294] : state === 'title' ? [165, 220, 262, 330] : [130, 196, 165, 247];
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = musicStep % 4 === 2 ? 'triangle' : 'square';
    o.frequency.value = scale[musicStep % scale.length];
    g.gain.value = s.settings.volume * 0.12;
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.12);
    musicAt = audio.currentTime + 0.18;
    musicStep++;
  }

  const FONT = {
    A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],
    C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],
    E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],
    G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],
    I:['111','010','010','010','010','010','111'],J:['00111','00010','00010','00010','10010','10010','01100'],
    K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],
    M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],
    O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],
    Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],
    S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],
    U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],
    W:['10001','10001','10001','10101','10101','10101','01010'],X:['10001','10001','01010','00100','01010','10001','10001'],
    Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],
    0:['01110','10001','10011','10101','11001','10001','01110'],1:['00100','01100','00100','00100','00100','00100','01110'],
    2:['01110','10001','00001','00010','00100','01000','11111'],3:['11110','00001','00001','01110','00001','00001','11110'],
    4:['00010','00110','01010','10010','11111','00010','00010'],5:['11111','10000','10000','11110','00001','00001','11110'],
    6:['01110','10000','10000','11110','10001','10001','01110'],7:['11111','00001','00010','00100','01000','01000','01000'],
    8:['01110','10001','10001','01110','10001','10001','01110'],9:['01110','10001','10001','01111','00001','00001','01110'],
    ':':['000','010','010','000','010','010','000'],'.':['0','0','0','0','0','11','11'],',':['0','0','0','0','0','11','10'],
    '!':['1','1','1','1','1','0','1'],'?':['11110','00001','00010','00100','00100','00000','00100'],
    '-':['00000','00000','00000','11111','00000','00000','00000'],'+':['000','010','010','111','010','010','000'],
    '/':['00001','00010','00010','00100','01000','01000','10000'],'[':['111','100','100','100','100','100','111'],
    ']':['111','001','001','001','001','001','111'],'(':['001','010','100','100','100','010','001'],
    ')':['100','010','001','001','001','010','100'],'%':['11001','11010','00100','00100','01011','10011','00000'],
    '=':['00000','11111','00000','11111','00000','00000','00000'],'_':['00000','00000','00000','00000','00000','00000','11111'],
    '*':['00000','10101','01110','11111','01110','10101','00000'],'#':['01010','11111','01010','01010','11111','01010','00000'],
    '<':['00010','00100','01000','10000','01000','00100','00010'],'>':['01000','00100','00010','00001','00010','00100','01000'],
    '|':['1','1','1','1','1','1','1'],' ':['0','0','0','0','0','0','0']
  };

  function getDrawableImage(id, im) {
    if (!im || s.settings.artPalette !== 'quantized') return im;
    const key = `${id}_${s.settings.paletteAlt ? 'alt' : 'base'}`;
    if (quantCache[key]) return quantCache[key];
    const oc = document.createElement('canvas');
    oc.width = im.width;
    oc.height = im.height;
    const octx = oc.getContext('2d');
    octx.drawImage(im, 0, 0);
    const idata = octx.getImageData(0, 0, oc.width, oc.height);
    const d = idata.data;
    const pal = THEME.palette.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 16) continue;
      let bi = 0, bd = 1e9;
      for (let p = 0; p < pal.length; p++) {
        const dr = d[i] - pal[p][0], dg = d[i + 1] - pal[p][1], db = d[i + 2] - pal[p][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bd) { bd = dist; bi = p; }
      }
      d[i] = pal[bi][0]; d[i + 1] = pal[bi][1]; d[i + 2] = pal[bi][2];
    }
    octx.putImageData(idata, 0, 0);
    return (quantCache[key] = oc);
  }

  function text(t, a, b, col = 6, size = 8) {
    const scale = Math.max(1, Math.floor(size / 7)), str = String(t).toUpperCase();
    x.fillStyle = THEME.palette[col % THEME.palette.length];
    for (let i = 0; i < str.length; i++) {
      const rows = FONT[str[i]] || FONT[' '];
      for (let yy = 0; yy < 7; yy++) {
        for (let xx = 0; xx < rows[yy].length; xx++) {
          if (rows[yy][xx] === '1') x.fillRect(Math.round(a) + i * 6 * scale + xx * scale, Math.round(b) + yy * scale, scale, scale);
        }
      }
    }
  }

  function box(a, b, w, h, col = 1, border = 6) {
    x.fillStyle = THEME.palette[col % THEME.palette.length];
    x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h));
    x.strokeStyle = THEME.palette[border % THEME.palette.length];
    x.lineWidth = 2;
    x.strokeRect(Math.round(a) + 1, Math.round(b) + 1, Math.round(w) - 2, Math.round(h) - 2);
  }

  function bar(a, b, w, h, p, col = 5) {
    x.fillStyle = THEME.palette[12];
    x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h));
    x.fillStyle = THEME.palette[col % THEME.palette.length];
    x.fillRect(Math.round(a) + 1, Math.round(b) + 1, Math.max(0, Math.round((w - 2) * clamp(p, 0, 1))), Math.round(h) - 2);
  }

  function labelRect(a, b, w, h, id, col = 3, state = 'idle', overrideFrame = null) {
    const m = DATA.assets[id], rawIm = assetImages[id];
    if (m && rawIm && assetStatus[id] === 'OK') {
      const im = getDrawableImage(id, rawIm);
      const anim = m.animations[state] || m.animations.idle || { startFrame: 0, frameCount: 1, fps: 0 };
      const frame = overrideFrame !== null
        ? overrideFrame
        : anim.startFrame + (anim.fps ? Math.floor(performance.now() / 1000 * anim.fps) % anim.frameCount : 0);
      const sx = (frame % (m.frameColumns || m.frameCount)) * m.frameWidth;
      const sy = Math.floor(frame / (m.frameColumns || m.frameCount)) * m.frameHeight;
      x.drawImage(im, sx, sy, m.frameWidth, m.frameHeight, Math.round(a), Math.round(b), Math.round(w), Math.round(h));
    } else {
      x.fillStyle = THEME.palette[col % THEME.palette.length];
      x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h));
      x.strokeStyle = THEME.palette[6];
      x.strokeRect(Math.round(a) + 0.5, Math.round(b) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
      text(id.slice(0, Math.max(2, Math.floor(w / 6))), a + 2, b + Math.floor((h - 8) / 2), 6, 7);
    }
  }

  function resolveGamble(customer, itemId) {
    const item = itemInfo(itemId);
    const eligible = DATA.gambles.filter(g => s.clutter >= g.minClutter && (!g.tag || g.tag === customer.tag || g.tag === item.tag));
    const pool = eligible.length ? eligible : DATA.gambles.slice(0, 4);
    const g = pool[(s.gambleIdx = ((s.gambleIdx || 0) + 1) % pool.length)];
    s.lastGambleId = g.id;
    s.stats.gambles = (s.stats.gambles || 0) + 1;
    s.album[g.id] = true;

    let odds = clamp(g.baseOdds + up('luck') * 0.5 + (g.kind === 'raffle' ? s.clutter / 220 : 0), 0.15, 0.94);
    let win = rand() < odds;
    if (!win && up('reroll') > 0 && rand() < 0.40) {
      win = rand() < odds;
      float('REROLL!', 132, 34, 5);
    }
    if (g.kind === 'scratch') {
      customer.ambiguous = false;
      customer.tag = item.tag;
    } else if (g.kind === 'raffle') {
      const fp = DATA.LAYOUT.FLOOR_PILE;
      s.rafflePulls = s.rafflePulls || [];
      if (s.rafflePulls.length >= 5) s.rafflePulls.shift();
      s.rafflePulls.push({ id: item.id, x: fp.x + 8 + ((s.rafflePulls.length * 14) % 50), y: fp.y + 8, ttl: 7 });
    }
    s.gambleModal = { id: g.id, win, timer: 0.36, total: 0.36 };
    beep(win ? 'combo' : 'wrong');
    return win ? g.mult : (up('insurance') > 0 ? 1.0 : 0.65);
  }

  function unlockedItems() {
    return DATA.items.filter(it => +it.id.slice(5) <= Math.min(12, 6 + Math.floor((s.day - 1) / 3) * 2)).slice(0, 8);
  }

  function getDayHitAreas() {
    const L = DATA.LAYOUT, sw = L.SHELF_WALL;
    const cols = 4, rows = 2;
    const cellW = Math.max(16, Math.floor(sw.w / cols)), cellH = Math.max(16, Math.floor(sw.h / rows));
    const items = unlockedItems().map((it, idx) => ({
      kind: 'item', id: it.id, index: idx,
      x: sw.x + (idx % cols) * cellW + 1,
      y: sw.y + Math.floor(idx / cols) * cellH + 1,
      w: Math.max(16, cellW - 2), h: Math.max(16, cellH - 2)
    }));
    const hb = L.HELPER_BENCH, cq = L.CUSTOMER_QUEUE;
    const helpers = s.helpers.slice(0, 7).map((h, i) => {
      const sleeping = h.idle > DATA.balance.helperIdleSeconds;
      const hx = Math.round(h.x ?? (sleeping ? hb.x + 4 + (i % 3) * 18 : cq.x + 8 + i * 20));
      const hy = Math.round(h.y ?? (sleeping ? hb.y + 6 + Math.floor(i / 3) * 20 : cq.y + 22));
      return { kind: 'helper', index: i, id: h.id, x: hx, y: hy, w: 20, h: 20 };
    });
    const cf = L.COUNTER_FRONT, qbW = Math.max(16, Math.floor((cf.w - 8) / DATA.quickBuyIds.length));
    const quickBuys = DATA.quickBuyIds.map((uid, i) => ({
      kind: 'quickBuy', id: uid, index: i,
      x: cf.x + 4 + i * qbW, y: cf.y + 4,
      w: Math.max(16, qbW - 2), h: Math.max(16, cf.h - 8)
    }));
    const raffles = (s.rafflePulls || []).map((rp, i) => ({ kind: 'raffle', id: rp.id, index: i, x: rp.x, y: rp.y, w: 18, h: 18 }));
    return { items, helpers, quickBuys, raffles, counterTop: L.COUNTER_TOP };
  }

  function spawnLeavingCustomer(cu, mood = 'happy') {
    const fd = DATA.LAYOUT.FRONT_DOOR;
    for (let i = 0; i < leavingPool.length; i++) {
      const lv = leavingPool[i];
      if (!lv.active) {
        lv.active = true; lv.id = cu.id;
        lv.x = cu.x ?? DATA.LAYOUT.CUSTOMER_QUEUE.x;
        lv.y = cu.y ?? DATA.LAYOUT.CUSTOMER_QUEUE.y;
        lv.vx = (fd.x - lv.x) / 0.6; lv.life = 0.6; lv.mood = mood;
        return;
      }
    }
  }

  function begin() {
    const d = DATA.daySchedule[Math.min(s.day - 1, 29)];
    let duration = d?.length || 90;
    const target = d?.target || DATA.daySchedule[29].target * Math.pow(DATA.balance.endlessTargetGrowth, s.day - 30);
    const boss = s.day % 4 === 0;
    const mod = DATA.modifiers[Math.floor(rand() * DATA.modifiers.length)];
    duration *= mod.duration || 1;
    const time = duration + up('shift');
    if (s.day === 1 && s.stats.days === 0) s.money += up('startCash');
    s.shift = { time, left: time, target, served: 0, lost: 0, wrong: 0, earned: 0, combo: 0, peak: 0, spawn: 0, event: 0, mod, overflow: false, boss, customers: [], result: '', speed: 1 };
    if (boss) {
      const b = DATA.bosses[(Math.floor(s.day / 4) - 1) % DATA.bosses.length];
      s.shift.bossId = b.id;
      s.shift.bossRule = b.rule;
      s.album[b.id] = true;
    }
    if (s.day > 30 && s.meta >= 10) s.shift.endless = true;
    s.mode = 'day';
    beep('buy');
    s.album['DAY_' + s.day] = true;
    save();
  }

  function spawn() {
    const L = DATA.LAYOUT;
    const unlocked = DATA.customers.filter(a => a.unlock <= Math.min(s.day, 16));
    const cu = unlocked[Math.floor(rand() * unlocked.length)];
    const pool = unlockedItems();
    const isBoss = s.shift.boss && !s.shift.bossSpawned && ((s.shift.bossRule !== 'COMBO') || s.shift.combo >= 3);
    const boss = isBoss ? DATA.bosses[(Math.floor(s.day / 4) - 1) % DATA.bosses.length] : null;
    const tag = boss && boss.rule.startsWith('TAG_') ? boss.rule : null;
    const choices = tag ? pool.filter(i => itemInfo(i.id).tag === tag) : pool;
    const chosen = choices[Math.floor(rand() * choices.length)] || pool[0];
    const clue = itemInfo(chosen.id);
    if (isBoss) s.shift.bossSpawned = true;
    const ambiguity = !isBoss && rand() < DATA.balance.ambiguityBase + Math.min(DATA.balance.ambiguityCeiling, s.clutter / DATA.balance.ambiguityClutterDivisor);
    const door = isBoss ? L.STORE_DOOR : L.FRONT_DOOR;
    const slotIdx = s.shift.customers.length;
    const customer = {
      id: boss?.id || cu.id,
      isBoss: !!boss,
      item: clue.id,
      tag: clue.tag,
      life: (boss ? 16 : cu.patience) * (1 + s.clutter / 250),
      max: (boss ? 16 : cu.patience) * (1 + s.clutter / 250),
      value: clue.value * (boss ? 5 : cu.reward) * (1 + s.clutter / 100) * (1 + up('clutter')) * (1 + up('hoard') * s.clutter / 100),
      ambiguous: ambiguity,
      x: door.x + 4,
      y: door.y + door.h - 24,
      targetX: L.CUSTOMER_QUEUE.x + 6 + (slotIdx % 6) * 24,
      targetY: L.CUSTOMER_QUEUE.y + 12 + (slotIdx % 2) * 8
    };
    if (ambiguity) customer.tag = DATA.items[Math.floor(rand() * DATA.items.length)].tag;
    s.shift.customers.push(customer);
    s.album[customer.id] = true;
    s.album[clue.id] = true;
    if (s.shift.customers.length > DATA.maxEntities) s.shift.customers.splice(DATA.maxEntities);
  }

  function payout(n) {
    s.money += n;
    s.score += n;
    if (s.shift) s.shift.earned += n;
    float('+' + fmt(n), 160, 44, 5);
  }

  function float(t, a, b, k) {
    particles.push({ t, x: a, y: b, life: 36, col: k });
    if (particles.length > 100) particles.shift();
  }

  function serve(customer, itemId, manual = true, gamble = false, helperAccuracy = 0.82) {
    if (!s.shift || !customer) return;
    const item = itemInfo(itemId);
    const at = s.shift.customers.indexOf(customer);
    if (at < 0) return;
    const quality = item.tag === customer.tag ? 1 : 0.34;
    const clutterPenalty = Math.max(0, s.clutter / 100 - DATA.balance.clutterPenaltyStart) * (1 - up('sort'));
    const bonus = manual ? up('order') + up('click') * 0.08 : up('helper');
    const chance = clamp(quality + (manual ? bonus : bonus + (helperAccuracy - 0.7)) - clutterPenalty + (s.shift.mod?.luck || 0) + (s.shift.mod?.accuracy || 0) + up('luck'), 0.08, 0.99);
    if (rand() < chance) {
      const rule = s.shift.bossRule;
      const bossCustomer = customer.id.startsWith('DAY_BOSS_');
      const ruleMet = !bossCustomer || (rule === 'GAMBLE' ? gamble : rule === 'COMBO' ? s.shift.combo >= 3 : customer.tag === rule);
      if (bossCustomer && !ruleMet) {
        customer.life -= 2;
        float('RULE', 150, 40, 8);
        return;
      }
      if (bossCustomer) {
        s.shift.bossDone = true;
        float('BOSS CLEAR', 130, 38, 7);
        shake = 4;
      }
      let value = customer.value * (1 + Math.min(s.shift.combo, 40) * (0.018 + up('combo') * 0.04)) * (manual ? 1 + up('click') * 0.25 : 1);
      if (gamble) value *= resolveGamble(customer, itemId);
      s.shift.combo++;
      s.shift.peak = Math.max(s.shift.peak, s.shift.combo);
      s.shift.served++;
      s.stats.served++;
      payout(value);
      beep(s.shift.combo > 4 ? 'combo' : 'click');
      s.clutter = clamp(s.clutter + DATA.balance.correctHandoverClutter - (up('sort') * 10), 0, 100);
      if (s.shift.combo % 5 === 0) {
        hit = 3;
        shake = 3;
        for (let z = 0; z < 8; z++) float('*', 150 + rand() * 30, 64 + rand() * 15, 7);
      }
      spawnLeavingCustomer(customer, 'happy');
      s.shift.customers.splice(at, 1);
      s.album[itemId] = true;
    } else {
      const r = rand();
      s.shift.wrong++;
      s.stats.wrong++;
      s.shift.combo = 0;
      beep('wrong');
      if (r < up('luck') * 0.3) {
        payout(customer.value * 2);
        float('JACKPOT', 124, 42, 7);
      } else if (r < 0.15 + up('insurance')) {
        payout(customer.value * 0.2);
      } else {
        customer.life -= 2;
        s.clutter = clamp(s.clutter + DATA.balance.wrongHandoverClutter, 0, 100);
      }
    }
  }

  function poke(i) {
    const h = s.helpers[i];
    if (h && h.idle > 0) {
      h.idle = 0;
      h.cool = 1.5;
      h.state = 'happy';
      s.stats.pokes++;
      beep('buy');
      float('! ' + h.id, h.x || 250, (h.y || 70) - 6, 7);
    }
  }

  function tick(dt) {
    if (s.gambleModal) {
      s.gambleModal.timer -= dt;
      if (s.gambleModal.timer <= 0) s.gambleModal = null;
    }
    for (let i = 0; i < leavingPool.length; i++) {
      const lv = leavingPool[i];
      if (!lv.active) continue;
      lv.x += lv.vx * dt;
      lv.life -= dt;
      if (lv.life <= 0) lv.active = false;
    }
    if (s.rafflePulls?.length) {
      for (let i = s.rafflePulls.length - 1; i >= 0; i--) {
        s.rafflePulls[i].ttl -= dt;
        if (s.rafflePulls[i].ttl <= 0) s.rafflePulls.splice(i, 1);
      }
    }
    if (s.mode === 'title' && rand() < dt * 0.8) {
      s.servingTicket = ((s.servingTicket || 42) + 1) % 999;
    }
    if (s.mode !== 'day' || !s.shift) return;
    const q = s.shift, L = DATA.LAYOUT;
    if (q.speed === 0) return;
    q.left -= dt * q.speed;
    q.spawn -= dt * q.speed;
    if (q.spawn <= 0) {
      spawn();
      q.spawn = Math.max(0.42, DATA.balance.arrivalSeconds / (1 + s.clutter / DATA.balance.clutterArrivalDivisor) / (q.mod?.arrival || 1));
      s.clutter = clamp(s.clutter + dt * (DATA.balance.clutterGrowthBase + (q.mod?.clutter || 1) * DATA.balance.clutterGrowthModifier) - up('sort') * 0.1, 0, 100);
    }
    if (q.left <= 0 || s.clutter >= 100) {
      if (s.clutter >= 100 && !up('hoard')) {
        q.overflow = true;
        s.stats.overflow++;
        q.left = 0;
        const penalty = q.earned * (1 - DATA.balance.overflowPayoutRate);
        s.money = Math.max(0, s.money - penalty);
        q.earned *= DATA.balance.overflowPayoutRate;
      }
      endDay();
      return;
    }
    if (rand() < dt * (0.012 + s.day * 0.001)) {
      const ev = DATA.events[Math.floor(rand() * DATA.events.length)];
      q.event = 2;
      float(nm(ev.id), 115, 30, 8);
      if (ev.id === 'EVENT_01') { for (let i = 0; i < 3; i++) spawn(); }
      if (ev.id === 'EVENT_02') s.helpers.forEach(h => { h.idle += 3; h.state = 'angry'; });
      if (ev.id === 'EVENT_03') s.clutter = clamp(s.clutter + 5, 0, 100);
      if (ev.id === 'EVENT_04') q.event = 4;
      if (ev.id === 'EVENT_05') { if (s.clutter > 60) s.money = Math.max(0, s.money - 25); else payout(25); }
      if (ev.id === 'EVENT_06' && !up('insurance')) {
        s.album.RIVAL_01 = true;
        if (q.customers.length) {
          spawnLeavingCustomer(q.customers[0], 'angry');
          q.customers.shift(); q.lost++; s.stats.lost++; q.combo = 0;
        }
      }
    }
    q.event = Math.max(0, q.event - dt);
    for (let i = q.customers.length - 1; i >= 0; i--) {
      const cu = q.customers[i];
      cu.targetX = L.CUSTOMER_QUEUE.x + 6 + (i % 6) * 24;
      cu.targetY = L.CUSTOMER_QUEUE.y + 12 + (i % 2) * 8;
      cu.x = (cu.x ?? cu.targetX) + (cu.targetX - (cu.x ?? cu.targetX)) * Math.min(1, dt * 6 * q.speed);
      cu.y = (cu.y ?? cu.targetY) + (cu.targetY - (cu.y ?? cu.targetY)) * Math.min(1, dt * 6 * q.speed);
      cu.life -= dt * q.speed;
      if (cu.life <= 0) {
        spawnLeavingCustomer(cu, 'angry');
        q.customers.splice(i, 1); q.lost++; s.stats.lost++; q.combo = 0;
      }
    }
    for (let i = 0; i < s.helpers.length; i++) {
      const h = s.helpers[i];
      h.cool = Math.max(0, (h.cool || 0) - dt);
      h.idle = (h.idle || 0) + dt * (q.mod.id === 'MODIFIER_02' ? 1.7 : 1);
      if (up('autopoke') && h.idle > DATA.balance.autoPokeSeconds) { h.idle = 0; h.state = 'working'; }
      const sleeping = h.idle > DATA.balance.helperIdleSeconds;
      const tx = sleeping ? L.HELPER_BENCH.x + 6 + (i % 3) * 18 : L.CUSTOMER_QUEUE.x + 10 + (i % 6) * 22;
      const ty = sleeping ? L.HELPER_BENCH.y + 8 + Math.floor(i / 3) * 18 : L.COUNTER_TOP.y - 16;
      h.x = (h.x ?? tx) + (tx - (h.x ?? tx)) * Math.min(1, dt * 5 * q.speed);
      h.y = (h.y ?? ty) + (ty - (h.y ?? ty)) * Math.min(1, dt * 5 * q.speed);
      h.state = sleeping ? 'sleeping' : h.cool > 0.8 ? 'happy' : q.customers.length ? 'working' : 'idle';
      if (sleeping) continue;
      h.work = (h.work || 0) + dt * q.speed;
      if (h.work >= Math.max(0.35, h.spec.speed / (1 + up('helper')))) {
        h.work = 0;
        const cu = q.customers[0];
        if (cu) serve(cu, cu.item, false, false, h.spec.accuracy);
      }
    }
  }

  function endDay() {
    if (s.mode !== 'day') return;
    const q = s.shift;
    const ratio = q.earned / Math.max(1, q.target || DATA.daySchedule[Math.min(s.day - 1, 29)].target);
    const loss = q.lost;
    const grade = ratio > 1.6 && loss === 0 ? 'S' : ratio > 1.15 && loss < 3 ? 'A' : ratio > 0.75 ? 'B' : ratio > 0.4 ? 'C' : ratio > 0.2 ? 'D' : 'F';
    const perfect = loss === 0 && q.wrong === 0 && !q.overflow;
    if (perfect) {
      s.stats.perfect++;
      payout(Math.max(40, q.earned * DATA.balance.perfectDayPayoutRate));
      beep('combo');
    }
    const wages = s.helpers.reduce((n, h) => n + h.spec.wage, 0);
    s.money = Math.max(0, s.money - wages);
    const bossBonus = q.bossDone ? DATA.bosses[(Math.floor(s.day / 4) - 1) % DATA.bosses.length].reward : 0;
    s.money += bossBonus;
    s.stats.days++;
    s.bestDay = Math.max(s.bestDay, s.day);
    s.bestCombo = Math.max(s.bestCombo, q.peak);
    s.meta += grade === 'S' ? 3 : grade === 'A' ? 2 : grade === 'B' ? 1 : 0;
    s.skillPoints = (s.skillPoints || 0) + (grade === 'S' ? 2 : grade === 'A' ? 1 : 0);
    s.shift.result = grade;
    s.shift.bonus = bossBonus;
    s.shift.wages = wages;
    s.shift.perfect = perfect;
    s.mode = 'summary';
    s.clutter = clamp(s.clutter - (up('disposal') ? 8 : 0), 0, 100);
    q.customers = [];
    arcBeat();
    if (s.day === 30) s.endReady = true;
    for (const a of DATA.achievements) if (achievement(a.condition)) s.flags[a.id] = true;
    const row = s.highScores.find(v => v.initials === 'AAA');
    if (row) { row.score = s.score; row.day = s.bestDay; row.combo = s.bestCombo; }
    else s.highScores.push({ initials: 'AAA', score: s.score, day: s.bestDay, combo: s.bestCombo });
    save();
    beep('buy');
  }

  function arcBeat() {
    const triggered = DATA.arcs.filter(a => a.beats.includes(s.day));
    for (const a of triggered) {
      const beat = a.beats.indexOf(s.day);
      const prev = s.arcHistory?.[a.id] || [];
      const lastCh = prev[prev.length - 1] || s.arc?.[a.id];
      const line = (lastCh && a.historyLines?.[beat]?.[lastCh]) || a.lines[beat];
      s.pendingArcs.push({ id: a.id, beat, line, choices: ['CHOICE_HELP', 'CHOICE_EXPLOIT', 'CHOICE_HIDE', 'CHOICE_KEEP'] });
      s.album[a.id] = true;
    }
    if (!s.pendingArc && s.pendingArcs.length) s.pendingArc = s.pendingArcs.shift();
  }

  let lastBuyAt = 0;
  function buy(u) {
    if (!u) return;
    const now = performance.now();
    if (now - lastBuyAt < 35) return;
    lastBuyAt = now;
    const owned = s.upgrades[u.id]?.count || 0, g = DATA.balance.upgradeCostGrowth;
    let n = s.buy === 'max' ? 0 : s.buy, cost = 0;
    if (s.buy === 'max') {
      while (n < 10000) {
        const next = Math.ceil(u.cost * Math.pow(g, owned + n));
        if (!Number.isFinite(next) || cost + next > s.money) break;
        cost += next;
        n++;
      }
    } else {
      for (let i = 0; i < n; i++) cost += Math.ceil(u.cost * Math.pow(g, owned + i));
    }
    if (n < 1 || s.money < cost) return;
    s.money -= cost;
    s.upgrades[u.id] = { effect: u.effect, amount: u.amount * (owned + n), count: owned + n };
    beep('buy');
    save();
  }

  function buyMeta(i) {
    const u = DATA.metaUpgrades[i];
    if (!u || s.meta < u.cost || s.metaUpgrades[u.id]) return;
    s.meta -= u.cost;
    s.metaUpgrades[u.id] = true;
    beep('buy');
    save();
  }

  function hire(i) {
    const spec = DATA.helpers[i];
    if (!spec) return;
    const cost = Math.ceil(DATA.balance.baseHelperCost * Math.pow(DATA.balance.helperCostGrowth, s.helpers.filter(h => h.spec.id === spec.id).length) * (i + 1));
    if (s.money < cost) return;
    s.money -= cost;
    s.helpers.push({ id: spec.id, spec, idle: 0, cool: 0, work: 0, state: 'idle' });
    s.album[spec.id] = true;
    beep('buy');
    save();
  }

  function auction() {
    const gain = s.clutter * (2 + up('auction') * 16);
    s.money += gain;
    s.clutter = Math.max(0, s.clutter - 22);
    save();
    beep('buy');
  }

  function merge() {
    if (!up('merge')) return;
    const targetId = s.selectedRestoreItem || 'ITEM_01';
    const base = DATA.items.find(i => i.id === targetId) || DATA.items[0];
    const st = (s.itemState[targetId] ||= { step: 0, mult: 1, tag: base.tag });
    const stepSpec = DATA.restorationSteps[st.step];
    if (!stepSpec || s.money < stepSpec.cost) return;
    s.money -= stepSpec.cost;
    const failProb = clamp(stepSpec.baseFail - up('sort') * 0.25 - up('luck') * 0.35, 0.03, 0.55);
    if (rand() < failProb) {
      const weird = rand() < (stepSpec.weirdChance + up('luck') * 0.3);
      const out = weird ? DATA.restoreOutcomes[1 + Math.floor(rand() * 2)] : DATA.restoreOutcomes[0];
      st.mult = +(st.mult * out.valueMult).toFixed(2);
      if (out.tagShift) st.tag = out.tagShift;
      s.clutter = clamp(s.clutter + out.clutterDelta, 0, 100);
      s.album[out.id] = true;
      float(nm(out.id), 130, 58, weird ? 7 : 8);
      beep(weird ? 'combo' : 'wrong');
    } else {
      st.step++;
      st.mult = +(st.mult * stepSpec.valueMult).toFixed(2);
      s.stats.restorations = (s.stats.restorations || 0) + 1;
      s.album[stepSpec.id] = true;
      float(nm(stepSpec.id), 130, 58, 5);
      beep('buy');
    }
    save();
  }

  function render() {
    THEME.palette = s.settings.paletteAlt ? THEME.alternatePalette : BASE_PALETTE;
    const p = THEME.palette;
    x.fillStyle = p[0];
    x.fillRect(0, 0, W, H);

    if (assetImages.BG_OFFICE_01 && assetStatus.BG_OFFICE_01 === 'OK') {
      const f = Math.floor(performance.now() / 200) % 6;
      const im = getDrawableImage('BG_OFFICE_01', assetImages.BG_OFFICE_01);
      x.drawImage(im, f * 320, 0, 320, 180, 0, 0, W, H);
      x.fillStyle = 'rgba(8,10,20,.34)';
      x.fillRect(0, 0, W, H);
    } else if (assetImages.BACKGROUND_OFFICE) {
      const im = getDrawableImage('BACKGROUND_OFFICE', assetImages.BACKGROUND_OFFICE);
      x.drawImage(im, 0, 0, W, H);
      x.fillStyle = 'rgba(8,10,20,.44)';
      x.fillRect(0, 0, W, H);
    }

    if (s.settings.crt) c.classList.add('crt'); else c.classList.remove('crt');
    x.save();
    if (shake && !s.settings.reducedMotion && !THEME.reducedMotion) {
      x.translate(Math.floor(rand() * 3 - 1), Math.floor(rand() * 3 - 1));
      shake--;
    }
    if (hit && !s.settings.reducedMotion && !THEME.reducedMotion) x.globalAlpha = hit-- % 2 ? 0.45 : 1;

    if (debugView) drawDebug();
    else if (s.mode === 'intro') drawIntro();
    else if (s.mode === 'ending') drawEnding();
    else if (s.mode === 'meta') drawMeta();
    else if (s.mode === 'settings') drawSettings();
    else if (s.mode === 'title') drawTitle();
    else if (s.mode === 'day') drawDay();
    else if (s.mode === 'summary') drawSummary();
    else if (s.mode === 'shop') drawShop();
    else if (s.mode === 'skills') drawSkills();
    else if (s.mode === 'album') drawAlbum();
    else if (s.mode === 'ach') drawAch();
    else if (s.mode === 'scores') drawScores();

    if (debugLayout) {
      x.strokeStyle = THEME.palette[7];
      for (const [k, z] of Object.entries(DATA.LAYOUT)) {
        (Array.isArray(z) ? z : [z]).forEach(r => {
          x.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
          text(k.slice(0, 8), r.x + 2, r.y + 2, 7, 6);
        });
      }
    }
    if (debugHits && s.mode === 'day') {
      const hits = getDayHitAreas();
      x.strokeStyle = THEME.palette[5];
      [...hits.items, ...hits.helpers, ...hits.quickBuys, ...hits.raffles].forEach(h => {
        x.strokeRect(h.x + 0.5, h.y + 0.5, h.w - 1, h.h - 1);
      });
    }
    x.restore();
    x.globalAlpha = 1;
    drawParticles();
    if (perfOverlay) {
      box(2, 2, 118, 12, 0, 5);
      text(`FPS ${Math.round(fps)}  SEED ${s.seed % 1000}`, 6, 4, 5, 6);
    }
    if (s.settings.crt && THEME.crt.scanlines) {
      x.fillStyle = 'rgba(0,0,0,.09)';
      for (let y = 0; y < H; y += 2) x.fillRect(0, y, W, 1);
    }
  }

  function drawDebug() {
    box(3, 3, 314, 174);
    const entries = Object.entries(DATA.assets), pages = Math.ceil(entries.length / 14);
    debugPage = clamp(debugPage, 0, Math.max(0, pages - 1));
    text(`ASSET DEBUG P.${debugPage + 1}/${pages} L:ZONES(${debugLayout ? 'ON' : 'OFF'}) B:HITS(${debugHits ? 'ON' : 'OFF'})`, 8, 7, 7, 6);
    entries.slice(debugPage * 14, debugPage * 14 + 14).forEach(([id, a], i) => {
      const st = assetStatus[id] || 'CHECKING';
      text(`${id} ${st} ${a.frameWidth}x${a.frameHeight} x${a.frameCount}`, 8, 20 + i * 10, st === 'OK' ? 5 : st === 'MISSING' ? 8 : 7, 6);
    });
    text('ARROWS PAGE  |  L ZONES  |  B HITBOXES  |  D CLOSE', 8, 165, 6, 6);
  }

  for (const [id, meta] of Object.entries(DATA.assets)) {
    const im = new Image();
    im.onload = () => {
      assetImages[id] = im;
      const expW = meta.frameWidth * (meta.frameColumns || meta.frameCount);
      const expH = meta.frameHeight * (meta.frameRows || 1);
      assetStatus[id] = (im.width === expW && im.height === expH) ? 'OK' : (im.width > expW ? 'OFF-GRID' : 'SIZE MISMATCH');
    };
    im.onerror = () => { assetStatus[id] = 'MISSING'; };
    im.src = meta.path;
  }

  function startFromTitle(forceIntro = false) {
    if (!forceIntro && (s.flags?.INTRO_SEEN || s.settings?.skipIntro)) { begin(); return; }
    s.introPage = 0;
    s.mode = 'intro';
  }

  function advanceIntro() {
    s.introPage = (s.introPage || 0) + 1;
    if (s.introPage >= DATA.introStory.length) {
      s.flags.INTRO_SEEN = true;
      begin();
    } else save();
  }

  function drawIntro() {
    const page = DATA.introStory[s.introPage || 0];
    const bob = s.settings.reducedMotion ? 0 : Math.round(Math.sin(performance.now() / 190) * 2);
    const blink = Math.floor(performance.now() / 380) % 2;
    x.fillStyle = 'rgba(20,24,38,.72)';
    x.fillRect(14, 8, 292, 164);
    x.strokeStyle = THEME.palette[7];
    x.strokeRect(14.5, 8.5, 291, 163);
    text('LOST & FOUND OFFICE   /   ' + String((s.introPage || 0) + 1).padStart(2, '0') + ' OF ' + DATA.introStory.length, 24, 15, 7, 7);
    labelRect(24, 30, 120, 80, page.id, 3, 'idle');
    labelRect(280, 15, 18, 18, page.item, 6);
    for (let i = 0; i < page.lines.length; i++) {
      text(page.lines[i], 150, 40 + i * 14 + bob, i === 0 ? 7 : 6, 6);
    }
    box(26, 118, 268, 36, 12, 6);
    text(page.title, 36, 124, 5, 7);
    text('SPEAKING: ' + page.speaker, 36, 136, 7, 6);
    text(blink ? 'CLICK / ENTER TO CONTINUE' : ' ', 93, 160, 7, 6);
  }

  function drawTitle() {
    x.fillStyle = 'rgba(20,24,38,.70)';
    x.fillRect(24, 14, 272, 152);
    x.strokeStyle = THEME.palette[7];
    x.strokeRect(24.5, 14.5, 271, 151);
    text(nm(DATA.title), 88, 26, 7, 9);
    text(nm(DATA.location) + '  |  ' + nm('NOW_SERVING_LABEL') + ' #' + String(s.servingTicket || 42).padStart(3, '0'), 62, 46, 5, 6);

    const blink = Math.floor(performance.now() / 380) % 2 === 0;
    box(66, 64, 148, 22, 6, 8);
    box(214, 64, 38, 22, blink ? 7 : 8, 6);
    text(nm('PRESS_START_TICKET'), 92, 71, 0, 8);
    if (blink) text('STUB', 220, 71, 0, 6);

    text('CLICK / TAP TO START', 98, 98, 7);
    text('SCORE ' + fmt(s.score) + '   BEST DAY ' + s.bestDay, 75, 118, 5);
    text('W INTRO  H SCORES  B META  S SETTINGS', 48, 144, 4, 7);
  }

  function drawSettings() {
    box(20, 12, 280, 156);
    text('CABINET SETTINGS', 83, 20, 7, 10);
    text('MASTER VOLUME', 42, 42, 6);
    bar(142, 42, 130, 9, s.settings.volume, 5);
    text(Math.round(s.settings.volume * 100) + '%', 278, 42, 7, 6);
    text('MUTE N: ' + (s.settings.mute ? 'ON' : 'OFF'), 42, 58, 6);
    text('CRT SCANLINES M: ' + (s.settings.crt ? 'ON' : 'OFF'), 42, 73, 6);
    text('ALT PALETTE P: ' + (s.settings.paletteAlt ? 'ON' : 'OFF'), 42, 88, 6);
    text('ART PALETTE O: ' + (s.settings.artPalette || 'ORIGINAL').toUpperCase(), 42, 103, 6);
    text('SKIP INTRO K: ' + (s.settings.skipIntro ? 'ON' : 'OFF'), 42, 118, 6);
    text('REDUCED MOTION U: ' + (s.settings.reducedMotion ? 'ON' : 'OFF'), 42, 133, 6);
    text('[LEFT/RIGHT] VOLUME   [ESC] BACK', 60, 152, 7, 7);
  }

  function drawDay() {
    const q = s.shift, L = DATA.LAYOUT, hits = getDayHitAreas();
    box(0, 0, W, 12, 0, 2);
    text(`D${String(s.day).padStart(2, '0')} ${nm(DATA.currency)}:${fmt(s.money)} $/S:${fmt(q.earned / Math.max(0.01, q.time - q.left))} C:${q.combo}`, 3, 3, 6, 6);
    bar(206, 3, 50, 6, q.left / q.time, 7);
    bar(260, 3, 56, 6, s.clutter / 100, s.clutter > 85 ? 8 : 5);

    const sw = L.SHELF_WALL, bgW = Math.floor(sw.w / sw.cols), bgH = Math.floor(sw.h / sw.rows);
    x.strokeStyle = THEME.palette[2];
    for (let r = 0; r < sw.rows; r++) {
      for (let cIdx = 0; cIdx < sw.cols; cIdx++) {
        x.strokeRect(sw.x + cIdx * bgW + 0.5, sw.y + r * bgH + 0.5, bgW - 1, bgH - 1);
      }
    }
    hits.items.forEach(slot => {
      const info = itemInfo(slot.id);
      labelRect(slot.x, slot.y, slot.w, slot.h, info.id, info.color, 'idle');
      if (info.step > 0) text(`+${info.step}`, slot.x + slot.w - 13, slot.y + 2, 7, 6);
      text(fmt(info.value), slot.x + 2, slot.y + slot.h - 8, 15, 6);
    });

    const fp = L.FLOOR_PILE, tierCount = Math.floor(s.clutter / 6);
    for (let i = 0; i < tierCount; i++) {
      const spillX = s.clutter > 75 ? Math.floor((s.clutter - 75) * 1.4) : 0;
      const bx = fp.x + ((i * 13) % Math.max(12, fp.w + spillX - 10));
      const by = fp.y + fp.h - 8 - Math.floor(i / 4) * 5;
      box(bx, clamp(by, fp.y - 6, L.COUNTER_TOP.y - 8), 10, 7, (i % 4) + 8, 6);
    }
    hits.raffles.forEach(rp => labelRect(rp.x, rp.y, rp.w, rp.h, rp.id, 7, 'idle'));

    if (!q.customers.length) text('QUEUE CLEAR', L.CUSTOMER_QUEUE.x + 36, L.CUSTOMER_QUEUE.y + 18, 3, 6);
    q.customers.slice(0, 6).forEach(cu => {
      const cx = Math.round(cu.x ?? L.CUSTOMER_QUEUE.x), cy = Math.round(cu.y ?? L.CUSTOMER_QUEUE.y);
      labelRect(cx, cy, 22, 22, cu.id, cu.isBoss ? 9 : 3, 'idle');
      box(cx - 2, cy - 11, 26, 9, 0, cu.ambiguous ? 7 : 6);
      text(nm(cu.tag).slice(0, 4), cx, cy - 9, cu.ambiguous ? 7 : 15, 6);
      bar(cx, cy + 23, 22, 4, cu.life / cu.max, cu.life < cu.max * 0.25 ? 8 : 5);
    });

    for (let i = 0; i < leavingPool.length; i++) {
      const lv = leavingPool[i];
      if (lv.active) labelRect(lv.x, lv.y, 20, 20, lv.id, lv.mood === 'happy' ? 5 : 8, 'leaving');
    }

    hits.helpers.forEach(hSlot => {
      const h = s.helpers[hSlot.index];
      const sleeping = h.idle > DATA.balance.helperIdleSeconds;
      labelRect(hSlot.x, hSlot.y, hSlot.w, hSlot.h, h.id, sleeping ? 8 : 4, h.state || (sleeping ? 'sleeping' : 'working'));
      if (sleeping) text('!', hSlot.x + 14, hSlot.y - 4, 8, 6);
    });

    box(L.COUNTER_TOP.x, L.COUNTER_TOP.y, L.COUNTER_TOP.w, L.COUNTER_TOP.h, 2, 6);
    const frontCust = q.customers[0];
    text(frontCust ? `WANT: ${nm(frontCust.tag)} [CLICK ITEM]` : 'WAITING FOR CUSTOMER...', L.COUNTER_TOP.x + 6, L.COUNTER_TOP.y + 8, 6, 6);
    if (s.clutter > 88) {
      box(L.COUNTER_TOP.x, L.COUNTER_TOP.y, 18, L.COUNTER_TOP.h, 8, 9);
      box(L.COUNTER_TOP.x + L.COUNTER_TOP.w - 18, L.COUNTER_TOP.y, 18, L.COUNTER_TOP.h, 8, 9);
    }

    box(L.COUNTER_FRONT.x, L.COUNTER_FRONT.y, L.COUNTER_FRONT.w, L.COUNTER_FRONT.h, 12, 3);
    hits.quickBuys.forEach((qb, i) => {
      const u = DATA.upgrades.find(upItem => upItem.id === qb.id);
      const owned = s.upgrades[qb.id]?.count || 0;
      const nextCost = Math.ceil(u.cost * Math.pow(DATA.balance.upgradeCostGrowth, owned));
      const canAfford = s.money >= nextCost;
      box(qb.x, qb.y, qb.w, qb.h, canAfford ? 1 : 0, canAfford ? 5 : 3);
      text(`[${i + 5}]${qb.id.slice(8, 12)}`, qb.x + 2, qb.y + 2, canAfford ? 7 : 4, 6);
      text(fmt(nextCost), qb.x + 2, qb.y + 11, canAfford ? 5 : 8, 6);
    });

    L.FOREGROUND_BOXES.forEach(fg => {
      box(fg.x, fg.y, fg.w, fg.h, 11, 6);
    });

    box(0, 168, W, 12, 0, 2);
    text(`SPC PAUSE  R RESUME  F X2  G X4  5-8 QBUY  Q ${s.lastGambleId || 'GAMBLE_01'}`, 4, 171, 6, 6);

    if (s.gambleModal) {
      const gm = s.gambleModal;
      const prog = 1 - gm.timer / gm.total;
      const fIdx = s.settings.reducedMotion ? (prog < 0.7 ? 0 : 5) : (prog < 0.75 ? Math.min(4, Math.floor((prog / 0.75) * 5)) : 5);
      box(98, 48, 124, 84, 0, gm.win ? 5 : 8);
      labelRect(100, 50, 120, 80, gm.id, 3, 'idle', fIdx);
    }
  }

  function drawSummary() {
    const q = s.shift;
    box(20, 10, 280, 160);
    text('DAY ' + s.day + ' COMPLETE', 95, 16, 7, 12);
    text('RATING  ' + q.result, 116, 32, q.result === 'S' ? 7 : 6, 11);
    text('EARNED ' + fmt(q.earned) + '  BOSS ' + fmt(q.bonus), 62, 48, 5);
    text('SERVED ' + q.served + '   LOST ' + q.lost + '   WRONG ' + q.wrong, 49, 60, 6);
    text('COMBO PEAK ' + q.peak + '   CLUTTER ' + Math.floor(s.clutter) + '%', 61, 72, 6);
    text(q.perfect ? 'PERFECT DAY BONUS!' : q.overflow ? 'OVERFLOW — SHIFT CLOSED' : 'SHIFT COMPLETE', 78, 84, q.perfect ? 7 : 8, 8);
    if (s.lastArcReply) text(s.lastArcReply.slice(0, 46), 28, 96, 5, 6);
    if (s.pendingArc) {
      const tr = s.trust?.[s.pendingArc.id] || 0;
      text(`${nm(s.pendingArc.id)} (TRUST ${tr}):`, 28, 108, 7, 6);
      text(s.pendingArc.line.slice(0, 46), 28, 118, 6, 6);
      text('[1] HELP  [2] EXPLOIT  [3] HIDE  [4] KEEP', 40, 132, 7, 6);
    } else text('[SPACE] SHOP    [A] ALBUM   [T] TROPHIES', 44, 142, 7);
    if (s.endReady && !s.pendingArc) text('[P] PRESTIGE / ENDINGS', 86, 155, 8);
  }

  function drawShop() {
    box(4, 4, 312, 172);
    text('BETWEEN DAYS — DAY ' + s.day, 8, 7, 7, 10);
    text(nm(DATA.currency) + ' ' + fmt(s.money) + '  ' + nm('CLUTTER_' + String(clamp(Math.ceil(s.clutter / 25), 1, 5)).padStart(2, '0')) + ' ' + Math.floor(s.clutter) + '%', 8, 21, 6);
    text('BUY x' + s.buy + '  [1] x1 [2] x10 [3] x100 [4] MAX  [LEFT/RIGHT] PAGE ' + ((s.upPage || 0) + 1), 8, 31, 5, 6);
    const arr = DATA.upgrades.slice((s.upPage || 0) * 9, (s.upPage || 0) * 9 + 9);
    for (let i = 0; i < arr.length; i++) {
      const u = arr[i], cost = Math.ceil(u.cost * Math.pow(DATA.balance.upgradeCostGrowth, s.upgrades[u.id]?.count || 0));
      text(nm(u.id) + ' ' + fmt(cost), 8, 44 + i * 11, i < 5 ? 6 : 5, 6);
    }
    const selItem = itemInfo(s.selectedRestoreItem || 'ITEM_01');
    const nextStep = DATA.restorationSteps[selItem.step];
    text('[A] AUCTION  [M] RESTORE  [K] SKILLS  [V] ALBUM', 166, 44, 7, 6);
    text(`ITEM:${selItem.id} S:${selItem.step}/4 [C]NEXT`, 166, 54, 5, 6);
    text(nextStep ? `${nextStep.id} $${fmt(nextStep.cost)}` : 'FULLY RESTORED', 166, 63, 6, 6);
    DATA.helpers.slice(0, 6).forEach((h, i) =>
      text(`[${i + 1}] ${nm(h.id)} ${fmt(DATA.balance.baseHelperCost * Math.pow(DATA.balance.helperCostGrowth, s.helpers.filter(a => a.spec.id === h.id).length) * (i + 1))} x${s.helpers.filter(a => a.spec.id === h.id).length}`, 166, 75 + i * 10, 4, 6)
    );
    text('[ENTER] NEXT DAY  [T] TROPHIES  [J] HIRE  [Z] SCORES', 8, 163, 7, 6);
  }

  function drawSkills() {
    box(8, 8, 304, 164);
    text('SKILL MAP — POINTS ' + (s.skillPoints || 0) + '  RESPEC [Y]', 14, 12, 7, 9);
    ['CLICK', 'HELPER', 'ODDS'].forEach((b, j) => {
      text(b, 40 + j * 95, 30, 5);
      for (let i = 0; i < 6; i++) {
        const id = `SKILL_${b}_${i + 1}`, own = s.skills.includes(id);
        box(20 + j * 96 + (i % 3) * 27, 43 + Math.floor(i / 3) * 39, 23, 20, own ? 4 : 2, own ? 7 : 3);
        text(i + 1, 29 + j * 96 + (i % 3) * 27, 49 + Math.floor(i / 3) * 39, own ? 7 : 6);
      }
    });
    text('Select branch with [1-3], node with arrows; ENTER buys', 29, 132, 6);
    text('CLICK BUILDS | HELPER SWARM | ODDS GAMBLER', 30, 149, 5);
  }

  function drawAlbum() {
    box(8, 8, 304, 164);
    text('COLLECTION ALBUM  ' + Object.keys(s.album).length + ' DISCOVERED', 14, 13, 7, 9);
    const ids = [...DATA.items.map(a => a.id), ...DATA.customers.map(a => a.id), ...DATA.helpers.map(a => a.id), ...DATA.events.map(a => a.id), ...DATA.bosses.map(a => a.id), ...DATA.endings];
    ids.slice((s.albumPage || 0) * 42, ((s.albumPage || 0) + 1) * 42).forEach((id, i) =>
      text((s.album[id] ? '■ ' + nm(id) : '□ ???'), 15 + (i % 3) * 99, 32 + Math.floor(i / 3) * 9, s.album[id] ? 5 : 3, 7)
    );
    text('[LEFT/RIGHT] pages  [ESC] back', 14, 158, 6);
  }

  function drawAch() {
    box(8, 8, 304, 164);
    text('TROPHY ROOM ' + Object.keys(s.flags).length + '/60', 14, 13, 7, 9);
    DATA.achievements.slice((s.achPage || 0) * 42, ((s.achPage || 0) + 1) * 42).forEach((a, i) =>
      text((s.flags[a.id] ? '■ ' : '□ ') + nm(a.id), 15 + (i % 3) * 99, 32 + Math.floor(i / 3) * 9, s.flags[a.id] ? 7 : 3, 7)
    );
    text('[LEFT/RIGHT] pages  [ESC] back', 14, 158, 6);
  }

  function drawScores() {
    box(28, 14, 264, 151);
    text('ARCADE HIGH SCORES', 84, 22, 7, 11);
    const rows = [...s.highScores].sort((a, b) => b.score - a.score).slice(0, 6);
    rows.forEach((a, i) => text(`${String(i + 1).padStart(2, '0')}  ${a.initials}  ${fmt(a.score)}  D${a.day}  C${a.combo}`, 73, 43 + i * 12, 6));
    text('BEST DAY ' + s.bestDay + '   BEST COMBO ' + s.bestCombo, 68, 122, 5, 7);
    text('[ESC] BACK', 128, 145, 5);
  }

  function drawEnding() {
    box(20, 12, 280, 156, 2, 7);
    text('ENDING CARD', 102, 24, 7, 10);
    text(nm(s.ending), 40, 49, 7, 9);
    (DATA.endingCards[s.ending] || []).forEach((line, i) => text(line, 40, 78 + i * 16, 6, 7));
    text(nm(DATA.metaCurrency) + ' ' + fmt(s.meta), 40, 120, 5, 7);
    text('PRESS START TO BEGIN AGAIN', 57, 146, 7, 7);
  }

  function drawMeta() {
    box(10, 9, 300, 162);
    text('PERMANENT UPGRADES', 70, 15, 7, 10);
    text(nm(DATA.metaCurrency) + ' ' + fmt(s.meta), 20, 32, 6, 7);
    DATA.metaUpgrades.forEach((u, i) => text(`[${i + 1}] ${nm(u.id)}  ${s.metaUpgrades[u.id] ? 'OWNED' : fmt(u.cost)}`, 20, 50 + i * 17, s.metaUpgrades[u.id] ? 4 : 6, 7));
    text('BUY ONCE — PERSISTS AFTER PRESTIGE — ESC BACK', 20, 151, 5, 6);
  }

  function achievement(i) {
    const st = s.stats;
    return [
      st.served > 0, st.served >= 100, st.served >= 1000, st.lost === 0 && st.days > 0, st.wrong >= 10, st.overflow > 0,
      st.pokes >= 500, s.clutter >= 99 && s.shift?.left > 0, st.perfect >= 1, st.perfect >= 10, s.helpers.length >= 1,
      s.helpers.length >= 10, s.money >= 1e3, s.money >= 1e6, s.money >= 1e9, s.day >= 5, s.day >= 10, s.day >= 30,
      s.bestCombo >= 10, s.bestCombo >= 50, up('gamble') > 0, s.stats.wrong >= 50, s.clutter >= 90, s.clutter === 0,
      s.skills.length >= 1, s.skills.length >= 10, Object.keys(s.album).length >= 10, Object.keys(s.album).length >= 50,
      s.helpers.some(h => h.idle > DATA.balance.helperIdleSeconds), s.stats.pokes >= 1, s.day % 4 === 0, s.stats.days >= 100,
      s.meta >= 10, up('auction') > 0, up('merge') > 0, up('autopoke') > 0, s.shift?.bossDone, s.money >= 1e12,
      s.stats.served >= 5000, s.stats.lost >= 100, s.day >= 50, s.ending, s.helpers.length >= 20,
      s.clutter >= 75 && s.clutter < 90, s.stats.perfect >= 30, s.bestCombo >= 99, s.money >= 1e15, s.skills.length >= 18,
      Object.keys(s.album).length >= 100, s.stats.wrong >= 100, s.stats.overflow >= 10, s.stats.pokes >= 100,
      s.shift?.speed >= 4, s.day === 1 && s.money > 100, s.shift?.bossDone && s.shift?.wrong === 0,
      s.clutter < 10 && s.day >= 10, s.helpers.filter(h => h.spec.id === 'HELPER_01').length >= 5,
      s.helpers.filter(h => h.spec.id === 'HELPER_06').length >= 1, s.day >= 100, s.meta >= 100
    ][i] || false;
  }

  function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const a = particles[i];
      text(a.t, a.x, a.y, a.col, 7);
      a.y -= 0.25;
      a.life--;
      if (!a.life) particles.splice(i, 1);
    }
  }

  function action(xp, yp) {
    if (s.mode === 'intro') { advanceIntro(); return; }
    if (s.mode === 'title') {
      if (yp > 136 && xp < 92) { startFromTitle(true); return; }
      if (yp > 136 && xp < 155) { s.mode = 'scores'; return; }
      if (yp > 136 && xp < 210) { s.mode = 'meta'; return; }
      if (yp > 136 && xp >= 210) { s.mode = 'settings'; return; }
      startFromTitle(false);
      return;
    }
    if (s.mode === 'day') {
      const hits = getDayHitAreas();
      for (const qb of hits.quickBuys) {
        if (xp >= qb.x && xp <= qb.x + qb.w && yp >= qb.y && yp <= qb.y + qb.h) {
          const u = DATA.upgrades.find(upItem => upItem.id === qb.id);
          if (u) buy(u);
          return;
        }
      }
      for (const hSlot of hits.helpers) {
        if (xp >= hSlot.x && xp <= hSlot.x + hSlot.w && yp >= hSlot.y && yp <= hSlot.y + hSlot.h) {
          poke(hSlot.index);
          return;
        }
      }
      for (const rp of hits.raffles) {
        if (xp >= rp.x && xp <= rp.x + rp.w && yp >= rp.y && yp <= rp.y + rp.h) {
          if (s.shift.customers[0]) serve(s.shift.customers[0], rp.id, true, false);
          s.rafflePulls.splice(rp.index, 1);
          return;
        }
      }
      for (const slot of hits.items) {
        if (xp >= slot.x && xp <= slot.x + slot.w && yp >= slot.y && yp <= slot.y + slot.h) {
          s.selectedRestoreItem = slot.id;
          if (s.shift.customers[0]) serve(s.shift.customers[0], slot.id, true, false);
          return;
        }
      }
      if (xp > 220 && yp < 14) { s.clutter = clamp(s.clutter - 1, 0, 100); return; }
      const ct = hits.counterTop;
      if (xp >= ct.x && xp <= ct.x + ct.w && yp >= ct.y && yp <= ct.y + ct.h && s.shift.customers[0]) {
        serve(s.shift.customers[0], s.selectedRestoreItem || s.shift.customers[0].item, true, false);
      }
      return;
    }
    if (s.mode === 'summary') {
      if (s.pendingArc) { chooseArc(clamp(Math.floor(xp / 80), 0, 3)); return; }
      if (s.endReady && yp > 145) { prestige(); return; }
      openShop();
      return;
    }
    if (s.mode === 'shop') {
      if (yp >= 28 && yp < 40) { s.buy = xp < 75 ? 1 : xp < 135 ? 10 : xp < 200 ? 100 : 'max'; save(); return; }
      if (yp >= 40 && yp < 142 && xp < 160) {
        const i = Math.floor((yp - 44) / 11), u = DATA.upgrades[(s.upPage || 0) * 9 + i];
        if (u) buy(u);
        return;
      }
      if (yp > 155) { begin(); return; }
      if (xp > 160 && yp >= 72 && yp < 140) {
        const i = Math.floor((yp - 75) / 10);
        if (DATA.helpers[i]) hire(i);
        return;
      }
      if (xp > 160 && yp >= 50 && yp < 70) { merge(); return; }
      if (yp > 42 && xp <= 160) { auction(); return; }
      return;
    }
    if (s.mode === 'skills') { buySkillAt(xp, yp); return; }
    if (s.mode === 'album') { s.albumPage = ((s.albumPage || 0) + 1) % 3; return; }
    if (s.mode === 'ach') { s.achPage = ((s.achPage || 0) + 1) % 2; return; }
    if (s.mode === 'settings') {
      if (yp >= 38 && yp < 52) s.settings.volume = clamp((xp - 142) / 130, 0, 1);
      else if (yp >= 54 && yp < 68) s.settings.mute = !s.settings.mute;
      else if (yp >= 70 && yp < 84) s.settings.crt = !s.settings.crt;
      else if (yp >= 86 && yp < 100) s.settings.paletteAlt = !s.settings.paletteAlt;
      else if (yp >= 101 && yp < 115) s.settings.artPalette = s.settings.artPalette === 'quantized' ? 'original' : 'quantized';
      else if (yp >= 116 && yp < 130) s.settings.skipIntro = !s.settings.skipIntro;
      else if (yp >= 131 && yp < 146) s.settings.reducedMotion = !s.settings.reducedMotion;
      save();
      return;
    }
    if (s.mode === 'meta') { if (yp >= 45 && yp < 140) buyMeta(Math.floor((yp - 50) / 17)); return; }
    if (s.mode === 'scores') s.mode = 'title';
  }

  function openShop() {
    if (s.mode === 'summary') s.day++;
    s.mode = 'shop';
    s.shopActions = 0;
    save();
  }

  function chooseArc(n) {
    const a = s.pendingArc;
    if (!a) return;
    const keyName = ['HELP', 'EXPLOIT', 'HIDE', 'KEEP'][n] || 'HELP';
    s.arc[a.id] = keyName;
    (s.arcHistory[a.id] ||= []).push(keyName);
    if (keyName === 'HELP') s.stats.helpCount = (s.stats.helpCount || 0) + 1;
    if (keyName === 'EXPLOIT') s.stats.exploitCount = (s.stats.exploitCount || 0) + 1;
    if (keyName === 'HIDE') { s.stats.hideCount = (s.stats.hideCount || 0) + 1; s.flags.STORY_HIDE = true; }
    if (keyName === 'KEEP') { s.stats.keepCount = (s.stats.keepCount || 0) + 1; s.flags.STORY_KEEP = true; }

    const arcDef = DATA.arcs.find(x => x.id === a.id);
    const beatOut = arcDef?.outcomes?.[a.beat]?.[keyName] || { reply: 'Recorded.', cash: 25, clutter: 0, trust: 0 };
    s.money = Math.max(0, s.money + (beatOut.cash || 0));
    s.clutter = clamp(s.clutter + (beatOut.clutter || 0), 0, 100);
    s.trust[a.id] = (s.trust[a.id] || 0) + (beatOut.trust || 0);
    s.lastArcReply = `${nm(a.id)}: "${beatOut.reply}"`;
    if (beatOut.perk && arcDef?.perkId) {
      s.arcPerks[a.id] = 'perk';
      s.album[arcDef.perkId] = true;
    }
    s.pendingArc = s.pendingArcs.length ? s.pendingArcs.shift() : null;
    save();
  }

  function prestige() {
    const click = up('click'), helper = up('helper'), luck = up('luck'), hoard = up('hoard');
    const keepTotal = s.stats.keepCount || 0, hideTotal = s.stats.hideCount || 0;
    const exploitTotal = s.stats.exploitCount || 0, helpTotal = s.stats.helpCount || 0;
    let ending = 'ENDING_01';
    if ((hoard > 0 && s.clutter >= 75) || keepTotal >= 6) ending = 'ENDING_03';
    else if ((helper > click && s.helpers.length > 0) || (helpTotal >= 6 && s.helpers.length >= 3)) ending = 'ENDING_02';
    else if (luck > click || exploitTotal >= 6) ending = 'ENDING_04';
    else if (s.stats.overflow > 0 || hideTotal >= 5) ending = 'ENDING_05';

    s.album[ending] = true;
    const meta = s.meta + Math.floor(Math.sqrt(s.score / DATA.balance.prestigeScoreDivisor)) + DATA.balance.prestigeFloor;
    const old = { meta, settings: s.settings, highScores: s.highScores, album: { ...s.album }, flags: { ...s.flags }, bestDay: s.bestDay, bestCombo: s.bestCombo, metaUpgrades: { ...s.metaUpgrades } };
    s = fresh();
    Object.assign(s, old);
    s.mode = 'ending';
    s.day = 1;
    s.ending = ending;
    save();
  }

  function buySkillAt(px, py) {
    const col = clamp(Math.floor((px - 20) / 96), 0, 2);
    const slot = (py < 82 ? 0 : 3) + clamp(Math.floor((px - 20 - col * 96) / 27), 0, 2);
    const id = `SKILL_${['CLICK', 'HELPER', 'ODDS'][col]}_${slot + 1}`;
    const node = DATA.skills.find(n => n.id === id);
    if (node && !s.skills.includes(id) && (s.skillPoints || 0) >= node.cost && (!node.requires || s.skills.includes(node.requires))) {
      s.skillPoints -= node.cost;
      s.skills.push(id);
      if (node.tradeoff) s.clutter = clamp(s.clutter + 10, 0, 100);
      save();
      beep('buy');
    }
  }

  function key(e) {
    const k = e.key.toLowerCase();
    if ([' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) e.preventDefault();
    if (k === 'f9') { perfOverlay = !perfOverlay; return; }
    if (k === 'x') { exportSave(); return; }
    if (k === 'i') { importSave(); return; }
    if (k === 'd') { debugView = !debugView; return; }
    if (debugView) {
      if (k === 'l') debugLayout = !debugLayout;
      if (k === 'b') debugHits = !debugHits;
      if (k === 'arrowright') debugPage++;
      if (k === 'arrowleft') debugPage = Math.max(0, debugPage - 1);
      return;
    }
    if (s.mode === 'ending') { if (k === 'enter' || k === ' ') s.mode = 'title'; return; }
    if (s.mode === 'intro') {
      if (k === 'escape') { s.mode = 'title'; return; }
      if (k === 'enter' || k === ' ' || k === 'arrowright') advanceIntro();
      return;
    }
    if (s.mode === 'settings') {
      if (k === 'escape') s.mode = 'title';
      if (k === 'arrowleft') s.settings.volume = clamp(s.settings.volume - 0.05, 0, 1);
      if (k === 'arrowright') s.settings.volume = clamp(s.settings.volume + 0.05, 0, 1);
      if (k === 'm') s.settings.crt = !s.settings.crt;
      if (k === 'n') s.settings.mute = !s.settings.mute;
      if (k === 'p') s.settings.paletteAlt = !s.settings.paletteAlt;
      if (k === 'o') s.settings.artPalette = s.settings.artPalette === 'quantized' ? 'original' : 'quantized';
      if (k === 'k') s.settings.skipIntro = !s.settings.skipIntro;
      if (k === 'u') s.settings.reducedMotion = !s.settings.reducedMotion;
      save();
      return;
    }
    if (s.mode === 'meta') {
      if (k === 'escape') s.mode = 'title';
      if (/^[1-5]$/.test(k)) buyMeta(+k - 1);
      return;
    }
    if (s.mode === 'title') {
      if (k === 'enter' || k === ' ') startFromTitle(false);
      else if (k === 'w') startFromTitle(true);
      else if (k === 'h') s.mode = 'scores';
      else if (k === 'b') s.mode = 'meta';
      else if (k === 's') s.mode = 'settings';
      else if (k === 'm') { s.settings.crt = !s.settings.crt; save(); }
      else if (k === 'p') { s.settings.paletteAlt = !s.settings.paletteAlt; save(); }
      else if (k === 'n') { s.settings.mute = !s.settings.mute; save(); }
      else if (k === '+' || k === '=') { s.settings.volume = clamp(s.settings.volume + 0.05, 0, 1); save(); }
      else if (k === '-') { s.settings.volume = clamp(s.settings.volume - 0.05, 0, 1); save(); }
      return;
    }
    if (k === 'escape') { s.mode = s.mode === 'album' || s.mode === 'ach' || s.mode === 'skills' || s.mode === 'scores' ? 'summary' : 'shop'; return; }
    if (k === 'n') { s.settings.mute = !s.settings.mute; save(); return; }
    if (k === '+' || k === '=') { s.settings.volume = clamp(s.settings.volume + 0.05, 0, 1); save(); return; }
    if (k === '-') { s.settings.volume = clamp(s.settings.volume - 0.05, 0, 1); save(); return; }
    if (s.mode === 'day') {
      if (k === ' ') { s.shift.speed = 0; return; }
      if (k === 'f') s.shift.speed = 2;
      if (k === 'g' && up('fast')) s.shift.speed = 4;
      if (k === 'e') endDay();
      if (k === 'q' && (up('gamble') || s.shift.bossRule === 'GAMBLE') && s.shift.customers[0]) {
        serve(s.shift.customers[0], s.shift.customers[0].item, true, true);
      }
      if (k === 'p') s.mode = 'album';
      if (k === '1' && s.shift.customers[0]) serve(s.shift.customers[0], s.shift.customers[0].item, true);
      if (k >= '5' && k <= '8') {
        const qbId = DATA.quickBuyIds[+k - 5];
        const u = DATA.upgrades.find(upItem => upItem.id === qbId);
        if (u) buy(u);
      }
      if (k === 'r') s.shift.speed = 1;
      return;
    }
    if (s.mode === 'summary') {
      if (k === ' ' || k === 'enter') openShop();
      else if (k === 'a') s.mode = 'album';
      else if (k === 't') s.mode = 'ach';
      else if (k === 'p' && s.endReady) prestige();
      else if (k >= '1' && k <= '4') chooseArc(+k - 1);
      return;
    }
    if (s.mode === 'shop') {
      if (k === 'enter') { begin(); return; }
      if (k === '1' || k === '2' || k === '3' || k === '4') { s.buy = k === '1' ? 1 : k === '2' ? 10 : k === '3' ? 100 : 'max'; save(); return; }
      if (k === 'a') auction();
      if (k === 'm') merge();
      if (k === 'c') {
        const idx = DATA.items.findIndex(it => it.id === (s.selectedRestoreItem || 'ITEM_01'));
        s.selectedRestoreItem = DATA.items[(idx + 1) % DATA.items.length].id;
        save();
      }
      if (k === 'k' || k === 'p') s.mode = 'skills';
      if (k === 'v') s.mode = 'album';
      if (k === 't') s.mode = 'ach';
      if (k === 'z') s.mode = 'scores';
      if (k === 'j') { hire(s.hireIndex || 0); s.hireIndex = ((s.hireIndex || 0) + 1) % DATA.helpers.length; }
      if (k === 'arrowright') s.upPage = clamp((s.upPage || 0) + 1, 0, Math.ceil(DATA.upgrades.length / 9) - 1);
      if (k === 'arrowleft') s.upPage = Math.max(0, (s.upPage || 0) - 1);
      return;
    }
    if (s.mode === 'skills') {
      if (k === 'y') { s.money = Math.max(0, s.money - 100); s.skillPoints += s.skills.length; s.skills = []; return; }
      if (k >= '1' && k <= '3') buySkillAt(20 + (+k - 1) * 96, 43);
      if (k === 'enter') s.mode = 'shop';
      return;
    }
    if (s.mode === 'album' || s.mode === 'ach') {
      if (k === 'arrowright') s.albumPage = (s.albumPage || 0) + 1;
      if (k === 'arrowleft') s.albumPage = Math.max(0, (s.albumPage || 0) - 1);
      if (k === 't') s.mode = 'ach';
      if (k === 'a') s.mode = 'album';
    }
  }

  c.addEventListener('pointerdown', e => {
    const r = c.getBoundingClientRect();
    const xp = (e.clientX - r.left) * W / r.width, yp = (e.clientY - r.top) * H / r.height;
    action(xp, yp);
    if (s.mode === 'day' || (s.mode === 'shop' && yp >= 40 && yp < 142 && xp < 160)) {
      c.setPointerCapture(e.pointerId);
      clearInterval(c.repeatTimer);
      c.repeatTimer = setInterval(() => action(xp, yp), 140);
    }
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    c.addEventListener(ev, () => clearInterval(c.repeatTimer));
  }
  window.addEventListener('keydown', key);
  window.addEventListener('blur', () => {
    clearInterval(c.repeatTimer);
    if (s.mode === 'day' && s.shift) s.shift.speed = 0;
    save();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && s.mode === 'day' && s.shift) s.shift.speed = 0;
    save();
  });

  function resize() {
    const scale = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
    c.style.width = (W * scale) + 'px';
    c.style.height = (H * scale) + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  window.__LOST_DESK__ = {
    get state() { return s; },
    setSeed(seed) { s.seed = seed >>> 0; },
    rng: rand,
    migrateSave,
    fresh,
    tick,
    begin,
    serve,
    buy,
    hire,
    merge,
    auction,
    chooseArc,
    prestige,
    render
  };

  const STEP = 1 / 60;
  let autosaveAt = 0;
  function loop(t) {
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    fps = fps * 0.9 + (1 / Math.max(0.001, dt)) * 0.1;
    acc += dt;
    while (acc >= STEP) {
      tick(STEP);
      acc -= STEP;
    }
    musicTick();
    if (s.mode === 'day' && t - autosaveAt > 5000) {
      save();
      autosaveAt = t;
    }
    render();
    requestAnimationFrame(loop);
  }
  save();
  requestAnimationFrame(loop);
})();
