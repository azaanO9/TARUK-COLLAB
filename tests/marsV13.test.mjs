import test from "node:test";
import assert from "node:assert/strict";

import {
  snapToBuildingGrid,
  validateModulePlacement,
  calculateBaseGrid,
  MODULE_RECIPES,
  GRID_SNAP_SIZE,
} from "../game/baseBuilding.ts";

import {
  ROVER_UPGRADES,
  GARAGE_PAD,
  isInsideGarageZone,
  canPurchaseRoverUpgrade,
  findNearestWinchAnchor,
  calculateWinchForce,
} from "../game/roverUpgrades.ts";

import {
  SKILL_TREE,
  calculatePlayerProgress,
  canUnlockSkill,
  getActivePerks,
  XP_PER_EVENT,
} from "../game/crewSkills.ts";

test("Base Building: snapToBuildingGrid snaps coordinates to 4m grid intervals", () => {
  assert.equal(GRID_SNAP_SIZE, 4.0);
  const snap1 = snapToBuildingGrid(2.1, 3.9);
  assert.equal(snap1.x, 4);
  assert.equal(snap1.z, 4);

  const snap2 = snapToBuildingGrid(-6.8, -14.1);
  assert.equal(snap2.x, -8);
  assert.equal(snap2.z, -16);
});

test("Base Building: MODULE_RECIPES specifies 3 distinct structural components", () => {
  assert.ok(MODULE_RECIPES.tunnel);
  assert.ok(MODULE_RECIPES.habitat);
  assert.ok(MODULE_RECIPES.solar_array);

  assert.equal(MODULE_RECIPES.habitat.o2Bonus, 20);
  assert.equal(MODULE_RECIPES.solar_array.powerOutput, 25);
  assert.equal(MODULE_RECIPES.tunnel.powerDrain, 1);
});

test("Base Building: validateModulePlacement checks core connection and overlap", () => {
  // Habitat core is at (-2, -26)
  // Placement within 12m of core is valid
  const validPlacement = validateModulePlacement("tunnel", -2, -22, []);
  assert.equal(validPlacement.valid, true);

  // Placement too far (e.g. at (100, 100)) is invalid (not connected)
  const farPlacement = validateModulePlacement("tunnel", 100, 100, []);
  assert.equal(farPlacement.valid, false);
  assert.match(farPlacement.reason, /Must connect within/i);

  // Overlapping existing module (within collision radius) is rejected
  const existing = [{
    id: "mod-1",
    kind: "tunnel",
    x: -2,
    z: -22,
    rotationY: 0,
    placedBy: "Test",
    placedAt: 1000,
    connected: true,
  }];
  const overlapPlacement = validateModulePlacement("habitat", -2, -22, existing);
  assert.equal(overlapPlacement.valid, false);
  assert.match(overlapPlacement.reason, /obstructed/i);
});

test("Base Building: calculateBaseGrid computes net power, O2, and status", () => {
  const modules = [
    {
      id: "m1",
      kind: "solar_array",
      x: -2,
      z: -22,
      rotationY: 0,
      placedBy: "Test",
      placedAt: 1000,
      connected: true,
    },
    {
      id: "m2",
      kind: "habitat",
      x: -2,
      z: -18,
      rotationY: 0,
      placedBy: "Test",
      placedAt: 2000,
      connected: true,
    },
  ];

  const grid = calculateBaseGrid(modules);
  assert.equal(grid.connectedCount, 2);
  assert.equal(grid.totalPowerGeneration, 25);
  assert.equal(grid.totalPowerConsumption, 3); // habitat drains 3
  assert.equal(grid.netPowerDelta, 22);
  assert.equal(grid.bonusO2Capacity, 20); // habitat adds 20 O2
});

test("Rover Garage: isInsideGarageZone detects proximity to Outpost Alpha pad", () => {
  // GARAGE_PAD is at x: 18.0, z: 11.5, radius 6.2
  assert.equal(isInsideGarageZone(18.0, 11.5), true);
  assert.equal(isInsideGarageZone(19.5, 12.0), true);
  assert.equal(isInsideGarageZone(0, 0), false);
  assert.equal(isInsideGarageZone(35, 35), false);
});

test("Rover Garage: canPurchaseRoverUpgrade validates costs and duplicate installations", () => {
  // mud_tires costs 3 titanium, 10 power
  const canBuy = canPurchaseRoverUpgrade("mud_tires", [], { titanium: 5, iceCores: 0 }, 50);
  assert.equal(canBuy.ok, true);

  // Insufficient titanium
  const lackTitanium = canPurchaseRoverUpgrade("mud_tires", [], { titanium: 1, iceCores: 0 }, 50);
  assert.equal(lackTitanium.ok, false);
  assert.match(lackTitanium.reason, /titanium/i);

  // Insufficient power
  const lackPower = canPurchaseRoverUpgrade("mud_tires", [], { titanium: 5, iceCores: 0 }, 5);
  assert.equal(lackPower.ok, false);
  assert.match(lackPower.reason, /power/i);

  // Already installed
  const duplicate = canPurchaseRoverUpgrade("mud_tires", ["mud_tires"], { titanium: 10, iceCores: 0 }, 100);
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.reason, /already installed/i);
});

test("Rover Garage: Heavy Winch anchor search and force calculation", () => {
  const obstacles = [
    { x: 10, z: -10, radius: 2.5, id: "boulder_1" },
    { x: 0, z: 50, radius: 2.0, id: "boulder_rear" },
  ];

  // Rover at (10, 0, 5) facing North (yaw = 0, forward is -Z)
  const anchor = findNearestWinchAnchor(10, 0, 5, 0, obstacles);
  assert.ok(anchor);
  assert.equal(anchor.x, 10);
  assert.equal(anchor.z, -10);

  // Force pulling rover toward anchor
  const force = calculateWinchForce(10, 0, 5, 0, anchor);
  assert.ok(force.forwardForce > 0);
  assert.equal(force.distance, 15);
});

test("Crew Specialization: calculatePlayerProgress and XP thresholds", () => {
  const prog0 = calculatePlayerProgress(0, []);
  assert.equal(prog0.level, 1);
  assert.equal(prog0.availablePoints, 0);
  assert.equal(prog0.unlockedSkills.length, 0);

  // 450 XP reaches level 3 (level 2: 150, level 3: 350)
  const prog3 = calculatePlayerProgress(450, ["eng_1_rapid_fab"]);
  assert.equal(prog3.level, 3);
  assert.equal(prog3.spentPoints, 1);
  assert.equal(prog3.availablePoints, 1);
});

test("Crew Specialization: canUnlockSkill validates tier prerequisites", () => {
  // Tier 1 skill can be unlocked if 1 point is available
  const canUnlockT1 = canUnlockSkill("eng_1_rapid_fab", [], 1);
  assert.equal(canUnlockT1.ok, true);

  // Tier 2 requires prerequisite tier 1 skill
  const failT2WithoutT1 = canUnlockSkill("eng_2_fortification", [], 1);
  assert.equal(failT2WithoutT1.ok, false);
  assert.match(failT2WithoutT1.reason, /prerequisite/i);

  // Tier 2 succeeds once prerequisite is met
  const passT2WithT1 = canUnlockSkill("eng_2_fortification", ["eng_1_rapid_fab"], 1);
  assert.equal(passT2WithT1.ok, true);
});

test("Crew Specialization: getActivePerks aggregates passive perks correctly", () => {
  const perksEmpty = getActivePerks([]);
  assert.equal(perksEmpty.roverSpeedMultiplier, 1.0);
  assert.equal(perksEmpty.foodYieldMultiplier, 1.0);

  const perksUnlocked = getActivePerks(["ast_3_pathfinder", "bot_1_hydro_opt", "eng_3_overcharge"]);
  assert.equal(perksUnlocked.roverSpeedMultiplier, 1.2);
  assert.equal(perksUnlocked.foodYieldMultiplier, 1.5);
  assert.equal(perksUnlocked.gridEfficiencyMultiplier, 1.25);
});
