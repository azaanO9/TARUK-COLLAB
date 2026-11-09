/** Pure first-person walking: metres are illustrative world units. No reserve changes. */
export const WORLD_LIMIT = 88;
export const WALK_SPEED = 5.2;
/** Illustrative jump motion, not a simulation of lunar suit physics. */
export type JumpState = { height: number; velocity: number };
export function stepJump(
  state: JumpState,
  requested: boolean,
  seconds: number,
  gravity = 5.5,
): JumpState {
  const dt = Math.max(0, Math.min(seconds, 0.05));
  let velocity = state.velocity;
  if (requested && state.height <= 0 && velocity <= 0) velocity = 4.2;
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
  obstacles: readonly { x: number; z: number; radius: number }[] = [],
  speed = WALK_SPEED,
): Walker {
  const dt = Math.max(0, Math.min(seconds, 0.05));
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
  let x = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, w.x + vx * dt)),
    z = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, w.z + vz * dt));
  for (const o of obstacles) {
    const dx = x - o.x,
      dz = z - o.z,
      d = Math.hypot(dx, dz);
    if (d < o.radius) {
      const nx = d ? dx / d : 1,
        nz = d ? dz / d : 0;
      x = o.x + nx * o.radius;
      z = o.z + nz * o.radius;
    }
  }
  return {
    ...w,
    x: Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, x)),
    z: Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, z)),
    vx,
    vz,
  };
}
