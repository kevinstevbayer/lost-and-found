# Lost & Found & Found — Phase 6 Build

A self-contained pixel-art incremental browser game. All player-facing content and balance data are centralized in `data.js`; visual configuration is in `theme.js`; game logic is in `game.js`.

## Run locally

1. Extract the ZIP.
2. Open `index.html` in a modern browser. If your browser blocks local assets, run `python -m http.server 8000` in this folder and visit `http://localhost:8000`.
3. Progress is saved to browser `localStorage` under `lostdesk_save` (save version 3; v1/v2 migration is supported).

## Deploy

Upload the extracted folder as a static site to Netlify, Cloudflare Pages, GitHub Pages, or another static host. No build step, server runtime, or external CDN is required.

## Controls

- **Title:** Enter/Space starts; `W` intro; `H` high scores; `B` permanent upgrades; `S` settings; `D` asset/layout audit.
- **Shift:** Click an item compartment to serve the first customer; hold to repeat. Click a sleeping helper to wake them. `5/6/7/8` buys from the quick-buy bar. Space pauses, `R` resumes, `F` runs at 2x, `G` runs at 4x after its upgrade, `E` ends the shift, `Q` triggers a gamble.
- **Shop:** Click an upgrade/helper; `1/2/3/4` selects x1/x10/x100/max; arrow keys change upgrade pages; `J` hires helpers in order; `A` auctions clutter; `M` attempts restoration; `C` cycles the target item; `K` opens the skill map; `Y` respecs.
- **Settings:** `M` CRT scanlines; `P` alternate palette; `O` art palette; `K` skip intro; `U` reduced motion; `N` mute; `+/-` volume.
- **Saves:** `X` exports a save string; `I` imports a v1/v2/v3 save string.

## Assets

See `assets/README.md` for exact sprite dimensions and animation grids. The supplied customer portrait pack is integrated as `CUSTOMER_01`–`CUSTOMER_16`; missing manifest assets use generated placeholders. All 205 paths declared in `DATA.assets` were checked against the packaged files.

## Validation

- JavaScript syntax checks pass for `game.js`, `data.js`, `theme.js`, and `tools/sim.mjs`.
- `node tools/sim.mjs` verifies save migration and runs five 30-day build-archetype simulations.
- The simulation is a stress-test, not a balance certification: its deliberately aggressive serving loop reaches clutter overflow in all five archetypes. Tuning clutter growth/handover effects remains a recommended next pass.
