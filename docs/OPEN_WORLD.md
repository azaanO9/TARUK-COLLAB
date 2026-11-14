# Open-world conversion - 2026-11-14

## Playable scope

The app now opens a PC/Mobile controls selector and then free Mars exploration. The mission hub, lunar/story routes, missions, resource simulation, quizzes, progression, rewards, certificate and Sage are no longer part of the playable experience. Historical modules and saves are retained but are not loaded by the app entry point.

## Changes

- `app/page.tsx`: one lazy-loaded free-roam entry, including legacy mode URLs.
- `ui/MarsFreeRoam.tsx`, `ui/freeRoam.css`: controls setup, unobstructed world, distance to the crew rover, pause/resume, Curiosity description and WebGL retry. Ambient day/night continues without resource costs.
- `ui/SurvivalWorld.tsx`: free-roam scene flag; no Sage/dock, mission beacon, base terminal or landing pod. Both crew and Curiosity rovers retain their models and existing movement. Start near the crew rover. Curiosity chooses terrain destinations instead of removed colony destinations.
- `ui/world/createMarsColony.ts`, `createSurvivalOutpost.ts`: build only terrain for free roam, with no base meshes, station targets or building collisions.
- `ui/world/marsTerrain.ts`: omit invisible hardware support floors in free roam while keeping ground and rock contacts.
- `tests/marsTerrain.test.mjs`: regression checks for correct ground contact at former hardware locations, rover spawn and preserved natural collisions.
- `app/layout.tsx`, `static-app/index.html`: current title and description.
- `ui/RotateToLandscapeGate.tsx`: generic landscape wording.
- `README.md`, `AGENTS.md`, `docs/ARCHIVE.md`: current scope, legacy notes archived.

## Verification

130 automated tests pass. TypeScript, Sites build and GitHub Pages build pass. Browser checks: PC launch, walking, crew-rover entry and driving, autonomous Curiosity updates, absent Sage, pause keyboard focus/Escape resume, explicit Mobile joystick/buttons, landscape layout without horizontal overflow, and old lunar URL opening free-roam setup. No browser console errors were observed during these checks.

## Publication reliability

The Pages workflow names artifacts per attempt and waits for API visibility before deploying. This addresses the observed upload-visibility failure and duplicate-artifact failure on retries.

## Practical limits

The existing map bounds remain. Returning to controls setup starts a fresh player/crew-rover position; pausing preserves it. Curiosity retains its pre-existing local navigation save. No physical phone was used for this verification; test touch steering and camera drag on your devices. Historical mission code remains for reference but has no playable route.
