import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  spawnCuriosityRover,
  stepCuriosityRover,
  curiosityFootprint,
  exportCuriositySave,
  CURIOSITY_PATROL_WAYPOINTS,
  CURIOSITY_MAX_SPEED,
  CURIOSITY_LIMIT,
  CURIOSITY_FAR_SCAN_RADIUS,
  CURIOSITY_SCAN_DURATION,
} from "../game/curiosityRover.ts";
import { overlapBody } from "../game/collision.ts";
import { colonyCollision } from "../game/marsColonyCollision.ts";
import { STATIONS } from "../content/survival.ts";
import { spawnWalker, stepWalker, WALKER_RADIUS } from "../game/navigation.ts";
import { spawnRoverVehicle, enterRover, stepRoverVehicle } from "../game/roverVehicle.ts";

test("CURIOSITY_PATROL_WAYPOINTS start near colony edge and stay predominantly in far plains", () => {
  const zones = new Set(CURIOSITY_PATROL_WAYPOINTS.map((w) => w.zone));
  assert.equal(zones.has("colony"), true);
  assert.equal(zones.has("plains"), true);
  assert.ok(CURIOSITY_PATROL_WAYPOINTS.some((w) => Math.hypot(w.x, w.z) < 22));
  const farWaypoints = CURIOSITY_PATROL_WAYPOINTS.filter((w) => Math.hypot(w.x, w.z + 6) >= 34);
  assert.ok(
    farWaypoints.length / CURIOSITY_PATROL_WAYPOINTS.length >= 0.8,
    `Expected >= 80% far plains waypoints, got ${farWaypoints.length}/${CURIOSITY_PATROL_WAYPOINTS.length}`,
  );
});

test("Curiosity executes full stop-and-scan crouch cycle (deploy + crouch -> laser -> stow + rise)", () => {
  const smallRock = { x: -29.5, z: 9.0, radius: 0.45, traversable: true };
  let state = spawnCuriosityRover([smallRock], () => 0);

  let sawDeploy = false;
  let sawLaser = false;
  let sawStow = false;
  let maxArm = 0;
  let maxCrouch = 0;
  let laserSteps = 0;

  for (let i = 0; i < 800; i++) {
    state = stepCuriosityRover(state, 0.05, [smallRock], () => 0);
    if (state.phase === "scanning") {
      if (state.scanStage === "deploy") sawDeploy = true;
      if (state.scanStage === "laser") {
        sawLaser = true;
        laserSteps += 1;
        assert.equal(state.laserActive, true);
        assert.ok(state.scanCrouch > 0.75, `Expected chassis crouched during laser scan, got ${state.scanCrouch}`);
      }
      if (state.scanStage === "stow") sawStow = true;
      if (state.armDeploy > maxArm) maxArm = state.armDeploy;
      if (state.scanCrouch > maxCrouch) maxCrouch = state.scanCrouch;
    }
    if (state.scanCount >= 1 && state.phase === "driving") break;
  }

  assert.equal(sawDeploy, true);
  assert.equal(sawLaser, true);
  assert.equal(sawStow, true);
  assert.ok(laserSteps * 0.05 <= 1.5, `Expected subtle short laser pulse (<= 1.5s), got ${(laserSteps * 0.05).toFixed(2)}s`);
  assert.ok(maxArm > 0.85);
  assert.ok(maxCrouch > 0.85);
  assert.ok(state.scanCount >= 1);
  assert.equal(state.laserActive, false);
  assert.equal(state.scanCrouch, 0, "Curiosity must return to full drive clearance once driving resumes");
  assert.ok(CURIOSITY_SCAN_DURATION > 5);
});

test("Curiosity steers cleanly around boulders/buildings and conducts scans predominantly in far plains", () => {
  const staticColony = colonyCollision(STATIONS);
  const bigBoulders = [
    { x: -24, z: 12, radius: 1.6, traversable: false },
    { x: -30, z: 7, radius: 1.8, traversable: false },
    { x: -38, z: -4, radius: 1.9, traversable: false },
    { x: -36, z: -24, radius: 2.1, traversable: false },
    { x: -20, z: -48, radius: 1.7, traversable: false },
  ];
  const obstacles = [...staticColony, ...bigBoulders];
  const smoothHill = (x, z) => Math.sin(x * 0.06) * 0.4 + Math.cos(z * 0.05) * 0.35;

  let state = spawnCuriosityRover(obstacles, smoothHill);
  const startX = state.x;
  const startZ = state.z;
  let prevScans = 0;
  let farScans = 0;

  for (let i = 0; i < 3200; i++) {
    state = stepCuriosityRover(state, 0.05, obstacles, smoothHill);
    assert.ok(Math.abs(state.speed) <= CURIOSITY_MAX_SPEED + 0.05);
    assert.ok(Math.abs(state.x) <= CURIOSITY_LIMIT && Math.abs(state.z) <= CURIOSITY_LIMIT);

    if (state.phase === "scanning" && prevScans === state.scanCount && state.scanTimer <= 0.06) {
      if (Math.hypot(state.x, state.z + 6) >= CURIOSITY_FAR_SCAN_RADIUS) farScans++;
      prevScans++;
    }

    const hull = curiosityFootprint(0, 0, state.yaw);
    for (const o of obstacles) {
      if (o.traversable) continue;
      assert.equal(
        overlapBody(state.x, state.z, hull, o),
        null,
        `Curiosity overlapped solid obstacle at step ${i} (${state.x.toFixed(2)}, ${state.z.toFixed(2)})`,
      );
    }
  }

  assert.ok(Math.hypot(state.x - startX, state.z - startZ) > 12, "Curiosity progressed along far patrol");
  assert.ok(prevScans >= 3, `Expected multiple scans during long patrol, got ${prevScans}`);
  assert.equal(farScans, prevScans, `Expected all autonomous scans in far plains >= ${CURIOSITY_FAR_SCAN_RADIUS}m`);
});

test("Curiosity avoids steep crater dropoffs and prefers smooth terrain", () => {
  const steepCraterAt = (x, z) => {
    const d = Math.hypot(x - (-22.5), z - 10.0);
    if (d < 5.5) return -4.2 * (1 - d / 5.5);
    return 0;
  };
  let state = spawnCuriosityRover([], steepCraterAt);
  for (let i = 0; i < 180; i++) {
    state = stepCuriosityRover(state, 0.05, [], steepCraterAt);
    assert.ok(state.chassisY > -1.2, `Expected Curiosity to steer clear of steep crater pit, got y=${state.chassisY}`);
  }
});

test("Astronaut pushing against Curiosity from any angle never slides Curiosity", () => {
  const baseCuriosity = spawnCuriosityRover([], () => 0);

  // Test both while parked scanning and while stopped/facing walker from all 4 cardinal directions
  const scanCuriosity = { ...baseCuriosity, phase: "scanning", scanStage: "laser", speed: 0 };
  for (const offset of [
    [0, 3.0],
    [0, -3.0],
    [3.0, 0],
    [-3.0, 0],
  ]) {
    let roverState = scanCuriosity;
    let walker = {
      ...spawnWalker(),
      x: roverState.x + offset[0],
      z: roverState.z + offset[1],
      yaw: Math.atan2(offset[0], offset[1]), // faces straight toward Curiosity
    };
    for (let i = 0; i < 80; i++) {
      const curiosityBox = curiosityFootprint(roverState.x, roverState.z, roverState.yaw);
      walker = stepWalker(walker, new Set(["w"]), 0.05, [curiosityBox]);
      roverState = stepCuriosityRover(
        roverState,
        0.05,
        [{ x: walker.x, z: walker.z, radius: WALKER_RADIUS, id: "walker" }],
        () => 0,
      );
      assert.equal(overlapBody(walker.x, walker.z, { x: 0, z: 0, radius: WALKER_RADIUS }, curiosityBox), null);
      assert.ok(
        Math.hypot(roverState.x - scanCuriosity.x, roverState.z - scanCuriosity.z) < 1e-6,
        `Walker push slid scanning Curiosity from offset (${offset[0]}, ${offset[1]})`,
      );
    }
  }
});

test("Curiosity independent Rocker-Bogie suspension articulates over asymmetric rough rock bumps", () => {
  const bumpyTerrain = (x, z) => {
    // Place an asymmetric 0.18m bump right under front-left wheel (-1.06, -1.09 in rotated frame)
    // and dip under rear-left wheel so rocker and bogie deflect meaningfully
    const dFrontBump = Math.hypot(x - (-18.1), z - 11.0);
    const dRearDip = Math.hypot(x - (-15.8), z - 8.9);
    const bump = dFrontBump < 1.2 ? 0.18 * (1 - dFrontBump / 1.2) : 0;
    const dip = dRearDip < 1.2 ? -0.14 * (1 - dRearDip / 1.2) : 0;
    return bump + dip;
  };
  let state = spawnCuriosityRover([], bumpyTerrain);
  for (let i = 0; i < 20; i++) {
    state = stepCuriosityRover({ ...state, phase: "scanning", scanStage: "deploy", speed: 0 }, 0.05, [], bumpyTerrain);
  }
  assert.ok(
    Math.abs(state.leftRockerAngle - state.rightRockerAngle) > 0.02,
    `Expected independent L/R rocker articulation, got L=${state.leftRockerAngle.toFixed(4)} R=${state.rightRockerAngle.toFixed(4)}`,
  );
  assert.ok(
    Math.abs(state.leftBogieAngle) > 0.02,
    `Expected bogie articulation between middle & rear left wheels, got ${state.leftBogieAngle.toFixed(4)}`,
  );
});

test("Curiosity and player astronaut + drivable MMSEV are mutually solid (no clipping)", () => {
  const curiosity = spawnCuriosityRover([], () => 0);
  const curiosityBox = curiosityFootprint(curiosity.x, curiosity.z, curiosity.yaw);

  // 1. Walker cannot walk through Curiosity
  let walker = spawnWalker();
  const dirX = curiosity.x - walker.x;
  const dirZ = curiosity.z - walker.z;
  walker = { ...walker, yaw: Math.atan2(-dirX, -dirZ) };
  for (let i = 0; i < 120; i++) {
    walker = stepWalker(walker, new Set(["w"]), 0.05, [curiosityBox]);
    assert.equal(overlapBody(walker.x, walker.z, { x: 0, z: 0, radius: WALKER_RADIUS }, curiosityBox), null);
  }

  // 2. Drivable MMSEV remains intact and cannot drive through Curiosity
  let sev = enterRover(spawnRoverVehicle(curiosity.x, curiosity.z + 8, 0));
  for (let i = 0; i < 80; i++) {
    sev = stepRoverVehicle(sev, new Set(["w"]), 0.05, [curiosityBox]);
    const sevOverlap = overlapBody(
      sev.x,
      sev.z,
      { x: 0, z: 0, radius: 3, halfX: 1.69, halfZ: 2.475, yaw: sev.yaw },
      curiosityBox,
    );
    assert.equal(sevOverlap, null, "MMSEV must not penetrate Curiosity footprint");
  }

  // 3. Curiosity yields without backing/sliding when walker stands directly in front of it
  const frontX = curiosity.x - Math.sin(curiosity.yaw) * 2.2;
  const frontZ = curiosity.z - Math.cos(curiosity.yaw) * 2.2;
  const walkerAhead = { x: frontX, z: frontZ, radius: WALKER_RADIUS, id: "walker" };
  let yielded = { ...curiosity, speed: CURIOSITY_MAX_SPEED, phase: "driving" };
  for (let i = 0; i < 20; i++) {
    yielded = stepCuriosityRover(yielded, 0.05, [walkerAhead], () => 0);
  }
  assert.ok(yielded.speed < 0.3, `Expected Curiosity to yield to walker ahead, speed=${yielded.speed}`);
  assert.equal(yielded.yieldReason, "entity");
});

test("NASA Curiosity GLB asset exists in public/models with expected rig nodes", () => {
  const glbPath = path.resolve(process.cwd(), "public/models/nasa-curiosity-clean.glb");
  assert.equal(fs.existsSync(glbPath), true, "public/models/nasa-curiosity-clean.glb must exist");
  const buf = fs.readFileSync(glbPath);
  assert.equal(buf.subarray(0, 4).toString("ascii"), "glTF");
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  const nodeNames = new Set((gltf.nodes || []).map((n) => n.name));
  for (const required of [
    "Chassis",
    "body",
    "suspension_xmember",
    "suspension_axel_L",
    "suspension_axel_R",
    "suspension_arm_B2_L",
    "suspension_arm_B2_R",
    "wheel_01_L",
    "wheel_02_L",
    "wheel_03_L",
    "wheel_01_R",
    "wheel_02_R",
    "wheel_03_R",
    "suspension_steer_F_L",
    "suspension_steer_B_L",
    "suspension_steer_F_R",
    "suspension_steer_B_R",
    "mast_02.001",
    "mast_03.001",
    "arm_01.001",
    "arm_02.001",
    "arm_03.001",
    "arm_04.001",
    "arm_05_head.001",
    "ChemCam",
  ]) {
    assert.equal(nodeNames.has(required), true, `Missing required GLB rig node: ${required}`);
  }
});

test("Different seeds produce different initial headings and non-repeating full-map scan areas", () => {
  const staticColony = colonyCollision(STATIONS);
  const a = spawnCuriosityRover(staticColony, () => 0, { seed: 101, allowColonyTargets: true });
  const b = spawnCuriosityRover(staticColony, () => 0, { seed: 99991, allowColonyTargets: true });
  assert.ok(
    Math.hypot(a.targetX - b.targetX, a.targetZ - b.targetZ) > 5 || Math.abs(a.yaw - b.yaw) > 0.2,
    "Expected distinct seeds to send Curiosity along different initial routes",
  );

  let state = a;
  const scanPoints = [];
  let prevScans = 0;
  for (let i = 0; i < 3600; i++) {
    state = stepCuriosityRover(state, 0.05, staticColony, () => 0);
    if (state.scanCount > prevScans) {
      prevScans = state.scanCount;
      scanPoints.push([state.x, state.z]);
    }
  }
  assert.ok(scanPoints.length >= 3, `Expected multiple scans during free-roam tour, got ${scanPoints.length}`);
  for (let i = 1; i < scanPoints.length; i++) {
    const d = Math.hypot(scanPoints[i][0] - scanPoints[i - 1][0], scanPoints[i][1] - scanPoints[i - 1][1]);
    assert.ok(d > 8, `Expected subsequent scan to pick a different area, moved only ${d.toFixed(2)}m`);
  }
});

test("Curiosity escapes a 3-sided rock trap via alternating reverse turns and target rerouting", () => {
  let state = spawnCuriosityRover([], () => 0, { seed: 42, allowColonyTargets: true });
  // Place Curiosity facing North (-Z) inside a tight U-pocket of boulders
  const trap = [
    { x: -17, z: 5.5, radius: 1.8, traversable: false },
    { x: -20.6, z: 8.5, radius: 1.7, traversable: false },
    { x: -13.4, z: 8.5, radius: 1.7, traversable: false },
  ];
  state = { ...state, x: -17, z: 10, yaw: 0, targetX: -17, targetZ: -25, stuckAnchorX: -17, stuckAnchorZ: 10 };
  const initialTargetX = state.targetX;
  const initialTargetZ = state.targetZ;

  for (let i = 0; i < 500; i++) {
    state = stepCuriosityRover(state, 0.05, trap, () => 0);
    const hull = curiosityFootprint(0, 0, state.yaw);
    for (const o of trap) {
      assert.equal(overlapBody(state.x, state.z, hull, o), null, "Must not clip boulders during trap escape");
    }
  }
  const escapedDist = Math.hypot(state.x - (-17), state.z - 10);
  assert.ok(escapedDist > 4.5, `Expected Curiosity to back out & escape pocket, moved only ${escapedDist.toFixed(2)}m`);
  assert.ok(
    state.targetX !== initialTargetX || state.targetZ !== initialTargetZ,
    "Expected trapped rover to reroute to a new reachable destination",
  );
});

test("Curiosity escapes tight obstacle wall with rear boulders without left-right/back-forth oscillation", () => {
  const staticColony = colonyCollision(STATIONS);
  // Wide blocking boulder cluster right ahead of nose + a rock 3.8m behind rear bumper
  const obstacles = [
    ...staticColony,
    { x: -17, z: 6.2, radius: 1.7, traversable: false },
    { x: -19.8, z: 7.4, radius: 1.7, traversable: false },
    { x: -14.2, z: 7.4, radius: 1.7, traversable: false },
    { x: -17, z: 15.0, radius: 1.3, traversable: false },
  ];
  let state = spawnCuriosityRover(obstacles, () => 0, { seed: 31415, allowColonyTargets: true });
  state = {
    ...state,
    x: -17,
    z: 9.85,
    yaw: 0,
    targetX: -17,
    targetZ: -25,
    stuckAnchorX: -17,
    stuckAnchorZ: 9.85,
  };

  for (let i = 0; i < 600; i++) {
    state = stepCuriosityRover(state, 0.05, obstacles, () => 0);
  }
  const escapeDist = Math.hypot(state.x - (-17), state.z - 9.85);
  assert.ok(escapeDist > 8.0, `Expected rover to escape obstacle pocket cleanly without looping, moved ${escapeDist.toFixed(2)}m`);

  // Verify sustained multi-minute roam across colony & rocks makes net window progress without freezing
  let anchorX = state.x;
  let anchorZ = state.z;
  let stalledWindows = 0;
  for (let w = 0; w < 8; w++) {
    for (let i = 0; i < 600; i++) {
      state = stepCuriosityRover(state, 0.05, obstacles, () => 0);
    }
    const movedInWindow = Math.hypot(state.x - anchorX, state.z - anchorZ);
    if (movedInWindow < 2.5 && state.phase === "driving") stalledWindows += 1;
    anchorX = state.x;
    anchorZ = state.z;
  }
  assert.equal(stalledWindows, 0, `Expected zero 30s stalled driving windows, saw ${stalledWindows}`);
});
