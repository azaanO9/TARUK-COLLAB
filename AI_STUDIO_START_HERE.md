# Junior Astronaut — current AI Studio handoff

This is the current entry point for continuing the TARUKH game in Google AI Studio. Read this file, `COLLABORATION.md`, `AGENTS.md`, and the source before making changes. The older `AI_STUDIO_HANDOFF.md`, `FULL_MARS_BRIEF.txt`, `BRIEF.md` and `CODEX.md` contain historical requests and descriptions. Current user instructions and the implementation take precedence if they conflict with historical material.

## Current project

- The default `/` opens a Junior Astronaut mission briefing with a callsign, symbolic patch and a choice of Mars or the lunar survival mission.
- Mars contains a finite explorable 3D outpost with WASD movement, Shift sprint, Space jump, V camera switch, mouse look and E inspect. Sage follows the astronaut. Day/night lighting changes automatically every 90 seconds and does not itself alter resources.
- Mars has a player-paced ten-sol prototype, six simple hands-on activities, NASA-linked quizzes, an illustrative resource/radiation-risk system, XP ranks, symbolic patches, a six-item codex, a waypoint and a printable certificate. Values are fictional training points. Progress currently exists only in page memory.
- The Mars minigames, rank and codex are not integrated into the older lunar survival campaign. Patches are symbols rather than collectible 3D models; the sol quiz currently repeats the same question. The rover is inspectable but not drivable. The game is a prototype, not a completed NASA-endorsed simulation.
- Earlier modes remain available at `?mode=survival`, `?mode=story`, `?mode=outpost`, and `?mode=downlink`. Retain them unless the user asks otherwise.

## Source map

- `app/page.tsx`: mission briefing and routing.
- `ui/MarsGame.tsx`, `ui/junior.css`: Mars HUD, activity and quiz presentation.
- `game/juniorMission.ts`: Mars resource, discovery, quiz, XP and sol rules.
- `ui/SurvivalWorld.tsx`, `ui/world/`: shared world, camera, interaction and procedural models.
- `ui/SurvivalGame.tsx`, `game/survivalEngine.ts`, `content/survival.ts`: separate lunar survival game.
- `docs/INTERFACE.md`, `docs/ASSUMPTIONS.md` and `docs/SOURCES.md`: architecture and educational assumptions.

Keep rendering separate from game calculations. Use child-friendly language, preserve keyboard accessibility, and avoid representing invented scores as scientific measurements. Do not silently remove existing features or previous modes.

## Run and verify

Node 22.18 or newer (24 recommended), pnpm 11.25.0. Install with `pnpm install --frozen-lockfile`, then run `pnpm dev`. Run `pnpm test`, `pnpm typecheck`, and `pnpm build` after changes. The last published game passed 36 tests, type checking and a production build; its MOXIE task and sol quiz were checked in a browser. Check the specific changes you make, including keyboard controls and smaller screens where relevant.

## Hosting and GitHub

GitHub `main` is the shared source starting point. Use separate branches and pull requests for work with teammates. The existing public game is deployed through a separate Sites workflow: pushing or merging to GitHub does not automatically update it. `.openai/hosting.json` intentionally contains a null project ID in GitHub to avoid accidentally targeting the original hosted Site. Keep API keys, credentials, local caches and dependencies out of GitHub. Google AI Studio may need environment-specific adjustments; retain the application and existing hosting integration while making only necessary changes.
