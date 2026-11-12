"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  DAYS,
  DAILY_USE,
  QUICK_RESPONSES,
  SPACE_SOURCES,
  STATIONS,
} from "../content/survival";
import {
  createSurvival,
  currentDay,
  offeredPlans,
  readyToPlan,
  survivalReducer,
} from "../game/survivalEngine";
import type { SurvivalAction } from "../game/survivalTypes";
import SurvivalWorld, { type View } from "./SurvivalWorld";
import BrandIntro from "./BrandIntro";
import LunarLanding from "./LunarLanding";
import { createSoundPlayer, type SoundCue } from "./soundEffects";
import { RotateToLandscapeGate } from "./RotateToLandscapeGate";
import { isCoarsePointerDevice } from "./mobileDevice";
import "./survival.css";
const labels = {
  power: "Power",
  water: "Water",
  food: "Food",
  oxygen: "Oxygen",
};
const initialView: View = {
  x: 0,
  z: 12,
  yaw: 0,
  target: null,
  distance: Infinity,
  locked: false,
  jumpHeight: 0,
};
export default function SurvivalGame({ skipOpening = false, initialTouchControls = false, autoDetectTouch = true }: { skipOpening?: boolean; initialTouchControls?: boolean; autoDetectTouch?: boolean }) {
  const [state, dispatch] = useReducer(
    survivalReducer,
    undefined,
    createSurvival,
  );
  useEffect(() => { if (skipOpening) dispatch({ type: "BEGIN", seed: 0 }); }, [skipOpening]);
  const [intro, setIntro] = useState(!skipOpening),
    [landing, setLanding] = useState(!skipOpening),
    [inspect, setInspect] = useState<string | null>(null),
    [planning, setPlanning] = useState(false),
    [missionOpen, setMissionOpen] = useState(false),
    [guide, setGuide] = useState(false),
    [touchControls, setTouchControls] = useState(
      () => initialTouchControls || (autoDetectTouch && isCoarsePointerDevice()),
    ),
    [portraitBlocked, setPortraitBlocked] = useState(false),
    [map, setMap] = useState(false),
    [paths, setPaths] = useState(false),
    [fallback, setFallback] = useState(false),
    [webglUnavailable, setWebglUnavailable] = useState(false),
    [view, setView] = useState(initialView),
    [waypoint, setWaypoint] = useState<string | null>(null),
    [muted, setMuted] = useState(false),
    [beat, setBeat] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]),
    audio = useRef<ReturnType<typeof createSoundPlayer> | null>(null),
    lastCount = useRef(0),
    dialogTitle = useRef<HTMLHeadingElement>(null);
  if (!audio.current) audio.current = createSoundPlayer();
  const day = currentDay(state),
    target = STATIONS.find((s) => s.id === (waypoint ?? day.target))!,
    station = STATIONS.find((s) => s.id === inspect),
    aimed = STATIONS.find((s) => s.id === view.target),
    actualTarget = STATIONS.find((s) => s.id === day.target)!;
  const distance = Math.hypot(view.x - actualTarget.x, view.z - actualTarget.z),
    near = distance <= 5.5 || fallback,
    ready = readyToPlan(state),
    modal = !!station || planning || guide || map || paths;
  const finishIntro = useCallback(() => setIntro(false), []),
    finishLanding = useCallback(() => setLanding(false), []),
    unavailable = useCallback(() => {
      setFallback(true);
      setWebglUnavailable(true);
    }, []);
  function cue(sound: SoundCue) {
    if (!muted) void audio.current?.play(sound);
  }
  function send(action: SurvivalAction) {
    void audio.current?.unlock();
    if (action.type === "BEGIN") cue("start");
    if (action.type === "INSPECT") cue("inspect");
    if (action.type === "RETRY") cue("retry");
    dispatch(action);
  }
  function inspectObject(id: string) {
    if (state.phase !== "explore") return;
    send({ type: "INSPECT", id });
    setInspect(id);
  }
  useEffect(() => {
    if (state.attempts.length > lastCount.current)
      cue(state.result?.plan.good ? "success" : "failure");
    lastCount.current = state.attempts.length;
  }, [state.attempts.length]);
  useEffect(() => {
    if (state.phase === "ending") cue("complete");
  }, [state.phase]);
  useEffect(() => () => audio.current?.dispose(), []);
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBeat(0);
    if (state.phase !== "result" && state.phase !== "failed") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBeat(3);
      return;
    }
    timers.current = [650, 1350, 2200].map((delay, i) =>
      setTimeout(() => setBeat(i + 1), delay),
    );
    return () => timers.current.forEach(clearTimeout);
  }, [state.result, state.phase]);
  function skip() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBeat(3);
  }
  useEffect(() => {
    if (modal) dialogTitle.current?.focus();
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInspect(null);
        setPlanning(false);
        setGuide(false);
        setMap(false);
        setPaths(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [modal]);
  const quick = state.phase === "failed" && [0, 3, 5, 8].includes(state.day);
  const response = QUICK_RESPONSES.find((r) => r.id === state.response);
  const responses = [...QUICK_RESPONSES];
  responses.push(...responses.splice(0, (state.seed + state.day) % 3));
  const destinationDistance = Math.round(
    Math.hypot(target.x - view.x, target.z - view.z),
  );
  const heading = ((((-view.yaw * 180) / Math.PI) % 360) + 360) % 360;
  return (
    <main
      className="sv-root"
      data-phase={state.phase}
      data-day={state.day + 1}
      data-player-x={view.x.toFixed(2)}
      data-player-z={view.z.toFixed(2)}
      data-jump-height={view.jumpHeight.toFixed(2)}
      data-aimed-object={view.target ?? ""}
    >
      <SurvivalWorld
        enabled={!intro && !landing && !portraitBlocked && state.phase === "explore" && !modal}
        showTouchControls={touchControls}
        autoDetectTouch={autoDetectTouch}
        onTouchControlsChange={setTouchControls}
        event={day.event}
        day={state.day}
        target={day.target}
        effect={state.result?.plan.effect ?? null}
        failure={state.phase === "failed"}
        stabilized={response?.good ?? false}
        animating={beat < 3}
        onInspect={inspectObject}
        onView={setView}
        onUnavailable={unavailable}
      />
      {!intro && !landing && state.phase === "explore" && !modal && (
        <RotateToLandscapeGate onBlockedChange={setPortraitBlocked} />
      )}
      {intro && <BrandIntro onComplete={finishIntro} />}
      {!intro && landing && <LunarLanding onComplete={finishLanding} />}
      <header className="sv-top">
        <div className="sv-wordmark">
          <span>6 ✦ SIX SHIFTS</span>
          <small>THE TEN-DAY EXPEDITION</small>
        </div>
        <div className="sv-day">
          <b>DAY {String(state.day + 1).padStart(2, "0")}</b>
          <span> / 10</span>
        </div>
        <nav>
          <button
            aria-label={muted ? "Enable sounds" : "Mute sounds"}
            onClick={() => {
              audio.current?.setEnabled(muted);
              setMuted(!muted);
            }}
          >
            {muted ? "SOUND OFF" : "SOUND ON"}
          </button>
          <button onClick={() => setPaths(true)}>LOG</button>
          <button onClick={() => setGuide(true)}>FIELD GUIDE</button>
        </nav>
      </header>
      <div
        className="sv-reserves"
        aria-label="Outpost resources in educational game points"
      >
        {(Object.keys(labels) as (keyof typeof labels)[]).map((key) => (
          <div key={key} className={state.reserves[key] < 25 ? "low" : ""}>
            <span>{labels[key]}</span>
            <strong>
              {state.reserves[key]}
              <small> pts</small>
            </strong>
            <i>
              <b style={{ width: `${state.reserves[key]}%` }} />
            </i>
          </div>
        ))}
        <div className={state.risk >= 50 ? "risk high" : "risk"}>
          <span>Radiation risk</span>
          <strong>
            {state.risk}
            <small> pts</small>
          </strong>
          <i>
            <b style={{ width: `${state.risk}%` }} />
          </i>
        </div>
      </div>
      {!intro && !landing && state.phase === "arrival" && (
        <section className="sv-arrival">
          <p className="sv-eyebrow">
            TRANQUILITY OUTPOST · SCOUT'S FIELD JOURNAL
          </p>
          <h1>
            Ten days.
            <br />
            One small home.
          </h1>
          <p>
            The next crew is on its way. Walk the outpost with MICA, keep your
            supplies steady, and learn what the Sun can change.
          </p>
          <div className="sv-arrival-controls">
            <b>{touchControls ? "STICK" : "W A S D"}</b>
            <span>
              {touchControls
                ? "Use left thumbstick to walk · Drag view to look · Tap right buttons to jump or inspect"
                : <>Walk in first or third person<br />Move mouse to look · V to switch · E to inspect</>}
            </span>
          </div>
          <button
            className="sv-primary"
            onClick={() =>
              send({ type: "BEGIN", seed: Math.floor(Math.random() * 100000) })
            }
          >
            Step onto the Moon <span>↗</span>
          </button>
          <small>
            No countdown. Each day ends when you choose.
            <br />
            Ages 7–12 · Fictional training scenario
          </small>
        </section>
      )}
      {!intro && state.phase === "explore" && !modal && (
        <>
          <div className={`sv-weather ${day.event !== "quiet" ? "alert" : ""}`}>
            <span>{day.weather}</span>
            <small>Scripted forecast · not live data</small>
          </div>
          <aside className="sv-mission">
            <div className="sv-mission-line">
              <span>
                DAY {state.day + 1} · {day.objective}
              </span>
              <button
                aria-expanded={missionOpen}
                onClick={() => setMissionOpen(!missionOpen)}
              >
                {missionOpen ? "Close" : "Details"}
              </button>
              {ready && near && (
                <button onClick={() => setPlanning(true)}>Plan →</button>
              )}
            </div>
            {missionOpen && (
              <div className="sv-mission-details">
                <p className="sv-eyebrow">
                  DAY {state.day + 1} · {day.title}
                </p>
                <h1>{day.objective}</h1>
                <p className="sv-mica">
                  <b>MICA /</b> {day.radio}
                </p>
                <ul>
                  {day.clues.map((id) => (
                    <li
                      key={id}
                      className={state.found.includes(id) ? "found" : ""}
                    >
                      <span>{state.found.includes(id) ? "✓" : "○"}</span>Inspect{" "}
                      {STATIONS.find((s) => s.id === id)!.name.toLowerCase()}
                    </li>
                  ))}
                </ul>
                <button
                  className="sv-primary"
                  disabled={!ready || !near}
                  onClick={() => setPlanning(true)}
                >
                  {!ready
                    ? "Investigate the clues"
                    : !near
                      ? "Return to the task station"
                      : "I've got a plan"}
                  <span>→</span>
                </button>
                <p className="sv-small">
                  {ready && !near
                    ? `${Math.round(distance)} m to ${actualTarget.name.toLowerCase()}`
                    : "Point at equipment. Press E within 5.5 m."}
                </p>
              </div>
            )}
          </aside>
          <div className="sv-bearing">
            <b>
              {Math.round(heading)}° ·{" "}
              {heading < 45 || heading >= 315
                ? "N"
                : heading < 135
                  ? "E"
                  : heading < 225
                    ? "S"
                    : "W"}
            </b>
            <span>
              {target.name} · {destinationDistance} m
            </span>
          </div>
          {aimed && (
            <div className="sv-target">
              <span>{aimed.name}</span>
              <small>{Math.round(view.distance)} m away</small>
              <button
                disabled={view.distance > 5.5}
                onClick={() => inspectObject(aimed.id)}
              >
                {view.distance <= 5.5
                  ? (touchControls ? "Tap · Inspect" : "E · Inspect")
                  : "Walk closer to inspect"}
              </button>
            </div>
          )}
          {!aimed && !touchControls && (
            <p className="sv-walk-hint">
              WASD to walk · Space to jump · V to switch view
            </p>
          )}
          <button
            className="sv-map-toggle"
            onClick={() => setMap(true)}
            aria-label="Open outpost map"
          >
            <svg viewBox="-90 -90 180 180" aria-hidden="true">
              <rect x="-88" y="-88" width="176" height="176" rx="8" />
              {STATIONS.map((s) => (
                <circle
                  key={s.id}
                  cx={s.x}
                  cy={s.z}
                  r={s.id === day.target ? 4 : 2}
                  className={s.id === day.target ? "goal" : ""}
                />
              ))}
              <path
                d="M0 -5 L3 4 L0 2 L-3 4 Z"
                transform={`translate(${view.x},${view.z}) rotate(${heading})`}
                className="player"
              />
            </svg>
            <span>OUTPOST MAP ↗</span>
            <small>176 × 176 m training area</small>
          </button>
          {fallback && (
            <button className="sv-fallback" onClick={() => setGuide(true)}>
              {webglUnavailable
                ? "3D unavailable · Open station guide"
                : "Accessible station controls active"}
            </button>
          )}
        </>
      )}
      {!intro &&
        (state.phase === "result" || state.phase === "failed") &&
        state.result && (
          <section
            className={`sv-result ${state.phase === "failed" ? "failed" : ""}`}
            aria-label="Decision consequence"
          >
            <div className="sv-result-head">
              <p className="sv-eyebrow">
                {state.phase === "failed"
                  ? "TASK PAUSED · LEARN AND RETRY"
                  : "PLAN WORKED · OUTPOST RESTORED"}
              </p>
              {beat < 3 && <button onClick={skip}>Skip animation</button>}
            </div>
            <h1>{state.result.plan.title}</h1>
            <ol className="sv-cause-chain">
              <li>
                <span>01 · YOUR ACTION</span>
                <p>{state.result.plan.action}</p>
              </li>
              {beat >= 1 && (
                <li>
                  <span>02 · EQUIPMENT</span>
                  <p>{state.result.plan.equipment}</p>
                </li>
              )}
              {beat >= 2 && (
                <li>
                  <span>03 · CONSEQUENCE</span>
                  <p>{state.result.plan.consequence}</p>
                </li>
              )}
              {beat >= 3 && (
                <li>
                  <span>04 · MICA'S FIELD NOTE</span>
                  <p>{state.result.plan.lesson}</p>
                </li>
              )}
            </ol>
            {beat >= 3 && (
              <>
                <div className="sv-deltas">
                  {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
                    <span key={k}>
                      {labels[k]}{" "}
                      <b>
                        {state.result!.before[k]} → {state.reserves[k]}
                      </b>
                    </span>
                  ))}
                </div>
                {state.phase === "failed" ? (
                  <>
                    {quick && !response ? (
                      <div className="sv-quick">
                        <h2>What should we do first?</h2>
                        <p>MICA: “Let's pause before the next move.”</p>
                        {responses.map((q, i) => (
                          <button
                            key={q.id}
                            onClick={() => {
                              cue(q.good ? "stabilize" : "equipment-warn");
                              send({ type: "RESPOND", id: q.id });
                            }}
                          >
                            <b>{String.fromCharCode(65 + i)}</b>
                            {q.title}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <>
                        {response && (
                          <p className="sv-response">{response.text}</p>
                        )}
                        <p className="sv-small">
                          Retry restores this day's supplies and risk. Your
                          clues and attempt history stay.
                        </p>
                        <button
                          className="sv-primary"
                          onClick={() => send({ type: "RETRY" })}
                        >
                          Retry day {state.day + 1} ↻
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="sv-daily">
                      <b>When you end this day</b>
                      <span>Food −5 · Water −5 · Power −5 · Oxygen −4</span>
                      <small>
                        Daily use is deducted once. Walking has no supply cost.
                      </small>
                    </div>
                    <button
                      className="sv-primary"
                      onClick={() => {
                        setWaypoint(null);
                        send({ type: "END_DAY" });
                      }}
                    >
                      {state.day === 9
                        ? "Send the final log · Finish expedition"
                        : "End day · Begin day " + (state.day + 2)}{" "}
                      →
                    </button>
                  </>
                )}
              </>
            )}
          </section>
        )}
      {state.phase === "ending" && (
        <section className="sv-ending">
          <p className="sv-eyebrow">DAY TEN · THE CREW CAN COME HOME</p>
          <h1>
            A little care.
            <br />A whole outpost.
          </h1>
          <p>
            You managed ten days of supplies, shadows and solar weather. MICA
            has saved every lesson for the next crew.
          </p>
          <div className="sv-ending-stats">
            <b>
              10 / 10<small>DAYS COMPLETE</small>
            </b>
            <b>
              {state.science} / 3<small>DISCOVERIES</small>
            </b>
            <b>
              {state.attempts.filter((a) => !a.plan.good).length}
              <small>ATTEMPTS LEARNED FROM</small>
            </b>
          </div>
          <button className="sv-primary" onClick={() => setPaths(true)}>
            Read our expedition log →
          </button>
          <button
            className="sv-secondary"
            onClick={() => {
              setIntro(true);
              setLanding(true);
              setWaypoint(null);
              setFallback(webglUnavailable);
              send({ type: "RESTART" });
            }}
          >
            Start a new expedition ↻
          </button>
        </section>
      )}
      <footer className="sv-foot">
        <span>
          TRAINING SIMULATION · ALL VALUES ARE EDUCATIONAL GAME POINTS
        </span>
        <span>Risk ↓ is better · {state.science}/3 discoveries</span>
      </footer>
      {modal && (
        <div className="sv-modal-backdrop">
          <section
            className={`sv-dialog ${map ? "map" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              station?.name ??
              (planning
                ? "Choose your plan"
                : map
                  ? "Outpost map"
                  : paths
                    ? "Expedition log"
                    : "Field guide")
            }
          >
            <button
              className="sv-close"
              aria-label="Close panel"
              onClick={() => {
                setInspect(null);
                setPlanning(false);
                setGuide(false);
                setMap(false);
                setPaths(false);
              }}
            >
              ×
            </button>
            {station && (
              <>
                <p className="sv-eyebrow">
                  FIELD OBSERVATION ·{" "}
                  {state.found.includes(station.id) ? "RECORDED" : ""}
                </p>
                <h2 ref={dialogTitle} tabIndex={-1}>
                  {station.name}
                </h2>
                <p>{station.description}</p>
                {day.clues.includes(station.id) && (
                  <p className="sv-clue">✓ A clue for today's task</p>
                )}
                <button
                  className="sv-primary"
                  onClick={() => {
                    setInspect(null);
                    if (ready && near) setPlanning(true);
                  }}
                >
                  {ready && near ? "Make a plan here →" : "Back to walking →"}
                </button>
              </>
            )}
            {planning && (
              <>
                <p className="sv-eyebrow">
                  DAY {state.day + 1} · READ THE EVIDENCE, THEN CHOOSE
                </p>
                <h2 ref={dialogTitle} tabIndex={-1}>
                  {day.objective}
                </h2>
                <p>
                  These are training plans. Read the whole plan; its letter can
                  change.
                </p>
                <div className="sv-plan-options">
                  {offeredPlans(state).map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPlanning(false);
                        send({ type: "CHOOSE", id: p.id });
                      }}
                    >
                      <b>{String.fromCharCode(65 + i)}</b>
                      <span>{p.title}</span>
                      <i>↗</i>
                    </button>
                  ))}
                </div>
                <button
                  className="sv-secondary"
                  onClick={() => setPlanning(false)}
                >
                  Keep investigating
                </button>
              </>
            )}
            {map && (
              <>
                <p className="sv-eyebrow">A BIG PLACE. A KNOWABLE PLACE.</p>
                <h2 ref={dialogTitle} tabIndex={-1}>
                  Tranquility field map
                </h2>
                <p>
                  North is up. Select a station to mark a waypoint. Walk there
                  with WASD.
                </p>
                <div className="sv-fullmap">
                  {STATIONS.map((s) => (
                    <button
                      key={s.id}
                      aria-label={`${s.name} map marker`}
                      title={s.name}
                      className={s.id === day.target ? "goal" : ""}
                      style={{
                        left: `${50 + s.x / 1.76}%`,
                        top: `${50 + s.z / 1.76}%`,
                      }}
                      onClick={() => {
                        setWaypoint(s.id);
                        setMap(false);
                      }}
                    >
                      <i />
                    </button>
                  ))}
                  <span
                    className="sv-map-you"
                    style={{
                      left: `${50 + view.x / 1.76}%`,
                      top: `${50 + view.z / 1.76}%`,
                    }}
                  >
                    ▲ YOU
                  </span>
                </div>
                <div className="sv-map-stations">
                  {STATIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setWaypoint(s.id);
                        setMap(false);
                      }}
                    >
                      {s.name} <span>↗</span>
                    </button>
                  ))}
                </div>
                <p className="sv-small">
                  Boundary markers keep the 176 × 176 m mission area finite.
                  There is no teleporting or walking cost.
                </p>
              </>
            )}
            {guide && (
              <>
                <p className="sv-eyebrow">EXPLORER'S NOTEBOOK</p>
                <h2 ref={dialogTitle} tabIndex={-1}>
                  Walk. Notice. Think.
                </h2>
                <p>
                  <b>WASD / arrows:</b> walk. <b>Move the mouse:</b> look
                  around. <b>V:</b> switch first and third person.{" "}
                  <b>Capture mouse:</b> aim with the centre reticle; Escape
                  releases it. <b>E / Enter:</b> inspect a nearby object.{" "}
                  <b>Q / R:</b> turn left / right. Touch controls are also
                  available.
                </p>
                <p>
                  Inspect the listed clues, then return to the day's task
                  station to choose a plan. Every failed task requires retry.
                  Retry restores that day's checkpoint and changes the wrong
                  plans and correct letter.
                </p>
                <h3>Understand the Sun</h3>
                <p>
                  An eclipse at this lunar site means Earth blocks the Sun:
                  solar input falls. A flare is a burst of electromagnetic
                  radiation. Energetic particle events may accompany solar
                  activity, but are a different hazard. Read forecasts and use
                  designated shielding.
                </p>
                <h3>Educational assumptions</h3>
                <p>
                  All supply points, the 0–100 radiation risk index, map
                  distances, procedures and the ten-day event sequence are
                  fictional teaching simplifications. Risk is not a dose
                  measurement. Shelter reduces current exposure; it does not
                  undo received radiation. Mission days are not a lunar
                  day/night cycle. Forecasts are scripted, not live.
                </p>
                <h3>Source references</h3>
                {SPACE_SOURCES.map((s) => (
                  <p key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.name} ↗
                    </a>
                    <small>{s.note}</small>
                  </p>
                ))}
                <details>
                  <summary>Accessible station guide</summary>
                  <button className="sv-secondary" onClick={() => setTouchControls(!touchControls)}>
                    {touchControls ? "Hide touch movement controls" : "Enable touch movement controls"}
                  </button>
                  <p>
                    Use these labelled controls if 3D or movement is
                    unavailable. This explicitly enables remote station
                    inspection for accessibility.
                  </p>
                  <button
                    className="sv-secondary"
                    onClick={() => {
                      setFallback(true);
                      setGuide(false);
                    }}
                  >
                    Enable accessible station controls
                  </button>
                  {STATIONS.map((s) => (
                    <button
                      key={s.id}
                      className="sv-guide-station"
                      disabled={state.phase !== "explore"}
                      onClick={() => {
                        setFallback(true);
                        setGuide(false);
                        inspectObject(s.id);
                      }}
                    >
                      {s.name} →
                    </button>
                  ))}
                </details>
                <details>
                  <summary>Earlier prototypes</summary>
                  <a href="?mode=story">Six-chapter story</a>
                  <a href="?mode=outpost">Original lunar demo</a>
                  <a href="?mode=downlink">Satellite experiment</a>
                </details>
              </>
            )}
            {paths && (
              <>
                <p className="sv-eyebrow">EVERY ATTEMPT TEACHES SOMETHING</p>
                <h2 ref={dialogTitle} tabIndex={-1}>
                  Our ten-day expedition
                </h2>
                <ol className="sv-log">
                  {DAYS.map((d, i) => (
                    <li key={d.id}>
                      <b>
                        DAY {i + 1} · {d.title}
                      </b>
                      {i > state.day ? (
                        <p>Not explored yet.</p>
                      ) : state.attempts.filter((a) => a.day === i).length ? (
                        state.attempts
                          .filter((a) => a.day === i)
                          .map((a, j) => (
                            <p key={j}>
                              {a.plan.good ? "✓" : "↻"} {a.plan.title}
                              {a.response && (
                                <small>
                                  Then:{" "}
                                  {
                                    QUICK_RESPONSES.find(
                                      (q) => q.id === a.response,
                                    )?.title
                                  }
                                </small>
                              )}
                            </p>
                          ))
                      ) : (
                        <p>Waiting for your plan.</p>
                      )}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
