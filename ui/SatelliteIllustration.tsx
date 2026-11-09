"use client";

import { useId } from "react";

export interface SelectedComponentsMap {
  solar: string;
  battery: string;
  antenna: string;
  payload: string;
}

interface SatelliteIllustrationProps {
  components: SelectedComponentsMap;
  activeMode?: "idle" | "charging" | "scanning" | "downlinking";
  highlightSlot?: "solar" | "battery" | "antenna" | "payload" | null;
  batteryLevel?: number;
  dataLevel?: number;
  className?: string;
  showLabels?: boolean;
}

export default function SatelliteIllustration({
  components,
  activeMode = "idle",
  highlightSlot = null,
  batteryLevel = 75,
  dataLevel = 30,
  className = "",
  showLabels = true,
}: SatelliteIllustrationProps) {
  const idPrefix = useId().replace(/:/g, "");

  // Detect component variants
  const isSails = components.solar === "solar-sails";
  const isDeployable = components.solar === "solar-deployable";
  // default is compact

  const isCryo = components.battery === "battery-cryo";
  const isSolidState = components.battery === "battery-advanced";
  // default is lithium

  const isLaser = components.antenna === "antenna-laser";
  const isDish = components.antenna === "antenna-dish";
  // default is omni

  const isRadar = components.payload === "payload-radar";
  const isSpectral = components.payload === "payload-spectral";
  // default is camera

  // Battery bar color
  const batteryColor =
    batteryLevel > 50 ? "#34d399" : batteryLevel > 20 ? "#fbbf24" : "#f87171";

  return (
    <div className={`satellite-canvas-wrap ${className}`}>
      <svg
        viewBox="0 0 640 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="satellite-svg"
        role="img"
        aria-label="2D Satellite schematic showing equipped solar panels, communications antenna, science payload, and battery bay"
      >
        <title>Downlink Satellite 2D Illustration</title>
        <desc>
          A detailed 2D diagram of the lunar orbiter showing current configuration
          and telemetry mode.
        </desc>
        <defs>
          {/* Gradients */}
          <linearGradient id={`${idPrefix}-solar-cell`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          <linearGradient id={`${idPrefix}-bus-foil`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          <linearGradient id={`${idPrefix}-chassis-gray`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id={`${idPrefix}-dish-metal`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="60%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          <linearGradient id={`${idPrefix}-laser-beam`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={`${idPrefix}-radio-beam`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={`${idPrefix}-scan-cone`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#c084fc" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7e22ce" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={`${idPrefix}-sun-rays`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
          </linearGradient>

          <filter id={`${idPrefix}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={`${idPrefix}-slot-highlight`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#38bdf8" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Space Background Grid & Stars */}
        <g className="space-backdrop">
          <circle cx="50" cy="50" r="1.5" fill="#ffffff" opacity="0.4" />
          <circle cx="120" cy="90" r="1" fill="#ffffff" opacity="0.6" />
          <circle cx="570" cy="40" r="2" fill="#93c5fd" opacity="0.5" />
          <circle cx="590" cy="180" r="1.5" fill="#ffffff" opacity="0.3" />
          <circle cx="60" cy="340" r="1" fill="#ffffff" opacity="0.5" />
          <circle cx="550" cy="360" r="2" fill="#fef08a" opacity="0.4" />
          <circle cx="320" cy="30" r="1" fill="#ffffff" opacity="0.5" />
        </g>

        {/* MODE EFFECT: SUNLIGHT CHARGING */}
        {activeMode === "charging" && (
          <g className="sun-effect" filter={`url(#${idPrefix}-glow)`}>
            <polygon
              points="10,0 200,160 160,260 0,100"
              fill={`url(#${idPrefix}-sun-rays)`}
            />
            <polygon
              points="630,0 440,160 480,260 640,100"
              fill={`url(#${idPrefix}-sun-rays)`}
            />
            <text x="320" y="45" textAnchor="middle" fill="#fde047" fontSize="12" fontWeight="700" letterSpacing="1">
              ☀️ SOLAR ARRAYS CHARGING BATTERY
            </text>
          </g>
        )}

        {/* MODE EFFECT: SCIENCE SCANNING */}
        {activeMode === "scanning" && (
          <g className="scan-effect" filter={`url(#${idPrefix}-glow)`}>
            <polygon
              points="320,290 200,410 440,410"
              fill={`url(#${idPrefix}-scan-cone)`}
            />
            <line x1="220" y1="400" x2="420" y2="400" stroke="#c084fc" strokeWidth="2" strokeDasharray="4,4" />
            <line x1="240" y1="370" x2="400" y2="370" stroke="#e9d5ff" strokeWidth="1.5" strokeDasharray="3,3" />
            <text x="320" y="405" textAnchor="middle" fill="#f3e8ff" fontSize="11" fontWeight="700">
              🔭 SENSORS MAPPING LUNAR SURFACE
            </text>
          </g>
        )}

        {/* MODE EFFECT: DOWNLINKING TO EARTH / BASE */}
        {activeMode === "downlinking" && (
          <g className="downlink-effect" filter={`url(#${idPrefix}-glow)`}>
            {isLaser ? (
              // Optical Laser Beam
              <>
                <polygon
                  points="317,80 323,80 340,0 300,0"
                  fill={`url(#${idPrefix}-laser-beam)`}
                />
                <line x1="320" y1="80" x2="320" y2="0" stroke="#38bdf8" strokeWidth="3" />
                <circle cx="320" cy="80" r="6" fill="#38bdf8" />
                <text x="320" y="25" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="700">
                  ⚡ HIGH-SPEED OPTICAL LASER DOWNLINK ACTIVE
                </text>
              </>
            ) : (
              // Radio Waves from Dish / Omni
              <>
                <path
                  d="M 280,60 A 45,45 0 0,1 360,60"
                  stroke="#60a5fa"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray="6,4"
                />
                <path
                  d="M 260,40 A 70,70 0 0,1 380,40"
                  stroke="#93c5fd"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray="8,6"
                />
                <path
                  d="M 240,20 A 95,95 0 0,1 400,20"
                  stroke="#bfdbfe"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray="10,6"
                />
                <text x="320" y="15" textAnchor="middle" fill="#93c5fd" fontSize="12" fontWeight="700">
                  📡 BEAMING STORED DATA TO EARTH GROUND STATION
                </text>
              </>
            )}
          </g>
        )}

        {/* ================= LEFT SOLAR ARRAY ================= */}
        <g
          id="slot-solar-left"
          filter={highlightSlot === "solar" ? `url(#${idPrefix}-slot-highlight)` : undefined}
          className="transition-all"
        >
          {/* Solar Boom Mount */}
          <rect x="180" y="202" width="60" height="12" fill="#475569" rx="3" />
          <line x1="180" y1="208" x2="240" y2="208" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="185" cy="208" r="4" fill="#cbd5e1" />

          {/* Panel 1 (Inner Left) */}
          <g>
            <rect
              x="100"
              y="160"
              width="80"
              height="96"
              fill={`url(#${idPrefix}-solar-cell)`}
              stroke="#60a5fa"
              strokeWidth="2"
              rx="4"
            />
            {/* Grid lines */}
            <line x1="100" y1="184" x2="180" y2="184" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
            <line x1="100" y1="208" x2="180" y2="208" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
            <line x1="100" y1="232" x2="180" y2="232" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
            <line x1="126" y1="160" x2="126" y2="256" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
            <line x1="153" y1="160" x2="153" y2="256" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
          </g>

          {/* Panel 2 (Outer Left for Deployable & Sails) */}
          {(isDeployable || isSails) && (
            <g>
              <rect x="94" y="203" width="6" height="10" fill="#94a3b8" rx="2" />
              <rect
                x="14"
                y="160"
                width="80"
                height="96"
                fill={`url(#${idPrefix}-solar-cell)`}
                stroke="#60a5fa"
                strokeWidth="2"
                rx="4"
              />
              <line x1="14" y1="184" x2="94" y2="184" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
              <line x1="14" y1="208" x2="94" y2="208" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
              <line x1="14" y1="232" x2="94" y2="232" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
              <line x1="40" y1="160" x2="40" y2="256" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
              <line x1="67" y1="160" x2="67" y2="256" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
            </g>
          )}

          {/* Top/Bottom Solar Sail Extenders (Sails only) */}
          {isSails && (
            <g opacity="0.9">
              <polygon points="14,160 100,135 180,160" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.5" />
              <polygon points="14,256 100,281 180,256" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.5" />
              <circle cx="100" cy="135" r="3" fill="#fde047" />
              <circle cx="100" cy="281" r="3" fill="#fde047" />
            </g>
          )}
        </g>

        {/* ================= RIGHT SOLAR ARRAY ================= */}
        <g
          id="slot-solar-right"
          filter={highlightSlot === "solar" ? `url(#${idPrefix}-slot-highlight)` : undefined}
          className="transition-all"
        >
          {/* Solar Boom Mount */}
          <rect x="400" y="202" width="60" height="12" fill="#475569" rx="3" />
          <line x1="400" y1="208" x2="460" y2="208" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="455" cy="208" r="4" fill="#cbd5e1" />

          {/* Panel 1 (Inner Right) */}
          <g>
            <rect
              x="460"
              y="160"
              width="80"
              height="96"
              fill={`url(#${idPrefix}-solar-cell)`}
              stroke="#60a5fa"
              strokeWidth="2"
              rx="4"
            />
            {/* Grid lines */}
            <line x1="460" y1="184" x2="540" y2="184" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
            <line x1="460" y1="208" x2="540" y2="208" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
            <line x1="460" y1="232" x2="540" y2="232" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
            <line x1="486" y1="160" x2="486" y2="256" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
            <line x1="513" y1="160" x2="513" y2="256" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
          </g>

          {/* Panel 2 (Outer Right for Deployable & Sails) */}
          {(isDeployable || isSails) && (
            <g>
              <rect x="540" y="203" width="6" height="10" fill="#94a3b8" rx="2" />
              <rect
                x="546"
                y="160"
                width="80"
                height="96"
                fill={`url(#${idPrefix}-solar-cell)`}
                stroke="#60a5fa"
                strokeWidth="2"
                rx="4"
              />
              <line x1="546" y1="184" x2="626" y2="184" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
              <line x1="546" y1="208" x2="626" y2="208" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
              <line x1="546" y1="232" x2="626" y2="232" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
              <line x1="572" y1="160" x2="572" y2="256" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
              <line x1="599" y1="160" x2="599" y2="256" stroke="#93c5fd" strokeWidth="0.8" opacity="0.6" />
            </g>
          )}

          {/* Top/Bottom Solar Sail Extenders (Sails only) */}
          {isSails && (
            <g opacity="0.9">
              <polygon points="460,160 540,135 626,160" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.5" />
              <polygon points="460,256 540,281 626,256" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.5" />
              <circle cx="540" cy="135" r="3" fill="#fde047" />
              <circle cx="540" cy="281" r="3" fill="#fde047" />
            </g>
          )}
        </g>

        {/* ================= SATELLITE MAIN BUS (BODY) ================= */}
        <g id="satellite-bus">
          {/* Gold Foil Outer Shell */}
          <polygon
            points="240,150 270,120 370,120 400,150 400,270 370,300 270,300 240,270"
            fill={`url(#${idPrefix}-bus-foil)`}
            stroke="#fbbf24"
            strokeWidth="2.5"
          />

          {/* MLI Foil Quilting Texture */}
          <line x1="270" y1="120" x2="370" y2="300" stroke="#fef08a" strokeWidth="0.75" opacity="0.3" />
          <line x1="370" y1="120" x2="270" y2="300" stroke="#fef08a" strokeWidth="0.75" opacity="0.3" />
          <line x1="240" y1="210" x2="400" y2="210" stroke="#fef08a" strokeWidth="0.75" opacity="0.4" />
          <line x1="320" y1="120" x2="320" y2="300" stroke="#fef08a" strokeWidth="0.75" opacity="0.4" />

          {/* Central Structural Ring */}
          <rect
            x="260"
            y="140"
            width="120"
            height="140"
            fill={`url(#${idPrefix}-chassis-gray)`}
            stroke="#64748b"
            strokeWidth="1.5"
            rx="6"
          />

          {/* Stenciled Name & Mission ID */}
          <text
            x="320"
            y="162"
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize="10"
            fontWeight="800"
            letterSpacing="1.5"
          >
            DOWNLINK-01
          </text>
          <text
            x="320"
            y="174"
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="7"
            fontWeight="600"
            letterSpacing="1"
          >
            LUNAR RELAY · 384,400 KM
          </text>

          {/* Attitude Control RCS Thruster Blocks */}
          <rect x="234" y="146" width="6" height="8" fill="#64748b" rx="1" />
          <polygon points="234,147 228,145 228,153" fill="#94a3b8" />
          <rect x="400" y="146" width="6" height="8" fill="#64748b" rx="1" />
          <polygon points="406,147 412,145 412,153" fill="#94a3b8" />
          <rect x="234" y="266" width="6" height="8" fill="#64748b" rx="1" />
          <polygon points="234,267 228,265 228,273" fill="#94a3b8" />
          <rect x="400" y="266" width="6" height="8" fill="#64748b" rx="1" />
          <polygon points="406,267 412,265 412,273" fill="#94a3b8" />
        </g>

        {/* ================= BATTERY MODULE (CENTER BAY) ================= */}
        <g
          id="slot-battery"
          filter={highlightSlot === "battery" ? `url(#${idPrefix}-slot-highlight)` : undefined}
          className="transition-all"
        >
          {/* Battery Housing Box */}
          <rect
            x="272"
            y="190"
            width="96"
            height="44"
            fill={isCryo ? "#0f172a" : isSolidState ? "#1e293b" : "#334155"}
            stroke={highlightSlot === "battery" ? "#38bdf8" : "#475569"}
            strokeWidth={highlightSlot === "battery" ? 2 : 1.2}
            rx="4"
          />

          {/* Cryo Thermal Jacket or Solid State Fins */}
          {isCryo && (
            <path
              d="M 270,192 L 270,232 M 370,192 L 370,232"
              stroke="#0ea5e9"
              strokeWidth="3"
            />
          )}

          {/* Battery Status readout */}
          <text x="278" y="204" fill="#94a3b8" fontSize="8" fontWeight="700">
            BATTERY
          </text>
          <text x="362" y="204" textAnchor="end" fill={batteryColor} fontSize="9" fontWeight="800">
            {batteryLevel}%
          </text>

          {/* Battery meter bar */}
          <rect x="278" y="209" width="84" height="6" fill="#0f172a" rx="2" />
          <rect
            x="278"
            y="209"
            width={Math.max(4, Math.min(84, (batteryLevel / 100) * 84))}
            height="6"
            fill={batteryColor}
            rx="2"
          />

          {/* Onboard Data Memory buffer status */}
          <text x="278" y="225" fill="#94a3b8" fontSize="7" fontWeight="600">
            MEM BUFFER: {dataLevel} MB
          </text>
          <circle cx="360" cy="223" r="3" fill={dataLevel > 0 ? "#a855f7" : "#475569"} />
        </g>

        {/* ================= COMMUNICATIONS ANTENNA (TOP) ================= */}
        <g
          id="slot-antenna"
          filter={highlightSlot === "antenna" ? `url(#${idPrefix}-slot-highlight)` : undefined}
          className="transition-all"
        >
          {/* Structural Boom / Mount */}
          <rect x="314" y="90" width="12" height="30" fill="#475569" rx="2" />
          <circle cx="320" cy="95" r="4" fill="#94a3b8" />

          {isLaser ? (
            // Laser Optical Transceiver
            <g>
              {/* Optics Tube */}
              <rect x="306" y="55" width="28" height="36" fill="#1e293b" stroke="#0ea5e9" strokeWidth="2" rx="4" />
              {/* Laser Lens Aperture */}
              <ellipse cx="320" cy="55" rx="12" ry="5" fill="#06b6d4" stroke="#e0f2fe" strokeWidth="1.5" />
              <ellipse cx="320" cy="55" rx="6" ry="2.5" fill="#ffffff" />
              {/* Alignment Star Tracker */}
              <circle cx="338" cy="74" r="3" fill="#facc15" />
            </g>
          ) : isDish ? (
            // Steerable Parabolic High-Gain Dish
            <g>
              {/* Curved Dish Reflector */}
              <path
                d="M 270,55 Q 320,85 370,55 Q 320,70 270,55 Z"
                fill={`url(#${idPrefix}-dish-metal)`}
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              {/* Feed horn struts */}
              <line x1="285" y1="62" x2="320" y2="40" stroke="#475569" strokeWidth="1.5" />
              <line x1="355" y1="62" x2="320" y2="40" stroke="#475569" strokeWidth="1.5" />
              {/* Feed horn receiver */}
              <circle cx="320" cy="40" r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
            </g>
          ) : (
            // Low-Gain Omni Whip Antenna
            <g>
              <line x1="320" y1="90" x2="320" y2="35" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
              <line x1="314" y1="45" x2="326" y2="45" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="320" cy="35" r="4" fill="#38bdf8" />
              {/* Small ground plane radials */}
              <line x1="320" y1="88" x2="305" y2="98" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="320" y1="88" x2="335" y2="98" stroke="#94a3b8" strokeWidth="1.5" />
            </g>
          )}
        </g>

        {/* ================= SCIENCE PAYLOAD (BOTTOM) ================= */}
        <g
          id="slot-payload"
          filter={highlightSlot === "payload" ? `url(#${idPrefix}-slot-highlight)` : undefined}
          className="transition-all"
        >
          {/* Payload Mount Bracket */}
          <rect x="290" y="300" width="60" height="12" fill="#475569" rx="2" />

          {isRadar ? (
            // Subsurface Radar Sounder
            <g>
              <rect x="300" y="312" width="40" height="20" fill="#1e293b" stroke="#a855f7" strokeWidth="1.5" rx="3" />
              <circle cx="320" cy="322" r="5" fill="#c084fc" />
              {/* Radar dipole booms extending horizontally */}
              <line x1="220" y1="328" x2="420" y2="328" stroke="#e9d5ff" strokeWidth="3" strokeLinecap="round" />
              <circle cx="220" cy="328" r="4" fill="#a855f7" />
              <circle cx="420" cy="328" r="4" fill="#a855f7" />
            </g>
          ) : isSpectral ? (
            // Multispectral Mineral Scanner
            <g>
              <rect x="295" y="312" width="50" height="24" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" rx="4" />
              {/* Multi-aperture lenses */}
              <circle cx="308" cy="324" r="5" fill="#38bdf8" stroke="#60a5fa" strokeWidth="1" />
              <circle cx="320" cy="324" r="5" fill="#f43f5e" stroke="#fb7185" strokeWidth="1" />
              <circle cx="332" cy="324" r="5" fill="#22c55e" stroke="#4ade80" strokeWidth="1" />
              <rect x="305" y="331" width="30" height="3" fill="#cbd5e1" rx="1" />
            </g>
          ) : (
            // High-Resolution Optical Camera
            <g>
              <rect x="300" y="312" width="40" height="26" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" rx="4" />
              {/* Big optical glass lens */}
              <circle cx="320" cy="325" r="9" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="320" cy="325" r="6" fill="#0284c7" />
              <circle cx="318" cy="323" r="2" fill="#ffffff" opacity="0.8" />
            </g>
          )}
        </g>

        {/* ================= ANNOTATION LABELS & CALLOUTS ================= */}
        {showLabels && (
          <g className="satellite-labels" fontSize="10" fontWeight="600">
            {/* Solar Label */}
            <g className={highlightSlot === "solar" ? "font-bold" : "opacity-80"}>
              <line x1="80" y1="140" x2="130" y2="170" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,3" />
              <circle cx="80" cy="140" r="3" fill="#38bdf8" />
              <rect x="10" y="118" width="130" height="20" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" rx="4" />
              <text x="75" y="132" textAnchor="middle" fill="#38bdf8" fontSize="9">
                {isSails ? "SOLAR SAILS" : isDeployable ? "TRIPLE-JUNCTION" : "COMPACT WINGS"}
              </text>
            </g>

            {/* Antenna Label */}
            <g className={highlightSlot === "antenna" ? "font-bold" : "opacity-80"}>
              <line x1="320" y1="20" x2="370" y2="36" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,3" />
              <circle cx="370" cy="36" r="3" fill="#38bdf8" />
              <rect x="370" y="26" width="140" height="20" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" rx="4" />
              <text x="440" y="40" textAnchor="middle" fill="#38bdf8" fontSize="9">
                {isLaser ? "OPTICAL LASER" : isDish ? "PARABOLIC DISH" : "OMNI ANTENNA"}
              </text>
            </g>

            {/* Payload Label */}
            <g className={highlightSlot === "payload" ? "font-bold" : "opacity-80"}>
              <line x1="320" y1="365" x2="370" y2="380" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,3" />
              <circle cx="320" cy="365" r="3" fill="#38bdf8" />
              <rect x="370" y="370" width="140" height="20" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" rx="4" />
              <text x="440" y="384" textAnchor="middle" fill="#38bdf8" fontSize="9">
                {isRadar ? "SUBSURFACE RADAR" : isSpectral ? "MINERAL SCANNER" : "LUNAR CAMERA"}
              </text>
            </g>

            {/* Battery Label */}
            <g className={highlightSlot === "battery" ? "font-bold" : "opacity-80"}>
              <line x1="250" y1="210" x2="200" y2="210" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,3" />
              <circle cx="250" cy="210" r="3" fill="#38bdf8" />
              <rect x="80" y="200" width="116" height="20" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" rx="4" />
              <text x="138" y="214" textAnchor="middle" fill="#38bdf8" fontSize="9">
                {isCryo ? "CRYO BATTERY" : isSolidState ? "SOLID-STATE" : "LITHIUM PACK"}
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
