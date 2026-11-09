import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialState,
  gameReducer,
  previewChoice,
  canChoose,
} from "../game/engine.ts";
import { MISSION, SCENARIOS } from "../content/scenarios.ts";

test("start → action → exact resource update → explanation → demo ending → replay", () => {
  const initial = createInitialState();
  let state = gameReducer(initial, { type: "START" });
  assert.equal(state.phase, "choosing");
  state = gameReducer(state, { type: "CHOOSE", choiceId: "clean-panels" });
  assert.deepEqual(state.resources, { power: 78, water: 62, oxygen: 74 });
  assert.equal(state.phase, "consequence");
  assert.match(state.history[0].consequence.explanation, /sunlight/);
  assert.deepEqual(initial.resources, { power: 60, water: 70, oxygen: 80 });
  assert.equal(
    gameReducer(state, { type: "CHOOSE", choiceId: "clean-panels" }),
    state,
  );
  state = gameReducer(state, { type: "CONTINUE" });
  assert.equal(state.ending, "demo-complete");
  assert.equal(state.phase, "ended");
  assert.deepEqual(gameReducer(state, { type: "REPLAY" }), initial);
});

test("all choices have matching previews, outcomes, and science", () => {
  const expected = [
    [78, 62, 74, 0],
    [48, 90, 76, 0],
    [44, 64, 72, 1],
  ];
  SCENARIOS[0].choices.forEach((choice, i) => {
    const state = gameReducer(createInitialState(), { type: "START" });
    const preview = previewChoice(state, choice);
    const result = gameReducer(state, { type: "CHOOSE", choiceId: choice.id });
    assert.deepEqual(
      [...Object.values(result.resources), result.science],
      expected[i],
    );
    assert.deepEqual(preview.after, result.resources);
    assert.ok(result.history[0].consequence.lesson.length > 20);
  });
});

test("reject unknown, out-of-phase and unaffordable actions; clamp capacity", () => {
  const initial = createInitialState();
  assert.equal(
    gameReducer(initial, { type: "CHOOSE", choiceId: "scan-rocks" }),
    initial,
  );
  const state = gameReducer(initial, { type: "START" });
  assert.equal(
    gameReducer(state, { type: "CHOOSE", choiceId: "invented" }),
    state,
  );
  const poor = { ...state, resources: { power: 1, water: 1, oxygen: 1 } };
  assert.equal(canChoose(poor, SCENARIOS[0].choices[2]), false);
  assert.equal(
    gameReducer(poor, { type: "CHOOSE", choiceId: "scan-rocks" }),
    poor,
  );
  const full = { ...state, resources: { power: 99, water: 99, oxygen: 99 } };
  const result = gameReducer(full, {
    type: "CHOOSE",
    choiceId: "clean-panels",
  });
  assert.equal(result.resources.power, 100);
  assert.equal(result.history[0].actualDelta.power, 1);
});

test("future content advances through six shifts and checks the science goal", () => {
  const scenarios = Array.from({ length: MISSION.totalShifts }, (_, i) => ({
    ...SCENARIOS[0],
    id: `fixture-${i}`,
    choices: [
      {
        ...SCENARIOS[0].choices[2],
        delta: { power: 0, water: 0, oxygen: 0 },
      },
    ],
  }));
  let state = gameReducer(createInitialState(), { type: "START" }, scenarios);
  for (let i = 0; i < 6; i++) {
    assert.equal(state.turn, i + 1);
    state = gameReducer(
      state,
      { type: "CHOOSE", choiceId: "scan-rocks" },
      scenarios,
    );
    state = gameReducer(state, { type: "CONTINUE" }, scenarios);
  }
  assert.equal(state.ending, "mission-complete");
  assert.equal(
    gameReducer(
      { ...state, phase: "consequence", science: 0 },
      { type: "CONTINUE" },
      scenarios,
    ).ending,
    "try-again",
  );
  assert.equal(
    gameReducer(
      {
        ...state,
        phase: "consequence",
        resources: { power: 0, water: 20, oxygen: 20 },
      },
      { type: "CONTINUE" },
      scenarios,
    ).ending,
    "try-again",
  );
});
