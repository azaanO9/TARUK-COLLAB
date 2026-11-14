"use client";
import { useState } from "react";
import type { View } from "./SurvivalWorld";
import { mapPoint, mapHeading, mapLidarContacts, MAP_RANGE } from "../game/minimap";
import { LIDAR_RANGE } from "../game/roverLidar";

/**
 * Compact GTA V style rectangular exploration minimap with authentic topographic
 * elevation contour background (scrolling seamlessly with player movement),
 * oriented rover vector icons, landing shuttle mark, and signature GTA 5 tri-bars.
 */
export default function ExplorationMinimap({ view }: { view: View }) {
  if (view.cockpitView) return null;
  const [open, setOpen] = useState(true);
  const driving = Boolean(view.roverDriving);
  const x = driving ? view.roverX ?? view.x : view.x;
  const z = driving ? view.roverZ ?? view.z : view.z;
  const scan = driving ? view.lidar : undefined;
  const range = driving ? scan?.range ?? LIDAR_RANGE : MAP_RANGE;
  const home = mapPoint(0, 12, x, z, range);
  const crew = mapPoint(view.roverX ?? x, view.roverZ ?? z, x, z, range);
  const scout = view.curiosityX === undefined ? null : mapPoint(view.curiosityX, view.curiosityZ ?? 0, x, z, range);

  // Seamless topographic contour scrolling locked 1:1 to world coordinates
  const topoScale = 88 / range;
  const patternSize = 120;
  const topoX = (((x * topoScale) % patternSize) + patternSize) % patternSize;
  const topoZ = (((z * topoScale) % patternSize) + patternSize) % patternSize;

  const threat = scan?.threatDistance;
  const blocked = threat !== null && threat !== undefined;
  const status = driving
    ? blocked
      ? `OBSTACLE · ${threat.toFixed(1)} M`
      : scan
      ? "PATH CLEAR · 12 M"
      : "SCANNING…"
    : "LIDAR DOCKED IN ROVER";

  const clearancePct = blocked && threat !== undefined
    ? Math.min(100, Math.max(15, (threat / 20) * 100))
    : 100;

  return (
    <aside
      className="roam-minimap gta-minimap"
      data-driving={driving}
      data-open={open}
      data-blocked={blocked}
      aria-label="Exploration minimap and rover LiDAR"
    >
      <div className="roam-map-topbar">
        <span className="roam-map-badge">
          <span className="roam-badge-dot" />
          {driving ? "GPS LIDAR" : "MARS GPS"} · {range}M
        </span>
        <button
          type="button"
          className="roam-map-toggle"
          aria-label={open ? "Hide map" : "Show map"}
          aria-expanded={open}
          aria-controls="exploration-map"
          onClick={() => setOpen(!open)}
        >
          {open ? "−" : "+"}
        </button>
      </div>

      {open && (
        <div id="exploration-map" className="roam-map-body">
          {/* Main Compact GTA V Rectangular Minimap with Topographic Background */}
          <div className="roam-radar-frame">
            <svg
              viewBox="5 30 190 140"
              className="roam-radar-svg roam-gta-rect-svg"
              role="img"
              aria-label={`North-up ${range} metre topographic GPS map. Player arrow in center. Crew rover, Curiosity rover, and lander indicated by icons. ${
                driving
                  ? "Contacts show detected rocks; red hazard diamonds indicate obstacles in travel path."
                  : "Dots show nearby surface rocks."
              }`}
            >
              <defs>
                {/* Rectangular clip for GTA V map frame */}
                <clipPath id="gta-rect-clip">
                  <rect x="6" y="31" width="188" height="138" rx="5" />
                </clipPath>

                {/* Dark GPS map base slate gradient */}
                <linearGradient id="gta-map-bg" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#131c28" stopOpacity="0.96" />
                  <stop offset="50%" stopColor="#0d1520" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#070c13" stopOpacity="0.98" />
                </linearGradient>

                {/* AUTHENTIC GTA 5 TOPOGRAPHIC CONTOUR PATTERN (Seamlessly scrolling with movement) */}
                <pattern
                  id="gta-topo-pattern"
                  width={patternSize}
                  height={patternSize}
                  patternUnits="userSpaceOnUse"
                  x={100 - topoX}
                  y={100 - topoZ}
                >
                  {/* Subtle elevation contour shading */}
                  <path
                    d="M 28 35 C 16 18, 54 12, 72 28 C 84 40, 76 60, 48 55 C 30 50, 36 40, 28 35 Z"
                    fill="rgba(56, 189, 248, 0.03)"
                  />
                  <path
                    d="M 72 82 C 60 68, 96 62, 110 76 C 118 86, 112 104, 92 100 C 78 96, 82 86, 72 82 Z"
                    fill="rgba(56, 189, 248, 0.025)"
                  />

                  {/* Sinuous flowing contour lines */}
                  <path
                    d="M 0 18 Q 30 5, 60 22 T 120 18"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="0.75"
                  />
                  <path
                    d="M 0 38 Q 35 50, 70 30 T 120 38"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.22)"
                    strokeWidth="1.1"
                  />
                  <path
                    d="M 0 62 Q 25 80, 65 58 T 120 62"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.11)"
                    strokeWidth="0.75"
                  />
                  <path
                    d="M 0 92 Q 40 75, 80 105 T 120 92"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="1"
                  />
                  <path
                    d="M 0 114 Q 30 100, 65 122 T 120 114"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="0.75"
                  />

                  {/* Topographic elevation loops (Ridge 1) */}
                  <path
                    d="M 28 35 C 16 18, 54 12, 72 28 C 84 40, 76 60, 48 55 C 30 50, 36 40, 28 35 Z"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.14)"
                    strokeWidth="0.75"
                  />
                  <path
                    d="M 36 34 C 28 22, 50 18, 64 30 C 72 38, 66 50, 48 46 C 36 43, 40 37, 36 34 Z"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="0.9"
                  />
                  <path
                    d="M 45 34 C 40 28, 50 25, 56 31 C 60 36, 56 42, 48 40 Z"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.26)"
                    strokeWidth="1.1"
                  />

                  {/* Topographic elevation loops (Depression / Ridge 2) */}
                  <path
                    d="M 72 82 C 60 68, 96 62, 110 76 C 118 86, 112 104, 92 100 C 78 96, 82 86, 72 82 Z"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.13)"
                    strokeWidth="0.75"
                  />
                  <path
                    d="M 80 84 C 72 74, 92 70, 102 80 C 108 86, 104 96, 90 94 Z"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.18)"
                    strokeWidth="0.85"
                  />

                  {/* GTA 5 elevation contour labels */}
                  <text x="44" y="36.5" fill="rgba(255,255,255,0.28)" fontSize="4.5" fontFamily="monospace">
                    2480
                  </text>
                  <text x="83" y="87.5" fill="rgba(255,255,255,0.28)" fontSize="4.5" fontFamily="monospace">
                    2320
                  </text>
                  <text x="10" y="36" fill="rgba(255,255,255,0.26)" fontSize="4.5" fontFamily="monospace">
                    2400
                  </text>
                  <text x="88" y="90" fill="rgba(255,255,255,0.26)" fontSize="4.5" fontFamily="monospace">
                    2300
                  </text>
                </pattern>

                {/* 1. CREW ROVER VECTOR ICON (NASA MMSEV Style 6-wheel rover) */}
                <g id="icon-crew-rover">
                  <circle r="14" fill="#38bdf8" fillOpacity="0.14" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3 2" />
                  {/* Left 3 wheels */}
                  <rect x="-8.5" y="-8" width="3.2" height="4.8" rx="1" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.6" />
                  <rect x="-8.5" y="-2.4" width="3.2" height="4.8" rx="1" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.6" />
                  <rect x="-8.5" y="3.2" width="3.2" height="4.8" rx="1" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.6" />
                  {/* Right 3 wheels */}
                  <rect x="5.3" y="-8" width="3.2" height="4.8" rx="1" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.6" />
                  <rect x="5.3" y="-2.4" width="3.2" height="4.8" rx="1" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.6" />
                  <rect x="5.3" y="3.2" width="3.2" height="4.8" rx="1" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.6" />
                  {/* Suspension axles */}
                  <line x1="-7" y1="-5.6" x2="7" y2="-5.6" stroke="#475569" strokeWidth="0.8" />
                  <line x1="-7" y1="0" x2="7" y2="0" stroke="#475569" strokeWidth="0.8" />
                  <line x1="-7" y1="5.6" x2="7" y2="5.6" stroke="#475569" strokeWidth="0.8" />
                  {/* Pressurized cabin chassis */}
                  <rect x="-5.5" y="-8.5" width="11" height="17" rx="3.5" fill="#0284c7" stroke="#e0f2fe" strokeWidth="0.9" />
                  {/* Cockpit canopy */}
                  <path d="M -4 -3.5 C -4 -7.5, 4 -7.5, 4 -3.5 Z" fill="#bae6fd" />
                  {/* Solar panel roof tiles */}
                  <rect x="-3.5" y="-1.5" width="7" height="6.5" rx="0.8" fill="#0369a1" stroke="#38bdf8" strokeWidth="0.5" />
                  {/* Headlights */}
                  <circle cx="-3" cy="-8.5" r="0.8" fill="#f8fafc" />
                  <circle cx="3" cy="-8.5" r="0.8" fill="#f8fafc" />
                </g>

                {/* 2. CURIOSITY / SCIENCE ROVER VECTOR ICON (Rocker-Bogie 6-wheel science rover) */}
                <g id="icon-curiosity-rover">
                  <circle r="14" fill="#c084fc" fillOpacity="0.14" stroke="#c084fc" strokeWidth="0.8" strokeDasharray="3 2" />
                  {/* Left 3 wheels */}
                  <rect x="-9" y="-7.5" width="3" height="4.6" rx="0.8" fill="#1e1b4b" stroke="#c084fc" strokeWidth="0.6" />
                  <rect x="-9" y="-2" width="3" height="4.6" rx="0.8" fill="#1e1b4b" stroke="#c084fc" strokeWidth="0.6" />
                  <rect x="-9" y="3.5" width="3" height="4.6" rx="0.8" fill="#1e1b4b" stroke="#c084fc" strokeWidth="0.6" />
                  {/* Right 3 wheels */}
                  <rect x="6" y="-7.5" width="3" height="4.6" rx="0.8" fill="#1e1b4b" stroke="#c084fc" strokeWidth="0.6" />
                  <rect x="6" y="-2" width="3" height="4.6" rx="0.8" fill="#1e1b4b" stroke="#c084fc" strokeWidth="0.6" />
                  <rect x="6" y="3.5" width="3" height="4.6" rx="0.8" fill="#1e1b4b" stroke="#c084fc" strokeWidth="0.6" />
                  {/* Rocker-Bogie struts */}
                  <line x1="-7.5" y1="-5.2" x2="-4" y2="0" stroke="#7e22ce" strokeWidth="0.8" />
                  <line x1="-7.5" y1="5.8" x2="-4" y2="0" stroke="#7e22ce" strokeWidth="0.8" />
                  <line x1="7.5" y1="-5.2" x2="4" y2="0" stroke="#7e22ce" strokeWidth="0.8" />
                  <line x1="7.5" y1="5.8" x2="4" y2="0" stroke="#7e22ce" strokeWidth="0.8" />
                  {/* Central Science Equipment Box */}
                  <rect x="-5" y="-5.5" width="10" height="12" rx="2" fill="#7e22ce" stroke="#f3e8ff" strokeWidth="0.9" />
                  <rect x="-3.5" y="-3.5" width="7" height="6.5" rx="1" fill="#9333ea" />
                  {/* Forward Mast / ChemCam */}
                  <line x1="1.8" y1="-5.5" x2="2.2" y2="-10.5" stroke="#fbbf24" strokeWidth="1.2" />
                  <circle cx="2.2" cy="-11" r="1.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.4" />
                  <circle cx="2.2" cy="-11" r="0.6" fill="#ef4444" />
                  {/* Rear RTG Generator */}
                  <rect x="-2" y="6.5" width="4" height="3" rx="0.6" fill="#f59e0b" stroke="#b45309" strokeWidth="0.5" />
                </g>

                {/* 3. LANDING SHUTTLE / BASE HABITAT VECTOR ICON */}
                <g id="icon-landing-shuttle">
                  <circle r="14" fill="#f59e0b" fillOpacity="0.14" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3 2" />
                  {/* 4 Diagonal Landing Legs */}
                  <line x1="-5" y1="-5" x2="-9" y2="-9" stroke="#d97706" strokeWidth="1.2" />
                  <circle cx="-9" cy="-9" r="1.4" fill="#fbbf24" />
                  <line x1="5" y1="-5" x2="9" y2="-9" stroke="#d97706" strokeWidth="1.2" />
                  <circle cx="9" cy="-9" r="1.4" fill="#fbbf24" />
                  <line x1="-5" y1="5" x2="-9" y2="9" stroke="#d97706" strokeWidth="1.2" />
                  <circle cx="-9" cy="9" r="1.4" fill="#fbbf24" />
                  <line x1="5" y1="5" x2="9" y2="9" stroke="#d97706" strokeWidth="1.2" />
                  <circle cx="9" cy="9" r="1.4" fill="#fbbf24" />
                  {/* Solar arrays */}
                  <rect x="-10" y="-1.5" width="20" height="3" rx="0.8" fill="#fde68a" stroke="#b45309" strokeWidth="0.6" />
                  {/* Central Module */}
                  <circle r="5.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.9" />
                  <circle r="2" fill="#ffffff" />
                </g>
              </defs>

              {/* Rectangular Bezel & Map Floor */}
              <rect
                x="5.5"
                y="30.5"
                width="189"
                height="139"
                rx="5"
                fill="#040911"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1.2"
              />
              <rect x="6" y="31" width="188" height="138" rx="5" fill="url(#gta-map-bg)" />

              {/* Clipped Map Contents */}
              <g clipPath="url(#gta-rect-clip)">
                {/* Authentic Topographic Elevation Contours */}
                <rect width="200" height="200" fill="url(#gta-topo-pattern)" />

                {/* Subtle GPS Crosshairs */}
                <line x1="100" y1="31" x2="100" y2="169" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.75" />
                <line x1="6" y1="100" x2="194" y2="100" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.75" />

                {/* Distance range rings */}
                <circle cx="100" cy="100" r={44} fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.7" strokeDasharray="3 3" />
                <circle cx="100" cy="100" r={88} fill="none" stroke="rgba(255, 255, 255, 0.16)" strokeWidth="0.75" />

                {/* Nearby Surface Rocks (when walking on foot) */}
                {!driving &&
                  (view.mapRocks ?? []).map((r, i) => {
                    const p = mapPoint(r.x, r.z, x, z);
                    return !p.edge && (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={Math.max(1.5, (r.radius * 88) / MAP_RANGE)}
                        fill="#b39879"
                        stroke="#5c4833"
                        strokeWidth="0.5"
                      />
                    );
                  })}

                {/* Active LiDAR Detected Contacts (static blips, no sweep scanning beam) */}
                {scan &&
                  mapLidarContacts(scan, x, z).map((contact, i) => (
                    <g
                      key={i}
                      className="roam-lidar-contact"
                      data-hazard={contact.inPath}
                      transform={`translate(${contact.x} ${contact.y})`}
                    >
                      {contact.inPath ? (
                        <>
                          <path
                            d="M0 -8.5 L8.5 0 L0 8.5 L-8.5 0 Z"
                            fill="#ef4444"
                            stroke="#ffffff"
                            strokeWidth="1.2"
                          />
                          <text y="3" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="900">
                            !
                          </text>
                        </>
                      ) : (
                        <circle
                          r={contact.radius}
                          fill="#38bdf8"
                          fillOpacity="0.75"
                          stroke="#0284c7"
                          strokeWidth="0.8"
                        />
                      )}
                    </g>
                  ))}

                {/* LANDING SHUTTLE / BASE MODULE */}
                <g
                  transform={`translate(${home.x} ${home.y})`}
                  className="roam-blip-landmark"
                  aria-label="Landing Habitat"
                >
                  <use href="#icon-landing-shuttle" />
                </g>

                {/* CREW ROVER (When on foot: shown parked with heading yaw rotation) */}
                {!driving && (
                  <g
                    transform={`translate(${crew.x} ${crew.y}) rotate(${mapHeading(view.roverYaw ?? 0)})`}
                    className="roam-blip-rover"
                    aria-label="Crew Rover"
                  >
                    <use href="#icon-crew-rover" />
                  </g>
                )}

                {/* CURIOSITY / SCIENCE ROVER (Shown with real-time heading yaw rotation) */}
                {scout && (
                  <g
                    transform={`translate(${scout.x} ${scout.y}) rotate(${mapHeading(view.curiosityYaw ?? 0)})`}
                    className="roam-blip-curiosity"
                    aria-label="Curiosity Rover"
                  >
                    <use href="#icon-curiosity-rover" />
                  </g>
                )}

                {/* CENTER PLAYER ARROW (GTA V style crisp white arrow rotated to player or rover heading) */}
                <g
                  transform={`translate(100 100) rotate(${mapHeading(
                    driving ? view.roverYaw ?? view.yaw : view.yaw
                  )})`}
                  className="roam-player-arrow"
                >
                  <circle r="3.5" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
                  <path
                    d="M 0 -9.5 L 5.5 6.5 L 0 3.2 L -5.5 6.5 Z"
                    fill="#ffffff"
                    stroke="#040811"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <circle cx="0" cy="3.2" r="1.1" fill="#38bdf8" />
                </g>
              </g>

              {/* North Indicator at top of rectangular frame (GTA 5 GPS style) */}
              <polygon points="100,32 96,38 104,38" fill="#ef4444" />
              <text x="100" y="47" textAnchor="middle" fill="#ef4444" fontSize="9.5" fontWeight="900" letterSpacing="0.5">
                N
              </text>
            </svg>
          </div>

          {/* GTA 5 STATUS TRI-BARS DIRECTLY UNDER RECTANGULAR MAP */}
          <div className="roam-gta-bars" aria-label="Status gauges">
            {/* Bar 1 (Health / Path Clearance): Green, turns Red on hazard */}
            <div
              className={`roam-gta-bar roam-bar-clearance ${blocked ? "is-hazard" : "is-clear"}`}
              title={`Path clearance: ${blocked ? "Hazard detected" : "All clear"}`}
            >
              <div
                className="roam-gta-bar-fill"
                style={{ width: `${clearancePct}%` }}
              />
            </div>
            {/* Bar 2 (Armor / Sensor Telemetry): Blue */}
            <div
              className="roam-gta-bar roam-bar-telemetry"
              title="LiDAR & Sensor Link telemetry"
            >
              <div
                className="roam-gta-bar-fill"
                style={{ width: driving ? "100%" : "80%" }}
              />
            </div>
            {/* Bar 3 (Special Ability / Rover Power): Yellow */}
            <div
              className="roam-gta-bar roam-bar-special"
              title="Rover & Suit Battery Power"
            >
              <div
                className="roam-gta-bar-fill"
                style={{ width: "95%" }}
              />
            </div>
          </div>

          {/* GTA 5 LOCATION & TELEMETRY TEXT (Street Name Style) */}
          <div className="roam-gta-readout">
            <div className="roam-gta-loc">
              {driving && blocked ? "HAZARD DETECTED" : "JEZERO CRATER"}
            </div>
            <div className={`roam-gta-sub ${blocked ? "is-blocked" : ""}`}>
              {status}
            </div>
          </div>

          {/* COMPACT MAP LEGEND WITH MINI VECTOR ROVER ICONS */}
          <div className="roam-map-legend" aria-label="Minimap icon legend">
            <span className="roam-legend-item">
              <span className="roam-legend-dot dot-shuttle" /> Lander
            </span>
            <span className="roam-legend-item">
              <span className="roam-legend-dot dot-crew" /> Crew
            </span>
            <span className="roam-legend-item">
              <span className="roam-legend-dot dot-scout" /> Curiosity
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
