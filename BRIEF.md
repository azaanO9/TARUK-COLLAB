# Six Shifts — an interactive story on the Moon

## Current experience: ten-day first-person survival

Latest direction: a visible astronaut walks in a finite open lunar area. V switches between third- and first-person views; mouse movement controls the camera and sensitivity is adjustable. After TARUKH branding, show a gentle crash landing before day one. Day seven asks the player to reason about a steep, loose crater shortcut versus a longer marked route.

The user's latest direction makes WASD exploration primary. `/` opens a finite 176×176-unit lunar outpost viewed through Scout's eyes. Aim at an object to see its name (including oxygen cylinders), walk close, and press E to investigate. The map sets waypoints. Drag look, optional mouse capture, Q/R turning and touch controls support navigation. The earlier six-chapter experience below remains at `?mode=story`.

Ten player-paced days cover solar dust, water recovery, food inventory, an Earth eclipse at the Moon, oxygen sealing, a flare/particle forecast, rover resupply, charging reserves, a solar particle event and the final relay log. Manage power, water, food and oxygen; a separate fictional radiation-risk index is lower when protected. Daily use is displayed and charged once when ending a resolved day. Walking itself has no cost or timer. Retain MICA, the TARUKH opening, sound/mute, authored consequences, quick decisions, required checkpoint retry, varying A/B/C offers, an attempt notebook, ending and replay.

Teach the distinction between a shadow interrupting solar generation and space-weather radiation hazards. Flares, CMEs and energetic particle events are related but different. The sequence, numerical risk index, supplies, map scale and procedures are educational assumptions. Sources remain separate. No live weather feed or real survival/dose model is claimed.

## Earlier six-chapter story

**Audience:** ages 7–12. **Team:** three beginner builders, two-day prototype.
**Premise:** Scout arrives at a quiet lunar base. With MICA, a small rover companion, turn it into a home over six connected missions.

## Experience

Explore a procedural 3D base. Inspect objects, collect clues, and choose an action. Scout walks to investigated objects; drag to look around, or focus the scene and use WASD/arrows. MICA offers dialogue and optional hints. Text can be read aloud through the browser's available speech service.

The six chapters cover solar power, water recovery, airlock sealing, rover diagnosis, trustworthy science samples, and a communications relay. The learning curve moves from one clue to combining two clues. No timer or reaction test.

**User-selected failure rule:** a wrong plan fails the current task. Explain the consequence, then require a retry before the child can continue. Retry restores that task's supplies, keeping clues and the record of the attempt. A later radio line and the ending acknowledge recovery. No character death, shaming, or permanent penalty for learning.

An explorable story-path notebook shows attempted branches, successful routes, and unopened chapters. Complete all six tasks, gather three science discoveries, see the ending, and replay.

## Design direction

An original cinematic miniature world: quiet lunar landscape, warm amber interface, a small rover with personality, readable observations, and decisions attached to places. Inspired by the idea of branching cinematic adventures, including Detroit: Become Human; no copied characters, dialogue, assets or scenes. This is a compact prototype, not a commercial-scale character animation system.

## Team ownership

1. Rules builder: `game/storyEngine.ts`, contracts and meaningful tests.
2. Interface/world builder: `ui/StoryGame.tsx`, `ui/StoryWorld.tsx`, procedural models and CSS.
3. Story/science builder: `content/story.ts`, child-friendly copy, assumptions and sources.

All unverified numbers and fictional procedures are educational assumptions. Keep them separate from source references. The prior one-turn outpost and Downlink prototypes are preserved as earlier experiments; `/` presents this six-chapter story.

## Next review

Playtest reading, clue clarity, navigation and emotional tone with children and an educator. Add more scene-specific physical interactions and richer character animation after the core story is validated. Keep failure/retry behavior and the independent interface contract stable.
