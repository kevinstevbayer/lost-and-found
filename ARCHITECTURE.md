# Architecture Notes

## Runtime

The game is a static browser application. `index.html` loads `theme.js`, `data.js`, and `game.js` in that order. The canvas uses a 320×180 internal resolution and nearest-neighbor scaling.

## Source of truth

- `data.js`: balance values, schedule, entities, names, dialogue arcs, upgrades, skills, endings, achievements, and the asset manifest.
- `theme.js`: canvas resolution, palette, CRT options, font, and border style.
- `game.js`: state, simulation, input, drawing, audio, saves, upgrades, events, and progression.
- `assets/`: sprites, backgrounds, icons, and generated fallback strips.

## Persistence

State is serialized to `localStorage` at key `lostdesk_save`. Save migration upgrades v1/v2 payloads to v3. Export/import uses a base64-encoded JSON save string.

## Rendering and asset fallback

The renderer draws at native canvas resolution and scales by integer multiples. Assets are loaded by IDs in `DATA.assets`; missing or failed images render labeled placeholder blocks. Helpers use six-by-six 32×32 animation grids. Customer portraits are static 160×160 images.

## Test harness

`tools/sim.mjs` creates a lightweight DOM/canvas stub, loads the real runtime files, verifies save migration, and exercises five upgrade/build archetypes over 30 simulated days. It is a deterministic smoke/stress test, not a substitute for cross-browser manual QA or full balance testing.
