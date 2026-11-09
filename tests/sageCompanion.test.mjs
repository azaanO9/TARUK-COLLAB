import test from "node:test";
import assert from "node:assert/strict";
import { SAGE_DOCK, sageDestination, stepSage } from "../game/sageCompanion.ts";

test("Sage waits at the dock until called and returns when sent home", () => {
  const player = { x: 25, z: -18, yaw: .8 };
  assert.deepEqual(sageDestination(false, player), SAGE_DOCK);
  const target = sageDestination(true, player);
  assert.ok(Math.hypot(target.x - player.x, target.z - player.z) < 2);
  const stepped = stepSage(SAGE_DOCK, target, .05);
  assert.ok(Math.hypot(stepped.x - SAGE_DOCK.x, stepped.z - SAGE_DOCK.z) <= .45 + 1e-9);
  assert.ok(Math.hypot(stepped.x - target.x, stepped.z - target.z) < Math.hypot(SAGE_DOCK.x - target.x, SAGE_DOCK.z - target.z));
  let position = stepped;
  for (let i = 0; i < 100; i++) position = stepSage(position, sageDestination(false, player), .05);
  assert.ok(Math.hypot(position.x - SAGE_DOCK.x, position.z - SAGE_DOCK.z) < .01);
});

test("Sage's follow position stays on the player's right as the player turns", () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const player = { x: 4, z: -3, yaw }, target = sageDestination(true, player);
    const right = (target.x - player.x) * Math.cos(yaw) - (target.z - player.z) * Math.sin(yaw);
    assert.ok(right > 1.7);
  }
});
