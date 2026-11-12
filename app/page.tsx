"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { createMission, missionReducer, type Action } from "../game/juniorMission";
import { MARS_SAVE_KEY, parseMarsSave, type MarsSave } from "../game/marsSave";
const DownlinkControl = lazy(() => import("../ui/DownlinkControl"));
const MissionControl = lazy(() => import("../ui/MissionControl"));
const StoryGame = lazy(() => import("../ui/StoryGame"));
const SurvivalGame = lazy(() => import("../ui/SurvivalGame"));
const MarsGame = lazy(() => import("../ui/MarsGame"));
import "../ui/junior.css";
import "../ui/flightDeck.css";
import {assetUrl} from "../lib/assetUrl";
import { isCoarsePointerDevice, tryEnterLandscape } from "../ui/mobileDevice";

export default function Home() {
  return <Suspense fallback={<main className="junior-briefing" role="status">Preparing your mission…</main>}><MissionHub /></Suspense>;
}

function MissionHub() {
  const [activeMission, setActiveMission] = useState<
    "mars" | "survival" | "story" | "downlink" | "outpost"
  >("mars");
  const [briefing, setBriefing] = useState(true);
  const [launchedFromHub, setLaunchedFromHub] = useState(false);
  const [callsign, setCallsign] = useState("");
  const safeCallsign = (value:string) => value.replace(/[^a-zA-Z0-9 -]/g, "").replace(/(?:fuck|shit|bitch|asshole)/gi, "").slice(0,24);
  const randomCallsign = () => { const names=["Nova", "Comet", "Orbit", "Star", "Cosmo", "Meteor"]; setCallsign(names[Math.floor(Math.random()*names.length)] + " " + (1+Math.floor(Math.random()*99))); };
  const [patch, setPatch] = useState("✦");
  const [controlMode, setControlMode] = useState<"mobile" | "pc" | null>(null);
  const [mission, setMission] = useState(()=>createMission());
  const [cargo,setCargo]=useState<"standard"|"air"|"food">("standard");
  const [hasMarsSave, setHasMarsSave] = useState(false);
  const [saveReady, setSaveReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const sendMission = (action:Action) => setMission(previous => missionReducer(previous, action));
  useEffect(() => {
    let loadedControl = false;
    try {
      const saved = parseMarsSave(window.localStorage.getItem(MARS_SAVE_KEY));
      if (saved) {
        setMission(saved.mission);
        setCallsign(saved.callsign);
        setPatch(saved.patch);
        setControlMode(saved.controlMode);
        setHasMarsSave(true);
        loadedControl = true;
      }
    } catch { setSaveError(true); }
    if (!loadedControl && isCoarsePointerDevice()) {
      setControlMode("mobile");
    }
    setSaveReady(true);
  }, []);
  useEffect(() => {
    if (!saveReady || !hasMarsSave || !controlMode) return;
    const save:MarsSave = {version:1, mission, callsign, patch, controlMode};
    try { window.localStorage.setItem(MARS_SAVE_KEY, JSON.stringify(save)); setSaveError(false); }
    catch { setSaveError(true); }
  }, [saveReady,hasMarsSave,mission,callsign,patch,controlMode]);
  const launch = () => {
    if (controlMode === "mobile") void tryEnterLandscape();
    if (choice === "mars") { if(!hasMarsSave)setMission(createMission(cargo));setHasMarsSave(true); }
    setActiveMission(choice);
    setLaunchedFromHub(true);
    setBriefing(false);
  };
  const restart = () => {
    if (!window.confirm("Restart the Mars mission? This will permanently replace your saved progress on this device.")) return;
    if (controlMode === "mobile") void tryEnterLandscape();
    setMission(createMission(cargo));
    setHasMarsSave(true);
    setActiveMission("mars");
    setLaunchedFromHub(true);
    setBriefing(false);
  };
  const [choice, setChoice] = useState<"mars" | "survival">("mars");
  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (mode === "story" || mode === "survival" || (process.env.NODE_ENV !== "production" && (mode === "downlink" || mode === "outpost"))) {
      setActiveMission(mode);
      setBriefing(false);
    }
  }, []);

  if (briefing) return <main className="junior-briefing flight-deck">
    <header className="deck-mast"><b>TARUKH</b><span>Junior Astronaut Mission Trainer</span></header>
    <div className="deck-layout">
    <section className="deck-hero" aria-labelledby="expedition-title">
      {choice==="mars" ? <img src={assetUrl("/art/mars-horizon.webp")} alt="" fetchPriority="high"/> : <div className="deck-lunar" aria-hidden="true"/>}
      <div className="deck-caption"><p>MISSION BRIEFING</p>
      <h1 id="expedition-title">{choice==="mars"?"Ares Field Camp":"Tranquility Outpost"}</h1>
      <p>{choice==="mars"?"Keep your crew supplied for ten sols and transmit your field report to Earth.":"Guide Scout through ten lunar training days with MICA."}</p></div>
      <dl><div><dt>Destination</dt><dd>{choice==="mars"?"Mars":"Moon"}</dd></div><div><dt>Duration</dt><dd>{choice==="mars"?"10 sols":"10 days"}</dd></div><div><dt>Guide</dt><dd>{choice==="mars"?"Sage":"MICA"}</dd></div></dl>
    </section>
    <section className="junior-card deck-console" aria-label="Mission briefing and cadet ID"><h2>Launch setup</h2><label>JUNIOR ASTRONAUT CALLSIGN<input maxLength={24} value={callsign} onChange={e=>setCallsign(safeCallsign(e.target.value))} placeholder="Enter your callsign" /></label><button type="button" className="junior-random" onClick={randomCallsign}>🎲 Random callsign</button><fieldset><legend>CHOOSE YOUR MISSION PATCH</legend><div className="junior-patches">{["✦","☄","◉","☾"].map(p=><button type="button" key={p} aria-pressed={patch===p} onClick={()=>setPatch(p)}>{p}</button>)}</div></fieldset><fieldset><legend>SELECT AN EXPEDITION</legend><button className="junior-choice" aria-pressed={choice==="survival"} onClick={()=>setChoice("survival")}><strong>01 / TRANQUILITY LUNAR OUTPOST</strong><span>Training mission · Scout & MICA</span></button><button className="junior-choice" aria-pressed={choice==="mars"} onClick={()=>setChoice("mars")}><strong>02 / MARS OUTPOST · 10 SOLS</strong><span>Ares Field Camp · Ten station decisions</span></button></fieldset>{choice==="mars"&&<details><summary>Starting supplies for a new mission</summary><label>Supply shipment<select value={cargo} onChange={e=>setCargo(e.target.value as typeof cargo)}><option value="standard">Balanced stores</option><option value="air">Air shortage · 12 oxygen points</option><option value="food">Food shortage · 18 food points</option></select></label></details>}<fieldset><legend>HOW ARE YOU PLAYING?</legend><div className="junior-device-choices"><button type="button" aria-pressed={controlMode === "mobile"} onClick={() => setControlMode("mobile")}><strong>📱 Mobile</strong><span>On-screen touch controls</span></button><button type="button" aria-pressed={controlMode === "pc"} onClick={() => setControlMode("pc")}><strong>🖥 PC</strong><span>Keyboard and mouse</span></button></div></fieldset><p className="junior-control-copy">{controlMode === "mobile" ? "Use the on-screen controls to move, jump, inspect and drive." : controlMode === "pc" ? "WASD walk · Space jump · V camera · E inspect" : "Choose Mobile or PC to continue."}</p>{saveError&&<p role="alert">Saving is unavailable in this browser. Your progress will last only while this page stays open.</p>}<button className="junior-launch" disabled={!controlMode || !saveReady} onClick={launch}>{choice === "mars" && hasMarsSave ? "RESUME MISSION →" : "BEGIN MISSION →"}</button>{choice === "mars" && hasMarsSave && <button type="button" className="junior-restart" disabled={!controlMode || !saveReady} onClick={restart}>Restart Mars mission</button>}{choice === "mars" && hasMarsSave && <p className="junior-control-copy">Saved on this browser · Sol {mission.sol} · {mission.xp} XP · {mission.found.length}/6 discoveries</p>}<p className="junior-control-copy">Terrain textures adapted from <a href="https://polyhaven.com/a/sandy_gravel_02" target="_blank" rel="noreferrer">Poly Haven</a> · <a href="https://polyhaven.com/license" target="_blank" rel="noreferrer">CC0</a>.</p></section></div></main>;
  if (activeMission === "mars") return <MarsGame mission={mission} sendMission={sendMission} callsign={callsign.trim() || "Explorer"} patch={patch} controlMode={controlMode ?? "pc"} onHub={()=>setBriefing(true)} />;
  if (activeMission === "survival") return <SurvivalGame skipOpening={launchedFromHub} initialTouchControls={controlMode === "mobile"} />;
  if (activeMission === "story")
    return <StoryGame onLegacy={() => setActiveMission("downlink")} />;

  if (activeMission === "outpost") {
    return (
      <>
        <button
          className="ss-back-story"
          onClick={() => setActiveMission("story")}
        >
          ← Back to Six Shifts story
        </button>
        <MissionControl onSwitchMission={() => setActiveMission("downlink")} />
      </>
    );
  }

  return (
    <>
      <button
        className="ss-back-story"
        onClick={() => setActiveMission("story")}
      >
        ← Back to Six Shifts story
      </button>
      <DownlinkControl onSwitchMission={() => setActiveMission("outpost")} />
    </>
  );
}
