# TARUKH collaboration guide

## Shared source and responsibilities

The GitHub `main` branch is the reviewed shared baseline. Start each task from an up-to-date `main`, work in your own branch, and open a pull request. Review and merge one pull request at a time; update your branch after the other is merged and resolve any overlapping edits before continuing.

- UI and debugging: the mission hub and HUD in `app/page.tsx`, `ui/MarsGame.tsx`, `ui/junior.css`, `ui/mars.css` and `ui/survival.css`.
- Animation and 3D: `ui/SurvivalWorld.tsx`, `ui/world/marsDetails.ts`, `ui/world/createSageCompanion.ts` and `ui/world/marsTerrain.ts`.
- Both roles may touch `ui/SurvivalWorld.tsx`; agree on ownership or coordinate before editing it at the same time. Keep gameplay state in its engine, not in rendering.

## Current state

The default Junior Astronaut briefing offers Mars and the existing lunar survival mission. Mars has a player-paced ten-sol prototype, six station activities, quizzes, illustrative resource/radiation points, ranks, a codex, a beacon and a printable certificate. The Moon uses its earlier separate survival rules. Mars patches are currently symbols, shift quizzes repeat, and resource values are educational game assumptions. The Mars rover is not drivable. The illustrated landing and earlier modes remain in the source; `?mode=survival`, `?mode=story`, `?mode=outpost`, and `?mode=downlink` open the earlier modes directly.

## Setup and checks

Use Node 22.18+ (24 recommended) and pnpm 11.25.0. Run `pnpm install --frozen-lockfile`, then `pnpm dev`. Before a pull request run `pnpm test`, `pnpm typecheck`, and `pnpm build`; check changed game interactions in a browser. Mention the tests performed and any limitations in the pull request. Do not include passwords, API keys or credentials in Git.

## Google AI Studio

In Build mode use Add files (+) > Import from GitHub and select this repository, after obtaining access. Work from the assigned branch when the interface supports it; otherwise export the change and have a maintainer put it on a separate GitHub branch. Pull the latest reviewed changes before starting another task. AI Studio chat and Codex chat do not automatically share their conversation history; record project decisions and unfinished work in the repository or the pull request.

## Publishing

The public game and this GitHub repository are separate systems. Merging a pull request here does not automatically update the live game. The maintainer must bring the reviewed changes into the Site source, validate them and deploy through the existing hosting workflow. `.openai/hosting.json` intentionally has no project ID in this shared repository; do not replace the deployed Site identity with a blank or different ID.
