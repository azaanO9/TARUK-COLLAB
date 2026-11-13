import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSolTemperatureCurve,
  computeMarsTempC,
  evaluateMarsEnvironment,
} from "../game/marsWeather.ts";
import {
  CAVE_BOUNDARY_RADIUS,
  CAVE_ENTRANCES,
  CAVE_EXIT_PORTAL,
  INITIAL_CAVE_NODES,
  caveHeightAt,
  nearestCaveEntrance,
} from "../game/marsCaveData.ts";
import {
  DEFENSE_RECIPES,
  canCraftDefense,
  createDefenseUnit,
  isPointProtectedByDefense,
} from "../game/baseDefenses.ts";
import { spawnInitialStalkers, stepStalkers } from "../game/marsStalkers.ts";
import {
  ROVER_CHASSIS_CLEARANCE,
  getRoverGear,
} from "../game/roverVehicle.ts";

test("marsWeather produces -100 C cryogenic nights, dust storm radio static, and ticker", () => {
  const cryoMidnight = computeMarsTempC(0.04, "CRYO_FREEZE");
  const midday = computeMarsTempC(0.54, "CLEAR");
  assert.ok(cryoMidnight <= -100, `Expected <= -100 C midnight cryo, got ${cryoMidnight}`);
  assert.ok(midday > -30, `Expected warmer midday temperature, got ${midday}`);

  const curve = buildSolTemperatureCurve(3, 25);
  assert.equal(curve.length, 25);
  assert.ok(curve.some((p) => p.tempC <= -95), "Diurnal curve drops into deep Martian freeze");

  const storm = evaluateMarsEnvironment(2, 0.45, "DUST_STORM");
  assert.equal(storm.weather, "DUST_STORM");
  assert.ok(storm.radioInterference >= 0.8, "Dust storm causes heavy voice chat static");
  assert.ok(storm.thermalDrainMultiplier > 1.2, "Storm increases thermal suit drain");
  assert.ok(storm.ticker.length >= 2, "Forecast ticker includes upcoming events");
});

test("marsCaveData defines finite floor elevation, portals, and mineable Ice/Titanium deposits", () => {
  assert.ok(CAVE_ENTRANCES.length >= 2);
  assert.ok(CAVE_BOUNDARY_RADIUS >= 30);
  const portalFloor = caveHeightAt(CAVE_EXIT_PORTAL.x, CAVE_EXIT_PORTAL.z);
  const deepFloor = caveHeightAt(8, -12);
  assert.ok(Number.isFinite(portalFloor) && Math.abs(portalFloor) < 0.1);
  assert.ok(Number.isFinite(deepFloor));

  const iceCount = INITIAL_CAVE_NODES.filter((n) => n.kind === "ice_core").length;
  const tiCount = INITIAL_CAVE_NODES.filter((n) => n.kind === "titanium").length;
  assert.ok(iceCount >= 3 && tiCount >= 3, "Cave spawns both Ice Cores and Titanium veins");

  const near = nearestCaveEntrance(CAVE_ENTRANCES[1].surfaceX + 1, CAVE_ENTRANCES[1].surfaceZ - 1);
  assert.equal(near.entrance.id, CAVE_ENTRANCES[1].id);
  assert.ok(near.distance < 2);
});

test("baseDefenses validates crafting recipes and protects nearby perimeter points", () => {
  const emptyCheck = canCraftDefense("emp_emitter", { titanium: 0, iceCores: 0, powerCells: 50 }, 60);
  assert.equal(emptyCheck.ok, false);

  const readyCheck = canCraftDefense(
    "emp_emitter",
    {
      titanium: DEFENSE_RECIPES.emp_emitter.titaniumCost,
      iceCores: DEFENSE_RECIPES.emp_emitter.iceCoreCost,
      powerCells: 60,
    },
    60,
  );
  assert.equal(readyCheck.ok, true);

  const unit = createDefenseUnit("def-1", "laser_grid", 12, -10, "Nova", 70);
  assert.equal(unit.active, true);
  assert.ok(isPointProtectedByDefense(15, -10, [unit], 70) !== null);
  assert.equal(isPointProtectedByDefense(45, -10, [unit], 70), null);
});

test("marsStalkers stay dormant during clear daytime and are repelled by perimeter defenses", () => {
  const initial = spawnInitialStalkers();
  assert.ok(initial.some((s) => s.biome === "surface"));
  assert.ok(initial.some((s) => s.biome === "cave"));

  const playerOutside = [{ id: "p1", x: 54, z: -46, biome: "surface" }];
  const clearDay = stepStalkers(initial, playerOutside, [], "CLEAR", -25, 80, 0.1, 10);
  const surfaceClear = clearDay.stalkers.filter((s) => s.biome === "surface");
  assert.ok(surfaceClear.every((s) => s.state === "dormant"));

  // During DUST_STORM near an active EMP emitter, approaching Stalker enters repelled state
  const emp = createDefenseUnit("emp-1", "emp_emitter", 55, -47, "Nova", 80);
  const stormDefense = stepStalkers(initial, playerOutside, [emp], "DUST_STORM", -82, 80, 0.1, 12);
  const repelled = stormDefense.stalkers.find((s) => s.id === "stalker-surface-ne");
  assert.equal(repelled?.state, "repelled");
  assert.ok(stormDefense.triggeredDefenses.includes("emp-1"));
});

test("roverVehicle clearance stays above terrain Z-fighting threshold and gear reports D/N/R", () => {
  assert.ok(ROVER_CHASSIS_CLEARANCE >= 0.02);
  assert.equal(getRoverGear(2.4), "D");
  assert.equal(getRoverGear(0), "N");
  assert.equal(getRoverGear(-1.5), "R");
});

