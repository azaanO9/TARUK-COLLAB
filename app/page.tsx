"use client";

import { useEffect, useState } from "react";
import DownlinkControl from "../ui/DownlinkControl";
import MissionControl from "../ui/MissionControl";
import StoryGame from "../ui/StoryGame";
import SurvivalGame from "../ui/SurvivalGame";
import MarsGame from "../ui/MarsGame";

export default function Home() {
  const [activeMission, setActiveMission] = useState<
    "mars" | "survival" | "story" | "downlink" | "outpost"
  >("mars");
  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (mode === "downlink" || mode === "outpost" || mode === "story" || mode === "survival")
      setActiveMission(mode);
  }, []);

  if (activeMission === "mars") return <MarsGame />;
  if (activeMission === "survival") return <SurvivalGame />;
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
