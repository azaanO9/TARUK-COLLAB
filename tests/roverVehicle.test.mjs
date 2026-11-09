import test from "node:test";
import assert from "node:assert/strict";
import {
  spawnRoverVehicle,
  canEnterRover,
  enterRover,
  exitRover,
  stepRoverVehicle,
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
  for (let i = 0; i < 60; i++) {
    rover = stepRoverVehicle(rover, new Set(["w"]), 0.05);
  }
  assert.ok(rover.speed > 5);
  assert.ok(rover.speed <= ROVER_MAX_FORWARD);
  // Forward motion in coordinate system moves along -Z when yaw is 0
  assert.ok(rover.z < 0);
});

test("reversing with s key accelerates backwards up to reverse limit", () => {
  let rover = enterRover(spawnRoverVehicle(0, 0, 0));
  for (let i = 0; i < 40; i++) {
    rover = stepRoverVehicle(rover, new Set(["s"]), 0.05);
  }
  assert.ok(rover.speed < 0);
  assert.ok(rover.speed >= -ROVER_MAX_REVERSE);
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
  rover.speed = 10;
  const initialSpeed = rover.speed;
  for (let i = 0; i < 5; i++) {
    rover = stepRoverVehicle(rover, new Set([" "]), 0.05);
  }
  assert.ok(rover.speed < initialSpeed - 4);
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
