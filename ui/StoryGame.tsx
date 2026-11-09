"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Compass,
  Droplets,
  FlaskConical,
  GitBranch,
  HelpCircle,
  RotateCcw,
  ScanLine,
  Volume2,
  VolumeX,
  Wind,
  X,
  Zap,
  FastForward,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { STORY_CHAPTERS, STORY_CONFIG } from "../content/story";
import {
  canDecide,
  chapterFor,
  createStory,
  storyReducer,
  storySummary,
  storyChoices,
  storyChoiceById,
  storyPathChoices,
} from "../game/storyEngine";
import type { StoryAction, StoryState } from "../game/storyTypes";
import {
  getConsequenceVisual,
  getQuickDecision,
  QUICK_DECISIONS,
} from "../content/storyConsequences";
import StoryWorld from "./StoryWorld";
import BrandIntro from "./BrandIntro";
import { createSoundPlayer, type SoundCue } from "./soundEffects";
import "./story.css";

const reducer = (state: StoryState, action: StoryAction) =>
  storyReducer(state, action);
const resourceLabels = { power: "Power", water: "Water", oxygen: "Oxygen" };
const resourceIcons = { power: Zap, water: Droplets, oxygen: Wind };

function Mica({ large = false }: { large?: boolean }) {
  return (
    <span className={`ss-mica ${large ? "large" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <path d="M16 21L20 12H44L48 21V43L43 50H21L16 43Z" fill="#d6b285" />
        <path d="M19 24H45V40H19Z" fill="#1c2a32" />
        <circle cx="32" cy="32" r="7" fill="#b9efdc" />
        <circle cx="34" cy="30" r="2" fill="#fff" />
        <path
          d="M25 46H39M13 28H8V40H13M51 28H56V40H51"
          stroke="#b9c7c8"
          strokeWidth="3"
        />
        <path d="M25 14V8M39 14V8" stroke="#d6b285" strokeWidth="2" />
      </svg>
    </span>
  );
}

export default function StoryGame({ onLegacy }: { onLegacy: () => void }) {
  const [state, dispatch] = useReducer(reducer, undefined, createStory);
  const [modal, setModal] = useState<"trail" | "guide" | null>(null);
  const [orbit, setOrbit] = useState(0);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioState, setAudioState] = useState("not-started");
  const [lastSound, setLastSound] = useState<SoundCue | null>(null);
  const [consequenceStage, setConsequenceStage] = useState(0);
  const soundPlayer = useRef<ReturnType<typeof createSoundPlayer> | null>(null);
  if (!soundPlayer.current) soundPlayer.current = createSoundPlayer();
  const previousAttempts = useRef(0);
  const previousPhase = useRef(state.phase);
  const finishIntro = useCallback(() => setIntroVisible(false), []);
  const dialog = useRef<HTMLDialogElement>(null);
  const focusTitle = useRef<HTMLHeadingElement>(null);
  const firstFrame = useRef(true);
  const chapter = chapterFor(state);
  const evidence = chapter.evidence.find((e) => e.id === state.activeEvidence);
  const choice = storyChoiceById(chapter, state.lastChoice);
  const offeredChoices = storyChoices(state);
  const lastAttempt = state.attempts.at(-1);
  const summary = storySummary(state);
  const consequenceVisual = getConsequenceVisual(state.lastChoice);
  const quickDecision = getQuickDecision(state.lastChoice);

  const skipAnimation = useCallback(() => {
    setConsequenceStage(4);
  }, []);

  useEffect(() => {
    if (state.phase !== "failed") {
      setConsequenceStage(0);
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setConsequenceStage(4);
      return;
    }
    setConsequenceStage(1);
    const t1 = setTimeout(() => setConsequenceStage(2), 900);
    const t2 = setTimeout(() => setConsequenceStage(3), 1800);
    const t3 = setTimeout(() => setConsequenceStage(4), 2700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [state.phase, state.lastChoice]);
  const previousRetried =
    state.chapter > 0 &&
    state.attempts.some(
      (a) =>
        a.chapterId === STORY_CHAPTERS[state.chapter - 1].id && !a.succeeded,
    );
  const thisRetried = state.attempts.some(
    (a) => a.chapterId === chapter.id && !a.succeeded,
  );
  const radio = thisRetried
    ? "Back at the checkpoint. Your clues are still here. I've brought two new plans, and the solution is still among them. Let's look carefully."
    : previousRetried
      ? chapter.recoveredRadio
      : chapter.radio;
  const hintUsed = state.hintsUsed.includes(chapter.id);
  const playSound = useCallback(
    (cue: SoundCue) => {
      if (!soundEnabled) return;
      setLastSound(cue);
      void soundPlayer.current
        ?.play(cue)
        .then((status) => setAudioState(status));
    },
    [soundEnabled],
  );
  useEffect(() => {
    if (state.attempts.length > previousAttempts.current) {
      playSound(state.attempts.at(-1)!.succeeded ? "success" : "failure");
    } else if (state.phase === "ending" && previousPhase.current !== "ending") {
      playSound("complete");
    }
    previousAttempts.current = state.attempts.length;
    previousPhase.current = state.phase;
  }, [state.attempts.length, state.phase, playSound]);
  useEffect(() => () => soundPlayer.current?.dispose(), []);
  useEffect(() => {
    if (!introVisible) focusTitle.current?.focus({ preventScroll: true });
  }, [introVisible]);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    if (firstFrame.current) {
      firstFrame.current = false;
      return;
    }
    focusTitle.current?.focus({ preventScroll: true });
  }, [state.phase, state.chapter, state.activeEvidence]);
  useEffect(() => {
    setVoiceAvailable("speechSynthesis" in window);
    return () => window.speechSynthesis?.cancel();
  }, []);
  function readAloud() {
    if (!voiceAvailable) return;
    window.speechSynthesis.cancel();
    const selOpt = quickDecision?.options.find(
      (o) => o.id === state.followUpDecision,
    );
    const text =
      choice && state.phase === "failed" && quickDecision && !state.followUpDecision
        ? `${quickDecision.prompt}. ${quickDecision.micaCall}. ${quickDecision.situation}`
        : choice && state.phase === "failed" && quickDecision && selOpt
          ? `${selOpt.reaction} ${selOpt.lesson}`
          : choice && (state.phase === "failed" || state.phase === "success")
            ? `${choice.title}. ${choice.consequence}. ${choice.lesson}`
            : evidence
              ? `${evidence.title} ${evidence.observation} ${evidence.inference}`
              : `${chapter.title} ${radio} ${chapter.objective}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.88;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }
  function send(action: StoryAction) {
    window.speechSynthesis?.cancel();
    if (soundEnabled)
      void soundPlayer.current
        ?.unlock()
        .then((status) => setAudioState(status));
    if (action.type === "BEGIN") playSound("start");
    if (action.type === "INSPECT") playSound("inspect");
    if (action.type === "RETRY") playSound("retry");
    if (action.type === "FOLLOW_UP") {
      const qd = getQuickDecision(state.lastChoice);
      const opt = qd?.options.find((o) => o.id === action.followUpId);
      playSound(opt?.kind === "thoughtful" ? "stabilize" : "equipment-warn");
    }
    dispatch(
      action.type === "BEGIN"
        ? {
            ...action,
            choiceSeed:
              action.choiceSeed ?? Math.floor(Math.random() * 0x100000000),
          }
        : action,
    );
  }
  function toggleSound() {
    soundPlayer.current?.setEnabled(!soundEnabled);
    if (soundEnabled) {
      soundPlayer.current?.stop();
      setAudioState("muted");
    } else
      void soundPlayer.current
        ?.unlock()
        .then((status) => setAudioState(status));
    setSoundEnabled((enabled) => !enabled);
  }

  return (
    <>
      {introVisible && <BrandIntro onComplete={finishIntro} />}
      <main
        className={`ss-root ss-phase-${state.phase}`}
        inert={introVisible}
        aria-hidden={introVisible}
        data-audio-state={audioState}
        data-last-sound={lastSound ?? "none"}
      >
        <StoryWorld
          chapter={state.chapter}
          phase={state.phase}
          place={chapter.place}
          evidence={chapter.evidence}
          found={state.found}
          activeEvidence={state.activeEvidence}
          completed={state.completed}
          orbit={orbit}
          onInspect={(id) => send({ type: "INSPECT", evidenceId: id })}
          failedChoiceId={state.phase === "failed" ? state.lastChoice : null}
          isConsequenceAnimating={state.phase === "failed" && consequenceStage < 4}
        />
        <div className="ss-vignette" aria-hidden="true" />
        <div className="ss-film" aria-hidden="true" />
        <header className="ss-header">
          <div className="ss-wordmark">
            <span className="ss-emblem">
              6<span>✦</span>
            </span>
            <span>
              SIX SHIFTS<small>A SMALL STORY ON THE MOON</small>
            </span>
          </div>
          <div
            className="ss-reserves"
            aria-label="Outpost reserves in educational game points"
          >
            {(["power", "water", "oxygen"] as const).map((key) => {
              const Icon = resourceIcons[key];
              return (
                <div key={key} className={`ss-reserve ss-${key}`}>
                  <Icon size={15} />
                  <span>
                    {resourceLabels[key]}
                    <strong data-story-resource={key}>
                      {state.resources[key]}
                      <small>pts</small>
                    </strong>
                  </span>
                  <span className="ss-reserve-bar">
                    <i style={{ height: `${state.resources[key]}%` }} />
                  </span>
                </div>
              );
            })}
            <div className="ss-science">
              <FlaskConical size={16} />
              <span>
                {state.science}
                <small>/{STORY_CONFIG.scienceGoal}</small>
              </span>
            </div>
          </div>
          <div className="ss-header-actions">
            <button
              aria-label={
                soundEnabled ? "Mute game sounds" : "Enable game sounds"
              }
              title={soundEnabled ? "Game sounds on" : "Game sounds off"}
              onClick={toggleSound}
            >
              {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <button
              aria-label="Open your story paths"
              onClick={() => setModal("trail")}
            >
              <GitBranch size={17} />
              <span>Your path</span>
            </button>
            <button
              aria-label="Open explorer field notes"
              onClick={() => setModal("guide")}
            >
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {state.phase === "arrival" ? (
          <section className="ss-arrival" aria-label="Story introduction">
            <p className="ss-kicker">
              <span /> TRANQUILITY OUTPOST · YOU HAVE ARRIVED
            </p>
            <h1 ref={focusTitle} tabIndex={-1}>
              Somewhere quiet.
              <br />
              Something
              <br />
              <em>needs you.</em>
            </h1>
            <p>
              One small base. One very curious rover.
              <br />
              And six shifts to make the Moon feel like home.
            </p>
            <div className="ss-intro-radio">
              <Mica />
              <div>
                <span>MICA / YOUR ROVER COMPANION</span>
                <p>
                  “You're here. I was starting to think
                  <br />
                  I'd have to do the welcoming myself.”
                </p>
              </div>
            </div>
            <button
              className="ss-primary"
              onClick={() => send({ type: "BEGIN" })}
            >
              Wake the outpost <ArrowRight size={19} />
            </button>
            <span className="ss-arrival-note">
              An interactive 3D story for curious explorers, ages 7–12.
            </span>
          </section>
        ) : null}

        {state.phase !== "arrival" && state.phase !== "ending" && (
          <>
            <section className="ss-chapter-info" aria-label="Current mission">
              <p className="ss-kicker">
                <span className="ss-chapter-index">
                  {String(state.chapter + 1).padStart(2, "0")}
                </span>{" "}
                / SIX SHIFTS <i /> {chapter.time}
              </p>
              <h1>{chapter.title}</h1>
              <span className="ss-location">{chapter.location}</span>
              {state.phase === "explore" && (
                <p className="ss-objective">
                  <ScanLine size={15} />
                  {chapter.objective}
                </p>
              )}
            </section>
            <nav className="ss-progress" aria-label="Chapter progress">
              {STORY_CHAPTERS.map((c, i) => (
                <span
                  key={c.id}
                  aria-label={`Chapter ${i + 1}: ${state.completed.includes(c.id) ? "completed" : i === state.chapter ? "current" : "unexplored"}`}
                  className={`${i === state.chapter ? "active" : ""} ${state.completed.includes(c.id) ? "done" : ""}`}
                >
                  {state.completed.includes(c.id) ? (
                    <Check size={10} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
              ))}
            </nav>
          </>
        )}

        {state.phase === "explore" && (
          <>
            <aside className="ss-radio" aria-label="MICA radio message">
              <Mica />
              <div>
                <p className="ss-radio-label">
                  <span /> MICA <small>LOCAL RADIO</small>
                </p>
                <p>{radio}</p>
              </div>
            </aside>
            <section
              className={`ss-investigation ${evidence ? "has-evidence" : ""}`}
              aria-label="Investigation and clues"
            >
              {evidence ? (
                <>
                  <div className="ss-sheet-top">
                    <span className="ss-kicker">
                      CLUE FOUND / {state.found.length}
                    </span>
                    <button
                      aria-label="Close observation"
                      className="ss-small-icon"
                      onClick={() => send({ type: "EXPLORE" })}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <h2 ref={focusTitle} tabIndex={-1}>
                    {evidence.title}
                  </h2>
                  <p>{evidence.observation}</p>
                  <div className="ss-inference">
                    <span>WHAT YOU NOTICED</span>
                    <p>{evidence.inference}</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="ss-kicker">LOOK CLOSER</p>
                  <h2 ref={focusTitle} tabIndex={-1}>
                    {thisRetried
                      ? "A different approach."
                      : "Every object has a story."}
                  </h2>
                  <p>
                    Select a glowing marker in the outpost. Scout will walk over
                    to investigate.
                  </p>
                </>
              )}
              <div className="ss-clue-counter">
                <span>
                  {chapter.evidence.map((e) => (
                    <i
                      key={e.id}
                      className={state.found.includes(e.id) ? "found" : ""}
                    >
                      {state.found.includes(e.id) ? (
                        <Check size={11} />
                      ) : (
                        <ScanLine size={11} />
                      )}
                    </i>
                  ))}
                </span>
                <span>
                  {state.found.length} / {chapter.evidence.length} clues found
                </span>
              </div>
              <button
                className="ss-primary"
                disabled={!canDecide(state)}
                onClick={() => send({ type: "DECIDE" })}
              >
                {canDecide(state)
                  ? "I've got a plan"
                  : "Investigate to make a plan"}
                <ArrowRight size={17} />
              </button>
              {hintUsed ? (
                <p className="ss-hint">
                  <Mica />
                  {chapter.hint}
                </p>
              ) : (
                <button
                  className="ss-text"
                  onClick={() => send({ type: "HINT" })}
                >
                  Ask MICA for a nudge <ChevronRight size={13} />
                </button>
              )}
            </section>
          </>
        )}

        {state.phase === "decide" && (
          <section
            className="ss-decision"
            aria-label="Make your mission decision"
          >
            <div className="ss-sheet-top">
              <button
                className="ss-text"
                onClick={() => send({ type: "EXPLORE" })}
              >
                <ArrowLeft size={13} />
                Look around again
              </button>
              <span className="ss-kicker">YOUR MOVE</span>
            </div>
            <h2 ref={focusTitle} tabIndex={-1}>
              {chapter.prompt}
            </h2>
            <p className="ss-decision-note">
              {thisRetried
                ? "Fresh plans for this attempt. Use your clues, not just the letter."
                : "Think about what you found. Then choose what to do."}
            </p>
            <div className="ss-options">
              {offeredChoices.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => send({ type: "CHOOSE", choiceId: c.id })}
                >
                  <span className="ss-option-key">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>
                    <strong>{c.verb}</strong>
                    <small>{c.detail}</small>
                  </span>
                  <ArrowRight size={17} />
                </button>
              ))}
            </div>
            <div className="ss-decision-bottom">
              <span>
                <GitBranch size={13} />
                Your actions become your story.
              </span>
              {!hintUsed && (
                <button onClick={() => send({ type: "HINT" })}>
                  Need a nudge?
                </button>
              )}
            </div>
            {hintUsed && <p className="ss-hint">{chapter.hint}</p>}
          </section>
        )}

        {state.phase === "success" && choice && (
          <section
            className="ss-outcome success"
            aria-label="Mission consequence"
          >
            <div className="ss-outcome-symbol">
              <Check size={28} />
            </div>
            <p className="ss-kicker">
              MISSION COMPLETE · A SMALL STEP FORWARD
            </p>
            <h2 ref={focusTitle} tabIndex={-1}>
              {choice.title}
            </h2>
            <p className="ss-outcome-story">{choice.consequence}</p>
            <div className="ss-lesson">
              <span>TAKE THIS WITH YOU</span>
              <p>{choice.lesson}</p>
            </div>
            <div
              className="ss-change-list"
              aria-label="Supply changes from this decision"
            >
              {lastAttempt &&
                (["power", "water", "oxygen"] as const).map((key) => (
                  <span key={key}>
                    {resourceLabels[key]}{" "}
                    <b>
                      {lastAttempt.before[key]}
                      <ChevronRight size={11} />
                      {lastAttempt.after[key]}
                    </b>
                  </span>
                ))}
              {choice.science > 0 && (
                <span>
                  Science <b>+{choice.science}</b>
                </span>
              )}
            </div>
            <button
              className="ss-primary"
              onClick={() => send({ type: "NEXT" })}
            >
              {state.chapter === STORY_CHAPTERS.length - 1
                ? "See the home you made"
                : "Continue the story"}
              <ArrowRight size={18} />
            </button>
          </section>
        )}

        {state.phase === "failed" && choice && (
          <section
            className="ss-outcome failed ss-consequence-section"
            aria-label="Mission failure consequence and follow-up"
          >
            {/* 1. Animated Consequence Equipment Sequence Banner */}
            <div className="ss-consequence-hud">
              <div className="ss-hud-header">
                <span className="ss-hud-badge">
                  <AlertTriangle size={13} />
                  {consequenceVisual?.statusBadge ?? "EQUIPMENT ALERT"}
                </span>
                {consequenceStage < 4 && (
                  <button
                    className="ss-skip-animation"
                    onClick={skipAnimation}
                    aria-label="Skip consequence animation"
                  >
                    <span>Skip animation</span>
                    <FastForward size={14} />
                  </button>
                )}
              </div>

              <div
                className="ss-chain-sequence"
                aria-label="Causal chain sequence"
              >
                <div
                  className={`ss-chain-step ${consequenceStage >= 1 ? "active" : ""}`}
                >
                  <span className="ss-step-num">1</span>
                  <div>
                    <strong>Action taken</strong>
                    <p>
                      {consequenceVisual?.chain.actionTitle ?? choice.verb}
                    </p>
                  </div>
                </div>

                <div
                  className={`ss-chain-step ${consequenceStage >= 2 ? "active" : ""}`}
                >
                  <span className="ss-step-num">2</span>
                  <div>
                    <strong>Equipment response</strong>
                    <p>
                      {consequenceVisual?.chain.equipmentState ??
                        choice.consequence}
                    </p>
                  </div>
                </div>

                <div
                  className={`ss-chain-step ${consequenceStage >= 3 ? "active" : ""}`}
                >
                  <span className="ss-step-num">3</span>
                  <div>
                    <strong>Outpost impact</strong>
                    <p>
                      {consequenceVisual?.chain.outpostEffect ??
                        "Reserves depleted while problem remained."}
                    </p>
                  </div>
                </div>

                <div
                  className={`ss-chain-step ${consequenceStage >= 4 ? "active" : ""}`}
                >
                  <span className="ss-step-num">4</span>
                  <div>
                    <strong>MICA's observation</strong>
                    <p>
                      {consequenceVisual?.chain.micaExplanation ??
                        choice.lesson}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Quick Decision Moment or Final Failure Resolution */}
            {quickDecision && consequenceStage >= 4 ? (
              !state.followUpDecision ? (
                /* Interactive Quick Decision Form */
                <div
                  className="ss-quick-decision-card"
                  aria-label="Quick decision moment"
                >
                  <p className="ss-qd-kicker">
                    <ShieldAlert size={14} />
                    IMMEDIATE SITUATION · QUICK DECISION
                  </p>
                  <h2 ref={focusTitle} tabIndex={-1}>
                    {quickDecision.prompt}
                  </h2>
                  <div className="ss-qd-radio">
                    <Mica />
                    <p>“{quickDecision.micaCall}”</p>
                  </div>
                  <p className="ss-qd-situation">
                    {quickDecision.situation}
                  </p>
                  <div className="ss-qd-options">
                    {quickDecision.options.map((opt, i) => (
                      <button
                        key={opt.id}
                        onClick={() =>
                          send({ type: "FOLLOW_UP", followUpId: opt.id })
                        }
                      >
                        <span className="ss-option-key">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span>{opt.label}</span>
                        <ArrowRight size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Follow-Up Reaction & Conclusion */
                (() => {
                  const selOpt = quickDecision.options.find(
                    (o) => o.id === state.followUpDecision,
                  );
                  return (
                    <div className="ss-followup-resolution">
                      <p className="ss-kicker">
                        {selOpt?.kind === "thoughtful"
                          ? "SITUATION STABILIZED · LESSON LEARNED"
                          : "IMPULSIVE REACTION · LESSON LEARNED"}
                      </p>
                      <h2 ref={focusTitle} tabIndex={-1}>
                        {selOpt?.label}
                      </h2>
                      <div className="ss-qd-reaction">
                        <Mica />
                        <p>“{selOpt?.reaction}”</p>
                      </div>
                      <div className="ss-lesson">
                        <span>WHAT TO REMEMBER</span>
                        <p>{selOpt?.lesson}</p>
                      </div>
                      <div className="ss-qd-status-pill">
                        <span>Outpost status:</span>
                        <strong>{selOpt?.outpostStatus}</strong>
                      </div>
                      <div
                        className="ss-change-list"
                        aria-label="Supply changes from this decision"
                      >
                        {lastAttempt &&
                          (["power", "water", "oxygen"] as const).map(
                            (key) => (
                              <span key={key}>
                                {resourceLabels[key]}{" "}
                                <b>
                                  {lastAttempt.before[key]}
                                  <ChevronRight size={11} />
                                  {lastAttempt.after[key]}
                                </b>
                              </span>
                            ),
                          )}
                      </div>
                      <p className="ss-retry-note">
                        Retry rewinds this task's supplies. Your clues and the
                        story of your attempt stay with you. Finish this task
                        to continue.
                      </p>
                      <button
                        className="ss-primary"
                        onClick={() => send({ type: "RETRY" })}
                      >
                        Try this mission again <RotateCcw size={17} />
                      </button>
                    </div>
                  );
                })()
              )
            ) : consequenceStage >= 4 ? (
              /* Standard Failure Result (when choice has no quick decision) */
              <div className="ss-standard-failure">
                <div className="ss-outcome-symbol">
                  <GitBranch size={28} />
                </div>
                <p className="ss-kicker">
                  TASK FAILED · TRY ANOTHER APPROACH
                </p>
                <h2 ref={focusTitle} tabIndex={-1}>
                  {choice.title}
                </h2>
                <p className="ss-outcome-story">{choice.consequence}</p>
                <div className="ss-lesson">
                  <span>WHAT THIS ATTEMPT TAUGHT YOU</span>
                  <p>{choice.lesson}</p>
                </div>
                <div
                  className="ss-change-list"
                  aria-label="Supply changes from this decision"
                >
                  {lastAttempt &&
                    (["power", "water", "oxygen"] as const).map((key) => (
                      <span key={key}>
                        {resourceLabels[key]}{" "}
                        <b>
                          {lastAttempt.before[key]}
                          <ChevronRight size={11} />
                          {lastAttempt.after[key]}
                        </b>
                      </span>
                    ))}
                </div>
                <p className="ss-retry-note">
                  Retry rewinds this task's supplies. Your clues and the story
                  of your attempt stay with you. Finish this task to continue.
                </p>
                <button
                  className="ss-primary"
                  onClick={() => send({ type: "RETRY" })}
                >
                  Try this mission again <RotateCcw size={17} />
                </button>
              </div>
            ) : null}
          </section>
        )}

        {state.phase === "ending" && (
          <section className="ss-ending" aria-label="Your story ending">
            <Mica large />
            <p className="ss-kicker">TRANQUILITY OUTPOST / A HOME, AT LAST</p>
            <h1 ref={focusTitle} tabIndex={-1}>
              {summary.failures > 0 ? (
                <>
                  You found your way.
                  <br />
                  <em>Together.</em>
                </>
              ) : (
                <>
                  Small steps.
                  <br />
                  <em>A place to call home.</em>
                </>
              )}
            </h1>
            <p>
              The lights are on. The water comes back. The door is sealed.
              <br />
              MICA is beside you. And Earth knows you're here.
            </p>
            <div className="ss-ending-facts">
              <span>
                <strong>{summary.learned}</strong> missions understood
              </span>
              <span>
                <strong>{state.science}</strong> science discoveries
              </span>
              <span>
                <strong>{summary.failures}</strong> attempts learned from
              </span>
            </div>
            <blockquote>
              “I thought a home was something you landed in.
              <br />
              Turns out it's something you look after.”<cite>— MICA</cite>
            </blockquote>
            <div className="ss-ending-actions">
              <button className="ss-primary" onClick={() => setModal("trail")}>
                See the path you took <GitBranch size={17} />
              </button>
              <button
                className="ss-secondary"
                onClick={() => send({ type: "RESTART" })}
              >
                Begin another story <RotateCcw size={15} />
              </button>
            </div>
          </section>
        )}

        <footer className="ss-footer">
          <span className="ss-training-dot" />
          TRAINING SIMULATION
          <span className="ss-footer-divider" />
          {state.phase === "explore" ? (
            <>
              <span>Drag to look · Select objects to investigate</span>
              <button
                onClick={() => {
                  setOrbit((v) => v + 1);
                }}
                aria-label="Rotate story camera"
              >
                <Compass size={15} />
                <span>Change view</span>
              </button>
            </>
          ) : (
            <span>No timer. Curiosity sets the pace.</span>
          )}
          <div className="ss-footer-right">
            {voiceAvailable && state.phase !== "arrival" && (
              <button
                onClick={readAloud}
                aria-label="Read current story text aloud"
              >
                <Volume2 size={15} />
                <span>Read aloud</span>
              </button>
            )}
            <span>All reserves are educational game points.</span>
          </div>
        </footer>

        <dialog
          ref={dialog}
          className="ss-dialog"
          onCancel={() => setModal(null)}
          onClose={() => setModal(null)}
          aria-labelledby="ss-dialog-title"
        >
          <div className="ss-sheet-top">
            <span className="ss-kicker">EXPLORER'S NOTEBOOK</span>
            <button
              className="ss-small-icon"
              aria-label="Close notebook"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
          </div>
          <h2 id="ss-dialog-title">
            {modal === "trail"
              ? "This is how your story unfolded."
              : "A little help for a big adventure."}
          </h2>
          {modal === "trail" ? (
            <>
              <p className="ss-modal-intro">
                Your discoveries, detours, and second tries. Every completed
                mission opens the next.
              </p>
              <div className="ss-flowchart">
                {STORY_CHAPTERS.map((c, i) => {
                  const attempts = state.attempts.filter(
                    (a) => a.chapterId === c.id,
                  );
                  const visited =
                    i <= state.chapter && state.phase !== "arrival";
                  return (
                    <section
                      key={c.id}
                      className={`${state.completed.includes(c.id) ? "completed" : ""} ${visited ? "visited" : "unseen"}`}
                    >
                      <div className="ss-flow-heading">
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <h3>{visited ? c.title : "An unexplored chapter"}</h3>
                        {state.completed.includes(c.id) && <Check size={17} />}
                      </div>
                      {visited && (
                        <div className="ss-branches">
                          {storyPathChoices(state, c).map((c) => {
                            const tried = attempts.filter(
                              (a) => a.choiceId === c.id,
                            );
                            const latestFollowUp = tried.at(-1)?.followUpChoiceId;
                            const qd = QUICK_DECISIONS[c.id];
                            const followUpOpt = qd?.options.find(
                              (o) => o.id === latestFollowUp,
                            );
                            return (
                              <div
                                key={c.id}
                                className={
                                  tried.length
                                    ? c.succeeds
                                      ? "taken-success"
                                      : "taken-fail"
                                    : "untaken"
                                }
                              >
                                <span />
                                {tried.length ? c.verb : "Untried path"}
                                <small>
                                  {tried.length
                                    ? c.succeeds
                                      ? "TASK SOLVED"
                                      : `${tried.length} ATTEMPT${tried.length > 1 ? "S" : ""} → RETRY${followUpOpt ? ` · Follow-up: “${followUpOpt.label}”` : ""}`
                                    : "NOT TAKEN"}
                                </small>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <h3>A story you play</h3>
              <p>
                Select the glowing objects in the 3D base to investigate. Read
                what Scout notices, then make a plan. Drag to look around. You
                can also focus the 3D area and use W A S D or arrow keys to walk
                Scout.
              </p>
              <h3>When a plan doesn't work</h3>
              <p>
                The mission pauses and explains why. Retry returns supplies to
                that task's checkpoint. You keep your clues and the record of
                your attempt. You must solve the task before opening the next
                chapter. There is no timer or penalty for asking MICA for help.
              </p>
              <p>
                Read the plans, not just their letters. The correct solution can
                appear at A, B or C. After an unsuccessful attempt, the next
                retry offers different wrong plans while keeping the correct
                solution available. Hints and rereading do not shuffle options
                during an attempt.
              </p>
              <h3>Sound and the opening</h3>
              <p>
                Soft sounds mark discoveries, success, and a plan that needs
                another try. The sound button in the top bar turns game sounds
                off or on. The opening can be skipped, and respects
                reduced-motion settings.
              </p>
              <button
                className="ss-text"
                onClick={() => {
                  setModal(null);
                  setIntroVisible(true);
                }}
              >
                Watch the opening again <RotateCcw size={13} />
              </button>
              <h3>Educational assumptions</h3>
              <p>
                All supply values, costs, gains, chapter clocks, cleaning and
                repair checklists, equipment, and site layout are fictional
                teaching simplifications. The six shifts do not represent real
                lunar days. Reserves are abstract points, not percentages or
                survival limits. Science goal: three discoveries. This is an
                independent prototype.
              </p>
              <h3>Source references</h3>
              <p>
                NASA references support the underlying concepts, separately from
                the invented numbers.
              </p>
              <a
                href="https://www.nasa.gov/general/is-there-weather-on-the-moon-we-asked-a-nasa-scientist-episode-34/"
                target="_blank"
                rel="noreferrer"
              >
                NASA · Weather and wind on the Moon ↗
              </a>
              <a
                href="https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/"
                target="_blank"
                rel="noreferrer"
              >
                NASA · Water and oxygen life support ↗
              </a>
              <a
                href="https://www.nasa.gov/goddard/esc/lcrns/"
                target="_blank"
                rel="noreferrer"
              >
                NASA · Lunar communications relays ↗
              </a>
              <div className="ss-prototype-link">
                <button
                  className="ss-text"
                  onClick={() => {
                    setModal(null);
                    onLegacy();
                  }}
                >
                  Open the earlier satellite prototype <ArrowRight size={13} />
                </button>
              </div>
            </>
          )}
        </dialog>
      </main>
    </>
  );
}
