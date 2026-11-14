import { stepWalker, WALKER_RADIUS, type MoveAxes, type Walker, type JumpState } from "./navigation.ts";
import { MARS_PHYSICS } from "./marsConfig.ts";
import { overlapDisc, type CollisionObstacle } from "./collision.ts";

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
  const startGround = heightAt(walker.x, walker.z);
  const startY = startGround + jump.height;
  // A landed astronaut may stand on a rock above the terrain and jump again.
  const supported = jump.velocity <= 0 && obstacles.some(o => o.topY !== undefined
    && Math.abs(startY-o.topY)<.025 && overlapDisc(walker.x,walker.z,WALKER_RADIUS,o));
  const airborne = !supported && (jump.height > 0 || jump.velocity > 0);
  const launching = !airborne && keys.has("jump");
  const speed = keys.has("shift") || analog?.sprint ? MARS_PHYSICS.sprintSpeed : MARS_PHYSICS.walkSpeed;
  // Only clear a rock once the feet are above its top. Walls/vehicles remain solid.
  const solid = obstacles.filter(o => o.topY === undefined || startY < o.topY-.025);
  const nextWalker = stepWalker(walker, keys, dt, solid, speed, !airborne, analog, worldLimit);
  const ground = heightAt(nextWalker.x, nextWalker.z);
  let floor = ground;
  for (const o of obstacles) if(o.topY !== undefined && startY >= o.topY-.025
    && overlapDisc(nextWalker.x,nextWalker.z,WALKER_RADIUS,o)) floor=Math.max(floor,o.topY);
  if (!airborne && !launching && (!supported || floor>=startY-.025)) {
    return {walker:nextWalker,jump:{height:Math.max(0,floor-ground),velocity:0}};
  }
  // Integrate world altitude, including falling off or landing on rock tops.
  const initialVelocity = launching ? MARS_PHYSICS.jumpSpeed : jump.velocity;
  const worldY = startY + initialVelocity * dt - .5 * MARS_PHYSICS.gravity * dt * dt;
  const velocity = initialVelocity - MARS_PHYSICS.gravity * dt;
  const nextJump = worldY <= floor && velocity <= 0
    ? {height:Math.max(0,floor-ground),velocity:0}
    : {height:Math.max(0,worldY-ground),velocity};
  return { walker: nextWalker, jump: nextJump };
}
