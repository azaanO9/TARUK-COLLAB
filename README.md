# TARUKH - Mars Open World

Explore Mars freely on foot or in the crew rover. The autonomous Curiosity rover also remains, alongside crater fields, rocks, tracks, day/night lighting and the original astronaut. There are no missions, resource requirements, ranks, rewards or certificates in the playable app. Sage and all base buildings, their collision shapes, service pads and station beacons have been removed from the free-exploration scene.

Choose **PC** or **Mobile**, then **Explore Mars**. WASD moves, Space jumps, V changes camera, F enters/exits the crew rover and E inspects Curiosity. Drag to look if mouse capture is unavailable. Mobile enables the existing joystick and rover controls. Camera & graphics retains Auto, High, Ultra and Performance. Pause lets you resume or return to controls setup. Returning to setup starts a fresh player/crew-rover session when you re-enter. Curiosity retains its existing local terrain-navigation save. There is no mission save or callsign flow; old mission saves are ignored and are not deleted.

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

Daylight follows a continuous two-minute noon-to-noon artistic cycle. The sun moves across the sky, and brightness changes gradually through sunset, night and sunrise with no frozen segments. Sky, sunlight, haze, stars and lights fade continuously; the cycle pauses with exploration. Both rovers remain. Curiosity patrols its original region, and tyre-track textures remain local to the starting area. Extremely distant travel is still subject to floating-point precision. Real low-end phone frame rates need device testing.

The original fictional expedition shuttle has swept wings, four terrain-aligned landing feet, soft thruster glow and pooled dust. It descends slowly through the last four metres, settles its suspension, then blends the camera behind the astronaut. Skip landing (or Space) settles the craft immediately. Reduced motion skips the moving cinematic. The landed shuttle remains a solid object; both rovers are unchanged. This is artistic animation, not a validated Mars landing procedure.

Desktop post-processing uses one FXAA edge-smoothing pass after tone mapping, sized to actual render pixels on resize and dynamic-resolution changes. Cockpit depth blur is removed, keeping distant rovers in focus. Mobile and Performance retain the direct-render path without added post-processing cost. Auto may still reduce resolution under load, so weak devices can lose fine detail.

The collapsible north-up minimap shows the player, landing site (H), crew rover (R), Curiosity (C) and nearby rocks within 80 m. Off-screen destinations stay on the map edge. It uses the existing position reports and a capped 2D overlay, not another 3D camera. On small touch screens it moves above the driving controls. Small rocks up to 55 cm high support the rover wheels in both original and generated terrain; taller boulders block it. Geometry-derived horizontal rock outlines replace oversized circular rover collisions.
