/** Shared multiplayer state, WebRTC signaling, trading, and room event contracts. */
import type { BaseDefenseUnit, DefenseKind } from "./baseDefenses.ts";
import type { MineableNode } from "./marsCaveData.ts";
import type { StalkerEntity } from "./marsStalkers.ts";
import type { MarsEnvironmentSnapshot, WeatherEventType } from "./marsWeather.ts";
import type { RoverGear } from "./roverVehicle.ts";

export type BiomeId = "surface" | "cave";

export type PlayerSupplies = {
  oxygen: number;
  water: number;
  powerCells: number;
  suitIntegrity: number;
  morale: number;
  iceCores: number;
  titanium: number;
};

export type NetworkPlayerState = {
  id: string;
  callsign: string;
  patch: string;
  suitColor: string;
  isHost: boolean;
  ready: boolean;
  biome: BiomeId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  jumpHeight: number;
  speed: number;
  inRover: boolean;
  talking: boolean;
  supplies: PlayerSupplies;
};

export type NetworkRoverState = {
  driverId: string | null;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  steerAngle: number;
  pitch: number;
  roll: number;
  chassisY: number;
  gear: RoverGear;
};

export type TeamResourcePool = {
  power: number;
  oxygen: number;
  water: number;
  food: number;
  titanium: number;
  iceCores: number;
};

export type TradeResourceKind = "oxygen" | "water" | "powerCells" | "iceCores" | "titanium";

export type RoomSummary = {
  code: string;
  hostCallsign: string;
  playerCount: number;
  maxPlayers: number;
  started: boolean;
  weather: WeatherEventType;
  sol: number;
};

export type RoomStateSnapshot = {
  code: string;
  started: boolean;
  simTime: number;
  hostId: string;
  players: NetworkPlayerState[];
  rover: NetworkRoverState;
  teamPool: TeamResourcePool;
  environment: MarsEnvironmentSnapshot;
  defenses: BaseDefenseUnit[];
  stalkers: StalkerEntity[];
  minerals: MineableNode[];
  alerts: string[];
};

export type PlayerMovePayload = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  jumpHeight: number;
  speed: number;
  biome: BiomeId;
  inRover: boolean;
  talking?: boolean;
};

export type RoverSyncPayload = {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  steerAngle: number;
  pitch: number;
  roll: number;
  chassisY: number;
  gear: RoverGear;
};

export type TradeTransferPayload = {
  toPlayerId: string;
  resource: TradeResourceKind;
  amount: number;
};

export type RtcSignalPayload = {
  targetId: string;
  sdp?: unknown;
  candidate?: unknown;
};

export interface ClientToServerEvents {
  "lobby:list": (ack?: (rooms: RoomSummary[]) => void) => void;
  "room:create": (
    payload: { callsign: string; patch: string; maxPlayers?: number },
    ack: (res: { ok: boolean; room?: RoomStateSnapshot; error?: string }) => void,
  ) => void;
  "room:join": (
    payload: { code: string; callsign: string; patch: string },
    ack: (res: { ok: boolean; room?: RoomStateSnapshot; error?: string }) => void,
  ) => void;
  "room:ready": (ready: boolean) => void;
  "room:start": () => void;
  "room:leave": () => void;
  "player:update": (payload: PlayerMovePayload) => void;
  "rover:claim": (driving: boolean, ack?: (ok: boolean) => void) => void;
  "rover:update": (payload: RoverSyncPayload) => void;
  "trade:transfer": (
    payload: TradeTransferPayload,
    ack?: (res: { ok: boolean; error?: string }) => void,
  ) => void;
  "mineral:mine": (
    nodeId: string,
    ack?: (res: { ok: boolean; error?: string }) => void,
  ) => void;
  "defense:deploy": (
    payload: { kind: DefenseKind; x: number; z: number },
    ack?: (res: { ok: boolean; error?: string }) => void,
  ) => void;
  "weather:override": (weather: WeatherEventType | null) => void;
  "station:resupply": (kind: "oxygen" | "water" | "power" | "shelter") => void;
  "rtc:offer": (payload: RtcSignalPayload) => void;
  "rtc:answer": (payload: RtcSignalPayload) => void;
  "rtc:ice": (payload: RtcSignalPayload) => void;
}

export interface ServerToClientEvents {
  "room:state": (snapshot: RoomStateSnapshot) => void;
  "room:alert": (message: string) => void;
  "stalker:strike": (payload: {
    playerId: string;
    suitLoss: number;
    moraleLoss: number;
    stalkerId: string;
  }) => void;
  "rtc:offer": (payload: { fromId: string; sdp: unknown }) => void;
  "rtc:answer": (payload: { fromId: string; sdp: unknown }) => void;
  "rtc:ice": (payload: { fromId: string; candidate: unknown }) => void;
}

