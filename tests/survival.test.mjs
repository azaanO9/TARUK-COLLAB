import test from "node:test";
import assert from "node:assert/strict";
import {
  DAYS,
  DAILY_USE,
  QUICK_RESPONSES,
  STATIONS,
} from "../content/survival.ts";
import {
  changeReserves,
  createSurvival,
  currentDay,
  offeredPlans,
  readyToPlan,
  survivalReducer,
} from "../game/survivalEngine.ts";
import {
  spawnWalker,
  stepWalker,
  stepJump,
  WORLD_LIMIT,
  WALK_SPEED,
} from "../game/navigation.ts";

test("jump rises, lands, and cannot restart while airborne", () => {
  let jump = stepJump({ height: 0, velocity: 0 }, true, 0.05);
  assert.ok(jump.height > 0 && jump.velocity > 0);
  const firstVelocity = jump.velocity;
  jump = stepJump(jump, true, 0.05);
  assert.ok(jump.velocity < firstVelocity);
  for (let i = 0; i < 100; i++) jump = stepJump(jump, false, 0.05);
  assert.deepEqual(jump, { height: 0, velocity: 0 });
  assert.ok(stepJump(jump, true, 0.05).height > 0);
});

test("the rover day uses evidence to choose the gentler crater route", () => {
  const day = DAYS[6];
  assert.ok(day.clues.includes("rover") && day.clues.includes("research"));
  for (const bank of day.plans) {
    assert.match(bank.find((p) => p.good).title, /longer.*gentler/i);
    assert.ok(bank.filter((p) => !p.good).every((p) => p.effect === "rover"));
  }
});
function ready(s) {
  for (const id of currentDay(s).clues)
    s = survivalReducer(s, { type: "INSPECT", id });
  return s;
}
test("ten distinct survival days complete with supplies, three discoveries, ending and replay", () => {
  let s = survivalReducer(createSurvival(), { type: "BEGIN", seed: 8 });
  assert.equal(new Set(DAYS.map((d) => d.title)).size, 10);
  for (let i = 0; i < 10; i++) {
    assert.equal(s.day, i);
    s = ready(s);
    const good = offeredPlans(s).find((p) => p.good);
    const before = structuredClone(s);
    s = survivalReducer(s, { type: "CHOOSE", id: good.id });
    assert.equal(s.phase, "result");
    assert.deepEqual(before.reserves, before.checkpoint);
    const afterAction = structuredClone(s.reserves);
    s = survivalReducer(s, { type: "END_DAY" });
    assert.deepEqual(s.reserves, changeReserves(afterAction, DAILY_USE));
    assert.ok(Object.values(s.reserves).every((n) => n > 0));
  }
  assert.equal(s.phase, "ending");
  assert.equal(s.science, 3);
  assert.equal(s.attempts.length, 10);
  assert.equal(survivalReducer(s, { type: "END_DAY" }), s);
  assert.deepEqual(survivalReducer(s, { type: "RESTART" }), createSurvival());
});
test("all ten days and all 60 wrong plans require retry, restore the checkpoint and retain clues/history", () => {
  let base = survivalReducer(createSurvival(), { type: "BEGIN" });
  for (const day of DAYS) {
    base = ready(base);
    for (const bank of day.plans) {
      for (const wrong of bank.filter((p) => !p.good)) {
        let s = {
          ...base,
          attempts: Array.from({ length: day.plans.indexOf(bank) }, () => ({
            day: base.day,
            plan: day.plans[0][1],
            before: base.reserves,
            after: base.reserves,
            risk: base.risk,
          })),
        };
        const checkpoint = structuredClone(s.checkpoint);
        s = survivalReducer(s, { type: "CHOOSE", id: wrong.id });
        assert.equal(s.phase, "failed");
        assert.equal(survivalReducer(s, { type: "END_DAY" }), s);
        const failed = s;
        s = survivalReducer(s, { type: "RETRY" });
        assert.equal(s.day, base.day);
        assert.deepEqual(s.reserves, checkpoint);
        assert.deepEqual(s.found, base.found);
        assert.equal(s.attempts.length, failed.attempts.length);
      }
    }
    base = survivalReducer(base, {
      type: "CHOOSE",
      id: offeredPlans(base).find((p) => p.good).id,
    });
    base = survivalReducer(base, { type: "END_DAY" });
  }
});
test("stable A/B/C offers move the correct letter and replace both wrong plans on retry", () => {
  for (let seed = 0; seed < 15; seed++) {
    let s = ready(survivalReducer(createSurvival(), { type: "BEGIN", seed }));
    for (let i = 0; i < 7; i++) {
      const before = offeredPlans(s);
      assert.deepEqual(offeredPlans(s), before);
      assert.equal(new Set(before.map((p) => p.id)).size, 3);
      s = survivalReducer(s, {
        type: "CHOOSE",
        id: before.find((p) => !p.good).id,
      });
      s = survivalReducer(s, { type: "RETRY" });
      const after = offeredPlans(s);
      assert.notEqual(
        after.findIndex((p) => p.good),
        before.findIndex((p) => p.good),
      );
      assert.equal(after.find((p) => p.good).id, before.find((p) => p.good).id);
      assert.ok(
        after
          .filter((p) => !p.good)
          .every((p) => !before.some((old) => old.id === p.id)),
      );
      assert.equal(
        survivalReducer(s, {
          type: "CHOOSE",
          id: before.find((p) => !p.good).id,
        }),
        s,
      );
    }
  }
});
test("quick responses validate IDs, do not duplicate costs or science, and never advance a failed day", () => {
  let s = ready(survivalReducer(createSurvival(), { type: "BEGIN" }));
  s = survivalReducer(s, {
    type: "CHOOSE",
    id: offeredPlans(s).find((p) => !p.good).id,
  });
  assert.equal(survivalReducer(s, { type: "RESPOND", id: "unknown" }), s);
  for (const q of QUICK_RESPONSES) {
    const answer = survivalReducer(s, { type: "RESPOND", id: q.id });
    assert.deepEqual(answer.reserves, s.reserves);
    assert.equal(answer.phase, "failed");
    assert.equal(answer.attempts.at(-1).response, q.id);
    assert.equal(
      survivalReducer(answer, { type: "RESPOND", id: q.id }),
      answer,
    );
    assert.equal(survivalReducer(answer, { type: "END_DAY" }), answer);
  }
});
test("clue gates, invalid inputs, event science, depletion and radiation limits are explicit", () => {
  let s = survivalReducer(createSurvival(), { type: "BEGIN" });
  assert.equal(
    survivalReducer(s, { type: "CHOOSE", id: DAYS[0].plans[0][0].id }),
    s,
  );
  assert.equal(survivalReducer(s, { type: "INSPECT", id: "unknown" }), s);
  assert.ok(
    DAYS.every((d) => d.clues.every((id) => STATIONS.some((o) => o.id === id))),
  );
  assert.equal(DAYS[3].event, "eclipse");
  assert.ok(DAYS[3].risk < 20);
  assert.equal(DAYS[5].event, "flare");
  assert.equal(DAYS[8].event, "particles");
  s = ready(s);
  s = survivalReducer(s, {
    type: "CHOOSE",
    id: offeredPlans(s).find((p) => p.good).id,
  });
  const zero = survivalReducer(
    { ...s, reserves: { ...s.reserves, food: 5 } },
    { type: "END_DAY" },
  );
  assert.equal(zero.phase, "failed");
  assert.equal(zero.day, 0);
  const risk = survivalReducer({ ...s, risk: 80 }, { type: "END_DAY" });
  assert.equal(risk.phase, "failed");
  assert.equal(risk.science, 0);
  assert.deepEqual(
    changeReserves(
      { power: 99, water: 1, food: 100, oxygen: 0 },
      { power: 50, water: -9, food: 1, oxygen: -1 },
    ),
    { power: 100, water: 0, food: 100, oxygen: 0 },
  );
});
test("WASD walking is smooth, frame-rate independent, diagonal-normalized and rotates with POV", () => {
  const run = (keys, dt = 1 / 60, yaw = 0) => {
    let w = { ...spawnWalker(), yaw };
    for (let t = 0; t < 2 - dt / 2; t += dt)
      w = stepWalker(w, new Set(keys), dt);
    return w;
  };
  const forward = run(["w"]),
    diagonal = run(["w", "d"]),
    rotated = run(["w"], 1 / 60, -Math.PI / 2);
  assert.ok(forward.z < 3);
  assert.ok(
    Math.abs(
      Math.hypot(diagonal.x, diagonal.z - 12) - Math.abs(forward.z - 12),
    ) < 0.01,
  );
  assert.ok(rotated.x > 9);
  assert.ok(Math.abs(run(["w"], 1 / 30).z - forward.z) < 0.1);
  const first = stepWalker(spawnWalker(), new Set(["w"]), 1 / 60);
  assert.ok(Math.abs(first.vz) < WALK_SPEED);
  const stopped = stepWalker(first, new Set(), 1 / 60);
  assert.ok(Math.abs(stopped.vz) < Math.abs(first.vz));
});
test("finite navigation bounds and equipment collisions prevent leaving the playable map", () => {
  let w = { ...spawnWalker(), z: -WORLD_LIMIT };
  for (let i = 0; i < 200; i++) w = stepWalker(w, new Set(["w"]), 0.05);
  assert.equal(w.z, -WORLD_LIMIT);
  w = { ...spawnWalker(), z: 3 };
  for (let i = 0; i < 100; i++)
    w = stepWalker(w, new Set(["w"]), 0.05, [{ x: 0, z: 0, radius: 1.5 }]);
  assert.ok(w.z >= 1.5);
  assert.deepEqual(
    stepWalker(spawnWalker(), new Set(["w"]), -1),
    spawnWalker(),
  );
});

test("Mars gravity and sprint affect the actual movement calculations", async () => {
  const { MARS_PHYSICS } = await import("../game/marsConfig.ts");
  const initial = { height: 0, velocity: 0 };
  const mars = stepJump(initial, true, 0.05, MARS_PHYSICS.gravity);
  const earth = stepJump(initial, true, 0.05, 9.81);
  assert.ok(mars.height > earth.height);
  let walking = spawnWalker(), sprinting = spawnWalker();
  for (let i = 0; i < 30; i++) {
    walking = stepWalker(walking, new Set(["w"]), 0.05);
    sprinting = stepWalker(sprinting, new Set(["w"]), 0.05, [], MARS_PHYSICS.sprintSpeed);
  }
  assert.ok(sprinting.z < walking.z);
});
