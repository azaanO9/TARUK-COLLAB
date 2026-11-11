import { overlapBody, type CollisionObstacle } from "./collision.ts";
import { roverFootprint, ROVER_WHEEL_BASE, type RoverVehicle } from "./roverVehicle.ts";

export const LIDAR_RANGE = 30;
export type LidarContact = { x: number; z: number; radius: number; inPath: boolean; kind: "rock" | "structure" };
export type LidarScan = { range: number; contacts: LidarContact[]; threatDistance: number | null };

function rayDistance(x: number, z: number, dx: number, dz: number, obstacle: CollisionObstacle) {
  const ox = x - obstacle.x, oz = z - obstacle.z;
  if (obstacle.halfX !== undefined && obstacle.halfZ !== undefined) {
    const c = Math.cos(obstacle.yaw ?? 0), s = Math.sin(obstacle.yaw ?? 0);
    const origins = [ox * c - oz * s, ox * s + oz * c];
    const directions = [dx * c - dz * s, dx * s + dz * c];
    const extents = [obstacle.halfX, obstacle.halfZ];
    let near = 0, far = LIDAR_RANGE;
    for (let axis = 0; axis < 2; axis++) {
      if (Math.abs(directions[axis]) < 1e-8) {
        if (Math.abs(origins[axis]) > extents[axis]) return Infinity;
      } else {
        const a = (-extents[axis] - origins[axis]) / directions[axis];
        const b = (extents[axis] - origins[axis]) / directions[axis];
        near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
      }
    }
    return near <= far ? near : Infinity;
  }
  const projection = -(ox * dx + oz * dz);
  const discriminant = projection * projection - (ox * ox + oz * oz - obstacle.radius * obstacle.radius);
  if (discriminant < 0) return Infinity;
  const exit = projection + Math.sqrt(discriminant);
  return exit < 0 ? Infinity : Math.max(0, projection - Math.sqrt(discriminant));
}

/** Simulated 2D lidar: nearest returns occlude farther objects on each beam. */
export function scanRoverLidar(rover: RoverVehicle, obstacles: readonly CollisionObstacle[]): LidarScan {
  const nearby = obstacles.filter(o => o.id !== "rover" && !o.traversable && Math.hypot(o.x - rover.x, o.z - rover.z) - o.radius <= LIDAR_RANGE);
  const detected = new Set<CollisionObstacle>();
  for (let beam = 0; beam < 180; beam++) {
    const angle = rover.yaw + beam * Math.PI / 90;
    const dx = -Math.sin(angle), dz = -Math.cos(angle);
    let closest = LIDAR_RANGE, hit: CollisionObstacle | undefined;
    for (const obstacle of nearby) {
      const distance = rayDistance(rover.x, rover.z, dx, dz, obstacle);
      if (distance < closest) { closest = distance; hit = obstacle; }
    }
    if (hit) detected.add(hit);
  }
  const hazards = new Set<CollisionObstacle>();
  let threatDistance: number | null = null;
  let x = rover.x, z = rover.z, yaw = rover.yaw;
  const direction = rover.speed < -.05 ? -1 : 1;
  for (let distance = 0; distance <= 12; distance += .25) {
    for (const obstacle of detected) {
      if (overlapBody(x, z, roverFootprint(0, 0, yaw), obstacle)) {
        hazards.add(obstacle); threatDistance ??= distance;
      }
    }
    yaw += direction * .25 / ROVER_WHEEL_BASE * Math.tan(rover.steerAngle);
    x -= Math.sin(yaw) * .25 * direction; z -= Math.cos(yaw) * .25 * direction;
  }
  return {
    range: LIDAR_RANGE, threatDistance,
    contacts: [...detected].map(o => ({ x: o.x, z: o.z, radius: o.radius, inPath: hazards.has(o), kind: o.halfX === undefined ? "rock" : "structure" })),
  };
}
