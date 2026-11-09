"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  Droplets,
  FlaskConical,
  Flag,
  Leaf,
  Maximize2,
  Orbit,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { MISSION, SCENARIOS } from "../content/scenarios";
import {
  canChoose,
  createInitialState,
  gameReducer,
  getScenario,
  previewChoice,
  RESOURCE_KEYS,
} from "../game/engine";
import type { GameAction, GameState } from "../game/types";
import LunarScene from "./LunarScene";

const resourceInfo = {
  power: {
    label: "Power",
    Icon: Zap,
    use: "Keeps your outpost running",
    className: "power",
  },
  water: {
    label: "Water",
    Icon: Droplets,
    use: "Every drop is precious",
    className: "water",
  },
  oxygen: {
    label: "Oxygen",
    Icon: Wind,
    use: "A little breathing room",
    className: "oxygen",
  },
};
const choiceIcons = { sun: Sun, water: Droplets, science: FlaskConical };
const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`);
const reduceGame = (state: GameState, action: GameAction) =>
  gameReducer(state, action);

export default function MissionControl({
  onSwitchMission,
}: {
  onSwitchMission?: () => void;
} = {}) {
  const [state, dispatch] = useReducer(
    reduceGame,
    undefined,
    createInitialState,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [sceneView, setSceneView] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const initialFocus = useRef(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const scenario = getScenario(state)!;
  const selected = scenario.choices.find((choice) => choice.id === selectedId);
  const result = state.history.at(-1);
  const preview =
    selected && state.phase === "choosing"
      ? previewChoice(state, selected)
      : null;

  useEffect(() => {
    if (guideOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [guideOpen]);

  useEffect(() => {
    if (initialFocus.current) {
      initialFocus.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
  }, [state.phase]);

  function replay() {
    setSelectedId(null);
    dispatch({ type: "REPLAY" });
  }
  function continueMission() {
    setSelectedId(null);
    dispatch({ type: "CONTINUE" });
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#mission">
        Skip to mission
      </a>
      <header className="topbar">
        <div className="brand-group">
          <a className="brand" href="/" aria-label="Six Shifts home">
            <span className="brand-orbit">
              <Orbit size={30} strokeWidth={1.5} />
            </span>
            <span>
              SIX SHIFTS
              <span className="brand-caption">
                JUNIOR ASTRONAUT MISSION TRAINER
              </span>
            </span>
          </a>
          {onSwitchMission && (
            <button
              className="mission-switch-pill"
              onClick={onSwitchMission}
              title="Switch to Downlink Satellite Mission"
            >
              <ArrowRight size={13} /> Switch to Downlink Satellite
            </button>
          )}
        </div>
        <div className="top-actions">
          <span className="prototype-tag">
            <span /> FIRST-SHIFT PROTOTYPE
          </span>
          <button className="text-button" onClick={() => setGuideOpen(true)}>
            <CircleHelp size={17} /> Field guide
          </button>
        </div>
      </header>

      <main>
        <section className="page-heading">
          <div>
            <p className="eyebrow">
              <span className="lime-dot" /> LUNAR OUTPOST / MISSION 001
            </p>
            <h1>
              Small crew. <span>Big decisions.</span>
            </h1>
            <p className="intro-copy">
              A home on the Moon starts with you. Make every resource count.
            </p>
          </div>
          <div className="crew-badge">
            <span className="crew-avatar">
              <Orbit size={28} />
            </span>
            <div>
              <span className="eyebrow">YOUR ROLE</span>
              <strong>Outpost commander</strong>
              <span className="muted">Explorer level · Ages 7–12</span>
            </div>
          </div>
        </section>

        <section className="resources" aria-label="Outpost resources">
          {RESOURCE_KEYS.map((key) => {
            const { label, Icon, use, className } = resourceInfo[key];
            const change =
              result && state.phase !== "briefing" && state.phase !== "choosing"
                ? result.actualDelta[key]
                : null;
            return (
              <div key={key} className={`resource-card ${className}`}>
                <div className="resource-top">
                  <span>
                    <Icon size={17} />
                    {label}
                  </span>
                  <span className="resource-note">
                    {change !== null ? (
                      <b className={change > 0 ? "gain" : "cost"}>
                        {signed(change)} this shift
                      </b>
                    ) : (
                      "IN RESERVE"
                    )}
                  </span>
                </div>
                <div className="resource-number">
                  <strong data-resource={key}>{state.resources[key]}</strong>
                  <span>
                    / 100 <small>points</small>
                  </span>
                </div>
                <div
                  role="meter"
                  aria-label={`${label} reserve`}
                  aria-valuenow={state.resources[key]}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="meter"
                >
                  <span style={{ width: `${state.resources[key]}%` }} />
                </div>
                <p>{use}</p>
              </div>
            );
          })}
          <div className="resource-card science">
            <div className="resource-top">
              <span>
                <FlaskConical size={17} />
                Science goal
              </span>
              <span className="resource-note">THE BIG PICTURE</span>
            </div>
            <div className="science-count">
              <strong>
                {state.science}
                <span> / {MISSION.scienceGoal}</span>
              </strong>
              <div className="sample-icons" aria-hidden="true">
                {Array.from({ length: MISSION.scienceGoal }, (_, i) => (
                  <FlaskConical
                    key={i}
                    size={21}
                    className={i < state.science ? "filled" : ""}
                  />
                ))}
              </div>
            </div>
            <p>
              Collect 3 samples across 6 shifts.
              <br />
              <span className="muted">
                Keep your outpost supplied along the way.
              </span>
            </p>
          </div>
        </section>

        <div className="mission-layout">
          <section
            className="outpost-view"
            aria-label="Interactive 3D lunar outpost"
          >
            <div className="view-top">
              <div>
                <span className="live-dot" /> TRANQUILITY OUTPOST
                <span className="view-coordinate">
                  LUNAR SURFACE · ILLUSTRATIVE VIEW
                </span>
              </div>
              <span className="view-chip">
                <span /> CREW CONNECTED
              </span>
            </div>
            <div className="scene-wrap">
              <LunarScene
                focus={
                  state.phase === "choosing"
                    ? selected?.focus
                    : result
                      ? scenario.choices.find((c) => c.id === result.choiceId)
                          ?.focus
                      : undefined
                }
                resolved={
                  state.phase === "consequence" || state.phase === "ended"
                }
                view={sceneView}
              />
              <div className="earth-label">
                <span className="earth" />
                <span>HOME, A LITTLE FARTHER AWAY.</span>
              </div>
              <div className="scene-title">
                <span className="eyebrow">
                  ONE OUTPOST. A WORLD OF POSSIBILITIES.
                </span>
                <p>
                  Your next giant leap
                  <br />
                  starts with a small choice.
                </p>
              </div>
              <div
                className={`object-label habitat-label ${selected?.focus === "water" ? "highlight" : ""}`}
              >
                <span /> HABITAT 01
              </div>
              <div
                className={`object-label solar-label ${selected?.focus === "power" ? "highlight" : ""}`}
              >
                <span /> SOLAR ARRAY
              </div>
              <div
                className={`object-label rover-label ${selected?.focus === "science" ? "highlight" : ""}`}
              >
                <span /> SCIENCE ROVER
              </div>
              <button
                className="view-control"
                aria-label="Rotate outpost view"
                title="Rotate outpost view"
                onClick={() => setSceneView((v) => v + 1)}
              >
                <RotateCcw size={17} />
              </button>
            </div>
            <div className="view-bottom">
              <span>
                <span className="lime-dot" /> YOUR OUTPOST IS IN YOUR HANDS
              </span>
              <span>
                3D MODEL <Maximize2 size={13} />
              </span>
            </div>
          </section>

          <section
            className="mission-panel"
            id="mission"
            aria-label="Mission decisions"
          >
            <div className="panel-top">
              <span className="eyebrow">MISSION CONTROL</span>
              <span className="shift-tag">
                SHIFT {state.turn} <span>/ {MISSION.totalShifts}</span>
              </span>
            </div>
            {state.phase === "briefing" && (
              <div className="briefing panel-content">
                <span className="mission-icon">
                  <Flag size={28} strokeWidth={1.5} />
                </span>
                <p className="eyebrow">YOU’VE LANDED. NOW, LEAD.</p>
                <h2 ref={heading} tabIndex={-1}>
                  Welcome to
                  <br />
                  your Moon base.
                </h2>
                <p>
                  You’re in charge of a tiny lunar outpost. Your mission? Care
                  for your crew and make room for discovery.
                </p>
                <div className="briefing-steps">
                  <div>
                    <span>01</span>
                    <p>Read your mission.</p>
                  </div>
                  <div>
                    <span>02</span>
                    <p>Choose how to use your supplies.</p>
                  </div>
                  <div>
                    <span>03</span>
                    <p>See what your decision changes.</p>
                  </div>
                </div>
                <div className="demo-note">
                  <Sparkles size={17} />
                  <p>
                    <strong>Try your first shift</strong>
                    <span>
                      One complete turn. Three ways to play.
                      <br />
                      Shifts 2–6 are coming next.
                    </span>
                  </p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => dispatch({ type: "START" })}
                >
                  Start my first shift <ArrowRight size={19} />
                </button>
                <p className="button-caption">
                  No timer. Take your time, commander.
                </p>
              </div>
            )}

            {state.phase === "choosing" && (
              <div className="panel-content choosing">
                <p className="eyebrow orange">YOUR FIRST CHALLENGE</p>
                <h2 ref={heading} tabIndex={-1}>
                  {scenario.title}
                </h2>
                <p>{scenario.situation}</p>
                <h3>{scenario.question}</h3>
                <div
                  className="choices"
                  role="group"
                  aria-label="Choose your crew action"
                >
                  {scenario.choices.map((choice) => {
                    const Icon = choiceIcons[choice.icon];
                    const effect = previewChoice(state, choice);
                    return (
                      <button
                        key={choice.id}
                        className={`choice-card ${selectedId === choice.id ? "selected" : ""}`}
                        aria-pressed={selectedId === choice.id}
                        onClick={() => setSelectedId(choice.id)}
                        disabled={!canChoose(state, choice)}
                      >
                        <span className="choice-icon">
                          <Icon size={20} />
                        </span>
                        <span className="choice-copy">
                          <strong>{choice.title}</strong>
                          <span>{choice.description}</span>
                          <span className="choice-deltas">
                            {RESOURCE_KEYS.map((key) => (
                              <span
                                key={key}
                                className={
                                  effect.actualDelta[key] > 0 ? "gain" : "cost"
                                }
                              >
                                {signed(effect.actualDelta[key])}{" "}
                                {resourceInfo[key].label.toLowerCase()}
                              </span>
                            ))}
                            {choice.science > 0 && (
                              <span className="gain">
                                +{choice.science} science
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="choice-radio">
                          {selectedId === choice.id && <Check size={12} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="selection-hint">
                  {preview
                    ? `After this choice: ${preview.after.power} power · ${preview.after.water} water · ${preview.after.oxygen} oxygen`
                    : "Pick a plan to preview your supplies."}
                </p>
                <button
                  className="primary-button"
                  disabled={!selected || !canChoose(state, selected)}
                  onClick={() => {
                    if (selected)
                      dispatch({ type: "CHOOSE", choiceId: selected.id });
                  }}
                >
                  Make it happen <ArrowRight size={19} />
                </button>
              </div>
            )}

            {state.phase === "consequence" && result && (
              <div className="panel-content consequence">
                <span className="mission-icon">
                  <Check size={30} />
                </span>
                <p className="eyebrow">DECISION LOGGED · SHIFT {state.turn}</p>
                <h2 ref={heading} tabIndex={-1}>
                  {result.consequence.title}
                </h2>
                <p>{result.consequence.explanation}</p>
                <div className="result-table" aria-label="Resource changes">
                  {RESOURCE_KEYS.map((key) => {
                    const { Icon, label } = resourceInfo[key];
                    return (
                      <div key={key}>
                        <span>
                          <Icon size={16} />
                          {label}
                        </span>
                        <span>
                          {result.before[key]} <ArrowRight size={14} />{" "}
                          <strong>{result.after[key]}</strong>
                          <b
                            className={
                              result.actualDelta[key] > 0 ? "gain" : "cost"
                            }
                          >
                            {signed(result.actualDelta[key])}
                          </b>
                        </span>
                      </div>
                    );
                  })}
                  {result.scienceGained > 0 && (
                    <div>
                      <span>
                        <FlaskConical size={16} />
                        Science
                      </span>
                      <b className="gain">+{result.scienceGained} sample</b>
                    </div>
                  )}
                </div>
                <div className="learning-note">
                  <Leaf size={21} />
                  <div>
                    <span className="eyebrow">A LITTLE LUNAR WISDOM</span>
                    <p>{result.consequence.lesson}</p>
                  </div>
                </div>
                <button className="primary-button" onClick={continueMission}>
                  {state.turn < SCENARIOS.length
                    ? "Continue to next shift"
                    : "See my mission recap"}{" "}
                  <ArrowRight size={19} />
                </button>
              </div>
            )}

            {state.phase === "ended" && (
              <div className="panel-content ending">
                <span className="mission-icon">
                  <ShieldCheck size={32} />
                </span>
                <p className="eyebrow">
                  {state.ending === "demo-complete"
                    ? "FIRST SHIFT COMPLETE"
                    : "MISSION RECAP"}
                </p>
                <h2 ref={heading} tabIndex={-1}>
                  {state.ending === "try-again"
                    ? "A new plan awaits."
                    : "That’s one giant start."}
                </h2>
                <p>
                  {state.ending === "demo-complete"
                    ? "You made a decision, balanced your supplies, and learned what it takes to build a home on the Moon."
                    : state.ending === "mission-complete"
                      ? "You kept your outpost supplied and reached your science goal!"
                      : "Your crew is taking a safe pause. Try another plan to keep supplies above zero and reach the science goal."}
                </p>
                <div className="recap-stat">
                  <span>
                    <Flag size={18} /> Shifts completed
                  </span>
                  <strong>
                    {state.history.length} / {MISSION.totalShifts}
                  </strong>
                </div>
                <div className="recap-stat">
                  <span>
                    <FlaskConical size={18} /> Science samples
                  </span>
                  <strong>
                    {state.science} / {MISSION.scienceGoal}
                  </strong>
                </div>
                <div className="learning-note">
                  <Sparkles size={23} />
                  <div>
                    <span className="eyebrow">THERE’S MORE THAN ONE WAY</span>
                    <p>What would change if you tried a different choice?</p>
                  </div>
                </div>
                <p className="demo-disclosure">
                  This prototype ends after shift 1. The full six-shift mission
                  and final challenge are still being built.
                </p>
                <button className="primary-button" onClick={replay}>
                  Play again <RotateCcw size={18} />
                </button>
              </div>
            )}
          </section>
        </div>

        <section className="journey" aria-label="Six-shift mission progress">
          <div className="journey-heading">
            <span className="eyebrow">YOUR SIX-SHIFT JOURNEY</span>
            <span>One thoughtful decision at a time.</span>
          </div>
          <ol>
            {MISSION.shiftNames.map((name, i) => (
              <li
                key={name}
                className={i === state.turn - 1 ? "current" : "locked"}
              >
                <span className="shift-node">
                  {i < state.history.length ? (
                    <Check size={15} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                <span>
                  <strong>{name}</strong>
                  <small>
                    {i === 0
                      ? state.history.length
                        ? "Completed"
                        : "Ready for you"
                      : "Planned · not playable yet"}
                  </small>
                </span>
                {i < 5 && (
                  <ChevronRight size={14} className="journey-chevron" />
                )}
              </li>
            ))}
          </ol>
        </section>
        <footer>
          <p>
            Built for curious minds. <span>Inspired by space exploration.</span>
          </p>
          <button onClick={() => setGuideOpen(true)}>
            Game points are educational assumptions <ArrowUpRight size={13} />
          </button>
        </footer>
      </main>

      <dialog
        ref={dialog}
        onCancel={() => setGuideOpen(false)}
        onClose={() => setGuideOpen(false)}
        className="field-guide"
        aria-labelledby="guide-title"
      >
        <div className="guide-header">
          <span className="eyebrow">COMMANDER’S FIELD GUIDE</span>
          <button
            className="icon-button"
            aria-label="Close field guide"
            onClick={() => setGuideOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="guide-title">A few things before liftoff.</h2>
        <h3>How to play</h3>
        <p>
          Start the shift, read the challenge, and select a plan. Check the
          resource changes, then press “Make it happen.” Read the consequence
          and open your recap. Replay to compare a different choice.
        </p>
        <h3>Educational assumptions</h3>
        <p>
          All resource values are invented game points, not percentages, liters,
          or real operating limits. You start with 60 power, 70 water, and 80
          oxygen. Each resource holds up to 100 points. The planned mission
          lasts 6 turns with a goal of 3 science samples. Only turn 1 is
          playable here.
        </p>
        <p>
          One action includes all resource changes for its shift. There is no
          hidden upkeep or timer. All numbers, costs, gains, and mission goals
          need future playtesting and science review.
        </p>
        <h3>Source references</h3>
        <p>
          These NASA sources support the ideas. They do not validate the game
          numbers.
        </p>
        <a
          href="https://ntrs.nasa.gov/citations/20240003496"
          target="_blank"
          rel="noreferrer"
        >
          NASA · Lunar dust and solar arrays <ArrowUpRight size={15} />
        </a>
        <a
          href="https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/"
          target="_blank"
          rel="noreferrer"
        >
          NASA · Water and oxygen life-support systems{" "}
          <ArrowUpRight size={15} />
        </a>
        <p className="muted">
          An independent Space Apps prototype. No NASA endorsement is implied.
        </p>
        <button className="primary-button" onClick={() => setGuideOpen(false)}>
          Ready, commander <Check size={18} />
        </button>
      </dialog>
    </div>
  );
}
