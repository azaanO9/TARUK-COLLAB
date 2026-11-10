import { discoveryIds, type Mission } from "./juniorMission.ts";

export const MARS_SAVE_KEY = "tarukh.mars.mission.v1";
export type MarsSave = { version: 1; mission: Mission; callsign: string; patch: string; controlMode: "mobile" | "pc" };
const resources = ["power", "water", "food", "oxygen", "risk"] as const;
const patches = ["✦", "☄", "◉", "☾"];
const knownDiscoveries = new Set<string>(discoveryIds);

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
    return value as MarsSave;
  } catch { return null; }
}

