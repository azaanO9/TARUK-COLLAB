"use client";

import { useEffect, useState } from "react";
import DownlinkControl from "../ui/DownlinkControl";
import MissionControl from "../ui/MissionControl";
import StoryGame from "../ui/StoryGame";
import SurvivalGame from "../ui/SurvivalGame";
import MarsGame from "../ui/MarsGame";
import "../ui/junior.css";

export default function Home() {
  const [activeMission, setActiveMission] = useState<
    "mars" | "survival" | "story" | "downlink" | "outpost"
  >("mars");
  const [briefing, setBriefing] = useState(true);
  const [launchedFromHub, setLaunchedFromHub] = useState(false);
  const [callsign, setCallsign] = useState("");
  const [patch, setPatch] = useState("✦");
  const [controlMode, setControlMode] = useState<"mobile" | "pc" | null>(null);
  const [choice, setChoice] = useState<"mars" | "survival">("mars");
  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (mode === "downlink" || mode === "outpost" || mode === "story" || mode === "survival") {
      setActiveMission(mode);
      setBriefing(false);
    }
  }, []);

  if (briefing) return <main className="junior-briefing"><section className="junior-card" aria-label="Mission briefing and cadet ID"><p className="mars-kicker">TARUKH · JUNIOR ASTRONAUT MISSION</p><h1>Your next world awaits.</h1><p>Choose a mission, make your cadet ID, and explore with your robot guide.</p><label>JUNIOR ASTRONAUT CALLSIGN<input maxLength={24} value={callsign} onChange={e=>setCallsign(e.target.value)} placeholder="Enter your callsign" /></label><fieldset><legend>CHOOSE YOUR MISSION PATCH</legend><div className="junior-patches">{["✦","☄","◉","☾"].map(p=><button type="button" key={p} aria-pressed={patch===p} onClick={()=>setPatch(p)}>{p}</button>)}</div></fieldset><fieldset><legend>SELECT AN EXPEDITION</legend><button className="junior-choice" aria-pressed={choice==="survival"} onClick={()=>setChoice("survival")}><strong>01 / TRANQUILITY LUNAR OUTPOST</strong><span>Training mission · Scout & MICA</span></button><button className="junior-choice" aria-pressed={choice==="mars"} onClick={()=>setChoice("mars")}><strong>02 / MARS OUTPOST · 10 SOLS</strong><span>Main expedition · Sage</span></button></fieldset><fieldset><legend>HOW ARE YOU PLAYING?</legend><div className="junior-device-choices"><button type="button" aria-pressed={controlMode === "mobile"} onClick={() => setControlMode("mobile")}><strong>📱 Mobile</strong><span>On-screen touch controls</span></button><button type="button" aria-pressed={controlMode === "pc"} onClick={() => setControlMode("pc")}><strong>🖥 PC</strong><span>Keyboard and mouse</span></button></div></fieldset><p className="junior-control-copy">{controlMode === "mobile" ? "Use the on-screen controls to move, jump, inspect and drive." : controlMode === "pc" ? "WASD walk · Space jump · V camera · E inspect" : "Choose Mobile or PC to continue."}</p><button className="junior-launch" disabled={!controlMode} onClick={()=>{setActiveMission(choice);setLaunchedFromHub(true);setBriefing(false)}}>BEGIN MISSION →</button></section></main>;
  if (activeMission === "mars") return <MarsGame callsign={callsign.trim() || "Explorer"} patch={patch} controlMode={controlMode ?? "pc"} onHub={()=>setBriefing(true)} />;
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
