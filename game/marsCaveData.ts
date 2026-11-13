/** Deterministic underground Ice Cave biome heightmap, portal coordinates, obstacles, and mineable ore nodes. */
import type { CollisionObstacle } from "./collision.ts";

export type CaveEntrance = {
  id: string;
  label: string;
  surfaceX: number;
  surfaceZ: number;
  caveSpawnX: number;
  caveSpawnZ: number;
};

export type MineableNode = {
  id: string;
  kind: "ice_core" | "titanium";
  x: number;
  z: number;
  yieldAmount: number;
  collected?: boolean;
};

export const CAVE_BOUNDARY_RADIUS = 36;

export const CAVE_ENTRANCES: readonly CaveEntrance[] = [
  {
    id: "north-rift",
    label: "North Crater Ice Rift",
    surfaceX: 34,
    surfaceZ: -32,
    caveSpawnX: 0,
    caveSpawnZ: 27,
  },
  {
    id: "west-tube",
    label: "South-West Lava Tube",
    surfaceX: -44,
    surfaceZ: 34,
    caveSpawnX: -24,
    caveSpawnZ: -12,
  },
];

export const CAVE_EXIT_PORTAL = {
  x: 0,
  z: 30,
  radius: 3.4,
  label: "Surface Ascent Lift",
};

/** Continuous cavern floor elevation inside the procedural sub-surface ice biome. */
export function caveHeightAt(x: number, z: number): number {
  const spawnFlat = Math.min(
    Math.hypot(x - CAVE_EXIT_PORTAL.x, z - CAVE_EXIT_PORTAL.z),
    Math.hypot(x + 24, z + 12),
  );
  const blend = Math.max(0, Math.min(1, (spawnFlat - 3.5) / 4.5));
  const h =
    Math.sin(x * 0.19) * Math.cos(z * 0.17) * 0.65 +
    Math.sin((x + z) * 0.34) * 0.24 -
    0.35 * Math.exp(-((x * x + z * z) / 280));
  return h * blend;
}

/** Basalt pillars and crystal stalagmite clusters obstructing walking inside the cavern. */
export const CAVE_PILLARS: readonly CollisionObstacle[] = [
  { id: "pillar-center-nw", x: -9, z: -7, radius: 2.1 },
  { id: "pillar-center-ne", x: 10, z: -8, radius: 2.4 },
  { id: "pillar-mid-e", x: 14, z: 8, radius: 2.0 },
  { id: "pillar-mid-w", x: -13, z: 9, radius: 2.2 },
  { id: "pillar-deep-n", x: 1, z: -19, radius: 2.8 },
  { id: "pillar-deep-sw", x: -17, z: -21, radius: 1.9 },
  { id: "pillar-deep-se", x: 20, z: -18, radius: 2.1 },
];

export const INITIAL_CAVE_NODES: readonly MineableNode[] = [
  { id: "ice-1", kind: "ice_core", x: -6, z: 12, yieldAmount: 1 },
  { id: "ice-2", kind: "ice_core", x: 11, z: -2, yieldAmount: 1 },
  { id: "ice-3", kind: "ice_core", x: -20, z: -4, yieldAmount: 1 },
  { id: "ice-4", kind: "ice_core", x: 6, z: -24, yieldAmount: 2 },
  { id: "ti-1", kind: "titanium", x: 8, z: 14, yieldAmount: 1 },
  { id: "ti-2", kind: "titanium", x: -12, z: -14, yieldAmount: 1 },
  { id: "ti-3", kind: "titanium", x: 22, z: -10, yieldAmount: 2 },
  { id: "ti-4", kind: "titanium", x: -4, z: -26, yieldAmount: 2 },
];

export function nearestCaveEntrance(x: number, z: number): { entrance: CaveEntrance; distance: number } {
  let best = CAVE_ENTRANCES[0];
  let bestDist = Infinity;
  for (const e of CAVE_ENTRANCES) {
    const d = Math.hypot(x - e.surfaceX, z - e.surfaceZ);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return { entrance: best, distance: bestDist };
}

