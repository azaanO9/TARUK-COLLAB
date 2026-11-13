import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  PlayerMovePayload,
  RoomStateSnapshot,
  RoomSummary,
  RoverSyncPayload,
  ServerToClientEvents,
  TradeTransferPayload,
} from "../../game/multiplayerTypes";
import type { DefenseKind } from "../../game/baseDefenses";
import type { WeatherEventType } from "../../game/marsWeather";
import type { BaseModuleKind, PlacedModule } from "../../game/baseBuilding";
import type { RoverUpgradeId } from "../../game/roverUpgrades";
import type { SkillNodeId } from "../../game/crewSkills";

export type CoopSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function defaultMultiplayerServerUrl(): string {
  if (typeof window === "undefined") return "http://localhost:3001";
  const envUrl = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_MULTIPLAYER_URL;
  if (envUrl) return envUrl;
  const host = window.location.hostname || "localhost";
  return `${window.location.protocol}//${host}:3001`;
}

export function connectMultiplayerServer(url = defaultMultiplayerServerUrl()): CoopSocket {
  return io(url, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnectionAttempts: 5,
    timeout: 6000,
  });
}

export async function listRooms(socket: CoopSocket): Promise<RoomSummary[]> {
  return new Promise((resolve) => {
    socket.emit("lobby:list", (rooms) => resolve(Array.isArray(rooms) ? rooms : []));
  });
}

export async function createCoopRoom(
  socket: CoopSocket,
  callsign: string,
  patch: string,
  maxPlayers = 4,
): Promise<{ ok: boolean; room?: RoomStateSnapshot; error?: string }> {
  return new Promise((resolve) => {
    socket.emit("room:create", { callsign, patch, maxPlayers }, (res) => resolve(res));
  });
}

export async function joinCoopRoom(
  socket: CoopSocket,
  code: string,
  callsign: string,
  patch: string,
): Promise<{ ok: boolean; room?: RoomStateSnapshot; error?: string }> {
  return new Promise((resolve) => {
    socket.emit("room:join", { code, callsign, patch }, (res) => resolve(res));
  });
}

export function sendPlayerState(socket: CoopSocket, payload: PlayerMovePayload) {
  socket.emit("player:update", payload);
}

export function sendRoverState(socket: CoopSocket, payload: RoverSyncPayload) {
  socket.emit("rover:update", payload);
}

export async function claimRoverSeat(socket: CoopSocket, driving: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    socket.emit("rover:claim", driving, (ok) => resolve(Boolean(ok)));
  });
}

export async function sendResourceTrade(
  socket: CoopSocket,
  payload: TradeTransferPayload,
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    socket.emit("trade:transfer", payload, (res) => resolve(res));
  });
}

export async function deployBaseDefense(
  socket: CoopSocket,
  kind: DefenseKind,
  x: number,
  z: number,
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    socket.emit("defense:deploy", { kind, x, z }, (res) => resolve(res));
  });
}

export async function mineCaveNode(
  socket: CoopSocket,
  nodeId: string,
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    socket.emit("mineral:mine", nodeId, (res) => resolve(res));
  });
}

export function overrideRoomWeather(socket: CoopSocket, weather: WeatherEventType | null) {
  socket.emit("weather:override", weather);
}

export function sendStationResupply(
  socket: CoopSocket,
  kind: "oxygen" | "water" | "power" | "shelter",
) {
  socket.emit("station:resupply", kind);
}

export async function placeBaseModule(
  socket: CoopSocket,
  kind: BaseModuleKind,
  x: number,
  z: number,
  rotationY = 0,
): Promise<{ ok: boolean; module?: PlacedModule; error?: string }> {
  return new Promise((resolve) => {
    socket.emit("module:place", { kind, x, z, rotationY }, (res) => resolve(res));
  });
}

export async function upgradeRover(
  socket: CoopSocket,
  upgradeId: RoverUpgradeId,
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    socket.emit("rover:upgrade", upgradeId, (res) => resolve(res));
  });
}

export async function unlockCrewSkill(
  socket: CoopSocket,
  skillId: SkillNodeId,
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    socket.emit("skills:unlock", skillId, (res) => resolve(res));
  });
}

export function gainPlayerXp(socket: CoopSocket, amount: number, reason: string) {
  socket.emit("xp:gain", amount, reason);
}

export function toggleRoverWinch(
  socket: CoopSocket,
  active: boolean,
  anchor?: { x: number; y: number; z: number } | null,
) {
  socket.emit("winch:toggle", { active, anchor });
}

