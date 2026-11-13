/** Procedural AI state machine for Martian Stalker shadow entities on surface storms & ice caves. */
import type { BaseDefenseUnit } from "./baseDefenses.ts";
import type { WeatherEventType } from "./marsWeather.ts";
import { CAVE_BOUNDARY_RADIUS } from "./marsCaveData.ts";

export type StalkerBehaviorState = "dormant" | "stalking" | "approaching" | "repelled";

export type StalkerEntity = {
  id: string;
  biome: "surface" | "cave";
  x: number;
  z: number;
  yaw: number;
  speed: number;
  state: StalkerBehaviorState;
  alertness: number; // 0..1
  repelTimer: number; // seconds remaining before re-engaging
  attackCooldown: number;
  phaseOffset: number;
};

export type StalkerPlayerTarget = {
  id: string;
  x: number;
  z: number;
  biome: "surface" | "cave";
  inRover?: boolean;
  headlightYaw?: number;
  headlightsOn?: boolean;
};

export type StalkerTickResult = {
  stalkers: StalkerEntity[];
  triggeredDefenses: string[];
  strikes: { playerId: string; suitLoss: number; moraleLoss: number; stalkerId: string }[];
};

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export function spawnInitialStalkers(): StalkerEntity[] {
  return [
    {
      id: "stalker-surface-ne",
      biome: "surface",
      x: 56,
      z: -48,
      yaw: 0.7,
      speed: 0,
      state: "dormant",
      alertness: 0.2,
      repelTimer: 0,
      attackCooldown: 0,
      phaseOffset: 0.2,
    },
    {
      id: "stalker-surface-sw",
      biome: "surface",
      x: -54,
      z: 46,
      yaw: -2.1,
      speed: 0,
      state: "dormant",
      alertness: 0.25,
      repelTimer: 0,
      attackCooldown: 0,
      phaseOffset: 2.1,
    },
    {
      id: "stalker-cave-deep",
      biome: "cave",
      x: 4,
      z: -21,
      yaw: 0,
      speed: 0,
      state: "stalking",
      alertness: 0.65,
      repelTimer: 0,
      attackCooldown: 0,
      phaseOffset: 1.4,
    },
    {
      id: "stalker-cave-west",
      biome: "cave",
      x: -16,
      z: -15,
      yaw: 1.1,
      speed: 0,
      state: "stalking",
      alertness: 0.55,
      repelTimer: 0,
      attackCooldown: 0,
      phaseOffset: 3.7,
    },
  ];
}

export function stepStalkers(
  stalkers: readonly StalkerEntity[],
  players: readonly StalkerPlayerTarget[],
  defenses: readonly BaseDefenseUnit[],
  weather: WeatherEventType,
  tempC: number,
  baseSolarPower: number,
  dt: number,
  simTime: number,
): StalkerTickResult {
  const safeDt = clamp(dt, 0, 0.1);
  const surfaceActive = weather === "DUST_STORM" || tempC <= -72;
  const triggeredDefenses: string[] = [];
  const strikes: { playerId: string; suitLoss: number; moraleLoss: number; stalkerId: string }[] = [];

  const next = stalkers.map((entity) => {
    const s = { ...entity };
    if (s.attackCooldown > 0) s.attackCooldown = Math.max(0, s.attackCooldown - safeDt);
    if (s.repelTimer > 0) {
      s.repelTimer = Math.max(0, s.repelTimer - safeDt);
      s.state = "repelled";
    }

    const activeInBiome = s.biome === "cave" || surfaceActive;
    if (!activeInBiome) {
      s.state = "dormant";
      s.speed = 0;
      s.alertness = Math.max(0.1, s.alertness - safeDt * 0.2);
      // Retreat quietly to crater fog perimeter
      const anchorX = s.id.includes("-ne") ? 60 : -58;
      const anchorZ = s.id.includes("-ne") ? -50 : 48;
      const dx = anchorX - s.x;
      const dz = anchorZ - s.z;
      const d = Math.hypot(dx, dz);
      if (d > 2) {
        s.x += (dx / d) * 3.8 * safeDt;
        s.z += (dz / d) * 3.8 * safeDt;
        s.yaw = Math.atan2(-dx, -dz);
      }
      return s;
    }

    // Check surface base defense repulsion
    if (s.biome === "surface" && baseSolarPower > 4) {
      for (const def of defenses) {
        if (!def.active) continue;
        const dDef = Math.hypot(s.x - def.x, s.z - def.z);
        if (dDef <= def.radius) {
          s.state = "repelled";
          s.repelTimer = Math.max(s.repelTimer, def.kind === "emp_emitter" ? 7.5 : 4.5);
          if (simTime - def.lastPulseAt > 1.8) {
            triggeredDefenses.push(def.id);
          }
          const rx = s.x - def.x || 1;
          const rz = s.z - def.z || 1;
          const rn = Math.hypot(rx, rz);
          s.x += (rx / rn) * 9.5 * safeDt;
          s.z += (rz / rn) * 9.5 * safeDt;
          s.yaw = Math.atan2(-rx, -rz);
          s.speed = 6.2;
          return s;
        }
      }
    }

    // Find closest player in matching biome
    let target: StalkerPlayerTarget | null = null;
    let targetDist = Infinity;
    for (const p of players) {
      if (p.biome !== s.biome) continue;
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      if (d < targetDist) {
        targetDist = d;
        target = p;
      }
    }

    if (!target) {
      // Idle patrol
      s.state = "stalking";
      const angle = simTime * 0.4 + s.phaseOffset;
      const patrolRadius = s.biome === "cave" ? 18 : 48;
      const tx = Math.cos(angle) * patrolRadius;
      const tz = Math.sin(angle) * patrolRadius;
      const dx = tx - s.x;
      const dz = tz - s.z;
      const d = Math.max(0.01, Math.hypot(dx, dz));
      s.speed = 2.1;
      s.x += (dx / d) * s.speed * safeDt;
      s.z += (dz / d) * s.speed * safeDt;
      s.yaw = Math.atan2(-dx, -dz);
      return s;
    }

    // Repelled sprint away from target
    if (s.repelTimer > 0) {
      const awayX = s.x - target.x || 1;
      const awayZ = s.z - target.z || 1;
      const awayN = Math.hypot(awayX, awayZ);
      s.speed = 5.4;
      s.x += (awayX / awayN) * s.speed * safeDt;
      s.z += (awayZ / awayN) * s.speed * safeDt;
      if (s.biome === "cave") {
        const r = Math.hypot(s.x, s.z);
        if (r > CAVE_BOUNDARY_RADIUS - 3) {
          s.x *= (CAVE_BOUNDARY_RADIUS - 3) / r;
          s.z *= (CAVE_BOUNDARY_RADIUS - 3) / r;
        }
      } else {
        s.x = clamp(s.x, -82, 82);
        s.z = clamp(s.z, -82, 82);
      }
      s.yaw = Math.atan2(-awayX, -awayZ);
      return s;
    }

    // Rover bright headlights dazzle/slow Stalker inside narrow forward beam
    if (target.headlightsOn && target.headlightYaw !== undefined && targetDist < 17) {
      const toStalkerX = s.x - target.x;
      const toStalkerZ = s.z - target.z;
      const fwdX = -Math.sin(target.headlightYaw);
      const fwdZ = -Math.cos(target.headlightYaw);
      const dot = (toStalkerX * fwdX + toStalkerZ * fwdZ) / Math.max(0.1, targetDist);
      if (dot > 0.86) {
        s.state = "repelled";
        s.repelTimer = 3.2;
        s.speed = 4.6;
        return s;
      }
    }

    // Outpost Habitat safe dome perimeter on surface (-2, -26 radius 8.5m)
    const distHab = s.biome === "surface" ? Math.hypot(s.x + 2, s.z + 26) : Infinity;
    if (distHab < 9.5) {
      s.state = "repelled";
      s.repelTimer = 3.5;
      return s;
    }

    // Stalking orbit near fog boundary (12-22m) before lunging when alertness builds
    const dx = target.x - s.x;
    const dz = target.z - s.z;
    const invD = 1 / Math.max(0.01, targetDist);
    if (targetDist > 26) {
      s.state = "stalking";
      s.speed = s.biome === "cave" ? 2.8 : 3.6;
      s.x += dx * invD * s.speed * safeDt;
      s.z += dz * invD * s.speed * safeDt;
      s.alertness = clamp(s.alertness + safeDt * 0.08, 0, 1);
    } else if (targetDist > 11 && s.alertness < 0.72) {
      // Circling menacingly at edge of visibility fog
      s.state = "stalking";
      s.alertness = clamp(s.alertness + safeDt * 0.16, 0, 1);
      const tangentX = -dz * invD;
      const tangentZ = dx * invD;
      s.speed = 2.6;
      s.x += (tangentX * 0.8 + dx * invD * 0.25) * s.speed * safeDt;
      s.z += (tangentZ * 0.8 + dz * invD * 0.25) * s.speed * safeDt;
    } else {
      // Closing in from the shadows
      s.state = "approaching";
      s.speed = s.biome === "cave" ? 3.25 : target.inRover ? 4.4 : 3.7;
      s.x += dx * invD * s.speed * safeDt;
      s.z += dz * invD * s.speed * safeDt;
    }

    if (s.biome === "cave") {
      const r = Math.hypot(s.x, s.z);
      if (r > CAVE_BOUNDARY_RADIUS - 2.5) {
        s.x *= (CAVE_BOUNDARY_RADIUS - 2.5) / r;
        s.z *= (CAVE_BOUNDARY_RADIUS - 2.5) / r;
      }
    } else {
      s.x = clamp(s.x, -82, 82);
      s.z = clamp(s.z, -82, 82);
    }
    s.yaw = Math.atan2(-dx, -dz);

    // Strike check if player caught without rover/defense protection
    if (targetDist <= 2.35 && s.attackCooldown <= 0) {
      s.attackCooldown = 6.5;
      s.repelTimer = 2.6;
      s.state = "repelled";
      s.alertness = 0.35;
      strikes.push({
        playerId: target.id,
        suitLoss: target.inRover ? 3 : 8,
        moraleLoss: target.inRover ? 5 : 14,
        stalkerId: s.id,
      });
    }

    return s;
  });

  return { stalkers: next, triggeredDefenses, strikes };
}

