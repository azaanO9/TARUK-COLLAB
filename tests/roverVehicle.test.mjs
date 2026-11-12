import test from "node:test";
import assert from "node:assert/strict";
import {
  spawnRoverVehicle,
  canEnterRover,
  enterRover,
  exitRover,
  stepRoverVehicle,
  getRoverGear,
  ROVER_MAX_FORWARD,
  ROVER_MAX_REVERSE,
  ROVER_LIMIT,
} from "../game/roverVehicle.ts";

test("spawnRoverVehicle initializes parked at rover station pad", () => {
  const rover = spawnRoverVehicle(17, 10, 0);
  assert.equal(rover.x, 17);
  assert.equal(rover.z, 10);
  assert.equal(rover.speed, 0);
  assert.equal(rover.driving, false);
});

test("canEnterRover detects astronaut proximity correctly", () => {
  const rover = spawnRoverVehicle(17, 10, 0);
  assert.equal(canEnterRover({ x: 17, z: 12 }, rover), true);
  assert.equal(canEnterRover({ x: 17, z: 25 }, rover), false);
  const occupied = { ...rover, driving: true };
  assert.equal(canEnterRover({ x: 17, z: 10 }, occupied), false);
});

test("enterRover and exitRover toggle driving state and calculate exit position", () => {
  const initial = spawnRoverVehicle(10, 5, 0);
  const entered = enterRover(initial);
  assert.equal(entered.driving, true);
  assert.equal(entered.speed, 0);

  const { rover: exited, exitPosition } = exitRover(entered);
  assert.equal(exited.driving, false);
  assert.equal(exited.speed, 0);
  assert.ok(Math.hypot(exitPosition.x - initial.x, exitPosition.z - initial.z) > 1.5);
});

test("accelerating with forward key increases speed up to max limit", () => {
  let rover = enterRover(spawnRoverVehicle(0, 0, 0));
  for (let i = 0; i < 130; i++) {
    rover = stepRoverVehicle(rover, new Set(["w"]), 0.05);
  }
  assert.equal(rover.speed, ROVER_MAX_FORWARD);
  assert.equal(Math.round(rover.speed * 3.6), 30);
  // Forward motion in coordinate system moves along -Z when yaw is 0
  assert.ok(rover.z < 0);
});

test("reversing with s key accelerates backwards up to reverse limit", () => {
  let rover = enterRover(spawnRoverVehicle(0, 0, 0));
  for (let i = 0; i < 60; i++) {
    rover = stepRoverVehicle(rover, new Set(["s"]), 0.05);
  }
  assert.equal(rover.speed, -ROVER_MAX_REVERSE);
  assert.equal(Math.round(Math.abs(rover.speed) * 3.6), 10);
  assert.ok(rover.z > 0);
});

test("steering left and right turns the rover yaw and front wheel angles", () => {
  let rover = enterRover(spawnRoverVehicle(0, 0, 0));
  rover.speed = 8;
  for (let i = 0; i < 20; i++) {
    rover = stepRoverVehicle(rover, new Set(["w", "a"]), 0.05);
  }
  assert.ok(rover.steerAngle > 0);
  assert.notEqual(rover.yaw, 0);
});

test("handbrake decelerates vehicle quickly", () => {
  let rover = enterRover(spawnRoverVehicle(0, 0, 0));
  rover.speed = ROVER_MAX_FORWARD;
  const initialZ = rover.z;
  for (let i = 0; i < 25; i++) {
    rover = stepRoverVehicle(rover, new Set([" "]), 0.05);
  }
  assert.equal(rover.speed, 0);
  assert.ok(initialZ - rover.z < 5, "stops within 5 m on flat ground from 30 km/h");
});

test("collision with obstacles stops or deflects rover", () => {
  let rover = enterRover(spawnRoverVehicle(0, 5, 0));
  rover.speed = 8;
  const obstacle = { x: 0, z: 0, radius: 2 };
  for (let i = 0; i < 40; i++) {
    rover = stepRoverVehicle(rover, new Set(["w"]), 0.05, [obstacle]);
  }
  assert.ok(Math.hypot(rover.x - obstacle.x, rover.z - obstacle.z) >= obstacle.radius);
});

test("finite bounds prevent leaving map", () => {
  let rover = enterRover(spawnRoverVehicle(0, -ROVER_LIMIT + 1, 0));
  rover.speed = 12;
  for (let i = 0; i < 50; i++) {
    rover = stepRoverVehicle(rover, new Set(["w"]), 0.05);
  }
  assert.ok(rover.z >= -ROVER_LIMIT);
});

test("getRoverGear reports D for forward, R for reverse, and N for neutral", () => {
  assert.equal(getRoverGear(0), "N");
  assert.equal(getRoverGear(0.05), "N");
  assert.equal(getRoverGear(-0.08), "N");
  assert.equal(getRoverGear(2.5), "D");
  assert.equal(getRoverGear(-1.8), "R");
});

test("pitch and roll conform accurately without sinking on slopes", () => {
  // Terrain rising along -Z (uphill forward when yaw = 0) and rising along +X (right side high)
  const slopeHeight = (x, z) => -0.25 * z + 0.15 * x;
  let rover = enterRover(spawnRoverVehicle(0, 0, 0, slopeHeight));
  for (let i = 0; i < 40; i++) {
    rover = stepRoverVehicle(rover, new Set(["w"]), 0.05, [], slopeHeight);
  }
  assert.ok(rover.pitch > 0.15, `expected positive nose-up pitch, got ${rover.pitch}`);
  assert.ok(rover.roll > 0.08, `expected positive right-high roll, got ${rover.roll}`);
  assert.ok(rover.chassisY > slopeHeight(rover.x, rover.z), "chassisY remains above terrain surface");
});

test("traversable rocks and rover pad do not block driving while suspension articulates", () => {
  const obstacles = [
    { id: "rover", x: 17, z: 10, radius: 2 },
    { x: 17, z: 6, radius: 0.7, traversable: true },
  ];
  const rockBumpHeight = (x, z) => (Math.hypot(x - 17, z - 6) < 0.8 ? 0.3 : 0);
  let rover = enterRover(spawnRoverVehicle(17, 10, 0, rockBumpHeight));
  for (let i = 0; i < 110; i++) {
    rover = stepRoverVehicle(rover, new Set(["w"]), 0.05, obstacles, rockBumpHeight);
  }
  assert.ok(rover.z < 5, `rover should drive seamlessly over its pad and traversable rocks, reached z=${rover.z}`);

  // When front-left wheel rests on a local rock bump, left rocker articulates upward
  const leftRock = (x, z) => (x < 0 && z < -1.0 ? 0.28 : 0);
  let art = enterRover(spawnRoverVehicle(0, 0, 0, leftRock));
  for (let i = 0; i < 20; i++) {
    art = stepRoverVehicle(art, new Set(), 0.05, [], leftRock);
  }
  assert.ok(art.leftRockerAngle > 0.02, `expected positive left rocker articulation, got ${art.leftRockerAngle}`);
});


test("forward and reverse speed caps are 30 and 10 km/h, including legacy overspeed", () => {
  assert.equal(Math.round(ROVER_MAX_FORWARD * 3.6), 30);
  assert.equal(ROVER_MAX_REVERSE * 3.6, 10);
  for (const [key, limit, initial] of [["w", ROVER_MAX_FORWARD, 13.6], ["s", -ROVER_MAX_REVERSE, -8]]) {
    let rover = {...enterRover(spawnRoverVehicle(0,0)), speed: initial};
    rover = stepRoverVehicle(rover, new Set([key]), .05);
    assert.equal(rover.speed, limit);
  }
});

test("analog rover steering, throttle, reverse and handbrake respond proportionally", () => {
  let halfSteer = enterRover(spawnRoverVehicle(0, 0));
  let fullSteer = enterRover(spawnRoverVehicle(0, 0));
  for (let i = 0; i < 20; i++) {
    halfSteer = stepRoverVehicle(halfSteer, new Set(), 0.05, [], () => 0, () => 0, { throttle: 1, steer: 0.4 });
    fullSteer = stepRoverVehicle(fullSteer, new Set(), 0.05, [], () => 0, () => 0, { throttle: 1, steer: 1 });
  }
  assert.ok(halfSteer.speed > 1);
  assert.ok(Math.abs(fullSteer.yaw) > Math.abs(halfSteer.yaw));

  let partialThrottle = enterRover(spawnRoverVehicle(0, 0));
  for (let i = 0; i < 20; i++) {
    partialThrottle = stepRoverVehicle(partialThrottle, new Set(), 0.05, [], () => 0, () => 0, { throttle: 0.45 });
  }
  assert.ok(partialThrottle.speed > 0.2 && partialThrottle.speed < halfSteer.speed);

  let reversing = enterRover(spawnRoverVehicle(0, 0));
  for (let i = 0; i < 16; i++) {
    reversing = stepRoverVehicle(reversing, new Set(), 0.05, [], () => 0, () => 0, { throttle: -1 });
  }
  assert.ok(reversing.speed < -0.5);

  const braked = stepRoverVehicle({ ...reversing }, new Set(), 0.05, [], () => 0, () => 0, { handbrake: true });
  assert.equal(braked.handbrake, true);
  assert.ok(Math.abs(braked.speed) < Math.abs(reversing.speed));
});
