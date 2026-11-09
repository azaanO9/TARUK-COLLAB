# Verification record

## Latest update — centered aim, jump and visual refinement

The crosshair is fixed at the viewport center and the station raycast uses the same center in both camera views. Space starts one illustrative jump, with a touch Jump button. The objective is a single compact strip with expandable Details. The lunar surface now uses a generated regolith texture and distant terrain, and the astronaut has additional suit detail; graphics remain a stylized procedural prototype.

Checked: TypeScript and **27 automated tests** pass, including jump ascent, landing and prevention of mid-air repeated jumps. In the desktop browser, Space moved the displayed jump height to 0.82 while x/z remained unchanged; the crosshair measured (640,360) in a 1280×720 viewport and (195,422) in a 390×844 viewport, with no horizontal overflow. Details expanded to reveal MICA and the clues and collapsed again. The third-person camera was offset so the astronaut does not cover the crosshair. The browser console showed no errors in the tested session. First-person/third-person switching and ten-day survival behavior remain as documented below. Texture and lighting are illustrative; wider hardware, screen-reader and child playtesting remain future work.

---

## Latest update — ten-day first-person survival expedition

Checked 8 November 2026. `/` now opens the new expedition; `?mode=story` preserves the earlier six-chapter game.

- **25 tests pass:** 18 preserved tests plus seven survival/navigation suites. New coverage includes all ten days, all 60 wrong plans across three banks, checkpoint recovery, stable/moving A/B/C offers, stale IDs, valid/invalid follow-up actions, no duplicate cost or science, daily consumption, depletion/risk stops, ending/replay, frame-independent WASD, diagonal normalization, rotation, collisions and ±88 world bounds.
- **Browser physical route:** actual held A/W keys changed position from the spawn (0,12) to approximately (−10.45,−9.55). Pointing displayed “Oxygen cylinder”; E opened its observation within 4 m. Walking to the solar array, inspecting with E, failing, following up, retrying and succeeding advanced to day 2. The correct plan moved from B to C and both wrong plans changed. Reserves restored to 70/75/80/80 on retry; ending the recovered day produced power/water/food/oxygen 83/69/75/75.
- **Complete browser route:** used the explicitly labelled accessible station guide for days 2–10 to check the remaining content and progression. Completed with power/water/food/oxygen **27/47/63/57**, three discoveries and one failed attempt. The log recorded all ten successful days, the failed plan and its follow-up. This does not claim a physical walk to every station.
- **Space-weather distinction:** day 4 showed an Earth eclipse, reduced scene sunlight and risk 8; day 6 showed the flare/particle forecast at risk 65; day 9 showed a solar particle event at risk 75. These are scripted educational values, not measurements. No visible radiation rays are portrayed.
- **Mouse capture:** unavailable in the tested embedded browser. The game displayed its drag-look fallback and WASD continued to work. Native pointer lock in an independent browser remains unverified.
- Source assumptions and conceptual references are separated in `ASSUMPTIONS.md`, `SOURCES.md` and the in-game field guide. Earlier records below refer to the preserved prototypes.

Screenshots are local ignored artifacts: `outputs/survival-first-person.png`, `survival-mobile.png`, `survival-eclipse.png`, `survival-flare-alert.png`, `survival-particle-alert.png`, `survival-ending.png`.

Final checks: replay restored day 1, science 0 and the initial supplies, with the TARUKH opening. At 390×844 the page width was exactly 390px; held touch-forward input moved z from 12 to about 8.2. After choosing a map waypoint, x/z remained unchanged. Desktop equipment labels and E inspection were checked with physical controls. The pointer follows the free cursor in drag mode and uses the central aim point with capture. The production build and TypeScript pass with the existing non-blocking Vinext/chunk notices. No save/load, actual radiation dosimetry, live forecasts or full physics are implemented. Child/educator playtesting, independent-browser mouse capture and a broader hardware/accessibility matrix remain future verification.

---

## Latest update — animated consequences & quick-decision moments

Checked 8 November 2026. Added in-world animated consequences, causal sequence HUD, and interactive quick-decision moments for failed missions.

- **18 automated tests pass**: 14 existing tests + 4 new consequence and quick-decision tests covering 4-step consequence chains for all 36 failed choices, thoughtful vs impulsive option balancing, zero-duplicate resource changes, retry requirements, and attempt recording.
- **Type check**: `tsc --noEmit` exits 0.
- **Production build**: Passes cleanly with code 0.
- **In-world animations**:
  - Solar: dull grey dust blanket remains, power line pulse slows by 80%, interior cabin lighting dims, battery draw is visualized.
  - Water: discolored stagnant/unfiltered loop flow alert on tanks and window.
  - Airlock: door unlatched/ajar with amber/red alarm beacon pulsing at the seal.
  - Rover: wheel vibration and motor strain against wedged pebble.
  - Antenna: dish tilted downward directly into basalt ridge with absorbed signal.
- **Causal sequence HUD**: 4-step sequence bar clearly links **Chosen action → Equipment response → Outpost impact → Explanation**.
- **Skip animation**: "Skip animation" button allows immediate advancement to stage 4; `prefers-reduced-motion` immediately presents static visual state.
- **Quick-decision moments**: Authored for key failure branches across all 6 missions with heading "What should we do first?", 1 thoughtful stabilization and 2 impulsive reactions. Thoughtful options explain why reducing demand or isolating leaks buys time; impulsive options demonstrate why rushed actions exacerbate failures. Neither bypasses the required mission retry.
- **Notebook & history**: "Your path" notebook records both the initial failure and the follow-up decision label in branch history.

---

## Earlier update — supplied TARUKH opening

Checked 8 November 2026. The actual user-supplied TARUKH PNG is preserved unchanged; its SHA-256 matches the attachment. The opening reads **“TARUKH presents Six Shifts.”**

- Desktop and 390×844 phone previews display the entire mark and embedded team name, followed by “presents” and the game title. The phone page width is 390px with no horizontal overflow.
- The loaded image reports 1254×1254 natural dimensions and is served locally as `image/png` with HTTP 200. Cached reload displays the identity correctly.
- Browser styles confirm `ss-shutter-up`, `ss-shutter-down`, and `ss-brand-approach`. The opening automatically hands control to the story; replay from field notes, the Skip button, and Escape all work.
- No browser console errors were observed. Existing reduced-motion behavior remains; the OS preference was not changed for this check.
- TypeScript and all **14 existing tests pass**. Production build passes with the existing non-blocking framework/chunk notices. No cosmetic unit tests were added.

Screenshots: `outputs/tarukh-opening.png` and `outputs/tarukh-opening-mobile.png` (local ignored artifacts).

---

## Earlier update — varied retry plans, sound, and placeholder opening

Checked 8 November 2026 before the team logo arrived. These checks describe the previous Six Shifts placeholder identity; the supplied TARUKH opening above supersedes it.

- **14 tests pass** and TypeScript reports no errors. Tests cover all six correct solutions and 36 incorrect plans (original plus retry banks), 60 seeded position layouts, 8 consecutive retries per chapter, changing both distractors, moving the correct letter, stable offers while thinking, rejection of stale choices, correct outcome lookup, notebook history, checkpoint restoration, and the full ending.
- **Production build passes.** Existing non-blocking framework notices remain; no lint task was requested.
- **Browser retry check:** first solar offer had its correct solution at B. After an unsuccessful choice, the new offer used two different wrong plans and kept the correct solution at C. The next retry used another pair and moved it to A. Asking for a hint left that offer unchanged.
- **Variant consequences/history:** the cover-the-panel variant showed “A blanket under a window.” and the matching explanation; the notebook retained that exact variant alongside the original failed attempt.
- **Sounds:** success and failure cues were dispatched with the browser AudioContext in `running` state. Muting changed the state to `muted`; a later failed task stayed muted. Re-enabling sound restored feedback, and finishing the story dispatched the ending cue. These are original synthesised tones, with no external audio asset dependency. Physical output volume/device routing was not independently measured.
- **Whole story:** the browser playthrough, including three failed attempts and recovery, still reached the ending at 35/69/75 reserves and three discoveries. Later chapters visibly used A, B and C instead of a fixed B.
- **Opening:** the rendered opening used `ss-shutter-up`, `ss-shutter-down`, and `ss-brand-approach` animations and automatically returned to the existing game state. Replay via field notes works. At 390px width the opening fit without horizontal overflow; Escape skipped it and restored the story. Actual team-image sizing will be checked once that image arrives. Reduced-motion handling exists but the OS preference was not changed for this check.

Screenshots are local ignored artifacts: `outputs/changed-retry-options.png`, `outputs/opening-preview.png`, and `outputs/opening-mobile.png`.

---

## Current main game — six-chapter interactive 3D story

Checked 8 November 2026. The default `/` now opens the story with Scout and MICA. Earlier records below describe the preserved prototypes.

### Automated

- **11 tests pass:** seven preserved prototype tests plus four story suites. Story suites cover a complete six-chapter route, all 18 authored choices, required retries, checkpoint restoration, clue retention, attempt history, clue gates, invalid input, repeated confirms, hints, immutable inputs, science rewards and replay.
- **Type check:** `tsc --noEmit` exits 0.
- **Production build:** Sites build helper exits 0. Non-blocking framework notices include large renderer chunks, import optimization, plugin timings and static route classification.

### Browser observations

| Interaction | Observed result |
| --- | --- |
| Wake the outpost | 3D world, first mission, MICA dialogue and investigation targets appear |
| Inspect a target | Scout walks toward it; observation and inference panel records the clue |
| Wrong first plan: wait for wind | Task fails at reserves 52/70/78; specific consequence explains why; no continue button |
| Required retry | Stays in chapter 1, restores 60/70/80 and retains discovered clue and failed attempt |
| Recovered first mission | Correct plan produces 78/67/77, then unlocks the water chapter |
| All six chapters | Actual browser route completed solar, water, airlock, rover rescue, sample records, relay transmission |
| Final reserves | 35 power / 69 water / 75 oxygen, with 3 discoveries |
| Recovered ending | “You found your way. Together.” acknowledges the failed attempt and recovery |
| Story-path notebook | Six successful branches and one failed branch shown; other choices marked untried |
| Replay | Restores 60/70/80, science 0, and the opening story |
| Keyboard | Enter activates investigation, choice, retry and next controls; new headings receive focus |
| Phone width | At 390×844, physical pointer click selects an investigation object; page width/height match viewport, no horizontal overflow |
| Console | No errors observed in the tested story session |

Screenshots: `outputs/story-retry.png`, `story-ending.png`, `story-paths.png`, `story-mobile.png`, and `story-exploration.png` (local ignored artifacts).

### Honest limits

This is an original procedural 3D point-and-click prototype, not a commercial-scale performance-capture game. The interaction model is exploration, observing clues, choosing plans, retrying and following recorded branches. Richer physical manipulation, more character animation, and additional alternate successful routes are future work. No persistence; refresh restarts. Read-aloud depends on browser speech services and was not audited across platforms. GPU-loss fallback, sustained keyboard walking, touch dragging, reduced-motion OS settings, screen-reader behavior and a broad device matrix were not exhaustively tested. Reading level and emotional tone still require child/educator playtesting.

No earlier satellite design-to-simulation bugs are claimed fixed by the story work. The main story has its own pure engine and contracts, and preserves those earlier experiments separately.

---

## Archived first-turn prototype checks

Checked 8 November 2026 in the local in-app Chromium browser.

## Automated checks

- `pnpm test`: four rule tests pass (all three choices, exact results, preview agreement, replay, input immutability, repeated/invalid actions, affordability, resource cap, future six-turn progression, science success/missed goal, and depleted reserves).
- `pnpm typecheck`: passes.
- Production build: passes. A large-chunk warning relates to the separately loaded Three.js renderer; the build also reports non-blocking Vinext import-optimization/static-route-classification notices.
- Local HTTP preview: returns 200 at `http://127.0.0.1:5173/`.

## Browser checks

| Check | Observed result |
| --- | --- |
| Start | Briefing becomes “A dusty arrival”; confirmation disabled until selection |
| Select panels | Preview shows 78 / 62 / 74; reserves stay 60 / 70 / 80 until confirmation |
| Confirm panels | Reserves become 78 / 62 / 74; “A brighter start!” explains sunlight and supply costs |
| Recycle water | Reserves become 48 / 90 / 76; recycling explanation appears |
| Science rover | Reserves become 44 / 64 / 72; science becomes 1 / 3; discovery explanation appears |
| Recap | First-shift ending states 1 / 6 shifts and explicitly discloses unfinished content |
| Replay | Returns to briefing; resources reset to 60 / 70 / 80, science to 0 |
| Keyboard | Enter activates start/confirmation; phase changes focus the new heading |
| Field guide | Opens as a modal; assumptions and NASA references have distinct headings; Escape closes it |
| 3D | Habitat, solar panels, tanks, astronaut and rover render; rotate button changes view |
| Desktop / phone | Inspected at 1440px and 390px widths; phone has no horizontal overflow |

Screenshots are saved locally in `outputs/` (ignored by Git). Browser checks exercise the authored first turn; six-turn ending tests use clearly synthetic content fixtures.

## Limits / unfinished

- Shifts 2–6 are roadmap labels, not playable scenarios. There is no real six-turn story or balanced full-mission path yet.
- Every numerical value is an educational assumption. Scientific accuracy and suitability for ages 7–12 need educator/child playtesting.
- No saved progress, audio, localization, accounts, or telemetry.
- WebGL fallback and reduced-motion handling exist in code, but device-level GPU failure and OS reduced-motion settings were not simulated in this check.
- No broad browser/device matrix, screen-reader audit, or slow-network performance test. The 3D module is comparatively large and loads after the HTML interface.


## Downlink orbital mission verification record

Checked 8 November 2026 in Chromium and Node test runner.

### Automated checks
- `pnpm test` / `node --test tests/*.test.mjs`: 7 automated tests passing (4 original outpost rules tests + 3 Downlink orbital simulation tests).
- `pnpm typecheck` / `tsc --noEmit`: 0 errors.
- `pnpm build` / production build: passes cleanly with code 0.
- Dev server: running and responsive at `http://127.0.0.1:5173/`.

### Browser experience checks
- **Screen 1 (Briefing)**: Clear mission framing, role badge, 3 engineering directives, and responsive 2D blueprint illustration.
- **Screen 2 (Design Studio)**: Component workbench with live 2D satellite visualizer updating equipment dynamically, interactive budget ($100M) and mass (100 kg) meters, plain-language trade-off badges, and visibly disabled states for unaffordable combinations.
- **Screen 3 (Operations)**: Six-orbit mission operations screen connected to `gameReducer` engine; live telemetry for battery, stored data, link signal, and returned data; plain-language choice cards with real-time preview and visibly explained unavailable actions; consequence screens with educational insights and dynamic visual satellite modes (charging, scanning, downlinking).
- **Screen 4 (Results & Comparison)**: Mission debrief with final score, benchmark table comparing custom orbiter against three archetypes (*The Swift Scout*, *The Deep Ice Relay*, *The Optical Speedster*), and post-flight design analysis.
- **Mobile responsiveness**: Verified at 390px width with no horizontal overflow, readable contrast, and touch-friendly controls.
- **Mission navigation**: Topbar pill allows instant switching between Downlink Orbiter and Lunar Outpost Base.
