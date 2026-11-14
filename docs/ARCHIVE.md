# Superseded mission-era README (before open-world conversion, 2026-11-14)

# TARUKH — Junior Astronaut Mission

A player-paced educational Mars outpost game for young explorers, with a separate lunar training mission and Six Shifts story. Select Mobile or PC at the mission briefing. The player chooses a callsign and patch; Mars progress and the cadet ID are saved locally in this browser so the mission can be resumed after a refresh.

On Mars, explore six stations, complete hands-on activities and NASA-linked quizzes, manage fictional resource points over ten sols, and earn discoveries, ranks and a printable certificate. Follow the beacon on foot or by rover. Approach the assigned equipment and press E or tap Start mission. Use the map to mark a route. Compare two plans, keep all crew supplies above zero, and transmit the sample record on sol ten. Visit supply stations for service before committing a plan. Day and night follow the sol counter. Sage stays at the shelter until invited to follow. The rover is driveable: approach it and press F (or use touch controls). WASD moves, Space jumps, E inspects and V changes view. Mobile provides on-screen movement and rover controls. Open Camera & graphics to choose Auto, High, Ultra or Performance.

The astronaut used in Mars exploration is an original animated procedural model. The historical NASA model is retained as an unused asset; see [ASSET_CREDITS.md](ASSET_CREDITS.md). Numerical supplies and risk are educational game assumptions, not real mission procedures. There are no accounts, telemetry, or pressure timers. Mars saves stay on this device and can be replaced by restarting the mission.

The Mars environment uses scanned ground and rock surfaces with height-aware dust/gravel mixing, varied roughness, cavity shading and triplanar rock detail. Larger boulders have continuous shading without changing their shape or collisions. Colony coatings have fine surface texture and deposited dust; an outdoor sky reflection capture, aligned sun/shadows and bounded contact shading give the hardware more depth. The astronaut and NASA rover models, cockpit, animation, terrain contact heights and vehicle physics are preserved. Existing scans and static batching are reused without additional asset downloads. See [graphics verification and screenshots](docs/GRAPHICS_UPDATE.md).

The Mars surface blends Poly Haven's CC0 Sandy Gravel 02 and Dry Ground Rocks scans in irregular dusty and stony patches. Randomized sample rotation, scale and offsets blend continuously in world space instead of repeating a mirrored grid. Fractured rock scans shade stones and cliffs; their warm dust coating and darker exposed rock share the ground's palette. NASA Curiosity imagery is a visual reference; the texture scans are Earth materials adapted artistically, not measured Mars terrain. Height and roughness detail stay visual, preserving the approved collision geometry and suspension. See [asset credits and source links](ASSET_CREDITS.md).

The solar station has three long tables, each carrying two cell-grid modules on 32° braced stands with anchored feet. The reference's white base modules are not imported. Walking uses swept contacts and wall sliding; the rover uses its full oriented body footprint, collision-aware steering and safe exit checks. Terrain heights, rover suspension, dry tracks and the solar activity remain active.

Loading uses the offline-prepared NASA rover (8.0 MB instead of 22.4 MB), parallel model/texture downloads, and lossless WebP terrain relief maps. Models finish loading and both rover camera views, including post effects, are warmed before exploration. The cockpit light stays in the scene with its intensity switched, avoiding a new scene-wide lighting shader variant when changing cameras. Auto uses half-resolution contact shading capped at 768 pixels on its longest edge; it reduces resolution and drops optional effects under sustained load. High/Ultra also enable restrained bloom. Performance skips effects and shadows. Effect failure falls back to direct rendering. Graphics diagnostics expose startup time and the last rover-camera frame's CPU submission time/new shader-program count; these measurements depend on hardware, cache and connection and are not FPS guarantees.

The rover cockpit has an original graphite cabin, ivory console surrounds, recessed live instruments, a steering stick, throttle, seats, harnesses and cabin lighting. Its seven front openings use contours measured from the NASA MMSEV glazing, including the lower windows and central divider. The seat and default look angle fit that window arrangement. Static interior fittings are batched by material and camera warmup remains enabled. This is an artistic game interior, not a reconstruction of NASA's actual cabin controls. See [cockpit fitting and validation](docs/ROVER_COCKPIT.md).

## Run and verify

Use Node 22.18+ and pnpm 11.25.0. Run `pnpm install --frozen-lockfile`, then `pnpm dev` and open http://127.0.0.1:5173/. Run `pnpm test`, `pnpm typecheck`, and `pnpm build` for checks. Historical notes are in [docs/ARCHIVE.md](docs/ARCHIVE.md).

## GitHub Pages publication

The public game can also run directly from this repository using GitHub Pages. `pnpm build:pages` builds the same mission components into `dist-pages` with the `/TARUK-COLLAB/` asset base. The Pages workflow tests, builds, and publishes updates to `main`. Repository Settings → Pages must use **GitHub Actions** as the source. `version.json` in the published build identifies the source commit. This is a separate publication from the existing ChatGPT Site; its configuration and identity remain unchanged. Browser saves belong to each site's origin and do not transfer between the two links.


The rover has mounted front lamps and a roof-mounted simulated lidar. While driving, amber map returns mark detected solid obstacles; red returns and a distance warning mark objects on the predicted route. The left cockpit instrument also shows the scan. Forward speed is capped at 30 km/h, with 10 km/h reverse. See the sensor limitations and authored driving values in [assumptions](docs/ASSUMPTIONS.md).


---

# Archived project notes

These historical notes may describe older versions. See the root README for the current game.

# TARUKH — Outpost Commander

## Graphics update · 9 November 2026

The default Mars exploration now has continuous sculpted terrain with recessed craters and raised rims, 6,950 instanced rocks and pebbles, layered distant escarpments, procedural regolith colour/bump textures, a shader sky, dust, bootprints, updated lighting and an animated original astronaut. Habitat, rover and equipment have additional original detailing. The opening, existing controls and earlier lunar modes are retained.

Open **Camera & graphics** while exploring. **Auto · smoother** is now the default: it adjusts resolution to frame rate and avoids expensive post-processing. **High** adds subtle bloom; **Ultra** also adds screen-space ambient occlusion and a higher resolution cap; **Performance** reduces resolution and disables shadows and post-processing. Static hardware is combined by material to reduce drawing overhead. Sage follows on the player's right at 78% of the previous size. Movement uses small physics steps and smoother walking animation. No external graphics service or model download is needed while playing. Mouse capture can be blocked by embedded browsers: drag to look or use Q/R.

This remains a finite exploration prototype with procedural art, not an AAA production. Driving, the Mars resource simulation and the ten-sol campaign are not implemented. The day/night button previews lighting only. See `docs/GRAPHICS_UPDATE.md` for changed files and verification.

The earlier project notes below are retained as history; some describe the lunar game rather than the current default Mars scene.

---

Aim using the fixed centre crosshair and press **Space** to jump. The objective appears as high-contrast text near the top; use **Details** for MICA's message and the clue list. The compact resource readings are stacked at the upper left. Direction buttons are hidden by default; enable touch movement from Field Guide → Accessible station guide if needed.

**New controls and opening:** after the TARUKH logo, a skippable rough-landing sequence introduces Scout and MICA. The expedition starts in third person with an animated astronaut. Use WASD to walk, move the mouse over the world to look, press **V** to switch first/third person, and adjust mouse sensitivity in the on-screen control. E inspects nearby equipment. The day-seven rover decision compares a hazardous crater shortcut with a longer, gentler route.

**Current default: the ten-day first-person expedition.** Walk with WASD/arrows, drag to look (or capture the mouse), aim at equipment to see its name, and press E within 5.5 illustrative metres to investigate. Q/R turn the view; touch controls are available. Inspect the daily clues and choose a plan at its task station. The finite mission area is 176×176 illustrative metres. The map marks waypoints without teleporting.

Manage food, water, oxygen, power and a radiation **risk index** across ten distinct, player-paced days. Daily consumption is shown before ending a day and deducted once. Walking has no supply cost. Eclipses, flare alerts and solar energetic particle events have distinct lessons and effects. All numerical values, procedures, geometry and the event schedule are educational assumptions; forecasts are scripted, not live. The field guide separates NASA references from assumptions.

TARUKH branding, sound/mute, failed-plan consequences, quick decisions, required retry, varied A/B/C offers, the expedition notebook, ending and replay are retained in this new mode. See `docs/INTERFACE.md` for its contract. Rules: `game/survivalEngine.ts`; content: `content/survival.ts`; walking: `game/navigation.ts`; interface/world: `ui/SurvivalGame.tsx`, `ui/SurvivalWorld.tsx`. The earlier experience below is preserved at **`?mode=story`**.

An original 3D point-and-click story for ages 7–12. Scout and MICA investigate a lunar outpost across **six playable missions**, with clues, decisions, consequences, required retries, a story-path notebook, an ending and replay.

Correct answers vary between A/B/C. Retrying changes both wrong plans and moves the correct solution to a different letter. Original success/failure sounds have a top-bar mute control. The supplied TARUKH logo introduces **“TARUKH presents Six Shifts”**: centered branding approaches the viewer as the upper shutter rises and the lower shutter drops. The opening can be skipped or replayed from field notes.

## Run locally

Dependencies are already installed in this checkout. From this folder:

```powershell
node scripts/run-framework.mjs dev
```

Open **http://127.0.0.1:5173/**. Keep the process running while playing. A new checkout needs Node 22.18+ (24 recommended), pnpm 11.25.0, then `pnpm install --frozen-lockfile` and `pnpm dev`.

## Play

Select **Wake the outpost**. Select labelled objects in the 3D world to investigate. Read the clues, then choose **I've got a plan**. A successful plan opens the next chapter. A wrong plan fails that task and requires **Try this mission again**; supplies rewind to its checkpoint, while your clues and attempt history remain.

Drag the view, or focus the 3D area and use WASD/arrow keys to move Scout. **Your path** opens the branching notebook. MICA's hints are optional. **Read aloud** uses browser speech when supported. No timer, accounts, telemetry or persistence; refreshing restarts the story.

## File map

| Files                                            | Responsibility                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `BRIEF.md`, `AGENTS.md`, `CODEX.md`              | Direction, contributor rules, environment handoff                 |
| `game/storyTypes.ts`, `game/storyEngine.ts`      | Pure story state, calculations, clues, attempts, retry and ending |
| `content/story.ts`                               | Six mission scripts, object observations and outcomes             |
| `ui/StoryGame.tsx`, `ui/story.css`               | Cinematic interface and story notebook                            |
| `ui/StoryWorld.tsx`, `ui/world/createOutpost.ts` | 3D, camera, walking, projected object buttons, model geometry     |
| `docs/INTERFACE.md`                              | State/action contract for another interface builder               |
| `docs/ASSUMPTIONS.md`, `docs/SOURCES.md`         | Educational model choices and separate evidence                   |
| `tests/story.test.mjs`, `docs/VERIFICATION.md`   | Regression checks and observed verification                       |

React/Vinext/Vite and Three.js. Preserve Sites integration and `.openai/hosting.json`. All 3D assets are procedural; no third-party character assets are required. If WebGL fails, investigation labels still allow the story to be played.

## Checks

```powershell
node --test tests/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/run-framework.mjs build
```

With pnpm available: `pnpm test`, `pnpm typecheck`, `pnpm build`.

## Preserved earlier prototypes

- `?mode=story`: the earlier six-chapter story with Scout and MICA.
- `?mode=outpost`: the original one-turn lunar resource demo.
- `?mode=downlink`: Antigravity's satellite experiment.
- `?mode=downlink&screen=design` (also `operations` / `results`): previous screen previews.

These prototypes remain distinct from the main story. Known satellite design-to-simulation issues are not represented as fixed by this story update.

## Mars foundation (current default)

Starting the Mars mission requests mouse capture, so horizontal mouse movement can turn freely through 180° and beyond. Escape releases the mouse; use the capture button or click the world to capture it again. If the browser blocks capture, hold the mouse button and drag repeatedly to turn, or use Q/R as an alternative. The sensitivity slider adjusts the turn speed.

The Mars prototype preserves the TARUKH opening and illustrated landing, then opens an explorable outpost. WASD moves, Shift sprints, Space jumps, V switches view, mouse looks and E inspects nearby equipment. The day/night button previews lighting only. The start values are fictional teaching points; they do not yet change, and no campaign or playable rover is claimed. Access the previous lunar game at `?mode=survival`.

The requested real-time Earth-to-Mars cinematic, ten-sol resource engine, driving, event decisions, failure/retry, short mode and full mission report remain unimplemented. The imported NASA astronaut is an unrigged model; its static pose and the procedural world are temporary. See `ASSET_CREDITS.md`. Local preview: `node scripts/run-framework.mjs dev` and open the address printed by the server.

The TARUKH opening now reveals the Mars landing directly. The landing uses generated 2D artwork, while the explorable world renders a generated Mars horizon, animated dust particles and a 3D Sage companion. The NASA astronaut is unrigged; the improved helmet silhouette does not yet provide full character animation.
