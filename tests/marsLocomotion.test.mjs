import test from 'node:test';
import assert from 'node:assert/strict';
import { stepMarsLocomotion } from '../game/marsLocomotion.ts';
import { boxObstacle } from '../game/collision.ts';
import { spawnWalker } from '../game/navigation.ts';
const flat = () => 0;

test('airborne movement ignores steering, sprint and camera yaw while preserving momentum', () => {
  const walker = { ...spawnWalker(), vx: 1.5, vz: -2 };
  const jump = { height: 1, velocity: .5 };
  const neutral = stepMarsLocomotion(walker, jump, new Set(), .02, flat);
  const steering = stepMarsLocomotion({ ...walker, yaw: Math.PI }, jump, new Set(['s', 'd', 'shift', 'jump']), .02, flat);
  for (const key of ['x', 'z', 'vx', 'vz']) assert.equal(steering.walker[key], neutral.walker[key]);
  assert.equal(steering.walker.vx, 1.5);
  assert.equal(steering.walker.vz, -2);
  assert.deepEqual(steering.jump, neutral.jump);
});

test('a stationary astronaut cannot start translating in mid-air', () => {
  const result = stepMarsLocomotion(spawnWalker(), { height: .5, velocity: 1 }, new Set(['w']), .05, flat);
  assert.equal(result.walker.z, 12);
  assert.equal(result.walker.vz, 0);
});

test('jump altitude follows its world-space arc above sloped terrain', () => {
  const walker = { ...spawnWalker(), x: 0, vx: 2 };
  const slope = x => x * .5;
  const result = stepMarsLocomotion(walker, { height: 2, velocity: 1 }, new Set(), .05, slope);
  const actualWorldY = slope(result.walker.x) + result.jump.height;
  assert.ok(Math.abs(actualWorldY - (2 + .05 - .5 * 3.71 * .05 ** 2)) < 1e-10);
});

test('ground contact ends flight and restores walking control', () => {
  const landing = stepMarsLocomotion({ ...spawnWalker(), vx: 1 }, { height: .001, velocity: -2 }, new Set(['a']), .02, flat);
  assert.deepEqual(landing.jump, { height: 0, velocity: 0 });
  const walking = stepMarsLocomotion(landing.walker, landing.jump, new Set(['a']), .05, flat);
  assert.ok(walking.walker.vx < landing.walker.vx);
});

test('airborne collision removes velocity into a wall', () => {
  const wall = boxObstacle(1, 12, .1, 5);
  let state = { walker: { ...spawnWalker(), vx: 4 }, jump: { height: 1, velocity: 0 } };
  for (let i = 0; i < 8; i++) state = stepMarsLocomotion(state.walker, state.jump, new Set(), .02, flat, [wall]);
  assert.ok(state.walker.x < .6);
  assert.ok(Math.abs(state.walker.vx) < .001);
});

test('analog thumbstick scales locomotion smoothly and activates outer-ring sprint', () => {
  let gentle = spawnWalker();
  let walking = spawnWalker();
  let sprinting = spawnWalker();
  const startZ = gentle.z;
  for (let i = 0; i < 12; i++) {
    gentle = stepMarsLocomotion(gentle, { height: 0, velocity: 0 }, new Set(), 0.05, flat, [], { forward: 0.4, side: 0 }).walker;
    walking = stepMarsLocomotion(walking, { height: 0, velocity: 0 }, new Set(), 0.05, flat, [], { forward: 0.85, side: 0 }).walker;
    sprinting = stepMarsLocomotion(sprinting, { height: 0, velocity: 0 }, new Set(), 0.05, flat, [], { forward: 1, side: 0, sprint: true }).walker;
  }
  assert.ok(gentle.z < startZ && walking.z < gentle.z && sprinting.z < walking.z);
});


test('rocks block walking at distant coordinates, but clear jumps cross them',()=>{
 const rock={x:300,z:0,radius:.6,topY:.5};
 let w={...spawnWalker(),x:298,z:0};
 for(let i=0;i<80;i++)w=stepMarsLocomotion(w,{height:0,velocity:0},new Set(['d']),.02,flat,[rock],undefined,Infinity).walker;
 assert.ok(w.x<299.1);
 const clear=stepMarsLocomotion({...w,vx:3},{height:.8,velocity:0},new Set(),.05,flat,[rock],undefined,Infinity);
 assert.ok(clear.walker.x>w.x+.1);
 const tall={...rock,topY:3};
 const blocked=stepMarsLocomotion({...w,vx:3},{height:.8,velocity:0},new Set(),.05,flat,[tall],undefined,Infinity);
 assert.ok(blocked.walker.x<299.1);
});
test('descending onto a rock supports the feet and allows another jump',()=>{
 const rock={x:300,z:0,radius:1,topY:.5};
 const landed=stepMarsLocomotion({...spawnWalker(),x:300,z:0},{height:.51,velocity:-1},new Set(),.05,flat,[rock],undefined,Infinity);
 assert.equal(landed.jump.height,.5);assert.equal(landed.jump.velocity,0);assert.equal(landed.walker.x,300);
 const hop=stepMarsLocomotion(landed.walker,landed.jump,new Set(['jump']),.05,flat,[rock],undefined,Infinity);
 assert.ok(hop.jump.height>.5);assert.ok(hop.jump.velocity>0);
});
