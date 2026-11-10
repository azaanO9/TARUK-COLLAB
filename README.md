# TARUKH — Junior Astronaut Mission

A player-paced educational Mars outpost game for young explorers, with a separate lunar training mission and Six Shifts story. Select Mobile or PC at the mission briefing. The player chooses a callsign and patch; Mars progress and the cadet ID are saved locally in this browser so the mission can be resumed after a refresh.

On Mars, explore six stations, complete hands-on activities and NASA-linked quizzes, manage fictional resource points over ten sols, and earn discoveries, ranks and a printable certificate. Complete one station activity each sol; revisiting a station can replenish its resource. Day and night follow the sol counter. Sage stays at the shelter until invited to follow. The rover is driveable: approach it and press F (or use touch controls). WASD moves, Space jumps, E inspects and V changes view. Mobile provides on-screen movement and rover controls. Open Camera & graphics to choose Auto, High, Ultra or Performance.

The astronaut used in Mars exploration is an original animated procedural model. The historical NASA model is retained as an unused asset; see [ASSET_CREDITS.md](ASSET_CREDITS.md). Numerical supplies and risk are educational game assumptions, not real mission procedures. There are no accounts, telemetry, or pressure timers. Mars saves stay on this device and can be replaced by restarting the mission.

The Mars art now includes a detailed pressure habitat and service stations, scanned terrain materials, original hardware textures, a continuous canyon landscape, and a rebuilt astronaut and Sage bay. See [graphics verification and screenshots](docs/GRAPHICS_UPDATE.md).

The Mars surface blends Poly Haven's CC0 Sandy Gravel 02 and Dry Ground Rocks scans in irregular dusty and stony patches. Randomized sample rotation, scale and offsets blend continuously in world space instead of repeating a mirrored grid. Fractured rock scans shade stones and cliffs; their warm dust coating and darker exposed rock share the ground's palette. NASA Curiosity imagery is a visual reference; the texture scans are Earth materials adapted artistically, not measured Mars terrain. Height and roughness detail stay visual, preserving the approved collision geometry and suspension. See [asset credits and source links](ASSET_CREDITS.md).

The solar station has three long tables, each carrying two cell-grid modules on 32° braced stands with anchored feet. The reference's white base modules are not imported. Walking uses swept contacts and wall sliding; the rover uses its full oriented body footprint, collision-aware steering and safe exit checks. Terrain heights, rover suspension, dry tracks and the solar activity remain active.

Loading uses the offline-prepared NASA rover (8.0 MB instead of 22.4 MB), parallel model/texture downloads, and lossless WebP terrain relief maps. Models finish loading and both rover camera views are warmed before exploration. The cockpit light stays in the scene with its intensity switched, avoiding a new scene-wide lighting shader variant when changing cameras. Auto/Performance skip optional postprocessing allocation; High/Ultra load those effects on demand. Auto resolution uses sustained performance samples rather than resizing buffers every few seconds. Graphics diagnostics expose startup time and the last rover-camera frame's CPU submission time/new shader-program count; these measurements depend on hardware, cache and connection and are not FPS guarantees.

The rover cockpit has an original graphite cabin, ivory console surrounds, recessed live instruments, a steering stick, throttle, seats, harnesses and cabin lighting. Its seven front openings use contours measured from the NASA MMSEV glazing, including the lower windows and central divider. The seat and default look angle fit that window arrangement. Static interior fittings are batched by material and camera warmup remains enabled. This is an artistic game interior, not a reconstruction of NASA's actual cabin controls. See [cockpit fitting and validation](docs/ROVER_COCKPIT.md).

## Run and verify

Use Node 22.18+ and pnpm 11.25.0. Run `pnpm install --frozen-lockfile`, then `pnpm dev` and open http://127.0.0.1:5173/. Run `pnpm test`, `pnpm typecheck`, and `pnpm build` for checks. Historical notes are in [docs/ARCHIVE.md](docs/ARCHIVE.md).

## GitHub Pages publication

The public game can also run directly from this repository using GitHub Pages. `pnpm build:pages` builds the same mission components into `dist-pages` with the `/TARUK-COLLAB/` asset base. The Pages workflow tests, builds, and publishes updates to `main`. Repository Settings → Pages must use **GitHub Actions** as the source. `version.json` in the published build identifies the source commit. This is a separate publication from the existing ChatGPT Site; its configuration and identity remain unchanged. Browser saves belong to each site's origin and do not transfer between the two links.

