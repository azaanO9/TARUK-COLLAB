import test from "node:test";
import assert from "node:assert/strict";
import {
  createStory,
  storyReducer,
  canDecide,
  storySummary,
  applyStoryChoice,
  storyChoices,
  storyChoiceById,
  storyPathChoices,
} from "../game/storyEngine.ts";
import { STORY_CHAPTERS, STORY_CONFIG } from "../content/story.ts";

function ready(state) {
  for (const evidence of STORY_CHAPTERS[state.chapter].evidence)
    state = storyReducer(state, { type: "INSPECT", evidenceId: evidence.id });
  return storyReducer(state, { type: "DECIDE" });
}
test("six investigations create a complete safe story and three science discoveries", () => {
  let state = storyReducer(createStory(), { type: "BEGIN" });
  for (const chapter of STORY_CHAPTERS) {
    state = ready(state);
    const choice = chapter.choices.find((c) => c.succeeds);
    const before = structuredClone(state);
    state = storyReducer(state, { type: "CHOOSE", choiceId: choice.id });
    assert.equal(state.phase, "success");
    assert.deepEqual(
      state.resources,
      applyStoryChoice(before.resources, choice),
    );
    assert.equal(before.phase, "decide");
    state = storyReducer(state, { type: "NEXT" });
  }
  assert.equal(state.phase, "ending");
  assert.equal(state.completed.length, 6);
  assert.equal(state.science, STORY_CONFIG.scienceGoal);
  assert.deepEqual(state.resources, { power: 35, water: 69, oxygen: 75 });
  assert.deepEqual(storySummary(state), {
    failures: 0,
    learned: 6,
    firstTry: 6,
    scienceGoalMet: true,
    reservesSafe: true,
  });
  assert.deepEqual(storyReducer(state, { type: "RESTART" }), createStory());
});
test("failure cannot advance; retry restores the checkpoint while preserving discoveries and attempts", () => {
  let state = ready(storyReducer(createStory(), { type: "BEGIN" }));
  const checkpoint = structuredClone(state.resources);
  const clues = [...state.found];
  state = storyReducer(state, { type: "CHOOSE", choiceId: "wait-wind" });
  assert.equal(state.phase, "failed");
  assert.equal(state.chapter, 0);
  assert.equal(storyReducer(state, { type: "NEXT" }), state);
  assert.equal(
    storyReducer(state, { type: "CHOOSE", choiceId: "safe-clean" }),
    state,
  );
  assert.notDeepEqual(state.resources, checkpoint);
  state = storyReducer(state, { type: "RETRY" });
  assert.deepEqual(state.resources, checkpoint);
  assert.deepEqual(state.found, clues);
  assert.equal(state.attempts.length, 1);
  assert.equal(state.science, 0);
  state = storyReducer(state, { type: "DECIDE" });
  state = storyReducer(state, { type: "CHOOSE", choiceId: "safe-clean" });
  assert.equal(state.phase, "success");
  assert.equal(state.attempts.length, 2);
  state = storyReducer(state, { type: "NEXT" });
  assert.equal(state.chapter, 1);
  assert.deepEqual(state.checkpoint, state.resources);
  assert.deepEqual(state.found, []);
  assert.equal(storySummary(state).firstTry, 0);
});
test("all eighteen authored decisions resolve; each failed task can be recovered without grinding supplies away", () => {
  let baseline = storyReducer(createStory(), { type: "BEGIN" });
  for (const chapter of STORY_CHAPTERS) {
    for (const choice of chapter.choices) {
      let trial = ready(baseline);
      trial = storyReducer(trial, { type: "CHOOSE", choiceId: choice.id });
      assert.equal(trial.phase, choice.succeeds ? "success" : "failed");
      assert.ok(choice.lesson.length > 20);
      assert.ok(choice.consequence.length > 50);
      if (!choice.succeeds) {
        const retried = storyReducer(trial, { type: "RETRY" });
        assert.deepEqual(retried.resources, baseline.checkpoint);
        const recovered = storyReducer(
          storyReducer(retried, { type: "DECIDE" }),
          {
            type: "CHOOSE",
            choiceId: chapter.choices.find((c) => c.succeeds).id,
          },
        );
        assert.equal(recovered.phase, "success");
      }
    }
    baseline = storyReducer(
      storyReducer(ready(baseline), {
        type: "CHOOSE",
        choiceId: chapter.choices.find((c) => c.succeeds).id,
      }),
      { type: "NEXT" },
    );
  }
});
test("clue gates, repeated confirms, invalid IDs, hints and phase guards stay deterministic", () => {
  const initial = createStory();
  assert.equal(storyReducer(initial, { type: "DECIDE" }), initial);
  let state = storyReducer(initial, { type: "BEGIN" });
  assert.equal(canDecide(state), false);
  assert.equal(storyReducer(state, { type: "DECIDE" }), state);
  assert.equal(
    storyReducer(state, { type: "INSPECT", evidenceId: "not-real" }),
    state,
  );
  state = storyReducer(state, { type: "INSPECT", evidenceId: "dusty-panel" });
  state = storyReducer(state, { type: "INSPECT", evidenceId: "dusty-panel" });
  assert.equal(state.found.length, 1);
  state = storyReducer(state, { type: "HINT" });
  state = storyReducer(state, { type: "HINT" });
  assert.equal(state.hintsUsed.length, 1);
  state = storyReducer(state, { type: "DECIDE" });
  assert.equal(
    storyReducer(state, { type: "CHOOSE", choiceId: "not-real" }),
    state,
  );
  state = storyReducer(state, { type: "CHOOSE", choiceId: "safe-clean" });
  assert.equal(
    storyReducer(state, { type: "CHOOSE", choiceId: "safe-clean" }),
    state,
  );
  assert.deepEqual(initial, createStory());
});

test("correct answers cover A, B and C, and an attempt stays stable while the player thinks", () => {
  const layouts = new Set();
  for (let seed = 0; seed < 60; seed++) {
    const state = storyReducer(createStory(), {
      type: "BEGIN",
      choiceSeed: seed,
    });
    const slots = STORY_CHAPTERS.map((_, chapter) =>
      storyChoices({ ...state, chapter }).findIndex(
        (choice) => choice.succeeds,
      ),
    );
    assert.deepEqual(
      slots.reduce(
        (counts, slot) => {
          counts[slot]++;
          return counts;
        },
        [0, 0, 0],
      ),
      [2, 2, 2],
    );
    layouts.add(slots.join(""));
    const before = storyChoices(state).map((choice) => choice.id);
    const hinted = storyReducer(state, { type: "HINT" });
    assert.deepEqual(
      storyChoices(hinted).map((choice) => choice.id),
      before,
    );
    assert.deepEqual(
      storyChoices(state).map((choice) => choice.id),
      before,
    );
  }
  assert.ok(
    layouts.size >= 5,
    "Fresh story seeds should produce varied arrangements",
  );
});

test("every retry changes both distractors and the correct letter while retaining the solution", () => {
  let baseline = storyReducer(createStory(), {
    type: "BEGIN",
    choiceSeed: 417,
  });
  for (const chapter of STORY_CHAPTERS) {
    let trial = ready(baseline);
    for (let retry = 0; retry < 8; retry++) {
      const before = storyChoices(trial);
      const correct = before.find((choice) => choice.succeeds);
      const wrong = before.find((choice) => !choice.succeeds);
      const originalSlot = before.indexOf(correct);
      trial = storyReducer(trial, { type: "CHOOSE", choiceId: wrong.id });
      assert.equal(trial.phase, "failed");
      assert.equal(
        storyChoiceById(chapter, trial.lastChoice).verb,
        wrong.verb,
        "Failure copy resolves the exact option submitted",
      );
      assert.equal(storyReducer(trial, { type: "NEXT" }), trial);
      trial = storyReducer(trial, { type: "RETRY" });
      assert.deepEqual(trial.resources, baseline.checkpoint);
      const after = storyChoices(trial);
      assert.equal(after.filter((choice) => choice.succeeds).length, 1);
      assert.equal(after.find((choice) => choice.succeeds).id, correct.id);
      assert.notEqual(
        after.findIndex((choice) => choice.succeeds),
        originalSlot,
      );
      assert.ok(
        after
          .filter((choice) => !choice.succeeds)
          .every((choice) => !before.some((old) => old.id === choice.id)),
      );
      trial = storyReducer(trial, { type: "DECIDE" });
      assert.equal(
        storyReducer(trial, { type: "CHOOSE", choiceId: wrong.id }),
        trial,
        "An old, no-longer-offered plan must be rejected",
      );
    }
    trial = storyReducer(trial, {
      type: "CHOOSE",
      choiceId: chapter.choices.find((choice) => choice.succeeds).id,
    });
    assert.equal(trial.phase, "success");
    assert.ok(
      storyPathChoices(trial, chapter).some(
        (choice) => !chapter.choices.some((base) => base.id === choice.id),
      ),
      "Notebook retains attempted retry variants",
    );
    baseline = storyReducer(trial, { type: "NEXT" });
  }
  assert.equal(baseline.phase, "ending");
  assert.equal(baseline.science, 3);
});

test("all retry variants have unique IDs, correct feedback, and cannot award science", () => {
  const ids = new Set();
  for (let chapter = 0; chapter < STORY_CHAPTERS.length; chapter++) {
    let state = ready(
      storyReducer({ ...createStory(), chapter }, { type: "BEGIN" }),
    );
    for (let bank = 0; bank < 3; bank++) {
      const options = storyChoices(state);
      for (const choice of options.filter((choice) => !choice.succeeds)) {
        assert.equal(ids.has(choice.id), false);
        ids.add(choice.id);
        assert.ok(choice.consequence.length > 50);
        assert.ok(choice.lesson.length > 20);
        const result = storyReducer(state, {
          type: "CHOOSE",
          choiceId: choice.id,
        });
        assert.equal(result.phase, "failed");
        assert.equal(result.science, state.science);
        assert.equal(
          storyChoiceById(STORY_CHAPTERS[chapter], result.lastChoice).title,
          choice.title,
        );
      }
      state = storyReducer(
        storyReducer(state, {
          type: "CHOOSE",
          choiceId: options.find((choice) => !choice.succeeds).id,
        }),
        { type: "RETRY" },
      );
      state = storyReducer(state, { type: "DECIDE" });
    }
  }
  assert.equal(ids.size, 36);
});
