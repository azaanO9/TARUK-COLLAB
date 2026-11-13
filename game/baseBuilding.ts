/** Modular base building system: snap-to-grid, module recipes, collision validation, and power/O2 grid simulation. */

export type BaseModuleKind = "tunnel" | "habitat" | "solar_array";

export type BaseModuleRecipe = {
  kind: BaseModuleKind;
  name: string;
  description: string;
  titaniumCost: number;
  iceCoreCost: number;
  powerCost: number;
  collisionRadius: number;
  connectionRadius: number;
  powerOutput: number;
  powerDrain: number;
  o2Bonus: number;
};

export const MODULE_RECIPES: Record<BaseModuleKind, BaseModuleRecipe> = {
  tunnel: {
    kind: "tunnel",
    name: "Pressurized Connector Tunnel",
    description: "Reinforced titanium conduit corridor linking habitats and distributing power/O2 across Outpost Alpha.",
    titaniumCost: 2,
    iceCoreCost: 0,
    powerCost: 5,
    collisionRadius: 2.2,
    connectionRadius: 8.5,
    powerOutput: 0,
    powerDrain: 1,
    o2Bonus: 5,
  },
  habitat: {
    kind: "habitat",
    name: "Modular Habitation Pod",
    description: "Pressurized living & life-support dome expanding crew living space and boosting global O2 stores (+20).",
    titaniumCost: 4,
    iceCoreCost: 2,
    powerCost: 12,
    collisionRadius: 3.6,
    connectionRadius: 9.0,
    powerOutput: 0,
    powerDrain: 3,
    o2Bonus: 20,
  },
  solar_array: {
    kind: "solar_array",
    name: "Deployable Heavy Solar Array",
    description: "Dual tracking photovoltaic array feeding clean solar wattage (+25) directly into the outpost grid.",
    titaniumCost: 3,
    iceCoreCost: 0,
    powerCost: 6,
    collisionRadius: 3.0,
    connectionRadius: 8.0,
    powerOutput: 25,
    powerDrain: 0,
    o2Bonus: 0,
  },
};

export type PlacedModule = {
  id: string;
  kind: BaseModuleKind;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  connected: boolean;
  builderCallsign: string;
  createdAt: number;
};

export const GRID_SNAP_SIZE = 4;
export const OUTPOST_CORE_POS = { x: -2, z: -26, radius: 9 };

export function snapToBuildingGrid(x: number, z: number, step = GRID_SNAP_SIZE): { x: number; z: number } {
  return {
    x: Math.round(x / step) * step,
    z: Math.round(z / step) * step,
  };
}

export type BuildingSupplies = {
  titanium: number;
  iceCores: number;
  powerCells?: number;
};

export type ModuleValidationResult =
  | { valid: true; reason: string; connected: boolean }
  | { valid: false; reason: string };

export function isConnectedToCore(
  x: number,
  z: number,
  kind: BaseModuleKind,
  existingModules: readonly PlacedModule[],
): boolean {
  const recipe = MODULE_RECIPES[kind];
  // Direct distance to main habitat core
  if (Math.hypot(x - OUTPOST_CORE_POS.x, z - OUTPOST_CORE_POS.z) <= recipe.connectionRadius + OUTPOST_CORE_POS.radius) {
    return true;
  }
  // Distance to another connected module
  for (const m of existingModules) {
    if (!m.connected) continue;
    const otherRecipe = MODULE_RECIPES[m.kind];
    const reach = Math.max(recipe.connectionRadius, otherRecipe.connectionRadius);
    if (Math.hypot(x - m.x, z - m.z) <= reach) {
      return true;
    }
  }
  return false;
}

export function validateModulePlacement(
  kind: BaseModuleKind,
  x: number,
  z: number,
  existingModules: readonly PlacedModule[],
  obstacles: readonly { x: number; z: number; radius: number }[] = [],
  supplies?: BuildingSupplies,
  teamPower?: number,
  playerPos?: { x: number; z: number },
  heightSampler?: (x: number, z: number) => number,
): ModuleValidationResult {
  const recipe = MODULE_RECIPES[kind];

  // Resource checks
  if (supplies && supplies.titanium < recipe.titaniumCost) {
    return { valid: false, reason: `Insufficient Titanium: requires ${recipe.titaniumCost}` };
  }
  if (supplies && supplies.iceCores < recipe.iceCoreCost) {
    return { valid: false, reason: `Insufficient Cryo Ice Cores: requires ${recipe.iceCoreCost}` };
  }
  if (teamPower !== undefined && teamPower < recipe.powerCost) {
    return { valid: false, reason: `Insufficient Base Power: requires ${recipe.powerCost}%` };
  }

  // Player distance check
  if (playerPos) {
    const distToPlayer = Math.hypot(x - playerPos.x, z - playerPos.z);
    if (distToPlayer > 26) {
      return { valid: false, reason: "Too far from astronaut (max 26 m)" };
    }
    if (distToPlayer < recipe.collisionRadius + 0.8) {
      return { valid: false, reason: "Astronaut is obstructing placement zone" };
    }
  }

  // Collision with static outpost obstacles (stations, rocks, crater rim)
  for (const o of obstacles) {
    const d = Math.hypot(x - o.x, z - o.z);
    if (d < recipe.collisionRadius + o.radius + 0.4) {
      return { valid: false, reason: "Obstructed by colony structure or boulder" };
    }
  }

  // Collision with existing modules
  for (const m of existingModules) {
    const d = Math.hypot(x - m.x, z - m.z);
    const mRadius = MODULE_RECIPES[m.kind].collisionRadius;
    if (d < recipe.collisionRadius + mRadius + 0.3) {
      return { valid: false, reason: "Obstructed by another placed module" };
    }
  }

  // Slope check (sample 4 cardinal points at radius)
  if (heightSampler) {
    const centerY = heightSampler(x, z);
    const deltas = [
      heightSampler(x + recipe.collisionRadius * 0.8, z),
      heightSampler(x - recipe.collisionRadius * 0.8, z),
      heightSampler(x, z + recipe.collisionRadius * 0.8),
      heightSampler(x, z - recipe.collisionRadius * 0.8),
    ];
    for (const h of deltas) {
      if (Math.abs(h - centerY) > 1.85) {
        return { valid: false, reason: "Terrain slope too steep for structural foundation" };
      }
    }
  }

  // Grid connectivity
  const connected = isConnectedToCore(x, z, kind, existingModules);
  if (!connected) {
    return { valid: false, reason: "Must connect within conduit range of Habitat or existing module" };
  }

  return { valid: true, reason: "Optimal foundation & conduit alignment", connected: true };
}

export type BaseGridTelemetry = {
  totalModules: number;
  totalPowerGeneration: number;
  totalPowerConsumption: number;
  netPowerDelta: number;
  bonusO2Capacity: number;
  connectedCount: number;
};

export function calculateBaseGrid(modules: readonly PlacedModule[]): BaseGridTelemetry {
  let totalPowerGeneration = 0;
  let totalPowerConsumption = 0;
  let bonusO2Capacity = 0;
  let connectedCount = 0;

  for (const m of modules) {
    if (!m.connected) continue;
    connectedCount++;
    const r = MODULE_RECIPES[m.kind];
    totalPowerGeneration += r.powerOutput;
    totalPowerConsumption += r.powerDrain;
    bonusO2Capacity += r.o2Bonus;
  }

  return {
    totalModules: modules.length,
    totalPowerGeneration,
    totalPowerConsumption,
    netPowerDelta: totalPowerGeneration - totalPowerConsumption,
    bonusO2Capacity,
    connectedCount,
  };
}

