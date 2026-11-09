# Codex Developer & Assistant Guide

**Latest user direction:** `/` now opens the ten-day first-person survival expedition. Read `README.md`, `BRIEF.md`, `AGENTS.md` and the v4 contract in `docs/INTERFACE.md`. Rules/content/UI are `game/survivalEngine.ts`, `content/survival.ts`, `ui/SurvivalGame.tsx`; smooth finite walking is `game/navigation.ts` and `ui/SurvivalWorld.tsx`. The earlier six-chapter story uses `?mode=story`. Downlink documentation below is historical. Keep the supplied TARUKH opening, clear educational assumptions and separate NASA references.

This document instructs OpenAI Codex, ChatGPT, and automated coding agents on how to run, test, modify, and extend the **Six Shifts** project and its **Downlink** satellite mission.

**Current entry point:** `/` opens the original six-chapter 3D story. Read `BRIEF.md`, `AGENTS.md`, and the story contract in `docs/INTERFACE.md` first. The older Downlink screens now require `?mode=downlink&screen=design` (or `operations` / `results`). The earlier lunar demo uses `?mode=outpost`. The 2D-only requirement below applies to the preserved satellite illustration, not the main 3D story. Story state transitions use `storyReducer` in `game/storyEngine.ts`.

---

## 1. Quick Commands for Codex

Run these commands directly in the repository root:

```bash
# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Run local development server (http://localhost:5173)
pnpm dev

# 3. Run all automated unit tests (Node built-in runner, no extra dependencies)
pnpm test

# 4. Check TypeScript types
pnpm typecheck

# 5. Production build for OpenAI Sites / Cloudflare
pnpm build
```

---

## 2. Direct Screen URL Previews

When testing in headless browsers or Codex web preview, you can navigate directly to any of the four Downlink screens via URL query parameters:

| Screen | URL | Description |
| :--- | :--- | :--- |
| **1. Mission Briefing** | `http://localhost:5173/` | Mission overview, 3 engineering directives, blueprint preview |
| **2. Design Studio** | `http://localhost:5173/?screen=design` | Component selection workbench, budget/mass meters, trade-off cards |
| **3. Mission Operations** | `http://localhost:5173/?screen=operations` | 6 orbital challenges, live telemetry, 2D satellite visual modes |
| **4. Results & Benchmark** | `http://localhost:5173/?screen=results` | Flight debrief, side-by-side benchmark matrix, design analysis |
| **Lunar Outpost Base** | Click topbar pill or use toggle | Original lunar base ground mission |

---

## 3. Project Architecture & Boundaries

Always preserve the architectural separation of concerns:

```
six-shifts/
├── game/
│   ├── types.ts              # Pure contracts: Resources, Choice, Scenario, GameState, GameAction
│   └── engine.ts             # Deterministic calculations: gameReducer, previewChoice, canChoose
├── content/
│   ├── scenarios.ts          # Lunar Outpost base scenarios & assumptions
│   └── downlinkScenarios.ts  # Downlink satellite components, 6 orbits & benchmark designs
├── ui/
│   ├── DownlinkControl.tsx   # 4-screen Downlink satellite interface
│   ├── SatelliteIllustration.tsx # Pure 2D SVG satellite schematic (no WebGL required)
│   ├── MissionControl.tsx    # Lunar Outpost base interface
│   └── LunarScene.tsx        # Visual-only 3D outpost (WebGL)
├── app/
│   ├── page.tsx              # Root entry with bi-directional mission switcher
│   ├── globals.css           # Styling, accessible contrast, mobile responsive & focus rings
│   └── layout.tsx            # HTML shell & font definitions
└── tests/
    ├── engine.test.mjs       # Pure engine & outpost tests
    └── downlink.test.mjs     # Downlink 6-orbit simulation & constraint tests
```

### Critical Rules for Codex:
1. **Never calculate resources in UI code**: All state transitions and resource deltas must pass through `gameReducer`, `previewChoice`, and `canChoose` from `game/engine.ts`.
2. **Pure 2D Illustration**: `SatelliteIllustration.tsx` is vector SVG without WebGL, Three.js, or GPU requirements, ensuring it renders with 100% fidelity in headless sandboxes, mobile views, and Codex web containers.
3. **No Hidden Costs**: Action deltas represent the entire shift/orbit. Clamping occurs deterministically between 0 and 100.
4. **Educational Assumptions**: Invented numerical values must be labelled as educational assumptions in `docs/ASSUMPTIONS.md`. Real NASA references must remain separate in `docs/SOURCES.md`.

---

## 4. How to Extend Downlink in Codex

### A. Adding a New Satellite Component
To add a new component (e.g. an optical sensor or thruster bay), edit `content/downlinkScenarios.ts`:
```ts
// In SATELLITE_COMPONENTS.payload:
{
  id: "payload-spectrometer",
  name: "Gamma-Ray Spectrometer",
  category: "payload",
  costMillion: 22,
  massKg: 18,
  shortDescription: "Detects hydrogen and rare elements from orbit.",
  tradeOffWhy: "Moderate cost with strong element detection.",
  tradeOffCatch: "Draws steady power continuously.",
  statLabel: "Science Output",
  statValue: "25 MB/scan",
}
```

### B. Adding or Tuning an Orbital Scenario
To modify orbital decisions or add a new event (e.g. solar storm), update `DOWNLINK_SCENARIOS` in `content/downlinkScenarios.ts`:
```ts
{
  id: "solar-storm",
  title: "Orbit 3 · Solar Particle Event",
  situation: "Radiation sensors alert of an incoming solar proton storm.",
  question: "How will you protect the spacecraft?",
  choices: [
    {
      id: "orient-shield",
      title: "Orient body to shield electronics",
      delta: { power: -10, water: 0, oxygen: 10 },
      science: 0,
      consequence: { ... },
    },
    ...
  ]
}
```

### C. Adding New Automated Tests
Add test cases to `tests/downlink.test.mjs`:
```js
test("Satellite cannot launch if budget exceeded", () => {
  const overBudget = 105;
  assert.ok(overBudget > DOWNLINK_BUDGET_LIMIT);
});
```
Then verify with:
```bash
node --test tests/*.test.mjs
```

---

## 5. Codex Environment Compatibility

- **macOS Sandbox (`CODEX_SANDBOX=seatbelt`)**: `vite.config.ts` automatically enables filesystem polling for HMR when running in a seatbelt container.
- **Managed Linux / OpenAI Sites**: `scripts/execution-profile.mjs` and `scripts/run-framework.mjs` adapt to managed Linux and cloud containers.
- **Production Archive**: The pre-built production package is kept at `outputs/six-shifts-deploy.tar.gz`.
