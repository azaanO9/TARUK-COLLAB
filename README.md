# TARUKH - Mars Open World

Explore Mars freely on foot or in the crew rover. The autonomous Curiosity rover also remains, alongside crater fields, rocks, tracks, day/night lighting and the original astronaut. There are no missions, resource requirements, ranks, rewards or certificates in the playable app. Sage and all base buildings, their collision shapes, service pads and station beacons have been removed from the free-exploration scene.

Choose **PC** or **Mobile**, then **Explore Mars**. WASD moves, Space jumps, V changes camera, F enters/exits the crew rover and E inspects Curiosity. Drag to look if mouse capture is unavailable. Mobile enables the existing joystick and rover controls. Camera & graphics retains Auto, High, Ultra and Performance. Pause lets you resume or return to controls setup. Returning to setup starts a fresh player/crew-rover session when you re-enter. Curiosity retains its existing local terrain-navigation save. There is no mission save or callsign flow; old mission saves are ignored and are not deleted.

Day/night changes automatically during active exploration; it does not affect supplies or impose a deadline. The finite map is the safe default; qualifying devices unlock generated terrain as described below. Both rovers, their physics, terrain contacts, cockpit and graphics remain intact. The surface and rover assets are described in [ASSET_CREDITS.md](ASSET_CREDITS.md).

All old mode URLs open the same free-exploration setup. Legacy mission/lunar/story source and tests remain in the repository for history but are no longer playable routes. Previous documentation is in [docs/ARCHIVE.md](docs/ARCHIVE.md); it is not the current feature list.

## Run and verify

Use Node 22.18+ and pnpm 11.25.0. Run `pnpm install --frozen-lockfile`, then `pnpm dev` and open http://127.0.0.1:5173/. Run `pnpm test`, `pnpm typecheck`, `pnpm build` and `pnpm build:pages` for checks.

## Publication

The public game is https://azaano9.github.io/TARUK-COLLAB/. Pushes to `main` run tests, typecheck and build before the GitHub Pages deployment. `version.json` identifies the published source commit. `pnpm build:pages` writes `dist-pages` using the `/TARUK-COLLAB/` asset base. The separate Sites configuration remains intact.

Mouse look uses pointer capture or click-and-drag; unpressed cursor movement does not rotate the camera. Cave portals and their entry triggers are disabled. Weather remains unchanged.

The exploration area is now 352 by 352 world metres (four times the previous area), with extended rover bounds, rocks spread into the new area and the decorative canyon moved beyond the playable boundary. It remains a finite world with the same graphics; no new game modes or building mechanics were added.

A lightweight original shuttle arrival animation covers scene preparation. Terrain, models and shaders load concurrently behind it. The flight cover remains until the scene is ready, then a 14-second 3D powered landing runs over the actual terrain before exploration unlocks. Reduced-motion devices show a still illustration and shorter minimum display. Failed loading still shows the retry dialog.

## Device-adaptive terrain

Before exploration, the renderer checks local GPU/CPU/memory hints. Phones, known integrated/software graphics, low-memory/low-core devices, Performance mode and unknown GPUs keep the 352-metre finite map. Eligible desktop GPUs also need to pass a short scene rendering benchmark behind the shuttle animation. No device information is saved or transmitted. Detection is conservative, not a guarantee of frame rate on every computer.

On qualifying devices, 70-metre terrain tiles generate ahead and recycle a fixed pool of 49 meshes. The initial detailed area and both rovers remain; outer terrain uses the same regolith materials and continuous terrain function. Ground contacts match the generated triangles. Distant haze masks tile replacement and the decorative stationary canyon is disabled in this mode. Generation is split across frames; Performance graphics reduces its per-frame CPU allowance without teleporting the player or deleting ground beneath them. A HUD label identifies expanding terrain or the fixed map. There is a 32 km coordinate safety boundary in each direction; this is not literally infinite. The autonomous Curiosity rover continues exploring its original local region. Existing track-map coverage is local to the starting region; distant driving does not extend that texture. No building, weather or mission modes were added.

The original fictional expedition shuttle has swept wings, four terrain-aligned landing feet, soft thruster glow and pooled dust. It descends slowly through the last four metres, settles its suspension, then blends the camera behind the astronaut. Skip landing (or Space) settles the craft immediately. Reduced motion skips the moving cinematic. The landed shuttle remains a solid object; both rovers are unchanged. This is artistic animation, not a validated Mars landing procedure.
