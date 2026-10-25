#!/usr/bin/env node
/**
 * Self-contained headless verification harness that loads the real theme.js, data.js, and game.js
 * into a headless DOM/Canvas stub and drives window.__LOST_DESK__ directly.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function createSandbox() {
  const store = new Map();
  const noop = () => {};
  const ctx2d = {
    imageSmoothingEnabled: false, fillStyle: '#000', strokeStyle: '#fff', lineWidth: 1, globalAlpha: 1,
    fillRect: noop, strokeRect: noop, drawImage: noop, save: noop, restore: noop, translate: noop,
    getImageData: (_, __, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData: noop
  };
  const canvasEl = {
    width: 320, height: 180, style: {}, classList: { add: noop, remove: noop },
    getContext: () => ctx2d, addEventListener: noop, getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 180 }),
    setPointerCapture: noop
  };
  const sandbox = {
    console, Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error,
     btoa: s => Buffer.from(s, 'binary').toString('base64'),
    atob: s => Buffer.from(s, 'base64').toString('binary'),
    escape, unescape, encodeURIComponent, decodeURIComponent,
    innerWidth: 1280, innerHeight: 720,
    performance: { now: () => 1000 },
    localStorage: { getItem: k => store.get(k) || null, setItem: (k, v) => store.set(k, v) },
    requestAnimationFrame: noop, setInterval: noop, clearInterval: noop,
    addEventListener: noop,
    document: {
      title: '', hidden: false,
      querySelector: () => canvasEl,
      createElement: () => ({ width: 32, height: 32, getContext: () => ctx2d }),
      addEventListener: noop
    },
    Image: class { set src(v) { this._src = v; } }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('theme.js', 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync('data.js', 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync('game.js', 'utf8'), sandbox);
  return sandbox;
}

const sb = createSandbox();
const api = sb.__LOST_DESK__;
const gameData = vm.runInContext('DATA', sb);

// 1. Verify v1, v2, v3 Save Migration
for (const ver of [1, 2, 3]) {
  const m = api.migrateSave({ version: ver, day: 5, money: 250, flags: { INTRO_SEEN: true } });
  assert.equal(m.version, 3);
  assert.equal(m.flags.INTRO_SEEN, true);
}
console.log('[PASS] Real game.js migrateSave() verified for v1, v2, and v3.');

// 2. Drive the real game.js engine across 5 build archetypes
const ARCHETYPES = [
  { name: 'Click', seed: 101, prio: ['UPGRADE_CLICK_1','UPGRADE_CLICK_2','UPGRADE_COMBO_1','UPGRADE_ORDER_1'], gamble: false },
  { name: 'Helper Swarm', seed: 202, prio: ['UPGRADE_HELPER_1','UPGRADE_HELPER_2','UPGRADE_AUTOPOKE_1','UPGRADE_SHIFT_1'], hire: true },
  { name: 'Clutter Hoarder', seed: 303, prio: ['UPGRADE_HOARD_1','UPGRADE_CLUTTER_1','UPGRADE_SORT_1','UPGRADE_AUCTION_1'], hoard: true },
  { name: 'Gamble / Odds', seed: 404, prio: ['UPGRADE_GAMBLE_1','UPGRADE_LUCK_1','UPGRADE_LUCK_2','UPGRADE_REROLL_1','UPGRADE_INSURANCE_1'], gamble: true },
  { name: 'Restoration/Sort', seed: 505, prio: ['UPGRADE_MERGE_1','UPGRADE_SORT_1','UPGRADE_SORT_2','UPGRADE_ORDER_2'], restore: true }
];

const rows = [];
for (const arch of ARCHETYPES) {
  const sim = createSandbox().__LOST_DESK__;
  sim.setSeed(arch.seed);
  const st = sim.state;
  for (let d = 1; d <= 30; d++) {
    st.day = d;
    sim.begin();
    for (let step = 0; step < 90; step++) {
      sim.tick(1.0);
      if (st.mode !== 'day') break;
      if (arch.hoard && st.clutter < 78) st.clutter = Math.min(88, st.clutter + 3);
      if (st.shift.customers[0]) {
        const cu = st.shift.customers[0];
        sim.serve(cu, cu.item, true, !!arch.gamble);
      }
    }
    if (st.mode === 'day') sim.tick(100);
    while (st.pendingArc) sim.chooseArc(0);
    st.mode = 'shop';
    for (const uid of arch.prio) {
      const u = gameData.upgrades.find(x => x.id === uid);
      sim.buy(u);
    }
    if (arch.hire && st.helpers.length < 6) sim.hire(st.helpers.length % 6);
    if (arch.restore) sim.merge();
  }
  rows.push({ build: arch.name, scoreD30: Math.round(st.score), overflows: st.stats.overflow, gambles: st.stats.gambles });
}
console.table(rows);
