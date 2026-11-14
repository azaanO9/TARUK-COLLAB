import { stepWalker, type MoveAxes, type Walker, type JumpState } from "./navigation.ts";
import { MARS_PHYSICS } from "./marsConfig.ts";
import type { CollisionObstacle } from "./collision.ts";

/** Ballistic flight keeps horizontal momentum until surface contact. */
export function stepMarsLocomotion(
  walker: Walker,
  jump: JumpState,
  keys: ReadonlySet<string>,
  seconds: number,
  heightAt: (x: number, z: number) => number,
  obstacles: readonly CollisionObstacle[] = [],
  analog?: MoveAxes,
  worldLimit?: number,
) {
  const dt = Math.max(0, Math.min(seconds, .05));
  if (!dt) return { walker, jump };
  const airborne = jump.height > 0 || jump.velocity > 0;
  const launching = !airborne && keys.has("jump");
  const speed = keys.has("shift") || analog?.sprint ? MARS_PHYSICS.sprintSpeed : MARS_PHYSICS.walkSpeed;
  const nextWalker = stepWalker(walker, keys, dt, obstacles, speed, !airborne, analog, worldLimit);
  if (!airborne && !launching) return { walker: nextWalker, jump: { height: 0, velocity: 0 } };

  // Integrate world altitude, so flying over rising/falling terrain cannot lift the astronaut.
  const startY = heightAt(walker.x, walker.z) + jump.height;
  const initialVelocity = launching ? MARS_PHYSICS.jumpSpeed : jump.velocity;
  const worldY = startY + initialVelocity * dt - .5 * MARS_PHYSICS.gravity * dt * dt;
  const velocity = initialVelocity - MARS_PHYSICS.gravity * dt;
  const clearance = worldY - heightAt(nextWalker.x, nextWalker.z);
  const nextJump = clearance <= 0 ? { height: 0, velocity: 0 } : { height: clearance, velocity };
  return { walker: nextWalker, jump: nextJump };
}
