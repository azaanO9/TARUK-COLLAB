import type { Resources } from "./types.ts";

export type StoryPhase =
  | "arrival"
  | "explore"
  | "decide"
  | "success"
  | "failed"
  | "ending";
export type Place =
  | "solar"
  | "water"
  | "airlock"
  | "rover"
  | "sample"
  | "antenna";
export interface Evidence {
  id: string;
  label: string;
  position: [number, number, number];
  title: string;
  observation: string;
  inference: string;
}
export interface StoryChoice {
  id: string;
  verb: string;
  detail: string;
  succeeds: boolean;
  delta: Resources;
  science: number;
  title: string;
  consequence: string;
  lesson: string;
}
export interface StoryChapter {
  id: string;
  title: string;
  location: string;
  place: Place;
  time: string;
  objective: string;
  radio: string;
  recoveredRadio: string;
  prompt: string;
  hint: string;
  requiredClues: number;
  evidence: readonly Evidence[];
  choices: readonly StoryChoice[];
}
export interface Attempt {
  chapterId: string;
  choiceId: string;
  succeeded: boolean;
  before: Resources;
  after: Resources;
  science: number;
  followUpChoiceId?: string;
}
export interface StoryState {
  choiceSeed: number;
  phase: StoryPhase;
  chapter: number; // Zero-based. Never increments after a failed attempt.
  resources: Resources;
  checkpoint: Resources;
  science: number;
  found: string[];
  activeEvidence: string | null;
  attempts: Attempt[];
  completed: string[];
  hintsUsed: string[];
  lastChoice: string | null;
  followUpDecision: string | null;
}
export type StoryAction =
  | { type: "BEGIN"; choiceSeed?: number }
  | { type: "INSPECT"; evidenceId: string }
  | { type: "DECIDE" }
  | { type: "EXPLORE" }
  | { type: "CHOOSE"; choiceId: string }
  | { type: "HINT" }
  | { type: "FOLLOW_UP"; followUpId: string }
  | { type: "RETRY" }
  | { type: "NEXT" }
  | { type: "RESTART" };
