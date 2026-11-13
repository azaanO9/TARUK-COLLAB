/** Interactive Rover Garage zone, vehicle modification logic, and upgrade mechanics (Mud Tires, Heavy Winch, Robotic Arm). */

export type RoverUpgradeId = "mud_tires" | "heavy_winch" | "robotic_arm";

export type RoverUpgradeDefinition = {
  id: RoverUpgradeId;
  name: string;
  description: string;
  titaniumCost: number;
  iceCoreCost: number;
  powerCost: number;
  icon: string;
};

export const ROVER_UPGRADES: Record<RoverUpgradeId, RoverUpgradeDefinition> = {
  mud_tires: {
    id: "mud_tires",
    name: "Regolith Mud-Traction Tires",
    description: "Deep-lug regolith siping reduces soft soil drag by 85% and boosts hill-climbing torque on steep crater dunes.",
    titaniumCost: 3,
    iceCoreCost: 0,
    powerCost: 10,
    icon: "🛞",
  },
  heavy_winch: {
    id: "heavy_winch",
    name: "High-Tensile Heavy Winch",
    description: "30-meter reinforced steel cable and hydraulic spool. Press H to anchor to nearby rocks and winch up steep crater walls.",
    titaniumCost: 4,
    iceCoreCost: 1,
    powerCost: 15,
    icon: "🪝",
  },
  robotic_arm: {
    id: "robotic_arm",
    name: "Articulated Surface Mining Arm",
    description: "Chassis-mounted robotic drill and spectrometer. Mine rare Cryo-Ice Cores and Titanium veins directly from the driver seat.",
    titaniumCost: 5,
    iceCoreCost: 2,
    powerCost: 20,
    icon: "🦾",
  },
};

export const GARAGE_PAD = {
  x: 18.0,
  z: 11.5,
  radius: 6.2,
  label: "Ares Outpost Alpha Garage & Tuning Bay",
};

export function isInsideGarageZone(x: number, z: number): boolean {
  return Math.hypot(x - GARAGE_PAD.x, z - GARAGE_PAD.z) <= GARAGE_PAD.radius;
}

export type UpgradeCheckResult =
  | { ok: true }
  | { ok: false; reason: string };

export function canPurchaseRoverUpgrade(
  id: RoverUpgradeId,
  installed: readonly RoverUpgradeId[],
  inventory: { titanium: number; iceCores: number },
  teamPower: number,
): UpgradeCheckResult {
  if (installed.includes(id)) {
    return { ok: false, reason: "Upgrade already installed on this chassis." };
  }
  const def = ROVER_UPGRADES[id];
  if (inventory.titanium < def.titaniumCost) {
    return { ok: false, reason: `Need ${def.titaniumCost} Titanium (current: ${inventory.titanium}).` };
  }
  if (inventory.iceCores < def.iceCoreCost) {
    return { ok: false, reason: `Need ${def.iceCoreCost} Ice Cores (current: ${inventory.iceCores}).` };
  }
  if (teamPower < def.powerCost) {
    return { ok: false, reason: `Need ${def.powerCost}% Base Solar Power (current: ${Math.round(teamPower)}%).` };
  }
  return { ok: true };
}

export type WinchState = {
  active: boolean;
  anchor: { x: number; y: number; z: number } | null;
  cableLength: number;
  maxDistance: number;
};

export const DEFAULT_WINCH_STATE: WinchState = {
  active: false,
  anchor: null,
  cableLength: 30,
  maxDistance: 32,
};

/**
 * Finds the nearest anchorable rock or structural column within winch reach (up to 32m).
 */
export function findNearestWinchAnchor(
  roverX: number,
  roverY: number,
  roverZ: number,
  roverYaw: number,
  obstacles: readonly { x: number; z: number; radius: number }[],
  maxReach = 32,
): { x: number; y: number; z: number } | null {
  let best: { x: number; y: number; z: number } | null = null;
  let bestDist = maxReach;

  for (const obs of obstacles) {
    // Only anchor to solid boulder-sized objects (radius >= 0.8)
    if (obs.radius < 0.7) continue;
    const dx = obs.x - roverX;
    const dz = obs.z - roverZ;
    const dist = Math.hypot(dx, dz);
    if (dist > maxReach || dist < 3) continue;

    // Favor anchors within +/- 100 degrees of forward camera/chassis view
    const heading = Math.atan2(-dx, -dz);
    let diff = (heading - roverYaw) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > 1.8) continue;

    if (dist < bestDist) {
      bestDist = dist;
      best = { x: obs.x, y: roverY + 0.5, z: obs.z };
    }
  }

  return best;
}

export type WinchForceResult = {
  fx: number;
  fz: number;
  tension: number;
  distance: number;
  forwardForce: number;
  yawTorque: number;
};

/**
 * Calculates physics pull force vector from winch cable towards anchor.
 * Supports both planar (roverX, roverZ, anchor, targetLength) and full orientation (roverX, roverY, roverZ, roverYaw, anchor).
 */
export function calculateWinchForce(
  roverX: number,
  roverZOrY: number,
  anchorOrRoverZ: { x: number; z: number } | number,
  targetLengthOrYaw: number = 2.0,
  springKOrAnchor?: number | { x: number; z: number },
): WinchForceResult {
  let rX = roverX;
  let rZ = 0;
  let rYaw = 0;
  let targetAnchor: { x: number; z: number };
  let targetLength = 2.0;

  if (typeof anchorOrRoverZ === "number" && typeof springKOrAnchor === "object" && springKOrAnchor !== null) {
    rZ = anchorOrRoverZ;
    rYaw = targetLengthOrYaw;
    targetAnchor = springKOrAnchor;
  } else {
    rZ = roverZOrY;
    targetAnchor = anchorOrRoverZ as { x: number; z: number };
    targetLength = targetLengthOrYaw;
  }

  const dx = targetAnchor.x - rX;
  const dz = targetAnchor.z - rZ;
  const dist = Math.hypot(dx, dz);
  if (dist <= targetLength || dist < 0.1) {
    return { fx: 0, fz: 0, tension: 0, distance: dist, forwardForce: 0, yawTorque: 0 };
  }
  const stretch = dist - targetLength;
  const forceMag = Math.min(65.0, stretch * 18.0);
  const nx = dx / dist;
  const nz = dz / dist;

  // Project pull vector onto rover forward axis (-sin(yaw), -cos(yaw))
  const forwardX = -Math.sin(rYaw);
  const forwardZ = -Math.cos(rYaw);
  const forwardForce = (nx * forwardX + nz * forwardZ) * forceMag;
  const yawTorque = (forwardX * nz - forwardZ * nx) * forceMag * 0.1;

  return {
    fx: nx * forceMag,
    fz: nz * forceMag,
    tension: forceMag,
    distance: dist,
    forwardForce,
    yawTorque,
  };
}

