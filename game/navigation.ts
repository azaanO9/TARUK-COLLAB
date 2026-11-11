/** Pure first-person walking: metres are illustrative world units. No reserve changes. */
import { moveAndSlide, type CollisionObstacle } from "./collision.ts";
export const WALKER_RADIUS = .32;
export const WORLD_LIMIT = 88;
export const WALK_SPEED = 5.2;
/** Illustrative jump motion, not a simulation of lunar suit physics. */
export type JumpState = { height: number; velocity: number };
export function stepJump(
  state: JumpState,
  requested: boolean,
  seconds: number,
  gravity = 5.5,
  launchSpeed = 4.2,
): JumpState {
  const dt = Math.max(0, Math.min(seconds, 0.05));
  let velocity = state.velocity;
  if (requested && state.height <= 0 && velocity <= 0) velocity = launchSpeed;
  velocity -= gravity * dt;
  const height = Math.max(0, state.height + velocity * dt);
  return height === 0 && velocity < 0
    ? { height: 0, velocity: 0 }
    : { height, velocity };
}
export type Walker = {
  x: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
};
export const spawnWalker = (): Walker => ({
  x: 0,
  z: 12,
  vx: 0,
  vz: 0,
  yaw: 0,
});
export function stepWalker(
  w: Walker,
  keys: ReadonlySet<string>,
  seconds: number,
  obstacles: readonly CollisionObstacle[] = [],
  speed = WALK_SPEED,
): Walker {
  const dt = Math.max(0, Math.min(seconds, 0.05));
  if (!dt) return w;
  let side =
    Number(keys.has("d") || keys.has("arrowright")) -
    Number(keys.has("a") || keys.has("arrowleft"));
  let forward =
    Number(keys.has("w") || keys.has("arrowup")) -
    Number(keys.has("s") || keys.has("arrowdown"));
  const length = Math.hypot(side, forward);
  if (length) {
    side /= length;
    forward /= length;
  }
  const tx = (Math.cos(w.yaw) * side - Math.sin(w.yaw) * forward) * speed;
  const tz = (-Math.sin(w.yaw) * side - Math.cos(w.yaw) * forward) * speed;
  const blend = 1 - Math.exp(-14 * dt),
    vx = w.vx + (tx - w.vx) * blend,
    vz = w.vz + (tz - w.vz) * blend;
  const moved = moveAndSlide(w.x, w.z, vx * dt, vz * dt, [{x:0,z:0,radius:WALKER_RADIUS}], obstacles, WORLD_LIMIT);
  let slideX = vx, slideZ = vz;
  for (const n of moved.normals) {
    const into = Math.min(0, slideX * n.nx + slideZ * n.nz);
    slideX -= into * n.nx; slideZ -= into * n.nz;
  }
  return {
    ...w,
    x: moved.x, z: moved.z,
    vx: slideX, vz: slideZ,
  };
}
