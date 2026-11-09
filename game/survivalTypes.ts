export type Reserves = {
  power: number;
  water: number;
  food: number;
  oxygen: number;
};
export type Effect =
  | "dust"
  | "power"
  | "water"
  | "food"
  | "oxygen"
  | "radiation"
  | "rover"
  | "signal";
export interface Station {
  id: string;
  name: string;
  x: number;
  z: number;
  kind: Effect | "shelter" | "science";
  description: string;
}
export interface Plan {
  id: string;
  title: string;
  good: boolean;
  delta: Reserves;
  risk: number;
  effect: Effect;
  action: string;
  equipment: string;
  consequence: string;
  lesson: string;
}
export interface Day {
  id: string;
  title: string;
  event: "quiet" | "eclipse" | "flare" | "particles";
  weather: string;
  risk: number;
  target: string;
  clues: string[];
  objective: string;
  radio: string;
  lesson: string;
  source?: string;
  science: number;
  plans: Plan[][];
}
export interface Attempt {
  day: number;
  plan: Plan;
  before: Reserves;
  after: Reserves;
  risk: number;
  response?: string;
}
export interface SurvivalState {
  phase: "arrival" | "explore" | "result" | "failed" | "ending";
  day: number;
  reserves: Reserves;
  checkpoint: Reserves;
  risk: number;
  found: string[];
  attempts: Attempt[];
  result: Attempt | null;
  response: string | null;
  science: number;
  seed: number;
}
export type SurvivalAction =
  | { type: "BEGIN"; seed?: number }
  | { type: "INSPECT"; id: string }
  | { type: "CHOOSE"; id: string }
  | { type: "RESPOND"; id: string }
  | { type: "RETRY" }
  | { type: "END_DAY" }
  | { type: "RESTART" };
