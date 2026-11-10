# TARUKH — Junior Astronaut Mission

A player-paced educational Mars outpost game for young explorers, with a separate lunar training mission and Six Shifts story. Select Mobile or PC at the mission briefing. The player chooses a callsign and patch; Mars progress and the cadet ID are saved locally in this browser so the mission can be resumed after a refresh.

On Mars, explore six stations, complete hands-on activities and NASA-linked quizzes, manage fictional resource points over ten sols, and earn discoveries, ranks and a printable certificate. Complete one station activity each sol; revisiting a station can replenish its resource. Day and night follow the sol counter. Sage stays at the shelter until invited to follow. The rover is driveable: approach it and press F (or use touch controls). WASD moves, Space jumps, E inspects and V changes view. Mobile provides on-screen movement and rover controls. Open Camera & graphics to choose Auto, High, Ultra or Performance.

The astronaut used in Mars exploration is an original animated procedural model. The historical NASA model is retained as an unused asset; see [ASSET_CREDITS.md](ASSET_CREDITS.md). Numerical supplies and risk are educational game assumptions, not real mission procedures. There are no accounts, telemetry, or pressure timers. Mars saves stay on this device and can be replaced by restarting the mission.

The Mars art now includes a detailed pressure habitat and service stations, original ground and hardware textures, a continuous canyon landscape, and a rebuilt astronaut and Sage bay. See [graphics verification and screenshots](docs/GRAPHICS_UPDATE.md).

The Mars surface uses continuous world-space dust, gravel and crust shading with irregular drifts and depressions; only equipment pads are level. The supplied Mars One texture is retained on individual stones, rather than tiled across the ground. The solar station has three long tables, each carrying two cell-grid modules on 32° braced stands with anchored feet. The reference's white base modules are not imported. See [asset credits](ASSET_CREDITS.md) for the stone texture attribution. Walking uses swept capsule contacts and wall sliding; the rover uses its full oriented body footprint, collision-aware steering and safe exit checks. Terrain heights, rover suspension, dry tracks and the solar activity remain active.

## Run and verify

Use Node 22.18+ and pnpm 11.25.0. Run `pnpm install --frozen-lockfile`, then `pnpm dev` and open http://127.0.0.1:5173/. Run `pnpm test`, `pnpm typecheck`, and `pnpm build` for checks. Historical notes are in [docs/ARCHIVE.md](docs/ARCHIVE.md).

## GitHub Pages publication

The public game can also run directly from this repository using GitHub Pages. `pnpm build:pages` builds the same mission components into `dist-pages` with the `/TARUK-COLLAB/` asset base. The Pages workflow tests, builds, and publishes updates to `main`. Repository Settings → Pages must use **GitHub Actions** as the source. `version.json` in the published build identifies the source commit. This is a separate publication from the existing ChatGPT Site; its configuration and identity remain unchanged. Browser saves belong to each site's origin and do not transfer between the two links.

