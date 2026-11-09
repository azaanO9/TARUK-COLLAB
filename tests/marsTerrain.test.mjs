import test from "node:test";
import assert from "node:assert/strict";
import { marsHeight } from "../ui/world/marsTerrain.ts";
import { STATIONS } from "../content/survival.ts";

test("Mars equipment pads and spawn remain level on the explorable terrain", () => {
  assert.equal(marsHeight(0, 12), 0);
  assert.equal(marsHeight(-2, -30), 0);
  for (const station of STATIONS) {
    assert.equal(marsHeight(station.x, station.z), 0, station.id);
    assert.equal(marsHeight(station.x + 2, station.z), 0, `${station.id} approach`);
  }
});

test("Mars craters have a recessed floor and the walking surface stays finite and continuous", () => {
  assert.ok(marsHeight(-48, 24) < marsHeight(-33, 24) - 2);
  for (let x = -88; x <= 88; x += 2) for (let z = -88; z <= 88; z += 2) {
    const h = marsHeight(x, z);
    assert.ok(Number.isFinite(h));
    assert.ok(Math.abs(marsHeight(x + .01, z) - h) < .1);
    assert.ok(Math.abs(marsHeight(x, z + .01) - h) < .1);
  }
});
