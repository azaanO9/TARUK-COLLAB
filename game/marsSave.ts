import { discoveryIds, type Mission } from "./juniorMission.ts";
import { CURIOSITY_LIMIT, type SavedCuriosityState } from "./curiosityRover.ts";

export const MARS_SAVE_KEY = "tarukh.mars.mission.v1";
export const CURIOSITY_SAVE_KEY = "tarukh.mars.curiosity.v1";
export type MarsSave = { version: 1; mission: Mission; callsign: string; patch: string; controlMode: "mobile" | "pc" };
const resources = ["power", "water", "food", "oxygen", "risk"] as const;
const patches = ["✦", "☄", "◉", "☾"];
const knownDiscoveries = new Set<string>(discoveryIds);
const scanStages = new Set(["none", "deploy", "laser", "stow"]);

function finiteInRange(value: unknown, limit: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}

/** Validate serialized Curiosity rover state before restoring from browser storage. */
export function parseCuriositySave(raw: string | null): SavedCuriosityState | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const s = value as Record<string, unknown>;
    if (s.version !== 1) return null;
    if (!finiteInRange(s.x, CURIOSITY_LIMIT) || !finiteInRange(s.z, CURIOSITY_LIMIT)) return null;
    if (typeof s.yaw !== "number" || !Number.isFinite(s.yaw)) return null;
    if (!finiteInRange(s.targetX, CURIOSITY_LIMIT) || !finiteInRange(s.targetZ, CURIOSITY_LIMIT)) return null;
    if (s.targetZone !== "colony" && s.targetZone !== "plains") return null;
    if (s.phase !== "driving" && s.phase !== "scanning") return null;
    if (typeof s.scanStage !== "string" || !scanStages.has(s.scanStage)) return null;
    if (typeof s.scanTimer !== "number" || !Number.isFinite(s.scanTimer) || s.scanTimer < 0 || s.scanTimer > 30) return null;
    if (typeof s.driveTimer !== "number" || !Number.isFinite(s.driveTimer) || s.driveTimer < 0 || s.driveTimer > 600) return null;
    if (typeof s.nextScanAfter !== "number" || !Number.isFinite(s.nextScanAfter) || s.nextScanAfter <= 0 || s.nextScanAfter > 120) return null;
    if (!Number.isInteger(s.scanCount) || (s.scanCount as number) < 0) return null;
    if (typeof s.lastScanSample !== "string" || s.lastScanSample.length > 200) return null;
    if (!Number.isInteger(s.rngSeed) || (s.rngSeed as number) < 0) return null;
    if (!Array.isArray(s.recentTargets) || s.recentTargets.length > 16) return null;
    for (const pt of s.recentTargets) {
      if (!pt || typeof pt !== "object") return null;
      const p = pt as Record<string, unknown>;
      if (!finiteInRange(p.x, CURIOSITY_LIMIT) || !finiteInRange(p.z, CURIOSITY_LIMIT)) return null;
    }
    return s as unknown as SavedCuriosityState;
  } catch {
    return null;
  }
}

/** Treat browser storage as untrusted and ignore unsupported or damaged saves. */
export function parseMarsSave(raw: string | null): MarsSave | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const save = value as Record<string, unknown>;
    if (save.version !== 1 || typeof save.callsign !== "string" || save.callsign.length > 24 || !/^[a-zA-Z0-9 -]*$/.test(save.callsign) || typeof save.patch !== "string" || !patches.includes(save.patch) || (save.controlMode !== "pc" && save.controlMode !== "mobile")) return null;
    if (!save.mission || typeof save.mission !== "object") return null;
    const mission = save.mission as Record<string, unknown>;
    if (!Number.isInteger(mission.sol) || (mission.sol as number) < 1 || (mission.sol as number) > 10 || !Number.isSafeInteger(mission.xp) || (mission.xp as number) < 0 || typeof mission.ended !== "boolean" || typeof mission.activityDone !== "boolean") return null;
    if (!mission.resources || typeof mission.resources !== "object") return null;
    const values = mission.resources as Record<string, unknown>;
    if (!resources.every(key => typeof values[key] === "number" && Number.isFinite(values[key]) && (values[key] as number) >= 0 && (values[key] as number) <= 100)) return null;
    if (!Array.isArray(mission.found) || mission.found.some(id => typeof id !== "string" || !knownDiscoveries.has(id)) || new Set(mission.found).size !== mission.found.length) return null;
    if (!Array.isArray(mission.patches) || mission.patches.some(id => typeof id !== "string" || (!knownDiscoveries.has(id) && !/^sol-(?:[1-9]|10)$/.test(id))) || new Set(mission.patches).size !== mission.patches.length) return null;
    if (!Array.isArray(mission.log) || mission.log.length > 1000 || mission.log.some(entry => typeof entry !== "string" || entry.length > 500)) return null;
    if (mission.failure !== undefined && typeof mission.failure !== "string") return null;
    if (mission.dispatch !== undefined && typeof mission.dispatch !== "string") return null;
    if (mission.serviced !== undefined && (!Array.isArray(mission.serviced) || mission.serviced.some(id=>typeof id!=="string"))) return null;
    if (mission.incoming !== undefined && (!mission.incoming || typeof mission.incoming!=="object" || Object.entries(mission.incoming).some(([k,v])=>!resources.some(key=>key===k)||!Number.isFinite(v)||Math.abs(v)>100))) return null;
    // Pre-atlas saves resume with their stores and discoveries. Collect the new day's evidence.
    if (!mission.ended && mission.serviced === undefined && mission.activityDone) mission.activityDone=false;
    return value as MarsSave;
  } catch { return null; }
}

