export type ResourceKey = "power" | "water" | "oxygen";
export type Resources = Record<ResourceKey, number>;
export type Phase = "briefing" | "choosing" | "consequence" | "ended";

export interface Choice {
  id: string;
  title: string;
  description: string;
  icon: "sun" | "water" | "science";
  focus: ResourceKey | "science";
  delta: Resources;
  science: number;
  consequence: { title: string; explanation: string; lesson: string };
}

export interface Scenario {
  id: string;
  title: string;
  situation: string;
  question: string;
  choices: readonly Choice[];
}

export interface TurnResult {
  scenarioId: string;
  choiceId: string;
  choiceTitle: string;
  before: Resources;
  after: Resources;
  actualDelta: Resources;
  scienceGained: number;
  consequence: Choice["consequence"];
}

export interface GameState {
  phase: Phase;
  turn: number;
  resources: Resources;
  science: number;
  history: TurnResult[];
  ending: "demo-complete" | "mission-complete" | "try-again" | null;
}

export type GameAction =
  | { type: "START" }
  | { type: "CHOOSE"; choiceId: string }
  | { type: "CONTINUE" }
  | { type: "REPLAY" };
