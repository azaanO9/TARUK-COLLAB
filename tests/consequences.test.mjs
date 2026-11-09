import test from "node:test";
import assert from "node:assert/strict";
import {
  createStory,
  storyReducer,
  chapterFor,
} from "../game/storyEngine.ts";
import { STORY_CHAPTERS } from "../content/story.ts";
import {
  CONSEQUENCE_VISUALS,
  QUICK_DECISIONS,
  getConsequenceVisual,
  getQuickDecision,
} from "../content/storyConsequences.ts";

function prepareExplore(state) {
  state = storyReducer(state, { type: "BEGIN" });
  for (const evidence of STORY_CHAPTERS[state.chapter].evidence) {
    state = storyReducer(state, { type: "INSPECT", evidenceId: evidence.id });
  }
  return storyReducer(state, { type: "DECIDE" });
}

test("consequence visual content covers all authored failed choices with complete 4-step chains", () => {
  // Check that every failed choice in story.ts has a consequence visual
  for (const chapter of STORY_CHAPTERS) {
    const wrongChoices = chapter.choices.filter((c) => !c.succeeds);
    for (const wrong of wrongChoices) {
      const visual = getConsequenceVisual(wrong.id);
      assert.ok(visual, `Missing consequence visual for wrong choice ${wrong.id}`);
      assert.ok(visual.chain.actionTitle.length > 5, `Short actionTitle for ${wrong.id}`);
      assert.ok(visual.chain.equipmentState.length > 10, `Short equipmentState for ${wrong.id}`);
      assert.ok(visual.chain.outpostEffect.length > 10, `Short outpostEffect for ${wrong.id}`);
      assert.ok(visual.chain.micaExplanation.length > 15, `Short micaExplanation for ${wrong.id}`);
      assert.ok(visual.statusBadge.length > 3, `Short statusBadge for ${wrong.id}`);
    }
  }
});

test("quick-decision follow-ups have 1 thoughtful and 2 impulsive options with calm feedback", () => {
  for (const [choiceId, qd] of Object.entries(QUICK_DECISIONS)) {
    assert.equal(qd.choiceId, choiceId);
    assert.ok(qd.prompt.includes("What should we do first?"));
    assert.ok(qd.micaCall.length > 10);
    assert.equal(qd.options.length, 3);
    const thoughtful = qd.options.filter((o) => o.kind === "thoughtful");
    const impulsive = qd.options.filter((o) => o.kind === "impulsive");
    assert.equal(thoughtful.length, 1, `Expected exactly 1 thoughtful option for ${choiceId}`);
    assert.equal(impulsive.length, 2, `Expected exactly 2 impulsive options for ${choiceId}`);
    for (const opt of qd.options) {
      assert.ok(opt.label.length > 5);
      assert.ok(opt.reaction.length > 15);
      assert.ok(opt.lesson.length > 15);
      assert.ok(opt.outpostStatus.length > 5);
    }
  }
});

test("FOLLOW_UP action records decision in attempts and state, applies zero resource changes, and cannot bypass retry", () => {
  let state = prepareExplore(createStory());
  const checkpoint = structuredClone(state.resources);

  // 1. Player chooses wrong plan (wait-wind)
  state = storyReducer(state, { type: "CHOOSE", choiceId: "wait-wind" });
  assert.equal(state.phase, "failed");
  assert.equal(state.followUpDecision, null);
  const resourcesAfterFail = structuredClone(state.resources);

  // Resources changed exactly once by CHOOSE
  assert.notDeepEqual(resourcesAfterFail, checkpoint);
  assert.equal(state.attempts.length, 1);
  assert.equal(state.attempts[0].choiceId, "wait-wind");
  assert.equal(state.attempts[0].succeeded, false);
  assert.equal(state.attempts[0].followUpChoiceId, undefined);

  // 2. Player makes thoughtful quick decision
  const qd = getQuickDecision("wait-wind");
  assert.ok(qd);
  const thoughtfulOpt = qd.options.find((o) => o.kind === "thoughtful");

  state = storyReducer(state, {
    type: "FOLLOW_UP",
    followUpId: thoughtfulOpt.id,
  });

  // Resources did NOT change again (applied exactly once!)
  assert.deepEqual(state.resources, resourcesAfterFail);
  assert.equal(state.followUpDecision, thoughtfulOpt.id);
  assert.equal(state.attempts[0].followUpChoiceId, thoughtfulOpt.id);

  // Still failed! Cannot advance with NEXT
  assert.equal(state.phase, "failed");
  const nextAttempt = storyReducer(state, { type: "NEXT" });
  assert.equal(nextAttempt, state, "NEXT during failed state must be a no-op");

  // Repeated follow up calls are no-ops
  const repeated = storyReducer(state, {
    type: "FOLLOW_UP",
    followUpId: "other-id",
  });
  assert.equal(repeated.followUpDecision, thoughtfulOpt.id);

  // 3. RETRY restores checkpoint supplies and resets followUpDecision, but keeps attempt record
  state = storyReducer(state, { type: "RETRY" });
  assert.equal(state.phase, "explore");
  assert.deepEqual(state.resources, checkpoint);
  assert.equal(state.followUpDecision, null);
  assert.equal(state.attempts.length, 1);
  assert.equal(state.attempts[0].followUpChoiceId, thoughtfulOpt.id);
});

test("impulsive follow-up option also records properly and preserves required retry rule", () => {
  let state = prepareExplore(createStory());
  state = storyReducer(state, { type: "CHOOSE", choiceId: "wait-wind" });

  const qd = getQuickDecision("wait-wind");
  const impulsiveOpt = qd.options.find((o) => o.kind === "impulsive");

  state = storyReducer(state, {
    type: "FOLLOW_UP",
    followUpId: impulsiveOpt.id,
  });
  assert.equal(state.followUpDecision, impulsiveOpt.id);
  assert.equal(state.phase, "failed");
  assert.equal(state.attempts[0].followUpChoiceId, impulsiveOpt.id);

  // Mission must still be solved via retry
  state = storyReducer(state, { type: "RETRY" });
  assert.equal(state.phase, "explore");
  state = storyReducer(state, { type: "DECIDE" });
  state = storyReducer(state, { type: "CHOOSE", choiceId: "safe-clean" });
  assert.equal(state.phase, "success");
  assert.equal(state.attempts.length, 2);
  assert.equal(state.attempts[0].succeeded, false);
  assert.equal(state.attempts[0].followUpChoiceId, impulsiveOpt.id);
  assert.equal(state.attempts[1].succeeded, true);
});

