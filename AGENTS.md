# Current project status - Mars Open World (2026-11-14)

The latest user request replaces the mission game with free exploration. `app/page.tsx` loads `ui/MarsFreeRoam.tsx` for every mode URL. Keep both rovers, terrain, astronaut, movement and graphics controls. Do not restore Sage, base buildings, mission progression, quizzes/rewards, certificates or lunar training. `SurvivalWorld` uses `freeRoam` to omit station geometry, collisions and interactions. Earlier source modules remain historical and unreachable; older instructions below are superseded where they conflict with this scope. See README.md for the current playable features.

# Instructions for assistants and builders

## Scope

The latest user brief introduces a Mars expedition. The default `/` now hosts the **Stage A Mars foundation**. Preserve the TARUKH opening and illustrated landing. The existing ten-day lunar game remains available at `?mode=survival`, and its other earlier modes remain unchanged. The Mars 3D cinematic, driveable rover, ten-sol resource engine and campaign are not yet implemented; do not describe them as complete.

Mars settings are in `game/marsConfig.ts`; presentation-only inspection progress is in `ui/MarsGame.tsx`. `SurvivalWorld` can render either planet, but it must not calculate resource effects. The Mars resource figures and manual day/night switch are currently displays, not a running resource simulation. See `ASSET_CREDITS.md` for imported assets and missing replacements.

Build Six Shifts for ages 7–12. The default `/` is now the **ten-day first-person survival expedition**, requested by the user after the six-chapter story. WASD walking, aiming at equipment and exploration are primary. Preserve the earlier six-chapter story at `?mode=story`, outpost at `?mode=outpost`, and Downlink at `?mode=downlink`. See `CODEX.md` for historical environment details.

## Boundaries

The latest direction adds a visible astronaut and switchable third/first-person cameras (V), mouse-look with adjustable sensitivity, and a skippable rough lunar landing after the TARUKH opening. Day seven is a crater-route investigation. Keep these as presentation and authored content; they must not bypass the survival engine or alter retry rules.

- `game/survivalTypes.ts`, `game/survivalEngine.ts`: authoritative ten-day state, supplies, risk, clue gates, retries, choice offers, daily use and ending.
- `game/navigation.ts`: pure smooth WASD integration, collision and finite map bounds. No resource arithmetic here.
- `content/survival.ts`: ten authored days, three plan banks per day, stations, educational assumptions and source links. Solar eclipses remove sunlight; they do not themselves generate a solar particle storm. Flare radiation and energetic particle events are distinct.
- `ui/SurvivalGame.tsx`, `ui/survival.css`: HUD, observation, decisions, consequence sequence, log, field guide and accessible station controls. `ui/SurvivalWorld.tsx`, `ui/world/createSurvivalOutpost.ts`: first-person camera, pointing/raycast input and procedural outpost. Never debit supplies from rendering or time spent walking.
- Mission days are player-paced training levels, not a real lunar day/night cycle. Radiation is a fictional current risk index, not a cumulative dose or medical safety threshold. Retry restores the daily checkpoint; shielding does not undo a dose already received. Do not imply that an eclipse or every flare creates a particle storm.

- `game/storyTypes.ts`, `game/storyEngine.ts`: story contracts, clue gates, resource updates, attempts, checkpoints, retry and chapter progression. No rendering, browser, network or storage.
- `content/story.ts`: six authored chapters, evidence, narrative branches, action outcomes and educational numerical assumptions.
- `content/storyRetries.ts`: authored retry distractor banks. Retain exactly one original correct solution; every retry replaces both wrong options and moves the correct letter. Use `storyChoices` from the engine; never reshuffle in the interface.
- `content/branding.ts`, `ui/BrandIntro.tsx`: supplied TARUKH branding and the skippable split-shutter opening: “TARUKH presents Six Shifts.” Preserve the supplied image in `public/team/tarukh-logo.png`; the team name is embedded in it. CSS frames the mark/wordmark without changing the source asset. `ui/soundEffects.ts` contains original synthesised feedback and a mute control.
- `ui/StoryGame.tsx`, `ui/story.css`: presentation; read state and submit typed story actions. No simulation arithmetic.
- `ui/StoryWorld.tsx`, `ui/world/createOutpost.ts`: procedural 3D, camera, walking and object input. Report evidence IDs; never decide success or change supplies.

- `game/types.ts`: shared state/action/content types.
- `game/engine.ts`: pure calculations, guards, progression, ending rules. No React, DOM, 3D, network, or storage.
- `content/scenarios.ts` & `content/downlinkScenarios.ts`: mission configurations, choices, numbers, component catalogs, and consequence copy. No interface imports.
- `ui/`: presentation and local selection state. Read state and dispatch actions; never calculate resource outcomes here. `SatelliteIllustration.tsx` is pure 2D vector SVG (no WebGL/GPU required, 100% portable). `LunarScene.tsx` is visual only.
- `app/`: page entry, mission routing/switching, metadata, and styling.
- Contract: `docs/INTERFACE.md`. Update it when changing public state or actions.

## Working rules

- Keep changes small and beginner-readable. Do not add a backend or persistence without a requirement.
- Put unverified numerical values in content and label them **educational assumptions**. Update `docs/ASSUMPTIONS.md`; keep references in `docs/SOURCES.md`.
- Do not claim the sources validate invented game values, or imply NASA endorsement.
- Keep unavailable shifts clearly marked; never silently repeat shift 1 to fill six turns.
- The story has six playable chapters. **User preference: fail the task, then retry before continuing.** Failure must block the next chapter. Retry rewinds that task's resources while retaining clues and attempts. Never silently change this to fail-forward or permanent resource grinding.
- Correct answers must not all occupy B. The engine distributes the correct solution across A/B/C using a per-story seed. The offer is stable within one attempt, including when opening hints. Choice IDs, not letters, are authoritative. Resolve failure copy and notebook history against all authored variants.
- Keep the story original. Branching decisions and a path notebook are design inspiration; do not use Detroit: Become Human assets, characters, dialogue or copied scenes. No violence, time-pressure failure or shaming children.
- Explain resource trade-offs in short, friendly language. Use text alongside color, keyboard-operable buttons, visible focus, and reduced-motion support.
- Preserve the Sites build integration in `vite.config.ts` and identity in `.openai/hosting.json`.

## Validation

Run `pnpm test`, `pnpm typecheck`, and `pnpm build` after rules/interface changes. Test the actual browser loop after interaction changes. Check narrow screens. Test negative/zero-resource and science-goal endings when adding content. No requirement for cosmetic unit tests.

Before handing off, report changed files, how to preview, checks run, and remaining limitations. Read `README.md` and `BRIEF.md` before extending scope.
