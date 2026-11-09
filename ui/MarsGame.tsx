"use client";
import { useCallback, useRef, useState } from "react";
import { STATIONS } from "../content/survival";
import { MARS_START } from "../game/marsConfig";
import BrandIntro from "./BrandIntro";
import LunarLanding from "./LunarLanding";
import SurvivalWorld, { type SurvivalWorldHandle, type View } from "./SurvivalWorld";
import "./survival.css";
import "./mars.css";

const INITIAL_VIEW: View = { x: 0, z: 12, yaw: 0, target: null, distance: Infinity, locked: false, jumpHeight: 0 };
const LESSONS: Record<string, string> = {
  solar: "Dust can reduce the sunlight reaching solar panels. Inspecting them helps the crew plan their power use.",
  oxygen: "The crew needs breathable air. On Mars, experiments have made oxygen from carbon dioxide, but this station is fictional.",
  rover: "A rover helps astronauts travel farther. This training model can be inspected; driving is still being built.",
  shelter: "A protected shelter can reduce exposure to space radiation. Real radiation safety needs more than a game score.",
  water: "Water is precious. A future outpost would need carefully designed ways to use it again.",
};
export default function MarsGame() {
  const [intro, setIntro] = useState(true);
  const world = useRef<SurvivalWorldHandle>(null);
  const [landing, setLanding] = useState(true);
  const [started, setStarted] = useState(false);
  const [night, setNight] = useState(false);
  const [view, setView] = useState(INITIAL_VIEW);
  const [inspected, setInspected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const finishIntro = useCallback(() => setIntro(false), []);
  const finishLanding = useCallback(() => setLanding(false), []);
  const inspect = (id: string) => {
    const station = STATIONS.find((s) => s.id === id);
    if (!station) return;
    setInspected((previous) => previous.includes(id) ? previous : [...previous, id]);
    setMessage(LESSONS[id] ?? `${station.name}: This equipment is ready for the next stage of the expedition.`);
  };
  const target = STATIONS.find((s) => s.id === view.target);
  return <main className="sv-root mars-root" data-phase={started ? "explore" : "menu"} data-player-x={view.x.toFixed(2)} data-player-z={view.z.toFixed(2)} data-camera-yaw={view.yaw.toFixed(3)} data-jump-height={view.jumpHeight.toFixed(2)}>
    <SurvivalWorld ref={world} planet="mars" showTouchControls={false} enabled={started && !message} event={night ? "night" : "quiet"} day={0} target="solar" effect={null} failure={false} stabilized={false} animating={false} onInspect={inspect} onView={setView} onUnavailable={() => setUnavailable(true)} />
    {intro && <BrandIntro planet="mars" onComplete={finishIntro} />}
    {landing && <LunarLanding planet="mars" paused={intro} onComplete={finishLanding} />}
    <header className="mars-header"><b>TARUKH <span> / OUTPOST COMMANDER</span></b><strong>SOL 01 / 10 · {night ? "NIGHT" : "DAY"}</strong><a href="?mode=survival">Lunar game</a></header>
    <section className="mars-resources" aria-label="Initial training resources">
      {Object.entries(MARS_START).map(([name, value]) => <div key={name}><span>{name}</span><strong>{value}</strong></div>)}
      <small>Training points · illustrative</small>
    </section>
    {!intro && !landing && !started && <section className="mars-menu"><p className="mars-kicker">A TARUKH EXPEDITION · PLAYABLE FOUNDATION</p><h1>Ten sols.<br/><em>One new world.</em></h1><p>Before you arrived, robotic cargo missions delivered the habitat and equipment. Now it is your turn to inspect the outpost.</p><p className="mars-controls">WASD walk · Shift sprint · Space jump<br/>Mouse look · V camera · E inspect · Esc releases mouse</p><button onClick={() => { setStarted(true); world.current?.captureMouse(); }}>START MARS EXPLORATION →</button><p className="mars-note">Early build: explore and inspect. The ten-sol campaign and real-time Earth-to-Mars cinematic are still in development.</p></section>}
    {started && <>
      <div className="mars-objective">SOL 1 · Inspect the solar array, oxygen cylinder and rover <span>{["solar", "oxygen", "rover"].filter(id => inspected.includes(id)).length}/3</span></div>
      <button className="mars-light" onClick={() => setNight(!night)}>Preview {night ? "day" : "night"} lighting</button>
      {target && <div className="mars-target"><strong>{target.id === "rover" ? "Exploration rover" : target.name}</strong><span>{view.distance <= 5.5 ? "Press E to inspect" : `${Math.round(view.distance)} m · move closer`}</span>{view.distance <= 5.5 && <button onClick={() => inspect(target.id)}>Inspect</button>}</div>}
      <aside className="mars-sage"><b>SAGE /</b> {inspected.length === 0 ? "Welcome to Mars, explorer. Let's check the equipment the robots left for us." : ["solar", "oxygen", "rover"].every(id => inspected.includes(id)) ? "Great inspection! The next stage will add real mission plans and resource changes." : "Good observation. Check the solar array, oxygen cylinder and rover."}</aside>
      {unavailable && <div className="mars-unavailable">3D is unavailable on this device. Try a browser with WebGL support.</div>}
      {message && <div className="mars-dialog-backdrop"><section className="mars-dialog" role="dialog" aria-modal="true" aria-label="Sage observation"><p className="mars-kicker">SAGE / FIELD NOTE</p><h2>Good eye, explorer.</h2><p>{message}</p><button onClick={() => setMessage(null)}>Continue exploring →</button></section></div>}
    </>}
    <footer className="mars-footer">MARS FOUNDATION · AVERAGE SOL ≈ 24 H 39 MIN · <a href="https://www.giss.nasa.gov/tools/mars24/help/notes.html" target="_blank" rel="noreferrer">NASA SOURCE ↗</a></footer>
  </main>;
}
