# Six Shifts — a small story on the Moon

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
