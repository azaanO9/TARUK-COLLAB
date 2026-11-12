/**
 * Pure simulation engine for the autonomous NASA Curiosity Mars science rover.
 * Zero Three.js, DOM, React, or browser dependencies — purely deterministic
 * physics, hazard avoidance, smooth-terrain steering, and stop-and-scan cycles.
 */
import { boxObstacle, moveAndSlide, overlapBody, overlapDisc, type CollisionObstacle } from "./collision.ts";

export const CURIOSITY_WHEEL_RADIUS = 0.243;
export const CURIOSITY_HALF_WIDTH = 1.38;
export const CURIOSITY_HALF_LENGTH = 1.62;
export const CURIOSITY_MAX_SPEED = 1.2;
export const CURIOSITY_REVERSE_SPEED = 0.55;
export const CURIOSITY_WHEEL_BASE = 2.25;
export const CURIOSITY_STEER_MAX = 0.42;
export const CURIOSITY_STEER_SPEED = 1.6;
export const CURIOSITY_LIMIT = 76;
export const CURIOSITY_FAR_SCAN_RADIUS = 26;
export const CURIOSITY_SCAN_DEPLOY_END = 1.4;
export const CURIOSITY_SCAN_LASER_END = 4.9;
export const CURIOSITY_SCAN_DURATION = 6.5;

/** Exact GLB wheel offsets relative to chassis origin (wrapper aligned to -Z forward). */
export const CURIOSITY_WHEEL_OFFSETS: readonly [number, number][] = [
  [-1.06, -1.09], // Front Left
  [1.06, -1.09],  // Front Right
  [-1.19, 0.09],  // Middle Left
  [1.19, 0.09],   // Middle Right
  [-1.06, 1.16],  // Rear Left
  [1.06, 1.16],   // Rear Right
];

export type CuriosityZone = "colony" | "plains";
export type CuriosityPhase = "driving" | "scanning";
export type CuriosityScanStage = "none" | "deploy" | "laser" | "stow";
export type CuriosityYieldReason = "none" | "obstacle" | "slope" | "entity";

export type CuriosityWaypoint = {
  readonly x: number;
  readonly z: number;
  readonly zone: CuriosityZone;
};

/**
 * Patrol circuit: begins visible near the western colony edge and then spends
 * ~90% of driving and surface scanning across outer Martian plains and crater rims (34-60m).
 */
export const CURIOSITY_PATROL_WAYPOINTS: readonly CuriosityWaypoint[] = [
  { x: -17, z: 10, zone: "colony" },
  { x: -34, z: 10, zone: "plains" },
  { x: -42, z: -12, zone: "plains" },
  { x: -34, z: -34, zone: "plains" },
  { x: -14, z: -56, zone: "plains" },
  { x: 16, z: -56, zone: "plains" },
  { x: 52, z: -30, zone: "plains" },
  { x: 58, z: -4, zone: "plains" },
  { x: 46, z: 26, zone: "plains" },
  { x: 18, z: 50, zone: "plains" },
  { x: -18, z: 44, zone: "plains" },
  { x: -26, z: 32, zone: "plains" },
];

/** Open colony paths & station approaches Curiosity can also inspect when full-map exploration is enabled. */
export const CURIOSITY_COLONY_WAYPOINTS: readonly CuriosityWaypoint[] = [
  { x: -17, z: 10, zone: "colony" },
  { x: -16, z: -4, zone: "colony" },
  { x: -1, z: -15, zone: "colony" },
  { x: 9, z: -2, zone: "colony" },
  { x: -7, z: -24, zone: "colony" },
  { x: 25, z: -11, zone: "colony" },
  { x: 25, z: 11, zone: "colony" },
  { x: -27, z: -15, zone: "colony" },
];

export type CuriosityPoint = {
  readonly x: number;
  readonly z: number;
};

export type SavedCuriosityState = {
  version: 1;
  x: number;
  z: number;
  yaw: number;
  targetX: number;
  targetZ: number;
  targetZone: CuriosityZone;
  phase: CuriosityPhase;
  scanStage: CuriosityScanStage;
  scanTimer: number;
  driveTimer: number;
  nextScanAfter: number;
  scanCount: number;
  lastScanSample: string;
  rngSeed: number;
  recentTargets: CuriosityPoint[];
};

export type CuriositySpawnOptions = {
  seed?: number;
  allowColonyTargets?: boolean;
  saved?: SavedCuriosityState | null;
};

const MARS_SAMPLE_NOTES = [
  "Olivine-rich basalt pebble · Mg/Fe spectral peak detected",
  "Wind-sorted ferric regolith · low sulfur, fine grain coat",
  "Layered sulfate mudstone · possible ancient lakebed signature",
  "Vesicular volcanic float rock · ChemCam LIBS plasma nominal",
  "Hematite-dusted duricrust · shallow hydrated mineral trace",
] as const;

export type CuriosityRoverState = {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  steerAngle: number;
  wheelRoll: number;
  chassisY: number;
  pitch: number;
  roll: number;
  leftRockerAngle: number;
  rightRockerAngle: number;
  leftBogieAngle: number;
  rightBogieAngle: number;
  scanCrouch: number;
  phase: CuriosityPhase;
  scanStage: CuriosityScanStage;
  scanTimer: number;
  driveTimer: number;
  nextScanAfter: number;
  recoveryTimer: number;
  recoveryTurnSign: number;
  armDeploy: number;
  mastYaw: number;
  mastPitch: number;
  laserActive: boolean;
  laserPulse: number;
  scanTargetX: number;
  scanTargetY: number;
  scanTargetZ: number;
  waypointIndex: number;
  targetX: number;
  targetZ: number;
  targetZone: CuriosityZone;
  allowColonyTargets: boolean;
  rngSeed: number;
  recentTargets: CuriosityPoint[];
  stuckTimer: number;
  stuckAnchorX: number;
  stuckAnchorZ: number;
  stuckAttempts: number;
  scanCount: number;
  currentZone: CuriosityZone;
  lastScanSample: string;
  yieldReason: CuriosityYieldReason;
  totalTime: number;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function nextRandom(seed: number): [number, number] {
  const next = (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
  return [next / 0x100000000, next];
}

function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Authoritative oriented bounding box footprint used by all solid collision checks. */
export function curiosityFootprint(x: number, z: number, yaw: number): CollisionObstacle {
  return boxObstacle(x, z, CURIOSITY_HALF_WIDTH, CURIOSITY_HALF_LENGTH, "curiosity", yaw);
}

function paddedCuriosityHull(yaw: number, pad = 0.16): CollisionObstacle {
  return boxObstacle(0, 0, CURIOSITY_HALF_WIDTH + pad, CURIOSITY_HALF_LENGTH + pad, "curiosity", yaw);
}

function solveCuriosityAttitude(
  x: number,
  z: number,
  yaw: number,
  heightAt: (wx: number, wz: number) => number,
  prevY: number,
  prevPitch: number,
  prevRoll: number,
  prevLeftRocker: number,
  prevRightRocker: number,
  prevLeftBogie: number,
  prevRightBogie: number,
  dt: number,
) {
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const wheelHeights: number[] = [];
  for (let i = 0; i < 6; i++) {
    const [lx, lz] = CURIOSITY_WHEEL_OFFSETS[i];
    const wx = x + cosYaw * lx + sinYaw * lz;
    const wz = z - sinYaw * lx + cosYaw * lz;
    wheelHeights.push(heightAt(wx, wz));
  }
  const hCenter = heightAt(x, z);
  const frontMean = (wheelHeights[0] + wheelHeights[1]) * 0.5;
  const rearMean = (wheelHeights[4] + wheelHeights[5]) * 0.5;
  const leftMean = (wheelHeights[0] + wheelHeights[2] + wheelHeights[4]) / 3;
  const rightMean = (wheelHeights[1] + wheelHeights[3] + wheelHeights[5]) / 3;

  const targetPitch = clamp(Math.atan2(frontMean - rearMean, CURIOSITY_WHEEL_BASE), -0.38, 0.38);
  const targetRoll = clamp(Math.atan2(rightMean - leftMean, 2.18), -0.34, 0.34);
  const wheelMean =
    (wheelHeights[0] + wheelHeights[1] + wheelHeights[2] + wheelHeights[3] + wheelHeights[4] + wheelHeights[5]) / 6;
  const targetY = Math.max(wheelMean, hCenter - 0.14);

  const yBlend = dt > 0 ? 1 - Math.exp(-15 * dt) : 1;
  const attBlend = dt > 0 ? 1 - Math.exp(-13 * dt) : 1;
  const jointBlend = dt > 0 ? 1 - Math.exp(-16 * dt) : 1;

  const chassisY = prevY + (targetY - prevY) * yBlend;
  const pitch = prevPitch + (targetPitch - prevPitch) * attBlend;
  const roll = prevRoll + (targetRoll - prevRoll) * attBlend;

  // Height residuals relative to the rigid chassis contact plane drive passive 6-wheel Rocker-Bogie articulation
  const sinP = Math.sin(pitch);
  const sinR = Math.sin(roll);
  const res = wheelHeights.map((wh, i) => {
    const [lx, lz] = CURIOSITY_WHEEL_OFFSETS[i];
    return wh - (chassisY + sinP * -lz + sinR * lx);
  });

  const bogieMidResL = (res[2] + res[4]) * 0.5;
  const bogieMidResR = (res[3] + res[5]) * 0.5;
  // Positive local-X rotation lowers front (01) and raises rear bogie (02/03)
  const targetLeftRocker = clamp(-(res[0] - bogieMidResL) * 0.78, -0.36, 0.36);
  const targetRightRocker = clamp(-(res[1] - bogieMidResR) * 0.78, -0.36, 0.36);
  // Positive local-X rotation on bogie pivot (B2) lowers mid wheel (02) and raises rear wheel (03)
  const targetLeftBogie = clamp((res[4] - res[2]) * 1.05, -0.4, 0.4);
  const targetRightBogie = clamp((res[5] - res[3]) * 1.05, -0.4, 0.4);

  const leftRockerAngle = prevLeftRocker + (targetLeftRocker - prevLeftRocker) * jointBlend;
  const rightRockerAngle = prevRightRocker + (targetRightRocker - prevRightRocker) * jointBlend;
  const leftBogieAngle = prevLeftBogie + (targetLeftBogie - prevLeftBogie) * jointBlend;
  const rightBogieAngle = prevRightBogie + (targetRightBogie - prevRightBogie) * jointBlend;

  return {
    chassisY,
    pitch,
    roll,
    leftRockerAngle,
    rightRockerAngle,
    leftBogieAngle,
    rightBogieAngle,
  };
}

function findNearestFreePoint(
  startX: number,
  startZ: number,
  yaw: number,
  obstacles: readonly CollisionObstacle[],
): { x: number; z: number } {
  const solid = obstacles.filter((o) => o.id !== "curiosity" && !o.traversable);
  const hull = paddedCuriosityHull(yaw, 0.25);
  if (!solid.some((o) => overlapBody(startX, startZ, hull, o))) {
    return { x: startX, z: startZ };
  }
  for (let r = 1.5; r <= 10; r += 1.5) {
    for (let step = 0; step < 12; step++) {
      const a = (step / 12) * Math.PI * 2;
      const cx = startX + Math.cos(a) * r;
      const cz = startZ + Math.sin(a) * r;
      if (Math.abs(cx) > CURIOSITY_LIMIT - 2 || Math.abs(cz) > CURIOSITY_LIMIT - 2) continue;
      if (!solid.some((o) => overlapBody(cx, cz, hull, o))) {
        return { x: cx, z: cz };
      }
    }
  }
  return { x: startX, z: startZ };
}

function isTargetAccessible(
  tx: number,
  tz: number,
  obstacles: readonly CollisionObstacle[],
  heightAt: (wx: number, wz: number) => number,
): boolean {
  if (Math.abs(tx) > CURIOSITY_LIMIT - 6 || Math.abs(tz) > CURIOSITY_LIMIT - 6) return false;
  const solid = obstacles.filter((o) => o.id !== "curiosity" && !o.traversable);
  const hull = paddedCuriosityHull(0, 0.45);
  if (solid.some((o) => overlapBody(tx, tz, hull, o))) return false;
  const h0 = heightAt(tx, tz);
  for (const [dx, dz] of [[2.2, 0], [-2.2, 0], [0, 2.2], [0, -2.2]]) {
    if (Math.abs(heightAt(tx + dx, tz + dz) - h0) / 2.2 > 0.30) return false;
  }
  return true;
}

function appendRecentTarget(
  recent: readonly CuriosityPoint[],
  x: number,
  z: number,
): CuriosityPoint[] {
  const filtered = recent.filter((p) => Math.hypot(p.x - x, p.z - z) >= 8);
  return [...filtered.slice(-7), { x: Number(x.toFixed(2)), z: Number(z.toFixed(2)) }];
}

function pickExplorationTarget(
  fromX: number,
  fromZ: number,
  rngSeed: number,
  allowColonyTargets: boolean,
  recentTargets: readonly CuriosityPoint[],
  obstacles: readonly CollisionObstacle[],
  heightAt: (wx: number, wz: number) => number,
  preferYaw?: number,
): { x: number; z: number; zone: CuriosityZone; rngSeed: number } {
  let seed = rngSeed >>> 0;
  const candidates: { x: number; z: number; zone: CuriosityZone }[] = [];

  // Sample varied outer-plains & crater-rim sectors across all directions
  for (let i = 0; i < 16; i++) {
    const [uA, s1] = nextRandom(seed);
    const [uR, s2] = nextRandom(s1);
    seed = s2;
    const angle = uA * Math.PI * 2;
    const radius = 28 + uR * 36;
    const cx = clamp(Math.cos(angle) * radius, -(CURIOSITY_LIMIT - 8), CURIOSITY_LIMIT - 8);
    const cz = clamp(-6 + Math.sin(angle) * radius, -(CURIOSITY_LIMIT - 8), CURIOSITY_LIMIT - 8);
    candidates.push({ x: cx, z: cz, zone: "plains" });
  }

  // Mix in curated plains/crater waypoints and (when enabled) colony paths
  for (const wp of CURIOSITY_PATROL_WAYPOINTS) {
    if (wp.zone === "plains" || allowColonyTargets) {
      candidates.push({ x: wp.x, z: wp.z, zone: wp.zone });
    }
  }
  if (allowColonyTargets) {
    for (const wp of CURIOSITY_COLONY_WAYPOINTS) {
      candidates.push({ x: wp.x, z: wp.z, zone: "colony" });
    }
  }

  let best: { x: number; z: number; zone: CuriosityZone } | null = null;
  let bestScore = -Infinity;

  for (const cand of candidates) {
    const [uJ, sNext] = nextRandom(seed);
    seed = sNext;
    const settled = findNearestFreePoint(cand.x, cand.z, 0, obstacles);
    if (!isTargetAccessible(settled.x, settled.z, obstacles, heightAt)) continue;

    const travelDist = Math.hypot(settled.x - fromX, settled.z - fromZ);
    if (travelDist < 12) continue;

    let minRecent = 50;
    for (const prev of recentTargets) {
      const d = Math.hypot(settled.x - prev.x, settled.z - prev.z);
      if (d < minRecent) minRecent = d;
    }

    const yawToCand = Math.atan2(-(settled.x - fromX), -(settled.z - fromZ));
    const headingAlign = preferYaw !== undefined ? Math.cos(normalizeAngle(yawToCand - preferYaw)) : 0;
    const score =
      Math.min(minRecent, 32) * 2.2 +
      Math.min(travelDist, 55) * 0.45 +
      headingAlign * 48 +
      uJ * 12 -
      (minRecent < 18 ? 45 : 0);

    if (score > bestScore) {
      bestScore = score;
      best = { x: settled.x, z: settled.z, zone: cand.zone };
    }
  }

  if (best) return { ...best, rngSeed: seed };

  // Guaranteed clear fallback on open western plains
  const fallback = findNearestFreePoint(-34, 10, 0, obstacles);
  return { x: fallback.x, z: fallback.z, zone: "plains", rngSeed: seed };
}

export function exportCuriositySave(state: CuriosityRoverState): SavedCuriosityState {
  return {
    version: 1,
    x: Number(state.x.toFixed(3)),
    z: Number(state.z.toFixed(3)),
    yaw: Number(state.yaw.toFixed(4)),
    targetX: Number(state.targetX.toFixed(3)),
    targetZ: Number(state.targetZ.toFixed(3)),
    targetZone: state.targetZone,
    phase: state.phase,
    scanStage: state.scanStage,
    scanTimer: Number(state.scanTimer.toFixed(3)),
    driveTimer: Number(state.driveTimer.toFixed(3)),
    nextScanAfter: Number(state.nextScanAfter.toFixed(2)),
    scanCount: state.scanCount,
    lastScanSample: state.lastScanSample,
    rngSeed: state.rngSeed >>> 0,
    recentTargets: state.recentTargets.slice(-8),
  };
}

export function spawnCuriosityRover(
  obstacles: readonly CollisionObstacle[] = [],
  heightAt: (wx: number, wz: number) => number = () => 0,
  options?: CuriositySpawnOptions,
): CuriosityRoverState {
  const allowColonyTargets = options?.allowColonyTargets ?? false;
  const saved = options?.saved ?? null;

  if (saved) {
    const yaw = normalizeAngle(saved.yaw);
    const startPos = findNearestFreePoint(saved.x, saved.z, yaw, obstacles);
    const attitude = solveCuriosityAttitude(
      startPos.x,
      startPos.z,
      yaw,
      heightAt,
      heightAt(startPos.x, startPos.z),
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    );
    const scanTarget = chooseScanTarget(startPos.x, startPos.z, yaw, obstacles, heightAt);
    return {
      x: startPos.x,
      z: startPos.z,
      yaw,
      speed: 0,
      steerAngle: 0,
      wheelRoll: 0,
      chassisY: attitude.chassisY,
      pitch: attitude.pitch,
      roll: attitude.roll,
      leftRockerAngle: attitude.leftRockerAngle,
      rightRockerAngle: attitude.rightRockerAngle,
      leftBogieAngle: attitude.leftBogieAngle,
      rightBogieAngle: attitude.rightBogieAngle,
      scanCrouch: saved.phase === "scanning" ? 1 : 0,
      phase: saved.phase,
      scanStage: saved.scanStage,
      scanTimer: saved.scanTimer,
      driveTimer: saved.driveTimer,
      nextScanAfter: saved.nextScanAfter,
      recoveryTimer: 0,
      recoveryTurnSign: 1,
      armDeploy: saved.phase === "scanning" ? 1 : 0,
      mastYaw: 0,
      mastPitch: saved.phase === "scanning" ? -0.34 : -0.06,
      laserActive: saved.phase === "scanning" && saved.scanStage === "laser",
      laserPulse: 0,
      scanTargetX: scanTarget.tx,
      scanTargetY: scanTarget.ty,
      scanTargetZ: scanTarget.tz,
      waypointIndex: 0,
      targetX: saved.targetX,
      targetZ: saved.targetZ,
      targetZone: saved.targetZone,
      allowColonyTargets,
      rngSeed: saved.rngSeed >>> 0,
      recentTargets: saved.recentTargets,
      stuckTimer: 0,
      stuckAnchorX: startPos.x,
      stuckAnchorZ: startPos.z,
      stuckAttempts: 0,
      scanCount: saved.scanCount,
      currentZone: saved.targetZone,
      lastScanSample: saved.lastScanSample,
      yieldReason: "none",
      totalTime: 0,
    };
  }

  const randomized = options?.seed !== undefined;
  let rngSeed = (options?.seed ?? 0x6d2b79f5) >>> 0;
  let startYaw = Math.PI * 0.48;
  let initialTarget = { x: CURIOSITY_PATROL_WAYPOINTS[0].x, z: CURIOSITY_PATROL_WAYPOINTS[0].z, zone: CURIOSITY_PATROL_WAYPOINTS[0].zone, rngSeed };
  const startBase = { x: -17, z: 10 };
  const startPos = findNearestFreePoint(startBase.x, startBase.z, startYaw, obstacles);

  if (randomized) {
    initialTarget = pickExplorationTarget(
      startPos.x,
      startPos.z,
      rngSeed,
      allowColonyTargets,
      [],
      obstacles,
      heightAt,
    );
    rngSeed = initialTarget.rngSeed;
    startYaw = normalizeAngle(Math.atan2(-(initialTarget.x - startPos.x), -(initialTarget.z - startPos.z)));
  }

  const attitude = solveCuriosityAttitude(
    startPos.x,
    startPos.z,
    startYaw,
    heightAt,
    heightAt(startPos.x, startPos.z),
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  );
  return {
    x: startPos.x,
    z: startPos.z,
    yaw: startYaw,
    speed: 0,
    steerAngle: 0,
    wheelRoll: 0,
    chassisY: attitude.chassisY,
    pitch: attitude.pitch,
    roll: attitude.roll,
    leftRockerAngle: attitude.leftRockerAngle,
    rightRockerAngle: attitude.rightRockerAngle,
    leftBogieAngle: attitude.leftBogieAngle,
    rightBogieAngle: attitude.rightBogieAngle,
    scanCrouch: 0,
    phase: "driving",
    scanStage: "none",
    scanTimer: 0,
    driveTimer: 2.0, // Cruises ~10m out from colony edge before commencing first scan
    nextScanAfter: 10.5,
    recoveryTimer: 0,
    recoveryTurnSign: 1,
    armDeploy: 0,
    mastYaw: 0,
    mastPitch: -0.06,
    laserActive: false,
    laserPulse: 0,
    scanTargetX: startPos.x - Math.sin(startYaw) * 2.35,
    scanTargetY: attitude.chassisY,
    scanTargetZ: startPos.z - Math.cos(startYaw) * 2.35,
    waypointIndex: 0,
    targetX: initialTarget.x,
    targetZ: initialTarget.z,
    targetZone: initialTarget.zone,
    allowColonyTargets,
    rngSeed,
    recentTargets: [],
    stuckTimer: 0,
    stuckAnchorX: startPos.x,
    stuckAnchorZ: startPos.z,
    stuckAttempts: 0,
    scanCount: 0,
    currentZone: "colony",
    lastScanSample: MARS_SAMPLE_NOTES[0],
    yieldReason: "none",
    totalTime: 0,
  };
}

const FORWARD_CANDIDATE_OFFSETS = [
  0,
  0.22, -0.22,
  0.46, -0.46,
  0.72, -0.72,
  1.0, -1.0,
  1.28, -1.28,
] as const;

const ESCAPE_CANDIDATE_OFFSETS = [
  1.62, -1.62,
  1.98, -1.98,
  2.38, -2.38,
  2.78, -2.78,
  Math.PI,
] as const;

type ProbeResult = {
  clear: boolean;
  blockedByEntity: boolean;
  blockedBySlope: boolean;
  score: number;
};

function evaluateHeadingCandidate(
  x: number,
  z: number,
  candYaw: number,
  desiredYaw: number,
  solid: readonly CollisionObstacle[],
  heightAt: (wx: number, wz: number) => number,
): ProbeResult {
  const hull = paddedCuriosityHull(candYaw, 0.22);
  const fx = -Math.sin(candYaw);
  const fz = -Math.cos(candYaw);
  const rx = Math.cos(candYaw);
  const rz = -Math.sin(candYaw);
  const h0 = heightAt(x, z);

  let minClearance = 8;
  let maxSlope = 0;
  let dropPenalty = 0;

  for (const dist of [1.4, 2.7, 4.1, 5.4]) {
    const px = x + fx * dist;
    const pz = z + fz * dist;
    if (Math.abs(px) > CURIOSITY_LIMIT - 1.5 || Math.abs(pz) > CURIOSITY_LIMIT - 1.5) {
      return { clear: false, blockedByEntity: false, blockedBySlope: false, score: Infinity };
    }
    for (let i = 0; i < solid.length; i++) {
      const o = solid[i];
      const dx = px - o.x;
      const dz = pz - o.z;
      const approx = Math.hypot(dx, dz) - (o.radius + 1.85);
      if (approx < minClearance) minClearance = approx;
      if (overlapBody(px, pz, hull, o)) {
        const isEntity = o.id === "walker" || o.id === "rover";
        return { clear: false, blockedByEntity: isEntity, blockedBySlope: false, score: Infinity };
      }
    }
    const h = heightAt(px, pz);
    const stepSlope = Math.abs(h - h0) / dist;
    if (stepSlope > maxSlope) maxSlope = stepSlope;
    if (h - h0 < -0.78) dropPenalty += (h0 - h - 0.78) * 6;
    if (dist <= 3.0) {
      const hL = heightAt(px - rx * 1.15, pz - rz * 1.15);
      const hR = heightAt(px + rx * 1.15, pz + rz * 1.15);
      const latSlope = Math.abs(hL - hR) / 2.3;
      if (latSlope > maxSlope) maxSlope = latSlope;
    }
  }

  // Reject steep crater walls & jagged boulder escarpments; prefer smooth Martian plains.
  if (maxSlope > 0.34 || dropPenalty > 1.2) {
    return { clear: false, blockedByEntity: false, blockedBySlope: true, score: Infinity };
  }

  const headingDiff = Math.abs(normalizeAngle(candYaw - desiredYaw));
  const clearanceCost = minClearance < 2.2 ? (2.2 - minClearance) * 2.2 : 0;
  const slopeCost = maxSlope * 5.2 + dropPenalty;
  return {
    clear: true,
    blockedByEntity: false,
    blockedBySlope: false,
    score: headingDiff * 1.45 + clearanceCost + slopeCost,
  };
}

function chooseScanTarget(
  x: number,
  z: number,
  yaw: number,
  obstacles: readonly CollisionObstacle[],
  heightAt: (wx: number, wz: number) => number,
) {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  let bestRock: CollisionObstacle | null = null;
  let bestDist = Infinity;

  for (const o of obstacles) {
    if (!o.traversable) continue;
    const dx = o.x - x;
    const dz = o.z - z;
    const dist = Math.hypot(dx, dz);
    if (dist < 2.25 || dist > 4.6) continue;
    const forwardDot = (dx * fx + dz * fz) / dist;
    if (forwardDot > 0.72 && dist < bestDist) {
      bestDist = dist;
      bestRock = o;
    }
  }

  if (bestRock) {
    const rightDot = (bestRock.x - x) * rx + (bestRock.z - z) * rz;
    const forwardDot = (bestRock.x - x) * fx + (bestRock.z - z) * fz;
    const aimYaw = clamp(Math.atan2(-rightDot, Math.max(0.5, forwardDot)), -0.75, 0.75);
    return {
      tx: bestRock.x,
      ty: heightAt(bestRock.x, bestRock.z) + 0.06,
      tz: bestRock.z,
      aimYaw,
    };
  }

  // Default target on smooth terrain clearly ahead of turret & ChemCam mast
  const tx = x + fx * 2.65 - rx * 0.24;
  const tz = z + fz * 2.65 - rz * 0.24;
  return {
    tx,
    ty: heightAt(tx, tz) + 0.02,
    tz,
    aimYaw: 0.1,
  };
}

export function stepCuriosityRover(
  state: CuriosityRoverState,
  seconds: number,
  obstacles: readonly CollisionObstacle[] = [],
  heightAt: (wx: number, wz: number) => number = () => 0,
): CuriosityRoverState {
  const dt = Math.max(0, Math.min(seconds, 0.05));
  if (dt <= 0) return state;

  const totalTime = state.totalTime + dt;
  const solid = obstacles.filter((o) => o.id !== "curiosity" && !o.traversable);
  const physicsObstacles = solid.filter((o) => o.id !== "walker");
  const walkerObstacle = solid.find((o) => o.id === "walker");

  // Check if a dynamic entity (walker or MMSEV rover) is directly inside our forward personal space
  const fxCurr = -Math.sin(state.yaw);
  const fzCurr = -Math.cos(state.yaw);
  const entityBlockingClosely = solid.some((o) => {
    if (o.id !== "walker" && o.id !== "rover") return false;
    const dx = o.x - state.x;
    const dz = o.z - state.z;
    const dist = Math.hypot(dx, dz);
    const minStopDist = o.id === "rover" ? 4.4 : 3.2;
    if (dist > minStopDist) return false;
    const forwardProj = (dx * fxCurr + dz * fzCurr) / Math.max(0.01, dist);
    return forwardProj > 0.35;
  });

  // ------------------------------------------------------------------
  // MODE A: SCANNING (stop, crouch suspension, unfold arm & fire ChemCam)
  // ------------------------------------------------------------------
  if (state.phase === "scanning") {
    const nextScanTimer = state.scanTimer + dt;
    const speed = Math.abs(state.speed) < 0.04 ? 0 : state.speed * Math.exp(-10 * dt);
    const steerAngle = state.steerAngle * Math.exp(-6 * dt);

    let scanStage: CuriosityScanStage = "deploy";
    let targetArm = 1;
    let targetCrouch = 1;
    let targetMastYaw = clamp(
      Math.atan2(
        -((state.scanTargetX - state.x) * Math.cos(state.yaw) - (state.scanTargetZ - state.z) * Math.sin(state.yaw)),
        Math.max(0.5, -(state.scanTargetX - state.x) * Math.sin(state.yaw) - (state.scanTargetZ - state.z) * Math.cos(state.yaw)),
      ),
      -0.95,
      0.95,
    );
    let targetMastPitch = -0.34;
    let laserActive = false;
    let laserPulse = 0;

    if (nextScanTimer < CURIOSITY_SCAN_DEPLOY_END) {
      scanStage = "deploy";
      const t = nextScanTimer / CURIOSITY_SCAN_DEPLOY_END;
      targetArm = clamp(t * t * (3 - 2 * t), 0, 1);
      const tc = clamp(t / 0.8, 0, 1);
      targetCrouch = tc * tc * (3 - 2 * tc);
    } else if (nextScanTimer < CURIOSITY_SCAN_LASER_END) {
      scanStage = "laser";
      targetArm = 1;
      targetCrouch = 1;
      laserActive = true;
      const inLaser = nextScanTimer - CURIOSITY_SCAN_DEPLOY_END;
      laserPulse = 0.55 + 0.45 * Math.sin(inLaser * 18);
      targetMastYaw += Math.sin(inLaser * 1.7) * 0.09;
      targetMastPitch = -0.34 + Math.cos(inLaser * 2.1) * 0.04;
    } else if (nextScanTimer < CURIOSITY_SCAN_DURATION) {
      scanStage = "stow";
      const u = (nextScanTimer - CURIOSITY_SCAN_LASER_END) / (CURIOSITY_SCAN_DURATION - CURIOSITY_SCAN_LASER_END);
      const smoothU = clamp(u * u * (3 - 2 * u), 0, 1);
      targetArm = 1 - smoothU;
      targetCrouch = 1 - smoothU;
      targetMastYaw *= 1 - u;
      targetMastPitch = -0.34 * (1 - u) - 0.06 * u;
    } else {
      // Completed scan cycle -> raise chassis cleanly and pick a fresh unexplored area
      const scanCount = state.scanCount + 1;
      const recentTargets = appendRecentTarget(state.recentTargets, state.x, state.z);
      const nextTarget = state.allowColonyTargets
        ? pickExplorationTarget(
            state.x,
            state.z,
            state.rngSeed,
            true,
            recentTargets,
            obstacles,
            heightAt,
          )
        : null;
      return {
        ...state,
        speed: 0,
        steerAngle: 0,
        scanCrouch: 0,
        phase: "driving",
        scanStage: "none",
        scanTimer: 0,
        driveTimer: 0,
        nextScanAfter: 9.5 + (scanCount % 3) * 2.0,
        armDeploy: 0,
        mastYaw: 0,
        mastPitch: -0.06,
        laserActive: false,
        laserPulse: 0,
        targetX: nextTarget ? nextTarget.x : state.targetX,
        targetZ: nextTarget ? nextTarget.z : state.targetZ,
        targetZone: nextTarget ? nextTarget.zone : state.targetZone,
        rngSeed: nextTarget ? nextTarget.rngSeed : state.rngSeed,
        recentTargets,
        stuckTimer: 0,
        stuckAnchorX: state.x,
        stuckAnchorZ: state.z,
        stuckAttempts: 0,
        scanCount,
        lastScanSample: MARS_SAMPLE_NOTES[scanCount % MARS_SAMPLE_NOTES.length],
        totalTime,
      };
    }

    const armDeploy = state.armDeploy + (targetArm - state.armDeploy) * (1 - Math.exp(-8 * dt));
    const scanCrouch = state.scanCrouch + (targetCrouch - state.scanCrouch) * (1 - Math.exp(-9 * dt));
    const mastYaw = state.mastYaw + (targetMastYaw - state.mastYaw) * (1 - Math.exp(-6 * dt));
    const mastPitch = state.mastPitch + (targetMastPitch - state.mastPitch) * (1 - Math.exp(-6 * dt));
    const attitude = solveCuriosityAttitude(
      state.x,
      state.z,
      state.yaw,
      heightAt,
      state.chassisY,
      state.pitch,
      state.roll,
      state.leftRockerAngle,
      state.rightRockerAngle,
      state.leftBogieAngle,
      state.rightBogieAngle,
      dt,
    );

    return {
      ...state,
      speed,
      steerAngle,
      scanCrouch,
      ...attitude,
      phase: "scanning",
      scanStage,
      scanTimer: nextScanTimer,
      armDeploy,
      mastYaw,
      mastPitch,
      laserActive,
      laserPulse,
      yieldReason: entityBlockingClosely ? "entity" : "none",
      totalTime,
    };
  }

  // ------------------------------------------------------------------
  // MODE B: DRIVING (smooth terrain selection + rock & entity avoidance)
  // ------------------------------------------------------------------
  let waypointIndex = state.waypointIndex;
  let targetX = state.targetX;
  let targetZ = state.targetZ;
  let targetZone = state.targetZone;
  let rngSeed = state.rngSeed;
  let recentTargets = state.recentTargets;

  const distToTarget = Math.hypot(targetX - state.x, targetZ - state.z);
  if (distToTarget < 3.8) {
    recentTargets = appendRecentTarget(recentTargets, targetX, targetZ);
    if (state.allowColonyTargets) {
      const picked = pickExplorationTarget(
        state.x,
        state.z,
        rngSeed,
        true,
        recentTargets,
        obstacles,
        heightAt,
      );
      targetX = picked.x;
      targetZ = picked.z;
      targetZone = picked.zone;
      rngSeed = picked.rngSeed;
    } else {
      waypointIndex = (waypointIndex + 1) % CURIOSITY_PATROL_WAYPOINTS.length;
      const wpNext = CURIOSITY_PATROL_WAYPOINTS[waypointIndex];
      targetX = wpNext.x;
      targetZ = wpNext.z;
      targetZone = wpNext.zone;
    }
  }
  const desiredYaw = Math.atan2(-(targetX - state.x), -(targetZ - state.z));

  let bestOffset = 0;
  let bestScore = Infinity;
  let sawEntity = false;
  let sawSlope = false;
  for (const offset of FORWARD_CANDIDATE_OFFSETS) {
    const candYaw = normalizeAngle(state.yaw + offset);
    const res = evaluateHeadingCandidate(state.x, state.z, candYaw, desiredYaw, solid, heightAt);
    if (res.clear) {
      // Slight hysteresis preference for continuing near current direction
      const adjusted = res.score + Math.abs(offset) * 0.12;
      if (adjusted < bestScore) {
        bestScore = adjusted;
        bestOffset = offset;
      }
    } else {
      if (res.blockedByEntity) sawEntity = true;
      if (res.blockedBySlope) sawSlope = true;
    }
  }

  // If forward cone is completely blocked, probe wide/rear escape gaps weighted by proximity to rear open space
  let wideEscapeOffset: number | null = null;
  if (!Number.isFinite(bestScore)) {
    let bestEscapeScore = Infinity;
    for (const offset of ESCAPE_CANDIDATE_OFFSETS) {
      const candYaw = normalizeAngle(state.yaw + offset);
      const res = evaluateHeadingCandidate(state.x, state.z, candYaw, candYaw, solid, heightAt);
      if (res.clear && res.score < bestEscapeScore) {
        bestEscapeScore = res.score;
        wideEscapeOffset = offset;
      }
    }
  }

  let recoveryTimer = Math.max(0, state.recoveryTimer - dt);
  let recoveryTurnSign = state.recoveryTurnSign;
  let stuckTimer = state.stuckTimer;
  let stuckAnchorX = state.stuckAnchorX;
  let stuckAnchorZ = state.stuckAnchorZ;
  let stuckAttempts = state.stuckAttempts;
  let targetSpeed = CURIOSITY_MAX_SPEED;
  let targetSteer = clamp(bestOffset * 0.52, -CURIOSITY_STEER_MAX, CURIOSITY_STEER_MAX);
  let yieldReason: CuriosityYieldReason = "none";

  const canReverse = evaluateHeadingCandidate(
    state.x,
    state.z,
    normalizeAngle(state.yaw + Math.PI),
    normalizeAngle(state.yaw + Math.PI),
    solid,
    heightAt,
  ).clear;

  if (entityBlockingClosely) {
    // Hold position politely whenever the astronaut or crew rover stands right ahead
    targetSpeed = 0;
    targetSteer = clamp(bestOffset * 0.5, -CURIOSITY_STEER_MAX, CURIOSITY_STEER_MAX);
    recoveryTimer = 0;
    stuckTimer = 0;
    yieldReason = "entity";
  } else if (!Number.isFinite(bestScore)) {
    // Forward cone blocked by rocks/crater -> back out toward the widest open escape gap & pick a new route
    if (recoveryTimer <= 0) {
      stuckAttempts += 1;
      recoveryTimer = canReverse ? 2.6 : 1.0;
      const openSign = wideEscapeOffset !== null ? (wideEscapeOffset >= 0 ? 1 : -1) : null;
      recoveryTurnSign = openSign ?? (stuckAttempts % 2 === 1 ? -state.recoveryTurnSign : 1);
      recentTargets = appendRecentTarget(recentTargets, targetX, targetZ);
      const escapeHeading = normalizeAngle(
        state.yaw + (wideEscapeOffset ?? recoveryTurnSign * 2.1),
      );
      const rerouted = pickExplorationTarget(
        state.x,
        state.z,
        rngSeed,
        state.allowColonyTargets,
        recentTargets,
        obstacles,
        heightAt,
        escapeHeading,
      );
      targetX = rerouted.x;
      targetZ = rerouted.z;
      targetZone = rerouted.zone;
      rngSeed = rerouted.rngSeed;
    }
    targetSpeed = canReverse ? -CURIOSITY_REVERSE_SPEED : CURIOSITY_MAX_SPEED * 0.35;
    targetSteer = (canReverse ? -recoveryTurnSign : recoveryTurnSign) * CURIOSITY_STEER_MAX;
    yieldReason = sawEntity ? "entity" : sawSlope ? "slope" : "obstacle";
  } else if (recoveryTimer > 0) {
    targetSpeed = canReverse ? -CURIOSITY_REVERSE_SPEED : CURIOSITY_MAX_SPEED * 0.45;
    targetSteer = (canReverse ? -recoveryTurnSign : recoveryTurnSign) * CURIOSITY_STEER_MAX;
    yieldReason = "obstacle";
  } else if (Math.abs(bestOffset) > 0.45) {
    // Slow slightly around tight boulders or sharp corner turns
    targetSpeed = CURIOSITY_MAX_SPEED * 0.72;
    yieldReason = sawSlope ? "slope" : sawEntity ? "entity" : "obstacle";
  }

  // Smooth speed & steering integration
  const speedBlend = 1 - Math.exp(-4.2 * dt);
  let speed = state.speed + (targetSpeed - state.speed) * speedBlend;
  if (Math.abs(targetSpeed) < 0.01 && Math.abs(speed) < 0.03) speed = 0;

  const steerDiff = targetSteer - state.steerAngle;
  const maxSteerStep = CURIOSITY_STEER_SPEED * dt;
  const steerAngle = Math.abs(steerDiff) <= maxSteerStep
    ? targetSteer
    : state.steerAngle + Math.sign(steerDiff) * maxSteerStep;

  // Dual-Axle (front + counter-steering rear) turning kinematics gives agile tight boulder dodging
  let yaw = state.yaw;
  if (Math.abs(speed) > 0.02) {
    const turnRate = (speed / CURIOSITY_WHEEL_BASE) * 1.45 * Math.tan(steerAngle);
    yaw = normalizeAngle(yaw + turnRate * dt);
  }

  // Rigid collision & slide against terrain/station obstacles + heavy crew MMSEV (never pushed by lightweight walker)
  const hull = curiosityFootprint(0, 0, yaw);
  const rotatedOverlaps = physicsObstacles.some((o) => overlapBody(state.x, state.z, hull, o));
  if (rotatedOverlaps) yaw = state.yaw;

  const moveX = -Math.sin(yaw) * speed * dt;
  const moveZ = -Math.cos(yaw) * speed * dt;
  const moved = moveAndSlide(state.x, state.z, moveX, moveZ, [curiosityFootprint(0, 0, yaw)], physicsObstacles, CURIOSITY_LIMIT);
  let x = moved.x;
  let z = moved.z;

  // Stop without sliding backward/sideways if forward step would intrude on the astronaut
  if (walkerObstacle) {
    const activeHull = curiosityFootprint(0, 0, yaw);
    if (overlapBody(x, z, activeHull, walkerObstacle)) {
      const nextDist = Math.hypot(x - walkerObstacle.x, z - walkerObstacle.z);
      const prevDist = Math.hypot(state.x - walkerObstacle.x, state.z - walkerObstacle.z);
      if (nextDist <= prevDist + 1e-4) {
        x = state.x;
        z = state.z;
        yaw = state.yaw;
        speed = 0;
        yieldReason = "entity";
      }
    }
  }

  const travelled = (x - state.x) * -Math.sin(yaw) + (z - state.z) * -Math.cos(yaw);

  // Check if physically stopped or making zero net progress -> escalate alternate turns & try a different path
  if (!entityBlockingClosely) {
    if (Math.hypot(x - stuckAnchorX, z - stuckAnchorZ) >= 2.0) {
      stuckAnchorX = x;
      stuckAnchorZ = z;
      stuckTimer = 0;
      stuckAttempts = 0;
    } else {
      stuckTimer += dt;
    }
  }

  if (moved.normals.length > 0 && targetSpeed > 0.2) {
    const actualSpeed = Math.abs(travelled / dt);
    if (actualSpeed < 0.15) {
      speed *= 0.4;
      if (recoveryTimer <= 0 && !entityBlockingClosely) {
        stuckAttempts += 1;
        recoveryTimer = 1.6;
        recoveryTurnSign = stuckAttempts % 2 === 1 ? -state.recoveryTurnSign : (bestOffset >= 0 ? 1 : -1);
      }
      if (yieldReason === "none") yieldReason = "obstacle";
    }
  }

  if (!entityBlockingClosely && recoveryTimer <= 0 && stuckTimer >= 2.8) {
    stuckAttempts += 1;
    stuckTimer = 0;
    stuckAnchorX = x;
    stuckAnchorZ = z;
    recoveryTurnSign = stuckAttempts % 2 === 1 ? -state.recoveryTurnSign : 1;
    recoveryTimer = canReverse ? 2.4 : 0.9;
    if (stuckAttempts >= 2) {
      recentTargets = appendRecentTarget(recentTargets, targetX, targetZ);
      const escapeHeading = Number.isFinite(bestScore)
        ? normalizeAngle(yaw + bestOffset)
        : normalizeAngle(yaw + recoveryTurnSign * 2.1);
      const rerouted = pickExplorationTarget(
        x,
        z,
        rngSeed,
        state.allowColonyTargets,
        recentTargets,
        obstacles,
        heightAt,
        escapeHeading,
      );
      targetX = rerouted.x;
      targetZ = rerouted.z;
      targetZone = rerouted.zone;
      rngSeed = rerouted.rngSeed;
    }
  }

  const wheelRoll = state.wheelRoll + travelled / CURIOSITY_WHEEL_RADIUS;
  const attitude = solveCuriosityAttitude(
    x,
    z,
    yaw,
    heightAt,
    state.chassisY,
    state.pitch,
    state.roll,
    state.leftRockerAngle,
    state.rightRockerAngle,
    state.leftBogieAngle,
    state.rightBogieAngle,
    dt,
  );

  // Subtle MastCam NavCam look sweep while driving; return crouch & arm cleanly to drive height
  const navLookYaw = clamp(Math.sin(totalTime * 0.55) * 0.28 + steerAngle * 0.45, -0.55, 0.55);
  const mastYaw = state.mastYaw + (navLookYaw - state.mastYaw) * (1 - Math.exp(-3.5 * dt));
  const mastPitch = state.mastPitch + (-0.06 - state.mastPitch) * (1 - Math.exp(-4 * dt));
  const armDeploy = Math.max(0, state.armDeploy - dt * 2);
  const scanCrouch = Math.max(0, state.scanCrouch - dt * 2.2);

  const driveTimer = state.driveTimer + (Math.abs(speed) > 0.55 ? dt : 0);
  const distFromColony = Math.hypot(x, z + 6);
  const farFromLastScan = state.recentTargets.every((p) => Math.hypot(p.x - x, p.z - z) >= 10);
  const colonyArrivalReady =
    state.allowColonyTargets &&
    farFromLastScan &&
    ((targetZone === "colony" && Math.hypot(targetX - x, targetZ - z) < 6.5 && driveTimer >= 3.5) ||
      driveTimer >= state.nextScanAfter);
  const farScanReady =
    colonyArrivalReady ||
    (!state.allowColonyTargets &&
      (distFromColony >= CURIOSITY_FAR_SCAN_RADIUS
        ? driveTimer >= state.nextScanAfter
        : driveTimer >= state.nextScanAfter * 3.5));

  // Transition cleanly to stop-and-scan cycle mostly in outer far plains / craters
  const forwardProbe = evaluateHeadingCandidate(x, z, yaw, yaw, solid, heightAt);
  const safeToScan =
    farScanReady &&
    recoveryTimer <= 0 &&
    !entityBlockingClosely &&
    forwardProbe.clear &&
    Math.abs(attitude.pitch) < 0.22 &&
    Math.abs(attitude.roll) < 0.22 &&
    !solid.some((o) => overlapDisc(x - Math.sin(yaw) * 2.2, z - Math.cos(yaw) * 2.2, 1.4, o));

  if (safeToScan) {
    const scanTarget = chooseScanTarget(x, z, yaw, obstacles, heightAt);
    return {
      ...state,
      x,
      z,
      yaw,
      speed,
      steerAngle,
      wheelRoll,
      scanCrouch,
      ...attitude,
      phase: "scanning",
      scanStage: "deploy",
      scanTimer: 0,
      driveTimer: 0,
      recoveryTimer: 0,
      recoveryTurnSign,
      armDeploy,
      mastYaw,
      mastPitch,
      laserActive: false,
      laserPulse: 0,
      scanTargetX: scanTarget.tx,
      scanTargetY: scanTarget.ty,
      scanTargetZ: scanTarget.tz,
      waypointIndex,
      targetX,
      targetZ,
      targetZone,
      rngSeed,
      recentTargets,
      stuckTimer: 0,
      stuckAnchorX: x,
      stuckAnchorZ: z,
      stuckAttempts: 0,
      currentZone: targetZone,
      yieldReason: "none",
      totalTime,
    };
  }

  return {
    ...state,
    x,
    z,
    yaw,
    speed,
    steerAngle,
    wheelRoll,
    scanCrouch,
    ...attitude,
    phase: "driving",
    scanStage: "none",
    driveTimer,
    recoveryTimer,
    recoveryTurnSign,
    armDeploy,
    mastYaw,
    mastPitch,
    laserActive: false,
    laserPulse: 0,
    waypointIndex,
    targetX,
    targetZ,
    targetZone,
    rngSeed,
    recentTargets,
    stuckTimer,
    stuckAnchorX,
    stuckAnchorZ,
    stuckAttempts,
    currentZone: targetZone,
    yieldReason,
    totalTime,
  };
}
