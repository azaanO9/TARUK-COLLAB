# Closer Mars regions and Perseverance — 14 November 2026

## What changed

- `game/marsRegion.ts`, `game/marsAtlas.ts`, `ui/MarsAtlas.tsx`: halve mapped travel distances (24 → 12 game metres per geographic degree). Geographic layout and the NASA MOLA data stay the same. Relief is also halved to preserve slopes and the existing approximately 10× vertical exaggeration. The map now labels the approximate 1:4,940 distance scale. Infinite procedural continuation and fixed streaming pools remain enabled on all devices.
- `game/roverVehicle.ts`: the driveable crew rover reaches 50 km/h forward; reverse remains 10 km/h. Acceleration, brakes, suspension and swept collision handling are retained. This is a gameplay speed, not a NASA rover specification.
- `game/daylightCycle.ts`: a complete noon–sunset–night–sunrise–noon cycle lasts 600 active seconds. The continuous cosine lighting curve is unchanged; pausing or the landing sequence does not consume this time. “10 minutes” is interpreted as the whole cycle, not 10 minutes for each half.
- `content/marsLandingSites.ts`, `content/marsLandmarks.ts`: add the historical Perseverance touchdown at 18.4446° N, 77.4509° E on 18 February 2021, Octavia E. Butler Landing in Jezero. It is landmark 7, about 673 game metres from the normal astronaut spawn. The coordinates are historical, not a live position.
- `ui/world/createPerseveranceRover.ts`: original procedural six-wheel rover with suspension links, camera mast, instruments, thermal deck, rear generator, sample arm and label. Wheels and a soft contact shadow conform to local terrain. Materials are batched; the model is culled beyond 140 m in Performance or 240 m in other tiers. Textures and geometry are released on teardown.
- `ui/SurvivalWorld.tsx`, `ui/world/streamedMars.ts`: integrate the fixed rover collision, nearby inspection, shader/texture warm-up and a small generated-rock clearance around its landing position. Chunk recycling retains its collision. The existing crew rover and autonomous Curiosity are preserved.
- `ui/MarsFreeRoam.tsx`: E opens a historical-site information card with its NASA reference. Existing controls and Caps Lock map behavior remain unchanged.
- `ui/ExplorationMinimap.tsx`, `ui/world/roverCockpit.ts`: show the new numbered landmark and an accurate Jezero region label nearby instead of describing the entire survey as Elysium. The cockpit retains its 8 Hz update cap.
- `README.md`, `docs/ASSUMPTIONS.md`, `docs/INTERFACE.md`, `docs/SOURCES.md`, `ASSET_CREDITS.md`: document the current scale, speed, timing, original model and scientific sources.

## Verification

All **168 tests**, `pnpm typecheck`, `pnpm build` (Sites) and `pnpm build:pages` pass. Tests cover the rescaled terrain/projection, landmark pins, the 600-second continuous cycle, speed/reverse caps, stopping and high-speed wall collision, terrain grounding, model disposal, generated texture disposal and rock clearance after chunk recycling. Updated files: `tests/marsRegion.test.mjs`, `tests/marsAtlas.test.mjs`, `tests/daylightCycle.test.mjs`, `tests/roverVehicle.test.mjs`, `tests/roverCockpit.test.mjs`, `tests/perseverance.test.mjs`.

Desktop browser checks: Perseverance renders at Jezero, E opens its correct site information, Caps Lock opens/closes the atlas and pin 7 can be selected. Performance graphics retains a terrain-conforming contact shadow. Developer-only `?debug=1&sitePreview=perseverance` starts beside it for visual verification; normal launches retain the shuttle arrival and spawn.

## Cost and limitations

The new model is at most 8 draw calls and approximately 8,600 triangles when nearby, including its label/contact shadow. It adds two small runtime-generated canvases (256×64 and 128×128), no downloaded model, no new dependency and no new render pass. Distant culling removes its draws at the normal spawn. No per-frame geometry/texture creation is introduced.

Pages client JavaScript: 561,338 → 563,951 gzip bytes, **+2,613 bytes** from the preceding publication. Including the earlier NASA map work, added JS plus map imagery is 231,838 bytes versus that work's pre-map baseline, still below the approximately 250 KB allowance.

On this desktop test browser at 1280×720, the active Jezero view measured 60 FPS / 16.7 ms. A Performance view used 49 draws, 314,034 triangles, 47 textures and render scale 1.00; an Auto view used 127 draws, 676,598 triangles and 50 textures. Views differ and these are diagnostic snapshots, not a controlled cross-device performance comparison or a phone guarantee. Paused/menu frame rates are intentionally lower.

Real-phone frame rates and a continuous ten-minute playthrough still need device testing; the full lighting period is covered by deterministic tests. Terrain remains a compressed regional MOLA approximation with procedural close detail, not survey-resolution Jezero geometry. The rover is an original stylised recreation placed at its documented touchdown, not a photogrammetric model or a simulation of its current mission.

Sources: [NASA-hosted landing-coordinate paper](https://ntrs.nasa.gov/api/citations/20230016428/downloads/Bell%20et%20al%202022sciadv.pdf), [NASA: Octavia E. Butler Landing](https://science.nasa.gov/resource/welcome-to-octavia-e-butler-landing/).
