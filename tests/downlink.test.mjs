import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialState,
  gameReducer,
  previewChoice,
  canChoose,
} from "../game/engine.ts";
import {
  DOWNLINK_MISSION,
  DOWNLINK_SCENARIOS,
  SATELLITE_COMPONENTS,
  DOWNLINK_BUDGET_LIMIT,
  DOWNLINK_MASS_LIMIT,
} from "../content/downlinkScenarios.ts";

test("Downlink component catalog stays within constraints", () => {
  const baseline = [
    SATELLITE_COMPONENTS.solar[0],
    SATELLITE_COMPONENTS.battery[0],
    SATELLITE_COMPONENTS.antenna[0],
    SATELLITE_COMPONENTS.payload[0],
  ];
  const totalCost = baseline.reduce((sum, c) => sum + c.costMillion, 0);
  const totalMass = baseline.reduce((sum, c) => sum + c.massKg, 0);

  assert.ok(totalCost <= DOWNLINK_BUDGET_LIMIT, `Cost ${totalCost} exceeds ${DOWNLINK_BUDGET_LIMIT}`);
  assert.ok(totalMass <= DOWNLINK_MASS_LIMIT, `Mass ${totalMass} exceeds ${DOWNLINK_MASS_LIMIT}`);
});

test("Downlink runs full 6-shift mission through gameReducer to mission-complete", () => {
  let state = createInitialState({
    resources: { ...DOWNLINK_MISSION.initialResources },
  });
  assert.equal(state.phase, "briefing");
  assert.equal(state.resources.power, 70);

  state = gameReducer(state, { type: "START" }, DOWNLINK_SCENARIOS);
  assert.equal(state.phase, "choosing");

  // Play through all 6 shifts picking a strategic path:
  // Shift 1: first-scan (+28 stored data)
  state = gameReducer(state, { type: "CHOOSE", choiceId: "first-scan" }, DOWNLINK_SCENARIOS);
  assert.equal(state.phase, "consequence");
  assert.equal(state.resources.water, 48);
  state = gameReducer(state, { type: "CONTINUE" }, DOWNLINK_SCENARIOS);
  assert.equal(state.turn, 2);

  // Shift 2: relay-outpost (+1 returned data)
  state = gameReducer(state, { type: "CHOOSE", choiceId: "relay-outpost" }, DOWNLINK_SCENARIOS);
  assert.equal(state.science, 1);
  state = gameReducer(state, { type: "CONTINUE" }, DOWNLINK_SCENARIOS);
  assert.equal(state.turn, 3);

  // Shift 3: run-heaters (thermal protection)
  state = gameReducer(state, { type: "CHOOSE", choiceId: "run-heaters" }, DOWNLINK_SCENARIOS);
  state = gameReducer(state, { type: "CONTINUE" }, DOWNLINK_SCENARIOS);
  assert.equal(state.turn, 4);

  // Shift 4: sun-recharge-and-trickle (+18 battery, +1 returned data)
  state = gameReducer(state, { type: "CHOOSE", choiceId: "sun-recharge-and-trickle" }, DOWNLINK_SCENARIOS);
  assert.equal(state.science, 2);
  state = gameReducer(state, { type: "CONTINUE" }, DOWNLINK_SCENARIOS);
  assert.equal(state.turn, 5);

  // Shift 5: deep-radar-pulse (+34 stored data)
  state = gameReducer(state, { type: "CHOOSE", choiceId: "deep-radar-pulse" }, DOWNLINK_SCENARIOS);
  state = gameReducer(state, { type: "CONTINUE" }, DOWNLINK_SCENARIOS);
  assert.equal(state.turn, 6);

  // Shift 6: grand-downlink (+2 returned data, uses 35 stored data)
  state = gameReducer(state, { type: "CHOOSE", choiceId: "grand-downlink" }, DOWNLINK_SCENARIOS);
  assert.equal(state.science, 4);
  state = gameReducer(state, { type: "CONTINUE" }, DOWNLINK_SCENARIOS);

  assert.equal(state.phase, "ended");
  assert.equal(state.ending, "mission-complete");
  assert.equal(state.history.length, 6);
  assert.ok(state.resources.power > 0);
  assert.ok(state.resources.water > 0);
  assert.ok(state.resources.oxygen > 0);
});

test("Downlink previewChoice and canChoose enforce resource boundaries", () => {
  const initial = createInitialState({
    resources: { power: 10, water: 0, oxygen: 50 },
  });
  const choosing = gameReducer(initial, { type: "START" }, DOWNLINK_SCENARIOS);

  // Choice that requires more power than available
  const expensiveChoice = DOWNLINK_SCENARIOS[0].choices[1]; // requires 14 power
  assert.equal(canChoose(choosing, expensiveChoice), false);

  // Preview gives exact delta clamping
  const preview = previewChoice(choosing, DOWNLINK_SCENARIOS[0].choices[0]);
  assert.equal(preview.actualDelta.power, 22);
});
