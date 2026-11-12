"use client";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Quiz } from "../content/marsQuizzes";
import { STATIONS } from "../content/marsBase";
import { MARS_HABITAT } from "../game/marsColonyCollision";
import { rank, type Mission } from "../game/juniorMission";
import type { View } from "./SurvivalWorld";

const RADAR_CRATERS: readonly [number, number, number][] = [
  [24, -29, 7],
  [38, -48, 12],
  [62, -22, 9],
  [-48, 24, 15],
  [-55, -52, 20],
  [51, 57, 22],
];

export function MarsRadarMinimap({
  view,
  target,
  found,
}: {
  view?: View;
  target?: string;
  found: readonly string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 224;
    const h = 136;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Base radar fill
    ctx.fillStyle = "#0b141c";
    ctx.fillRect(0, 0, w, h);

    const px = view?.x ?? 0;
    const pz = view?.z ?? 12;
    const yaw = view?.roverDriving ? view.roverYaw ?? 0 : view?.yaw ?? 0;
    const scale = 2.05; // pixels per meter (~54m radius visible)
    const cx = w * 0.5;
    const cy = h * 0.52;

    // Helper: transform world (wx, wz) into GTA V camera-aligned radar space (up = facing direction)
    // Forward vector is (-sin(yaw), -cos(yaw)); Right vector is (cos(yaw), -sin(yaw))
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const toRadar = (wx: number, wz: number): [number, number] => {
      const dx = wx - px;
      const dz = wz - pz;
      const right = dx * cosY - dz * sinY;
      const forward = -dx * sinY - dz * cosY;
      return [cx + right * scale, cy - forward * scale];
    };

    // Subtle rotating grid lines
    ctx.strokeStyle = "rgba(130, 175, 195, 0.08)";
    ctx.lineWidth = 1;
    for (let gx = -90; gx <= 90; gx += 15) {
      const [x1, y1] = toRadar(gx, -90);
      const [x2, y2] = toRadar(gx, 90);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      const [hx1, hy1] = toRadar(-90, gx);
      const [hx2, hy2] = toRadar(90, gx);
      ctx.beginPath();
      ctx.moveTo(hx1, hy1);
      ctx.lineTo(hx2, hy2);
      ctx.stroke();
    }

    // Playable boundary outline (-85..+85)
    const corners = [
      toRadar(-85, -85),
      toRadar(85, -85),
      toRadar(85, 85),
      toRadar(-85, 85),
    ];
    ctx.strokeStyle = "rgba(235, 138, 90, 0.32)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(corners[0][0], corners[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(corners[i][0], corners[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Craters & soft mud basins
    for (const [crX, crZ, crR] of RADAR_CRATERS) {
      const [rx, ry] = toRadar(crX, crZ);
      const rr = crR * scale;
      ctx.fillStyle = "rgba(86, 56, 38, 0.34)";
      ctx.beginPath();
      ctx.arc(rx, ry, rr * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(195, 128, 86, 0.28)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(rx, ry, rr, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Mars Habitat footprint
    const [hx, hy] = toRadar(MARS_HABITAT.x, MARS_HABITAT.z);
    ctx.fillStyle = "rgba(218, 198, 170, 0.22)";
    ctx.strokeStyle = "rgba(235, 215, 185, 0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(hx, hy, MARS_HABITAT.radius * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // GPS Route line to active next target
    const targetStation = target ? STATIONS.find((s) => s.id === target) : undefined;
    if (targetStation) {
      const [tx, ty] = toRadar(targetStation.x, targetStation.z);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(154, 205, 50, 0.72)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.restore();
    }

    // Station blips
    for (const s of STATIONS) {
      const [sx, sy] = toRadar(s.x, s.z);
      const isTarget = s.id === target;
      const isDone = found.includes(s.id);
      if (isTarget) {
        ctx.fillStyle = "#facc15";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = isDone ? "#4ade80" : "#94a3b8";
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Yellow-green Exploration Rover blip when walking on foot
    if (view && !view.roverDriving && view.roverX !== undefined && view.roverZ !== undefined) {
      const [rx, ry] = toRadar(view.roverX, view.roverZ);
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(-(view.roverYaw ?? 0) + yaw);
      ctx.fillStyle = "#9acd32";
      ctx.strokeStyle = "#111a14";
      ctx.lineWidth = 1;
      ctx.fillRect(-3.5, -5.5, 7, 11);
      ctx.strokeRect(-3.5, -5.5, 7, 11);
      ctx.restore();
    }

    // Autonomous NASA Curiosity science rover blip (cyan driving, amber scanning)
    if (view && view.curiosityX !== undefined && view.curiosityZ !== undefined) {
      const [qx, qy] = toRadar(view.curiosityX, view.curiosityZ);
      ctx.save();
      ctx.translate(qx, qy);
      ctx.rotate(-(view.curiosityYaw ?? 0) + yaw);
      ctx.fillStyle = view.curiosityPhase === "scanning" ? "#f59e0b" : "#38bdf8";
      ctx.strokeStyle = "#082f49";
      ctx.lineWidth = 1;
      ctx.fillRect(-3, -4, 6, 8);
      ctx.strokeRect(-3, -4, 6, 8);
      ctx.restore();
    }

    // Lidar returns share the collision system used by the rover.
    for (const contact of view?.lidar?.contacts ?? []) {
      const [rx, ry] = toRadar(contact.x,contact.z);
      ctx.fillStyle = contact.inPath ? "#ff6363" : "#efbb65";
      ctx.beginPath(); ctx.arc(rx,ry,Math.max(2,Math.min(7,contact.radius*scale)),0,Math.PI*2); ctx.fill();
    }

    // Subtle range vignette & player arrow in center
    ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.stroke();

    // Player / Rover directional chevron (always points straight up)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = view?.roverDriving ? "#9acd32" : "#ffffff";
    ctx.strokeStyle = "#0b141c";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-5.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Rotating North "N" compass pip around perimeter
    const northX = cx + -sinY * (w * 0.44);
    const northY = cy + -cosY * (h * 0.42);
    const clampedNx = Math.max(12, Math.min(w - 12, northX));
    const clampedNy = Math.max(11, Math.min(h - 11, northY));
    ctx.fillStyle = "#111b24";
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(clampedNx, clampedNy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", clampedNx, clampedNy + 0.5);

    ctx.restore();
  }, [view, target, found]);

  return (
    <div className="gta-radar-frame" aria-label="Tactical Mars surface radar">
      <canvas ref={canvasRef} className="gta-radar-canvas" />
      <span className="gta-radar-tag">
        {view?.roverDriving ? "LIDAR · 30 m" : "EVA RADAR"}
      </span>
      {view?.roverDriving && <span className="gta-lidar-status" role="status" style={{color:view.lidar?.threatDistance != null ? "#ff8585" : "#a5ded0"}}>
        {view.lidar?.threatDistance != null ? `Blocked in ${view.lidar.threatDistance.toFixed(1)} m` : view.lidar ? "Path clear · 12 m" : "Scanning…"}
      </span>}
      {view?.mudDepth !== undefined && view.mudDepth > 0.32 && (
        <span className="gta-mud-tag">MUD ZONE</span>
      )}
    </div>
  );
}

export function MarsHud({
  mission,
  view,
  target,
  onGuide,
  onLog,
}: {
  mission: Mission;
  view?: View;
  target?: string;
  onGuide: () => void;
  onLog: () => void;
}) {
  const oxygenPct = Math.max(0, Math.min(100, mission.resources.oxygen));
  const suitIntegrityPct = Math.max(0, Math.min(100, 100 - mission.resources.risk));
  const powerPct = Math.max(0, Math.min(100, mission.resources.power));
  const [radarCollapsed, setRadarCollapsed] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse) and (max-height: 560px)").matches
  );

  return (
    <aside
      className={`gta-hud-cluster${radarCollapsed ? " is-collapsed" : ""}`}
      aria-label="Mission telemetry and tactical radar"
    >
      <div className="gta-mobile-bar">
        <button
          type="button"
          className="gta-mobile-toggle"
          aria-expanded={!radarCollapsed}
          onClick={() => setRadarCollapsed((v) => !v)}
        >
          {radarCollapsed ? "Radar ▸" : "Hide radar ▾"}
        </button>
        <button type="button" className="gta-mobile-quick" onClick={onGuide}>
          {mission.found.length}/6
        </button>
        <button type="button" className="gta-mobile-quick" onClick={onLog}>
          Log
        </button>
      </div>
      <div className="gta-rank-strip" aria-label="Mission notebook">
        <div className="junior-rank">
          <b>{rank(mission.xp, mission.found.length)}</b>
          <span>{mission.xp} XP</span>
          <progress max="1000" value={mission.xp} />
        </div>
        <div className="mars-notebook-actions">
          <button type="button" onClick={onGuide}>
            Discoveries {mission.found.length}/6
          </button>
          <button type="button" onClick={onLog}>
            Mission log
          </button>
        </div>
      </div>

      {!radarCollapsed && <MarsRadarMinimap view={view} target={target} found={mission.found} />}

      {/* GTA V style 3-bar vital telemetry directly below the radar */}
      <section className="gta-vitals-bars" aria-label="Mission resources">
        <div className="gta-bar-col" title={`Oxygen: ${oxygenPct}%`}>
          <div className="gta-bar-track">
            <div className="gta-bar-fill bar-oxygen" style={{ width: `${oxygenPct}%` }} />
          </div>
          <span className="gta-bar-label">
            <i>O₂</i> <strong>{oxygenPct}</strong>
          </span>
        </div>

        <div className="gta-bar-col" title={`Suit Integrity: ${suitIntegrityPct}% (Rad risk ${mission.resources.risk})`}>
          <div className="gta-bar-track">
            <div className="gta-bar-fill bar-suit" style={{ width: `${suitIntegrityPct}%` }} />
          </div>
          <span className="gta-bar-label">
            <i>SUIT</i> <strong>{suitIntegrityPct}</strong>
          </span>
        </div>

        <div className="gta-bar-col" title={`Power: ${powerPct}%`}>
          <div className="gta-bar-track">
            <div className="gta-bar-fill bar-power" style={{ width: `${powerPct}%` }} />
          </div>
          <span className="gta-bar-label">
            <i>PWR</i> <strong>{powerPct}</strong>
          </span>
        </div>
      </section>

      <div className="gta-secondary-res">
        <span>Water <b>{mission.resources.water}</b></span>
        <span>Food <b>{mission.resources.food}</b></span>
        <span>Rad <b>{mission.resources.risk}</b></span>
        <small>Illustrative</small>
      </div>
    </aside>
  );
}

export function MissionDialogFrame({
  dialogRef,
  children,
}: {
  dialogRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return (
    <section
      ref={dialogRef}
      tabIndex={-1}
      className="mars-dialog junior-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Mission activity"
    >
      {children}
    </section>
  );
}

export function SolQuizDialog({
  quiz,
  sol,
  answer,
  onAnswer,
  onClose,
}: {
  quiz: Quiz;
  sol: number;
  answer: number | null;
  onAnswer: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <>
      <p className="mars-kicker">NASA QUICK QUIZ · SOL {sol}</p>
      <h2>{quiz.q}</h2>
      {answer === null ? (
        quiz.answers.map((text, index) => (
          <button key={text} data-quiz-answer onClick={() => onAnswer(index)}>
            {text}
          </button>
        ))
      ) : (
        <>
          <p>
            {answer === quiz.correct
              ? "Correct! +50 XP, 3 power points and a sol patch."
              : "Good try!"}{" "}
            {quiz.explain}{" "}
            <a href={quiz.url} target="_blank" rel="noreferrer">
              NASA source ↗
            </a>
          </p>
          <button data-dialog-continue onClick={onClose}>
            Continue
          </button>
        </>
      )}
    </>
  );
}
