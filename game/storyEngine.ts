import { STORY_CHAPTERS, STORY_CONFIG } from "../content/story.ts";
import { STORY_RETRY_BANKS } from "../content/storyRetries.ts";
import type {
  StoryAction,
  StoryState,
  StoryChapter,
  StoryChoice,
} from "./storyTypes.ts";
import type { Resources } from "./types.ts";

const keys = ["power", "water", "oxygen"] as const;
export function createStory(): StoryState {
  return {
    choiceSeed: 0,
    phase: "arrival",
    chapter: 0,
    resources: { ...STORY_CONFIG.initialResources },
    checkpoint: { ...STORY_CONFIG.initialResources },
    science: 0,
    found: [],
    activeEvidence: null,
    attempts: [],
    completed: [],
    hintsUsed: [],
    lastChoice: null,
    followUpDecision: null,
  };
}

/** All authored choices, including retry-only distractors, for stable history lookup. */
export function allStoryChoices(chapter: StoryChapter): StoryChoice[] {
  const variants = (STORY_RETRY_BANKS[chapter.id] ?? [])
    .flat()
    .map((variant) => {
      const original = chapter.choices.find(
        (choice) => choice.id === variant.replaces,
      );
      if (!original || original.succeeds)
        throw new Error(`Invalid retry plan: ${variant.id}`);
      return { ...original, ...variant, succeeds: false, science: 0 };
    });
  return [...chapter.choices, ...variants];
}

function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  let random = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const j = random % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Stable within an attempt. New attempts change distractors and the correct letter. */
export function storyChoices(
  state: StoryState,
  chapters: readonly StoryChapter[] = STORY_CHAPTERS,
): StoryChoice[] {
  const chapter = chapterFor(state, chapters);
  const failures = state.attempts.filter(
    (a) => a.chapterId === chapter.id && !a.succeeded,
  ).length;
  const correct = chapter.choices.filter((choice) => choice.succeeds);
  const banks = [
    chapter.choices.filter((choice) => !choice.succeeds),
    ...(STORY_RETRY_BANKS[chapter.id] ?? []).map((bank) =>
      bank.map(
        (variant) =>
          allStoryChoices(chapter).find((choice) => choice.id === variant.id)!,
      ),
    ),
  ];
  const distractors = seededShuffle(
    banks[failures % banks.length],
    state.choiceSeed + state.chapter * 97 + failures * 13,
  );
  const slots = seededShuffle([0, 1, 2, 0, 1, 2], state.choiceSeed);
  const correctSlot = (slots[state.chapter % slots.length] + failures) % 3;
  const result = [...distractors];
  result.splice(correctSlot, 0, ...correct);
  return result;
}

export function storyChoiceById(chapter: StoryChapter, id: string | null) {
  return id
    ? allStoryChoices(chapter).find((choice) => choice.id === id)
    : undefined;
}

export function storyPathChoices(state: StoryState, chapter: StoryChapter) {
  const attempted = new Set(
    state.attempts
      .filter((attempt) => attempt.chapterId === chapter.id)
      .map((attempt) => attempt.choiceId),
  );
  return allStoryChoices(chapter).filter(
    (choice) =>
      chapter.choices.some((base) => base.id === choice.id) ||
      attempted.has(choice.id),
  );
}
export function chapterFor(
  state: StoryState,
  chapters: readonly StoryChapter[] = STORY_CHAPTERS,
) {
  return chapters[state.chapter];
}
export function canDecide(
  state: StoryState,
  chapters: readonly StoryChapter[] = STORY_CHAPTERS,
) {
  return (
    state.phase === "explore" &&
    state.found.length >= chapterFor(state, chapters).requiredClues
  );
}
export function applyStoryChoice(
  resources: Resources,
  choice: StoryChoice,
): Resources {
  return Object.fromEntries(
    keys.map((key) => [
      key,
      Math.max(
        0,
        Math.min(STORY_CONFIG.capacity, resources[key] + choice.delta[key]),
      ),
    ]),
  ) as Resources;
}
export function storySummary(state: StoryState) {
  const failures = state.attempts.filter((a) => !a.succeeded).length;
  const learned = state.completed.length;
  return {
    failures,
    learned,
    firstTry:
      learned -
      new Set(
        state.attempts
          .filter((a) => !a.succeeded && state.completed.includes(a.chapterId))
          .map((a) => a.chapterId),
      ).size,
    scienceGoalMet: state.science >= STORY_CONFIG.scienceGoal,
    reservesSafe: keys.every((k) => state.resources[k] > 0),
  };
}
/** Story calculations only. Failed tasks cannot advance. Retry restores the checkpoint. */
export function storyReducer(
  state: StoryState,
  action: StoryAction,
  chapters: readonly StoryChapter[] = STORY_CHAPTERS,
): StoryState {
  const chapter = chapterFor(state, chapters);
  if (action.type === "RESTART") return createStory();
  if (action.type === "BEGIN" && state.phase === "arrival")
    return {
      ...state,
      phase: "explore",
      choiceSeed: (action.choiceSeed ?? 0) >>> 0,
    };
  if (action.type === "INSPECT" && state.phase === "explore") {
    if (!chapter.evidence.some((e) => e.id === action.evidenceId)) return state;
    return {
      ...state,
      activeEvidence: action.evidenceId,
      found: state.found.includes(action.evidenceId)
        ? state.found
        : [...state.found, action.evidenceId],
    };
  }
  if (action.type === "DECIDE" && canDecide(state, chapters))
    return { ...state, phase: "decide", activeEvidence: null };
  if (
    action.type === "EXPLORE" &&
    (state.phase === "explore" || state.phase === "decide")
  )
    return { ...state, phase: "explore", activeEvidence: null };
  if (
    action.type === "HINT" &&
    (state.phase === "explore" || state.phase === "decide")
  )
    return {
      ...state,
      hintsUsed: [...new Set([...state.hintsUsed, chapter.id])],
    };
  if (action.type === "CHOOSE" && state.phase === "decide") {
    const choice = storyChoices(state, chapters).find(
      (c) => c.id === action.choiceId,
    );
    if (!choice) return state;
    const after = applyStoryChoice(state.resources, choice);
    return {
      ...state,
      phase: choice.succeeds ? "success" : "failed",
      resources: after,
      lastChoice: choice.id,
      followUpDecision: null,
      science: state.science + (choice.succeeds ? choice.science : 0),
      attempts: [
        ...state.attempts,
        {
          chapterId: chapter.id,
          choiceId: choice.id,
          succeeded: choice.succeeds,
          before: { ...state.resources },
          after,
          science: choice.succeeds ? choice.science : 0,
        },
      ],
      completed: choice.succeeds
        ? [...state.completed, chapter.id]
        : state.completed,
    };
  }
  if (action.type === "FOLLOW_UP" && state.phase === "failed") {
    if (state.followUpDecision) return state;
    const lastAttemptIndex = state.attempts.length - 1;
    const updatedAttempts = [...state.attempts];
    if (lastAttemptIndex >= 0) {
      updatedAttempts[lastAttemptIndex] = {
        ...updatedAttempts[lastAttemptIndex],
        followUpChoiceId: action.followUpId,
      };
    }
    return {
      ...state,
      followUpDecision: action.followUpId,
      attempts: updatedAttempts,
    };
  }
  if (action.type === "RETRY" && state.phase === "failed")
    return {
      ...state,
      phase: "explore",
      resources: { ...state.checkpoint },
      activeEvidence: null,
      lastChoice: null,
      followUpDecision: null,
    };
  if (action.type === "NEXT" && state.phase === "success") {
    if (state.chapter === chapters.length - 1)
      return { ...state, phase: "ending" };
    return {
      ...state,
      phase: "explore",
      chapter: state.chapter + 1,
      checkpoint: { ...state.resources },
      found: [],
      activeEvidence: null,
      lastChoice: null,
      followUpDecision: null,
    };
  }
  return state;
}
