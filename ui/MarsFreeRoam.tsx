"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import ShuttleArrival from "./ShuttleArrival";
import SurvivalWorld, { type View } from "./SurvivalWorld";
import { isCoarsePointerDevice, tryEnterLandscape } from "./mobileDevice";
import { RotateToLandscapeGate } from "./RotateToLandscapeGate";
import "./survival.css";
import "./mars.css";
import "./junior.css";
import "./mobileCockpit.css";
import "./freeRoam.css";

export default function MarsFreeRoam() {
  const [streamed, setStreamed] = useState(false);
  const [mode, setMode] = useState<"pc" | "mobile">("pc");
  const [sceneReady, setSceneReady] = useState(false);
  const [arrived, setArrived] = useState(false);
  const ready = useCallback(() => setSceneReady(true), []);
  const finishArrival = useCallback(() => setArrived(true), []);
  const [started, setStarted] = useState(false);
  const [menu, setMenu] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [lowGraphics, setLowGraphics] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [inspect, setInspect] = useState(false);
  const dialog = useRef<HTMLElement>(null);
  const unavailable = useCallback(() => setFailed(true), []);
  const inspectRover = useCallback((id: string) => { if (id === "curiosity") setInspect(true); }, []);
  const modal = menu || failed || inspect;

  useEffect(() => { if (isCoarsePointerDevice()) setMode("mobile"); }, []);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    document.exitPointerLock?.();
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !failed) { setMenu(false); setInspect(false); }
      if (event.key !== "Tab") return;
      const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keys);
    return () => { document.removeEventListener("keydown", keys); previous?.focus(); };
  }, [modal, failed]);

  if (!started) return <main className="roam-launch">
    <section><p>TARUKH</p><h1>Mars Open World</h1>
      <p>Walk the crater fields, drive the exploration rover and watch Curiosity survey the surface. Explore at your own pace.</p>
      <fieldset><legend>Choose your controls</legend>
        <button aria-pressed={mode === "pc"} onClick={() => setMode("pc")}>PC · Keyboard & mouse</button>
        <button aria-pressed={mode === "mobile"} onClick={() => setMode("mobile")}>Mobile · Touch controls</button>
      </fieldset>
      <p>{mode === "pc" ? "WASD move · Space jump · V camera · F enter/exit rover · E inspect Curiosity" : "Use the movement stick, swipe to look and use the rover buttons when nearby."}</p>
      <button className="roam-primary" onClick={() => { if (mode === "mobile") void tryEnterLandscape(); setView(null); setSceneReady(false); setArrived(false); setStarted(true); }}>Explore Mars</button>
    </section>
  </main>;

  const roverDistance = view?.roverX === undefined || view.roverZ === undefined ? null : Math.round(Math.hypot(view.x - view.roverX, view.z - view.roverZ));
  return <main className="sv-root mars-root roam-root" data-controls={mode} data-phase="explore">
    <SurvivalWorld key={attempt} freeRoam playDropPodIntro planet="mars" enabled={arrived && !modal && !blocked} onReady={ready} onTerrainMode={setStreamed}
      showTouchControls={mode === "mobile"} autoDetectTouch={false} onTouchControlsChange={active => setMode(active ? "mobile" : "pc")}
      event="quiet" day={0} target="" effect={null} failure={false} stabilized={false} animating={false}
      initialQuality={lowGraphics ? "performance" : "auto"} onInspect={inspectRover} onView={setView} onUnavailable={unavailable} />
    {!arrived && !failed && <ShuttleArrival key={`arrival-${attempt}`} ready={sceneReady} onComplete={finishArrival} />}
    {!modal && arrived && <RotateToLandscapeGate onBlockedChange={setBlocked} />}
    <header className="roam-header"><b>TARUKH <span>· FREE EXPLORATION</span></b><button disabled={!arrived} onClick={() => setMenu(true)}>Pause</button></header>
    {!modal && <aside className="roam-info">{view?.biome === "cave" ? "Ice caves" : streamed ? "Expanding Mars terrain" : "Mars surface"} · {view?.lightPhase ?? "Day"} · {view?.roverDriving ? "Driving crew rover" : roverDistance !== null ? `Crew rover · ${roverDistance} m` : "Free exploration"}</aside>}
    {modal && <div className="mars-dialog-backdrop"><section ref={dialog} className="mars-dialog roam-dialog" role="dialog" aria-modal="true" aria-labelledby="roam-dialog-title">
      {failed ? <><h2 id="roam-dialog-title">The 3D world couldn’t start</h2><p>Retry, or use lighter graphics for this browser.</p>
        <button onClick={() => { setSceneReady(false); setArrived(false); setFailed(false); setAttempt(value => value + 1); }}>Retry</button>
        <button onClick={() => { setLowGraphics(true); setSceneReady(false); setArrived(false); setFailed(false); setAttempt(value => value + 1); }}>Retry with Performance graphics</button></>
      : inspect ? <><h2 id="roam-dialog-title">Curiosity rover</h2><p>This autonomous rover explores the terrain and pauses to scan rocks. Its movements and measurements are simulated.</p><p>Status: {view?.curiosityPhase ?? "exploring"}</p><button onClick={() => setInspect(false)}>Continue exploring</button></>
      : <><h2 id="roam-dialog-title">Exploration paused</h2><button onClick={() => setMenu(false)}>Resume exploring</button><p>WASD move · Space jump · V camera · F enter/exit rover. Drag to look if mouse capture is unavailable.</p><button onClick={() => { setMenu(false); setStarted(false); }}>Back to controls setup</button></>}
    </section></div>}
  </main>;
}
