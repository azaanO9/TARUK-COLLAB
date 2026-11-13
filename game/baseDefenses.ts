/** Solar-powered perimeter defenses (Laser Grids & EMP Emitters) for Outpost Alpha. */

export type DefenseKind = "laser_grid" | "emp_emitter";

export type BaseDefenseUnit = {
  id: string;
  kind: DefenseKind;
  x: number;
  z: number;
  radius: number;
  powerDraw: number;
  active: boolean;
  lastPulseAt: number; // simulation seconds of last EMP / beam flare
  ownerCallsign: string;
};

export type CraftInventory = {
  titanium: number;
  iceCores: number;
  powerCells: number;
};

export type DefenseRecipe = {
  kind: DefenseKind;
  name: string;
  description: string;
  titaniumCost: number;
  iceCoreCost: number;
  powerCost: number;
  radius: number;
  powerDrawPerShift: number;
};

export const DEFENSE_RECIPES: Record<DefenseKind, DefenseRecipe> = {
  laser_grid: {
    kind: "laser_grid",
    name: "Perimeter Laser Grid",
    description:
      "Projects high-output optical containment beams around its pylon (11 m radius) that repel Martian Stalkers approaching Outpost Alpha.",
    titaniumCost: 2,
    iceCoreCost: 0,
    powerCost: 6,
    radius: 11.5,
    powerDrawPerShift: 3,
  },
  emp_emitter: {
    kind: "emp_emitter",
    name: "Cryo-Cooled EMP Emitter",
    description:
      "Solar-charged pulse spire (15.5 m radius) discharging an electromagnetic shockwave whenever hostile Stalkers breach the fog perimeter.",
    titaniumCost: 3,
    iceCoreCost: 2,
    powerCost: 10,
    radius: 15.5,
    powerDrawPerShift: 5,
  },
};

export function canCraftDefense(
  kind: DefenseKind,
  inventory: CraftInventory,
  teamPower: number,
): { ok: boolean; reason?: string } {
  const recipe = DEFENSE_RECIPES[kind];
  if (inventory.titanium < recipe.titaniumCost) {
    return { ok: false, reason: `Need ${recipe.titaniumCost} Titanium (mine Ice Caves).` };
  }
  if (inventory.iceCores < recipe.iceCoreCost) {
    return { ok: false, reason: `Need ${recipe.iceCoreCost} Ice Cores (mine Ice Caves).` };
  }
  if (teamPower < recipe.powerCost) {
    return { ok: false, reason: `Need ${recipe.powerCost} Base Solar Power.` };
  }
  return { ok: true };
}

export function createDefenseUnit(
  id: string,
  kind: DefenseKind,
  x: number,
  z: number,
  ownerCallsign: string,
  baseSolarPower: number,
): BaseDefenseUnit {
  const recipe = DEFENSE_RECIPES[kind];
  return {
    id,
    kind,
    x: Math.round(x * 100) / 100,
    z: Math.round(z * 100) / 100,
    radius: recipe.radius,
    powerDraw: recipe.powerDrawPerShift,
    active: baseSolarPower > 5,
    lastPulseAt: -10,
    ownerCallsign,
  };
}

export function isPointProtectedByDefense(
  x: number,
  z: number,
  defenses: readonly BaseDefenseUnit[],
  basePower: number,
): BaseDefenseUnit | null {
  if (basePower <= 3) return null;
  for (const unit of defenses) {
    if (!unit.active) continue;
    if (Math.hypot(x - unit.x, z - unit.z) <= unit.radius) {
      return unit;
    }
  }
  return null;
}

