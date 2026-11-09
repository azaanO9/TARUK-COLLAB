# Historical handoff — superseded

This document records an earlier prototype. For the current game and next steps, read `AI_STUDIO_START_HERE.md` first. The instructions below to wait and the descriptions of incomplete Mars features are historical; follow the current user request and current source.

---
# TARUKH / Six Shifts — AI Studio handoff

Read this file and `FULL_MARS_BRIEF.txt`, then inspect the existing source. The developer will send the next task separately. This ZIP contains the real project source, assets and tests.

## Project direction

TARUKH is the team; Six Shifts is the existing project title. The latest direction is **Outpost Commander: 10 Sols on Mars**, a browser-playable 3D educational survival game. The original audience was ages 7–12; the latest Mars brief says 8–14. Make it imaginative, welcoming and interactive. Open-world exploration and cinematic decisions are inspiration only: do not copy commercial characters, maps, assets or dialogue. The developer wants far better graphics and character animation, a compact HUD, child-friendly language and choices with understandable consequences.

## What exists today

The default `/` is an **early Mars foundation**, not a finished campaign. Preserve the TARUKH split-shutter logo opening and landing animation. The opening shows the actual team image; it reveals the landing directly. The current landing uses animated 2D artwork, not a completed real-time 3D cinematic.

The playable environment uses Three.js with a finite Mars outpost, generated horizon art, visual drifting dust, equipment, a NASA astronaut model with a clearer helmet, and a small 3D Sage robot with a visible face. Robots delivered the habitat and equipment before the astronaut arrived. The player can move, inspect equipment and receive short scripted Sage explanations. The user considers the current graphics insufficient: the outpost and rover are placeholders, and the NASA astronaut is unrigged and has a static outstretched pose.

The initial values Power 6, Air 6, Shield 3, Science 0 and Hearts 3 are currently **static invented teaching points**. The day/night control previews lighting only. The full Mars resource engine, real-time 3D Earth-to-Mars cinematic, drivable rover, timed ten-sol campaign, Mars ending and achievements have not been implemented. Never present these as complete.

## Controls and interface

WASD walks, Shift sprints, Space jumps, E inspects, V switches first/third person, and the mouse looks around. Horizontal rotation is unbounded, including beyond 180°. Starting a mission requests mouse capture; Esc releases it. Click the game or capture button to request it again. If the browser blocks capture, hold and drag repeatedly, or use Q/R. The sensitivity slider changes turn speed. The center crosshair is the aiming point. The user prefers a compact, vertical upper-left resource display and no default on-screen arrow buttons. Preserve keyboard access and reduced-motion support.

## Previous versions and choices

`?mode=survival` preserves the ten-day lunar game; `?mode=story` the six-chapter story; `?mode=outpost` the original first-turn prototype; `?mode=downlink` the satellite experiment. Preserve all modes. The lunar story includes decisions, resource effects, animated consequences, sounds, mute, a notebook, ending and replay. Wrong choices fail the current task and require a retry; retry restores the task checkpoint while retaining clues and attempt history. Correct solutions vary across A/B/C; retry moves the correct option and replaces both wrong options while keeping the same solution. Some failures have optional impulsive follow-ups that do not bypass retry. Keep these behaviors. For future Mars question missions retain the encouraging consequence/retry preference unless the developer changes it; the Mars brief also requests Mission Control assistance for depleted resources.

## Intended Mars game

Read `FULL_MARS_BRIEF.txt` for the detailed staged plan, all ten sol events, every specified choice and exact resource effects, short mode, science library, achievements, rover mechanics, 5-minute daylight, visuals, asset requirements, and the real-time Earth-to-Mars cinematic. The original brief inconsistently calls the companion Nova and Sage; use **Sage** for continuity unless the developer says otherwise. It asks for a playable foundation first, then rover/physics, resources/day-night, campaign, advanced systems, and polish.

The intended game is single player. It should include a physically explorable outpost, a rover entered/exited with F, driving with acceleration, braking, steering, collision, traction and battery use, samples, equipment repair, oxygen and communications tasks, storms and a friendly companion. Mars gravity of approximately 3.71 m/s² should affect real jumping. Other speed, forces and resource numbers are game assumptions. The developer wants an eventually skippable, actual real-time 3D Earth-to-Mars journey before Sol 1, with launch, cruise, entry and landing near the already-deployed base. Keep the existing intro and landing until the developer approves an equivalent replacement.

Campaign starting points are Power 6, Air 6, Shield 3, Science 0, Hearts 3. Power/Air/Shield cap at 10, Hearts at 3. The brief specifies normal daylight Power +3; dust-storm daylight +1 on sols 5–6; normal night Power -2 and Air -1, or low-power Power -1 and Air -1. The four daytime plans are Science +2/Power -3, Air +2/Power -2, Shield +2/Power -2, or Power +3. These values are invented game-balance assumptions, not NASA data. Read the brief for ordering, special events, radiation thresholds, actual sol-specific choices and safety/failure logic before implementation. Clarify genuine contradictions before claiming exact compliance.

## Architecture

React 19, TypeScript, Three.js directly, Vinext/Vite, and Cloudflare-compatible tooling. Do not rewrite the project unnecessarily or add accounts, multiplayer or a backend without a requirement. `app/page.tsx` selects modes; `ui/MarsGame.tsx` contains Mars presentation and inspection state; `ui/SurvivalWorld.tsx` contains the shared camera, 3D input and mouse capture; `ui/world/createSurvivalOutpost.ts` builds the scene; `ui/world/createSageCompanion.ts` builds Sage; `ui/BrandIntro.tsx` and `ui/LunarLanding.tsx` implement the preserved animations; `game/navigation.ts` handles movement/jump; and `game/marsConfig.ts` stores Mars constants. `content/survival.ts` currently supplies shared, lunar-authored station metadata. See `docs/INTERFACE.md`.

Keep content, game calculations and rendering separate. The world reports position, aim and interaction IDs; a game engine/reducer should resolve actions, consequences and resource updates. Do not change resources during rendering or merely while walking. Put fictional values in labeled configuration and scientific references separately in `docs/SOURCES.md`. Add a dedicated Mars content and rules layer when implementing the campaign.

## Accuracy and asset rights

Separate verified sources from assumptions. Do not invent DONKI event details, label archived observations as live, conflate solar flares with particle events or imply NASA endorses the game. Mark unverifiable claims `[VERIFY SOURCE]`. `ASSET_CREDITS.md` records the NASA astronaut by DigitalSpace Corporation, generated Mars artwork and procedural assets. Follow NASA media guidelines and document source/licence for any new models. Do not hotlink unverified models. Preserve `public/team/tarukh-logo.png`.

## Setup and verification

This archive excludes installed dependencies, build outputs, Git history and local runtime/cache. Node 22.18+ (24 recommended), pnpm 11.25.0. Install `pnpm install --frozen-lockfile`, then run `pnpm dev` and open the printed address. Run `pnpm test`, `pnpm typecheck` and `pnpm build`, and test actual interactions in a browser. At handoff: the build and typecheck passed, 28 automated tests passed, and the in-app preview demonstrated drag turning beyond 180°; pointer lock itself was unavailable in that preview. AI Studio may require adapting the Cloudflare/Vinext setup: inspect it first and preserve the app while making only necessary integration changes.

The archive's `.openai/hosting.json` has the original project ID removed to avoid targeting the original hosted site. The current public original is https://six-shifts-lunar-training-azaan.kashmkari.chatgpt.site/ .

The team consists of beginner builders. Work from the existing source, communicate plainly, keep the user informed, and report what changed, how to preview, tests and limitations. First inspect and understand the package, then wait for the developer's next instruction.
