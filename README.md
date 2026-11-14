# TARUKH - Mars Open World

**Map and FPS controls:** Press **Caps Lock** after landing to open/close the map (Esc also closes it). Mobile retains the Atlas button. The atlas opens on the complete Mars Trek region you supplied; **Nearby view** centres on your position. Ground, minimap, cockpit and atlas share the shipped NASA MOLA elevation crop. This is shaded relief, not satellite photography. In **Camera & graphics → FPS meter**, choose **Off**, **FPS only**, or **Detailed** (frame time, draw calls, triangles, textures, render scale and active tier). The meter samples once per second, starts off on ordinary links and lasts for the current exploration session. No telemetry or live map downloads are added.

Explore the Elysium region freely on foot or in the crew rover. The ground now uses a local, downsampled NASA MGS/MOLA elevation crop from the user-selected Mars Trek extent. Six real landmark centres appear on the bottom-left minimap; its Atlas button opens a shaded field map with source links. Travel is compressed about 1:2,470 and relief exaggerated about 10× relative to horizontal scale. Close-up regolith and the landing area are artistic additions. The autonomous Curiosity rover also remains, alongside crater fields, rocks, tracks, day/night lighting and the original astronaut. There are no missions, resource requirements, ranks, rewards or certificates in the playable app. Sage and all base buildings, their collision shapes, service pads and station beacons have been removed from the free-exploration scene.

Choose **PC** or **Mobile**, then **Explore Mars**. The world prepares behind the arrival artwork, followed by a skippable 24-second powered landing: hatch opens, the astronaut steps out, makes a small hop and walks into the playable camera. Reduced motion skips the flight and exit movement. WASD moves, Space jumps, V changes camera, F enters/exits the crew rover and E inspects Curiosity. Drag to look if mouse capture is unavailable. Mobile enables the existing joystick and rover controls. Camera & graphics retains Auto, High, Ultra and Performance. Pause lets you resume or return to controls setup. Returning to setup starts a fresh player/crew-rover session when you re-enter. Curiosity retains its existing local terrain-navigation save. There is no mission save or callsign flow; old mission saves are ignored and are not deleted.

Day/night changes automatically during active exploration; it does not affect supplies or impose a deadline. Every device now receives continuously generated terrain, with a smaller streaming budget on lower-end hardware. Both rovers, their physics, terrain contacts, cockpit and graphics remain intact. The surface and rover assets are described in [ASSET_CREDITS.md](ASSET_CREDITS.md).

All old mode URLs open the same free-exploration setup. Legacy mission/lunar/story source and tests remain in the repository for history but are no longer playable routes. Previous documentation is in [docs/ARCHIVE.md](docs/ARCHIVE.md); it is not the current feature list.

## Run and verify

Use Node 22.18+ and pnpm 11.25.0. Run `pnpm install --frozen-lockfile`, then `pnpm dev` and open http://127.0.0.1:5173/. Run `pnpm test`, `pnpm typecheck`, `pnpm build` and `pnpm build:pages` for checks.

## Publication

The public game is https://azaano9.github.io/TARUK-COLLAB/. Pushes to `main` run tests, typecheck and build before the GitHub Pages deployment. `version.json` identifies the published source commit. `pnpm build:pages` writes `dist-pages` using the `/TARUK-COLLAB/` asset base. The separate Sites configuration remains intact.

Mouse look uses pointer capture or click-and-drag; unpressed cursor movement does not rotate the camera. Cave portals and their entry triggers are disabled. Weather remains unchanged.

A lightweight original shuttle arrival animation covers scene preparation. Terrain, models and shaders load concurrently behind it. The flight cover remains until the scene is ready, then a 14-second 3D powered landing runs over the actual terrain before exploration unlocks. Reduced-motion devices show a still illustration and shorter minimum display. Failed loading still shows the retry dialog.

## Device-adaptive terrain

All devices stream new 70-metre terrain tiles as you explore, with no fixed map boundary. Local hardware hints select a bounded pool: 25 tiles and eight instanced rocks per tile on lower-end devices, or 49 tiles and eighteen rocks on supported higher-end desktops. Rocks are deterministic, partly buried and solid. Tiles and collision shapes recycle as you travel. No device information is saved or transmitted.

Daylight follows a continuous two-minute noon-to-noon artistic cycle. The sun moves across the sky, and brightness changes gradually through sunset, night and sunrise with no frozen segments. Sky, sunlight, haze, stars and lights fade continuously; the cycle pauses with exploration. Both rovers remain. Curiosity patrols its original region. Tyre tracks now use a rolling buffer around the player and work throughout generated terrain; nearby marks persist while distant marks recycle. Extremely distant travel is still subject to floating-point precision. Real low-end phone frame rates need device testing.

The original fictional expedition shuttle has swept wings, four terrain-aligned landing feet, soft thruster glow and pooled dust. It descends slowly through the last four metres, settles its suspension, then blends the camera behind the astronaut. Skip landing (or Space) settles the craft immediately. Reduced motion skips the moving cinematic. The landed shuttle remains a solid object; both rovers are unchanged. This is artistic animation, not a validated Mars landing procedure.

Desktop post-processing uses one FXAA edge-smoothing pass after tone mapping, sized to actual render pixels on resize and dynamic-resolution changes. Cockpit depth blur is removed, keeping distant rovers in focus. Mobile and Performance retain the direct-render path without added post-processing cost. Auto may still reduce resolution under load, so weak devices can lose fine detail.

The collapsible north-up minimap sits at the bottom-left and shows the player, landing site (H), crew rover (R), Curiosity (C) and nearby rocks within 80 m. Off-screen destinations stay on the map edge. It uses the existing position reports and a capped 2D overlay, not another 3D camera. On touch screens it stays on the left, above the movement/steering controls. Driving switches it to a 30 m simulated LiDAR view using the existing rover sensor: detected objects are cyan circles and predicted path hazards are amber diamonds with an exclamation mark and a distance warning. The gentle scan sweep stops with reduced motion. Up to 48 sensor markers reuse the existing eight scans per second; no extra 3D camera or ray scans are added. Small rocks up to 55 cm high support the rover wheels in both original and generated terrain; taller boulders block it. Geometry-derived horizontal rock outlines replace oversized circular rover collisions.

Generated chunks share the starting terrain's ground colouring and rock materials, including Performance variants. Each tile adds 12 low-tier or 32 higher-tier decorative pebbles inside its existing rock instance draw. Footprints follow slopes everywhere and are suppressed while driving. Existing dust, mud drag, lighting, suspension and rock contacts already operate on world coordinates.

Tyre-track memory stays bounded: low-end/mobile/Performance startup selects a 512-square buffer (1 MiB raw RGBA); other starts use 1024-square (4 MiB). A small page mask prevents old tracks repeating at new locations. New pages clear incrementally, and stamps upload only a reused 9 KiB patch at most 20/30 times per second per rover. Switching graphics during play adjusts update budgets without reallocating textures. Tracks are temporary surface effects, not a permanent saved history.

See [docs/MARS_TREK_UPDATE.md](docs/MARS_TREK_UPDATE.md) for dataset provenance, scale, validation and limitations.
