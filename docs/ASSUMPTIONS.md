# Educational assumptions — unverified numerical model

## Ten-day first-person expedition (current default)

The rough landing, astronaut proportions, crater positions and suggested rover route are fictional scenario elements; there is no crash physics or real-time terrain simulation. Camera sensitivity and movement speeds are game controls, not real suit performance measurements.

All values in `content/survival.ts` are invented for teaching: initial reserves power/water/food/oxygen 70/75/80/80; capacity 100; daily use 5/5/5/4; authored action deltas; science goal 3; day-specific risk values and a retry threshold of 80. The radiation risk index represents simplified **current exposure risk**, not accumulated dose, dose rate, health or a real safe limit. Shielding does not undo received radiation. No numbers here are NASA operating limits.

The ten mission days and compressed eclipse/flare/particle-event sequence are scripted training levels, not ten real observed days, a predicted forecast or a lunar day/night cycle. A quiet day still has background radiation. The eclipse reduces solar input without itself creating a solar energetic particle event. A flare alert and a particle forecast are related but distinct. Illustrative event lighting, weather badges and equipment animations are not physical simulations.

Map size (176×176 units labelled metres), 1.7-unit eye height, 5.2-unit/s walking, 5.5-unit interaction reach, collisions, supply replenishments and checklists are fictional. Food comes from existing sealed stores/deliveries; the game does not claim instant crop growth. Oxygen replenishment includes a reserve connection, not oxygen creation by sealing. Retry is a teaching rewind. Daily consumption is charged once when ending a resolved day; walking has no cost and no deadline. The explicitly enabled accessible station guide bypasses physical proximity for accessibility.

## Main 3D story: current educational assumptions

Retry-only incorrect plans and their fictional costs are authored in `content/storyRetries.ts`. These are teaching scenarios and unverified game-point values, not mission procedures. Retry banks cycle between three authored offers while preserving the real correct solution. The choice seed affects presentation only; it never changes the underlying science or rewards for a correct plan.

All numerical values and procedures in `content/story.ts` are fictional teaching choices, not NASA-approved operating procedures. Start at power/water/oxygen 60/70/80; capacity 100 points each. Successful chapter deltas are: solar +18/−3/−3; water −8/+16/−3; airlock −6/−2/+14; rover −9/−5/−5; samples −8/−4/−4; relay −12/−3/−4. Three discoveries are earned (one for the water investigation and two for the labelled sample records). Every unsuccessful choice's costs are explicit in content and are also unverified game-balance assumptions.

Retry is a **training simulation rewind**, not real-life recovery: restore that task's checkpoint reserves, retain clues/attempt history, and require task success before advancing. Successful chapters alone persist supply changes. No hidden consumption or physical time model. Chapter clock labels are narrative cues; six shifts do not represent real lunar days or a measured daylight/night cycle.

Cleaning tools, airlock checklists, pressure replenishment, rover repairs, sample-handling procedures, the fictional site's relay visibility, and the outpost's geography are simplified story mechanisms. In particular, the airlock task's oxygen gain includes a fictional reserve replenishment after sealing; sealing a hatch alone does not generate oxygen. The approved dry-cleaning tool is fictional and is not an instruction to brush real flight hardware. The sky, Earth, terrain scale and lighting are illustrative. Science units are abstract discoveries, not physical sample counts.

The original prototype model below applies only to `?mode=outpost`. The satellite model applies only to `?mode=downlink`.

**Every number below is invented for teaching and prototype balance. None is NASA-verified.** Points are abstract supplies, not percentages, liters, kWh, gas pressure, elapsed time, or human survival limits.

| Item               | Educational assumption                           |
| ------------------ | ------------------------------------------------ |
| Starting reserves  | Power 60, water 70, oxygen 80                    |
| Resource capacity  | 100 points per resource; minimum 0               |
| Planned mission    | 6 decision turns; no physical duration per shift |
| Science objective  | 3 samples by the end of turn 6                   |
| Brush off panels   | +18 power, −8 water, −6 oxygen, +0 science       |
| Run water recycler | −12 power, +20 water, −4 oxygen, +0 science      |
| Send science rover | −16 power, −6 water, −8 oxygen, +1 science       |
| Ending rule        | All resources >0 and science ≥3 after 6 turns    |

Action deltas include the whole shift's activities. There is no extra passive consumption, power generation, or hidden cost. A gain is capped at capacity; the interface shows the actual gain. Resources reaching zero trigger a friendly safe pause after the consequence. These are game rules, not operational advice.

The water-recycling machine and dust-clearing spacewalk are simplified fictional implementations. An off-world rover study counts as a “sample” in the game even though real missions distinguish physical samples from data. The terrain, outpost layout, equipment sizes, Earth appearance, and lighting are artistic, not measured or geographically accurate.

Next review: playtest the arithmetic/reading load with ages 7–12 and ask a science educator to review trade-offs. The remaining five turns and a balanced six-turn path are not authored yet. Sources supporting underlying concepts are kept separately in `SOURCES.md`.

## Educational assumptions — Downlink orbital satellite model

Every value below is an invented educational assumption designed for ages 7–12 gameplay and systems thinking. None is a certified NASA flight limit.

| Item                 | Educational assumption                                    |
| -------------------- | --------------------------------------------------------- |
| Launch budget limit  | $100 Million maximum cost                                 |
| Rocket payload limit | 100 kg maximum launch mass                                |
| Planned mission      | 6 orbital passes around the Moon                          |
| Science objective    | ≥3 Returned Data packages delivered                       |
| Battery capacity     | 100% maximum, starts at 60%–90% depending on battery pack |
| Data buffer memory   | 100 MB maximum onboard storage capacity                   |
| Link signal health   | 100% maximum RF link stability                            |
| Solar recharge       | +18% to +30% battery per sunlit pass                      |
| Downlink bandwidth   | 15 MB to 50 MB per ground station pass                    |
| Scanner output       | 20 MB to 40 MB stored per orbital scan pass               |

Like the lunar outpost base, actions clamp between 0 and 100. If battery drops to 0%, the spacecraft enters a protective safe pause. Downlinking data requires stored data in the buffer and sufficient battery power to drive the transmitter.

## Mars prototype assumptions

Starting Power 6, Air 6, Shield 3, Science 0 and Hearts 3 are invented educational game points. Movement speed, jump impulse, terrain, equipment, and the lighting preview are gameplay simplifications. The Mars jump calculation uses the requested approximate gravity of 3.71 m/s², but does not simulate a real suit.

## Junior Astronaut Mars prototype

The default briefing collects a callsign, a symbolic patch and a choice of the existing lunar mission or the new Mars activities. The Mars rules in `game/juniorMission.ts` are fictional educational points, not a life-support or radiation model. Six repeatable activities unlock six discoveries; each first completion grants 75 XP, and a correct quiz grants 50 XP and 3 power once. Ten player-paced sol events have two choices; each shift consumes 3 water, food and oxygen. Careful choices use 4 power; quick choices use 1 power plus 4 of the event's named resource and increase the fictional risk score by 8. Points clamp to 0–100. An empty supply shows a Mission Control log entry, and the player can still complete other activities. These are game-balance assumptions, not NASA operational data.

The certificate becomes available after six discoveries or ten sol shifts. The existing lunar mission retains its original separate rules and controls; the new station activities and rank system currently apply to Mars. The current patches are graphic symbols and the guide uses a world-space 3D beacon and a directional indicator. No account or persistent save is provided.

## Junior Astronaut Mars resource model

Starting supplies of 75, consumption of 7 per sol, the event costs, station recovery of 18, and the radiation risk score are fictional gameplay points. Station work is required once per sol; repeated activities replenish their related supply. The alternating day/night setting is a player-paced visual cue, not a simulation of real elapsed time.


Mars EVA motion uses an authored 2.8 m/s launch speed with 3.71 m/s² gravity, producing an approximately one-metre hop. Gait cadence, impact compression and visible wind wisps are artistic training-game choices, not validated EVA biomechanics or measured weather.

Mars airborne movement conserves horizontal velocity until collision or landing. Camera rotation and movement keys cannot accelerate an airborne astronaut. Vertical flight is integrated in world coordinates above the changing terrain. Air drag is neglected for these short hops, and the existing conservative horizontal collision shapes remain in use.

### Rover sensor and driving assumptions
The NASA Space Exploration Vehicle concept reference describes a surface speed of about 10 km/h. As a gameplay speed cap, the game sets forward max speed to 25 km/h (`~6.94 m/s`) and reverse to 10 km/h (`~2.78 m/s`). Acceleration (1.6 m/s²), service braking (4.5 m/s²), handbraking (7.5 m/s²), and coast drag (0.85 m/s²) are gameplay assumptions, not NASA specifications or a validated traction model.

The roof sensor and cockpit/HUD lidar map are a simulated 2D collision scan, not a reproduction of NASA hardware. It scans 180 horizontal beams over 30 m at up to 8 Hz, retaining nearest returns. Non-traversable rocks and structures use the same collision boundaries as driving; the rover pad and traversable stones are excluded. Red contacts intersect the rover's predicted footprint over the next 12 m at its current steering angle and travel direction (forward when stationary); amber contacts are other detected obstacles. Distances are sampled in 0.25 m steps. Occlusion, finite angular resolution and the 2D model limit detection. Warnings do not apply automatic brakes or guarantee clearance.
