import { MISSION, SCENARIOS } from "../content/scenarios.ts";
import type {
  Choice,
  GameAction,
  GameState,
  Resources,
  Scenario,
  TurnResult,
} from "./types.ts";

export const RESOURCE_KEYS = ["power", "water", "oxygen"] as const;

/** Fresh state each time; pure functions have no browser or rendering dependencies. */
export function createInitialState(customInitial?: Partial<GameState>): GameState {
  return {
    phase: "briefing",
    turn: 1,
    resources: customInitial?.resources
      ? { ...customInitial.resources }
      : { ...MISSION.initialResources },
    science: customInitial?.science ?? 0,
    history: customInitial?.history ? [...customInitial.history] : [],
    ending: customInitial?.ending ?? null,
  };
}

export function getScenario(
  state: GameState,
  scenarios: readonly Scenario[] = SCENARIOS,
) {
  return scenarios[state.turn - 1] ?? null;
}

export function canChoose(state: GameState, choice: Choice): boolean {
  return (
    state.phase === "choosing" &&
    RESOURCE_KEYS.every((key) => state.resources[key] + choice.delta[key] >= 0)
  );
}

/** Read-only preview; authoritative calculations also run on CHOOSE. */
export function previewChoice(state: GameState, choice: Choice): TurnResult {
  const after = Object.fromEntries(
    RESOURCE_KEYS.map((key) => [
      key,
      Math.max(
        0,
        Math.min(MISSION.capacity, state.resources[key] + choice.delta[key]),
      ),
    ]),
  ) as Resources;
  return {
    scenarioId: getScenario(state)?.id ?? "",
    choiceId: choice.id,
    choiceTitle: choice.title,
    before: { ...state.resources },
    after,
    actualDelta: Object.fromEntries(
      RESOURCE_KEYS.map((key) => [key, after[key] - state.resources[key]]),
    ) as Resources,
    scienceGained: choice.science,
    consequence: { ...choice.consequence },
  };
}

/** Invalid actions are harmless no-ops. CHOOSE resolves exactly once per turn. */
export function gameReducer(
  state: GameState,
  action: GameAction,
  scenarios: readonly Scenario[] = SCENARIOS,
): GameState {
  if (action.type === "REPLAY") return createInitialState();
  if (action.type === "START" && state.phase === "briefing")
    return { ...state, phase: "choosing" };
  if (action.type === "CHOOSE" && state.phase === "choosing") {
    const scenario = getScenario(state, scenarios);
    const choice = scenario?.choices.find(
      (item) => item.id === action.choiceId,
    );
    if (!choice || !canChoose(state, choice)) return state;
    const result = {
      ...previewChoice(state, choice),
      scenarioId: scenario!.id,
    };
    return {
      ...state,
      phase: "consequence",
      resources: result.after,
      science: state.science + result.scienceGained,
      history: [...state.history, result],
    };
  }
  if (action.type === "CONTINUE" && state.phase === "consequence") {
    const depleted = RESOURCE_KEYS.some((key) => state.resources[key] === 0);
    const missionFinished = state.history.length >= MISSION.totalShifts;
    if (depleted || missionFinished || state.turn >= scenarios.length) {
      const ending = depleted
        ? "try-again"
        : missionFinished
          ? state.science >= MISSION.scienceGoal
            ? "mission-complete"
            : "try-again"
          : "demo-complete";
      return { ...state, phase: "ended", ending };
    }
    return { ...state, phase: "choosing", turn: state.turn + 1 };
  }
  return state;
}
