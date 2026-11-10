# Interface contracts

## Junior Astronaut Mars mission (current)

`game/juniorMission.ts` owns Mars mission resources, discoveries, XP, patches and sol progression. `TASK` marks a sol activity and can restore a station resource on repeat visits. `SHIFT` requires an activity that sol and consumes supplies; `QUIZ` and `SHIFT_QUIZ` award once. Rank depends on both XP and discovery count. `isNight(sol)` selects a player-paced alternating lighting cue. The mission briefing controls Mobile versus PC presentation and owns Mars mission state. Versioned browser-local saves retain mission resources, discoveries, XP, logs and cadet ID; the hub resumes or explicitly confirms a restart. World position and unfinished dialog input are not saved. Lunar rules are unchanged.


## Current default: ten-day first-person expedition and open-world Mars rover (v4)

The centre crosshair is the sole aim point for station raycasts in both views. Space queues one jump from the ground; holding it cannot repeatedly jump in midair. `stepJump` is a pure illustrative movement helper and has no resource effects. The HUD reads resources and risk from engine state and shows them vertically at the upper left. The unboxed objective text expands for the full clue list and MICA's message; planning and clue gates remain authoritative in the survival engine. On-screen movement controls, including Jump, are hidden by default and can be enabled in Field Guide → Accessible station guide. `SurvivalGame` passes this presentation preference to `SurvivalWorld` as `showTouchControls`; it does not change mission state.

### Open-world exploration rover

A full-scale, six-wheeled heavy exploration rover (`ui/world/createBigRover.ts`, `game/roverVehicle.ts`) is stationed at the Mars outpost base (`ROVER BAY · R-01`).
- **Enter/Exit (`F` key or on-screen button)**: When on foot within 4.8m of the rover, pressing `F` places the astronaut into the driver's bucket seat inside the transparent cockpit cabin (open-world / GTA 5 style). Pressing `F` again safely dismounts the astronaut to the driver's side of the vehicle and parks the rover.
- **Driving Controls**:
  - `W` / `ArrowUp`: Accelerate forward up to illustrative top speed ~48.6 km/h (13.5 m/s).
  - `S` / `ArrowDown`: Service brake when moving forward; reverses up to ~18.7 km/h when stopped.
  - `A` / `D` (`ArrowLeft` / `ArrowRight`): Steer front wheels up to ±30° using Ackermann vehicle kinematics.
  - `Space`: Emergency handbrake with rapid stopping deceleration.
  - `V`: Switch between third-person chase camera and first-person interior cockpit view.
- **Physical Integration**:
  - Six all-terrain wheels with 3D treads and titanium alloy hubs rotate proportionally to driving speed.
  - Front wheel assemblies physically pivot on their steering yokes.
  - Dynamic terrain conformity samples front/rear and left/right Mars elevation for smooth pitch and roll over dunes and crater slopes.
  - Dual high-beam LED headlights with directional illumination; taillights intensify under braking and reverse.
  - Pure vehicle physics live in `game/roverVehicle.ts` and are verified in `tests/roverVehicle.test.mjs`. Driving has no supply penalties.

The player can switch between first- and third-person cameras with V or the view button. Pointer movement over the world rotates the camera, with an adjustable sensitivity; pointer capture remains optional. The astronaut and landing sequence are presentation only and never alter survival state. The TARUKH opening precedes a skippable, reduced-motion-aware rough landing, then the player starts day one. Day seven presents an authored crater-route decision; existing retry and resource rules continue to apply.

### Rigged astronaut & procedural Mars gait engine
- `ui/world/createRiggedAstronaut.ts` loads rigged `.glb`/`.gltf` character models using modern Three.js `GLTFLoader` with `DRACOLoader` support (`/draco/`).
  - Target model location: `/models/astronaut.glb` (with seamless automatic fallback to the procedural EVA astronaut if the downloaded asset is not yet placed in `public/models/`).
  - Normalizes geometry scale and grounds boot soles automatically at $y = 0$.
  - Sets `castShadow = true` and `receiveShadow = true` across all child meshes and ensures color space fidelity (`outputColorSpace = THREE.SRGBColorSpace`).
  - Resolves internal bone hierarchies dynamically (supports Mixamo, standard glTF Biped, Blender Rigify, and 3ds Max Biped naming schemes).
- `game/marsGait.ts` implements pure low-gravity (~0.38g) biomechanical locomotion:
  - **Bounding / Floatiness**: Extended stride period ($~1.2\text{ Hz}$ base cadence) with pronounced vertical hip bounce ($~0.085\text{m}$ amplitude) following a ballistic hang-time curve.
  - **Foot Plant**: Legs reach forward during the stride swing to absorb forward momentum before touchdown.
  - **Counter-Balance**: Arms swing in opposition to legs with natural EVA space-suit lateral abduction ($~12^\circ - 14^\circ$ roll).
  - **Grounding**: Ankle dorsiflexion during forward swing and planar alignment on plant prevents clipping through terrain or appearing weightless.
  - **Airborne & Idle**: Smooth exponential blending into low-gravity floating poses during jumps, and subtle chest breathing with micro-sway while stationary.
  - Pure gait calculations are verified in `tests/riggedAstronaut.test.mjs`.

`createSurvival()` and `survivalReducer` in `game/survivalEngine.ts` own state. `currentDay`, `offeredPlans`, `readyToPlan`, and `changeReserves` are pure helpers. State tracks phase (`arrival`, `explore`, `result`, `failed`, `ending`), zero-based day, food/water/power/oxygen reserves, daily checkpoint, current radiation-risk index, discovered station IDs, attempts, current result, follow-up response, science and a stable choice seed.

| Action | Contract |
| --- | --- |
| `BEGIN {seed?}` | Arrival → exploration. |
| `INSPECT {id}` | During exploration, accept known station IDs and record a clue once. |
| `CHOOSE {id}` | Requires all daily clues and a currently offered ID; apply authored supply/risk changes once, record an attempt → result or failed. |
| `RESPOND {id}` | Failed only, one known quick-response ID; record it without changing supplies or advancing the day. |
| `RETRY` | Failed only; restore day checkpoint and starting risk, retain clues/history and change both wrong offers and the correct letter. |
| `END_DAY` | Result only; subtract the displayed daily use once. Zero supplies or risk ≥80 pauses for retry. Otherwise checkpoint the next day, or end the expedition after day 10. |
| `RESTART` | Fresh arrival. |

UI reads the returned state; it must not mutate reserves. Ten unique days and three plan banks per day live in `content/survival.ts`. The correct solution remains stable, its slot moves on retry, and offer IDs stay stable within an attempt. Science is awarded only when successfully ending its day; ending/repeated submissions cannot duplicate it. All thresholds and costs are educational assumptions.

The world reports station IDs and a presentation-only `View` (x/z, yaw, pointed station, distance and mouse-lock status). The browser permits physical inspection within 5.5 world units and opens planning near the task station after its clues. The explicitly labelled accessible station guide permits remote interaction when needed; the engine itself has no DOM or 3D dependency. Neither walking nor rendering spends supplies. `game/navigation.ts` integrates acceleration, braking, normalized diagonal movement, camera-relative WASD, collisions and bounds ±88. The map changes a waypoint, never player position. Movement stops on blur, modal opening, pointer-lock changes, hidden tabs and key release.

Consequence rendering is keyed by each selected plan's effect (dust, power, water, oxygen, food, rover, signal or radiation). Follow-up response changes the indicator state; it cannot solve the task. The skippable timer sequence cancels pending callbacks. Reduced motion makes the sequence and warning effects static. Mouse capture is optional; drag look, Q/R and touch controls remain. Escape releases capture or closes panels. Earlier contracts below apply only to preserved modes.

## Preserved six-chapter story contract (v3, `?mode=story`)

### Choice variation and feedback update

State now includes `choiceSeed`. `BEGIN` optionally accepts `choiceSeed`; the browser supplies a fresh unsigned seed from the initial user gesture. The engine remains deterministic for the same state/actions. Tests may use a fixed seed.

`storyChoices(state)` is the authoritative current offer. Across the six initial mission offers, the correct choice appears twice at each of A/B/C, in a seeded shuffled arrangement. Within an attempt the order is stable; hints, inspection, opening the notebook, and renders do not reshuffle. On retry, the correct choice moves to a different letter and the two distractors change. The three authored banks (initial + two retry banks) cycle, without adjacent repeats. Longer runs can revisit an earlier bank; there is no claim of infinitely generated content.

`CHOOSE` accepts only an ID currently returned by `storyChoices`. A stale wrong option from an earlier retry is rejected. The original correct solution remains available on every attempt. `storyChoiceById(chapter,id)` resolves outcome copy from all authored variants, so a failure screen is correct even though the next retry's offer differs. `storyPathChoices(state,chapter)` includes attempted variants in the notebook. Never bind success to display letters or assume B is correct.

UI sound effects are separate from rules (`ui/soundEffects.ts`): lazy audio activation follows a user gesture; one success/failure cue per committed attempt, plus optional inspect, retry, start and ending cues. Muting stops active sound and suppresses pending cues. Text/visual consequences remain authoritative when sound is muted or unavailable.

`BrandIntro` runs on opening the main story, before interaction. The top shutter moves up, bottom down, and central branding approaches the viewer over 3.5 seconds. Skip/Escape can dismiss it; reduced-motion uses a short static opening. `content/branding.ts` now specifies the supplied TARUKH mark, its embedded team name, and the separate game title. The opening reads “TARUKH presents Six Shifts.” The original PNG is preserved in `public/team/tarukh-logo.png`; CSS frames its mark and wordmark and uses a matching warm-paper shutter palette. Cached/SSR image completion is checked at mount so the reveal does not depend solely on an `onLoad` event. If the image fails, the known team name is rendered as text and the opening can still finish.

The default `/` game uses `game/storyTypes.ts` and `game/storyEngine.ts`. The v1 outpost and v2 satellite contracts below describe preserved prototypes, not the new entry point.

`createStory()` returns a fresh `StoryState`. `storyReducer(state, action)` owns all authoritative transitions and reserve calculations. `chapterFor(state)` reads authored content, `canDecide(state)` checks the discovery gate, `applyStoryChoice` performs clamped resource calculations, and `storySummary(state)` derives ending facts. These functions have no DOM, React, Three.js, network or storage dependencies.

State: `phase` (`arrival`, `explore`, `decide`, `success`, `failed`, `ending`), zero-based `chapter`, `resources`, chapter `checkpoint`, `science`, discovered evidence IDs `found`, `activeEvidence`, `attempts` (with optional `followUpChoiceId`), `completed`, `hintsUsed`, `lastChoice`, and `followUpDecision`.

| Action                   | Allowed state and effect                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `BEGIN`                  | arrival → explore                                                                               |
| `INSPECT {evidenceId}`   | explore; validates chapter evidence ID, records discovery once and opens observation            |
| `DECIDE`                 | explore with sufficient clues → decide                                                          |
| `EXPLORE`                | close observation or return from deciding; keep discoveries                                     |
| `CHOOSE {choiceId}`      | decide only; apply deltas once and record attempt → success or failed                           |
| `HINT`                   | explore/decide; remember that MICA was asked for help                                           |
| `FOLLOW_UP {followUpId}` | failed only; record quick-decision response in attempt history; never alters resources or phase |
| `RETRY`                  | failed only; restore checkpoint reserves, reset follow-up, keep clues/attempts, stay on chapter  |
| `NEXT`                   | success only; checkpoint updated reserves, clear current clues, advance; final chapter → ending |
| `RESTART`                | fresh arrival state                                                                             |

**Critical invariant:** a failed mission cannot advance. `NEXT` in `failed` is a no-op. Only a successful attempt earns science and unlocks the next chapter. Quick-decision follow-up moments stabilize understanding or explain impulsive errors, but never bypass the mandatory mission retry. Repeated choice submissions, follow-up submissions, and invalid IDs are no-ops. Retry never applies its earlier failure cost permanently or duplicates science rewards.

`content/story.ts` owns the six chapter scripts, required clue counts, evidence coordinates, choices, success flags, resource deltas and explanatory lessons. Resource points clamp 0–100. There is no hidden upkeep or timer. At first-try completion the authored route ends at 35 power / 69 water / 75 oxygen with 3 discoveries. Failed attempts rewind before recovery, so learning cannot grind reserves into an unwinnable state.

`StoryWorld` only reports evidence IDs via `onInspect`; `StoryGame` dispatches `INSPECT`. World coordinates, camera interpolation and walking are visual mechanics. The renderer never declares a mission solved. `StoryGame` renders outcomes and resource values returned by the engine. It derives only local presentation state (dialog visibility, camera control, and speech). The path notebook is rendered from attempts; unseen future chapters stay hidden. Previous retries affect radio copy and ending text.

Example: `BEGIN` → `INSPECT dusty-panel` → `DECIDE` → `CHOOSE wait-wind` produces `failed`, reserves 52/70/78, chapter 0. `NEXT` does nothing. `RETRY` restores 60/70/80 and preserves the clue/failed attempt. `DECIDE` → `CHOOSE safe-clean` produces success at 78/67/77. `NEXT` opens chapter 1 with those checkpoint reserves.

---

## Preserved outpost contract (v1)

The interface can be replaced independently. Import `game/engine.ts` and types from `game/types.ts`. Do not edit resource totals in UI code. Engine functions are synchronous, deterministic, and do not mutate their inputs. No API server, network calls, randomness, or persistence is involved.

## Public functions

| Function                       | Purpose                                                                     |
| ------------------------------ | --------------------------------------------------------------------------- |
| `createInitialState()`         | Return a fresh briefing state.                                              |
| `gameReducer(state, action)`   | Return the next authoritative state; invalid actions return the same state. |
| `getScenario(state)`           | Current scenario or `null` if none is authored.                             |
| `previewChoice(state, choice)` | Return proposed before/after/actual changes without committing anything.    |
| `canChoose(state, choice)`     | True only in choosing phase when costs are affordable.                      |
| `RESOURCE_KEYS`                | Stable order: power, water, oxygen.                                         |

`getScenario` and `gameReducer` accept an optional scenario array for isolated tests. Production uses `SCENARIOS`. Use unique scenario IDs and choice IDs within each scenario.

## State to render

```ts
type GameState = {
  phase: "briefing" | "choosing" | "consequence" | "ended";
  turn: number; // one-based; remains 1 during first-turn consequence/recap
  resources: { power: number; water: number; oxygen: number };
  science: number;
  history: TurnResult[]; // committed turns only
  ending: null | "demo-complete" | "mission-complete" | "try-again";
};
```

Read mission length, capacity, and goal from `MISSION` in `content/scenarios.ts`. Render meters using `state.resources`. Render science using `state.science`. The current content comes from `getScenario(state)`. Render the latest explanation from `state.history.at(-1).consequence`. `TurnResult` includes `before`, `after`, `actualDelta`, `scienceGained`, choice IDs/title, and consequence title/explanation/lesson.

## Action protocol

| Phase       | Action                                         | Result                                                     |
| ----------- | ---------------------------------------------- | ---------------------------------------------------------- |
| briefing    | `{ type: 'START' }`                            | choosing; resources unchanged                              |
| choosing    | `{ type: 'CHOOSE', choiceId: 'clean-panels' }` | apply chosen deltas once, append result, enter consequence |
| consequence | `{ type: 'CONTINUE' }`                         | next authored turn, or ending                              |
| any         | `{ type: 'REPLAY' }`                           | fresh briefing state; clear UI selection too               |

Selecting a card is **local UI state**. Use `previewChoice` to show all effects before the player confirms. Only confirmation submits `CHOOSE`. Disable unaffordable choices using `canChoose`. Disable confirmation until a choice is selected. Leave the explanation visible until `CONTINUE`; do not auto-advance. Repeated confirms cannot charge twice.

```tsx
const reduceGame = (state: GameState, action: GameAction) =>
  gameReducer(state, action);
const [state, dispatch] = useReducer(reduceGame, undefined, createInitialState);
const scenario = getScenario(state);
const choice = scenario?.choices.find((c) => c.id === selectedId);
const preview = choice ? previewChoice(state, choice) : null;
// Render preview.after; on explicit confirmation:
dispatch({ type: "CHOOSE", choiceId: selectedId });
```

## Rules owned by the engine

Each action includes the entire shift's resource changes (no hidden upkeep). Values clamp to 0–100; `actualDelta` reflects the cap. Costs that would go below zero are rejected. Exactly zero is allowed, shows its consequence, then produces a gentle `try-again` ending. At six completed turns, positive resources plus science ≥3 produce `mission-complete`; a missed goal produces `try-again`. If authored content ends before six, use `demo-complete`, never a full-mission win.

## Worked first-turn example

Initial resources `{power:60, water:70, oxygen:80}`, science `0`. Submit `START`, then `CHOOSE` with `clean-panels`. Result: `{power:78, water:62, oxygen:74}`, science `0`, phase `consequence`. Explain that cleaner panels collect more sunlight while a spacewalk uses supplies. `CONTINUE` ends this one-turn demo; `REPLAY` resets everything.

The 3D scene accepts only visual props (`focus`, `resolved`, `view`) and never submits gameplay actions. The HTML interface remains fully playable if WebGL fails. New interfaces must preserve readable numbers, text explanations, keyboard selection, visible focus, and an explicit demo ending.

## Downlink orbital interface contract (v2)

The "Downlink" interface implements a four-screen lunar satellite mission:

1. **Mission Briefing**: High-level objectives (budget, mass, survival, 3 returned data packages).
2. **Component-Selection Screen**: Interactive 2D satellite visualizer with four equipment bays (Power/Solar, Battery, Antenna, Payload), live budget ($100M) and mass (100 kg) constraints, plain-language trade-offs, and visibly disabled unaffordable actions.
3. **Six-Step Mission Operations Screen**: Six orbital passes driven directly by `gameReducer(state, action, DOWNLINK_SCENARIOS)` and `previewChoice`.
   - Engine `power` maps to **Battery Power** (0–100%).
   - Engine `water` maps to **Stored Data Buffer** (0–100 MB).
   - Engine `oxygen` maps to **Link Signal Health** (0–100%).
   - Engine `science` maps to **Returned Data Goal** (target: ≥3 packages).
   - Dynamic 2D satellite illustration reacts visually to telemetry modes: `charging` (sun rays), `scanning` (sensor cone), and `downlinking` (radio/laser waves).
4. **Results and Design-Comparison Screen**: Side-by-side benchmark table comparing custom orbiter performance against three reference archetypes (_The Swift Scout_, _The Deep Ice Relay_, _The Optical Speedster_), followed by a plain-language Flight Director post-flight engineering analysis.

## Mars foundation contract

The Start action requests pointer lock during the user's click. `SurvivalWorld` exposes `captureMouse` through its ref, handles lock/release and leaves yaw unbounded. If lock is unavailable, dragging accumulates yaw across repeated drags; Q/R remain available. Escape releases browser pointer lock. None of these presentation inputs change mission resources.

`ui/MarsGame.tsx` owns presentation-only inspection progress and passes the `planet="mars"` mode to the existing `SurvivalWorld`. The world reports position and the nearby station ID through `onView`, and reports an inspection through `onInspect`; it does not compute resource changes. Initial display values and Mars gravity/sprint parameters are centralized in `game/marsConfig.ts`. The lighting toggle is a manual preview, not a day/night resource cycle. The Mars campaign engine and timed sol transitions have not yet been implemented.

## Junior Astronaut Mars mission

`game/juniorMission.ts` owns Mars points, XP, discoveries, patch awards and shift actions. `ui/MarsGame.tsx` renders hands-on tasks, quiz and events and dispatches actions; `ui/SurvivalWorld.tsx` remains presentation-only. The existing lunar `survivalReducer` is unchanged. The mission is player-paced; the automatic 90-second lighting preview has no supply effects. Values and fictional controls are educational game assumptions. The callsign is kept only in the current page state.

Mars Sage starts at the home dock. `MarsGame` owns the follow setting and passes it to `SurvivalWorld`; the player can toggle it using the Sage button or B while the world is focused. In home mode Sage returns to the dock; in follow mode Sage approaches a point to the player's right. Dock and follow positions are presentation only and do not alter mission supplies. The choice lasts for the current mission session.
