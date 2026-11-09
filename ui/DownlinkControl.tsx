"use client";

import { useEffect, useId, useReducer, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Battery,
  Check,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Database,
  ExternalLink,
  Flag,
  HardDrive,
  Info,
  Radio,
  RotateCcw,
  Satellite,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Wrench,
  Zap,
} from "lucide-react";
import {
  BENCHMARK_DESIGNS,
  DOWNLINK_BUDGET_LIMIT,
  DOWNLINK_MASS_LIMIT,
  DOWNLINK_MISSION,
  DOWNLINK_SCENARIOS,
  SATELLITE_COMPONENTS,
  type SatelliteComponent,
} from "../content/downlinkScenarios";
import {
  canChoose,
  createInitialState,
  gameReducer,
  previewChoice,
  RESOURCE_KEYS,
} from "../game/engine";
import type { Choice, GameAction, GameState, ResourceKey } from "../game/types";
import SatelliteIllustration, {
  type SelectedComponentsMap,
} from "./SatelliteIllustration";

type ScreenMode = "briefing" | "design" | "operations" | "results";

const signed = (val: number) => (val > 0 ? `+${val}` : `${val}`);

export default function DownlinkControl({
  onSwitchMission,
}: {
  onSwitchMission?: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  // Screen flow: briefing -> design -> operations -> results
  const [screen, setScreen] = useState<ScreenMode>("briefing");

  // Selected components during design
  const [selectedComponents, setSelectedComponents] =
    useState<SelectedComponentsMap>({
      solar: "solar-deployable",
      battery: "battery-advanced",
      antenna: "antenna-dish",
      payload: "payload-camera",
    });

  const [highlightSlot, setHighlightSlot] = useState<
    "solar" | "battery" | "antenna" | "payload" | null
  >(null);

  // Simulation engine state
  const reduceEngine = (state: GameState, action: GameAction) =>
    gameReducer(state, action, DOWNLINK_SCENARIOS);

  const [gameState, dispatch] = useReducer(
    reduceEngine,
    undefined,
    () =>
      createInitialState({
        resources: { ...DOWNLINK_MISSION.initialResources },
      })
  );

  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Client-side URL sync after mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    const urlScreen = new URLSearchParams(window.location.search).get(
      "screen"
    ) as ScreenMode;
    if (
      urlScreen &&
      ["briefing", "design", "operations", "results"].includes(urlScreen)
    ) {
      setScreen(urlScreen);
      if (urlScreen === "results") {
        // Run simulated 6-orbit mission through engine to populate realistic results
        dispatch({ type: "START" });
        dispatch({ type: "CHOOSE", choiceId: "first-scan" });
        dispatch({ type: "CONTINUE" });
        dispatch({ type: "CHOOSE", choiceId: "relay-outpost" });
        dispatch({ type: "CONTINUE" });
        dispatch({ type: "CHOOSE", choiceId: "run-heaters" });
        dispatch({ type: "CONTINUE" });
        dispatch({ type: "CHOOSE", choiceId: "sun-recharge-and-trickle" });
        dispatch({ type: "CONTINUE" });
        dispatch({ type: "CHOOSE", choiceId: "deep-radar-pulse" });
        dispatch({ type: "CONTINUE" });
        dispatch({ type: "CHOOSE", choiceId: "grand-downlink" });
        dispatch({ type: "CONTINUE" });
      }
    }
  }, []);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [screen, gameState.phase, gameState.turn]);

  useEffect(() => {
    if (guideOpen) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [guideOpen]);

  // When game ends in engine, move to results screen
  useEffect(() => {
    if (gameState.phase === "ended") {
      setScreen("results");
    }
  }, [gameState.phase]);

  // Design stats calculation
  const currentSolar = SATELLITE_COMPONENTS.solar.find(
    (c) => c.id === selectedComponents.solar
  )!;
  const currentBattery = SATELLITE_COMPONENTS.battery.find(
    (c) => c.id === selectedComponents.battery
  )!;
  const currentAntenna = SATELLITE_COMPONENTS.antenna.find(
    (c) => c.id === selectedComponents.antenna
  )!;
  const currentPayload = SATELLITE_COMPONENTS.payload.find(
    (c) => c.id === selectedComponents.payload
  )!;

  const totalCost =
    currentSolar.costMillion +
    currentBattery.costMillion +
    currentAntenna.costMillion +
    currentPayload.costMillion;

  const totalMass =
    currentSolar.massKg +
    currentBattery.massKg +
    currentAntenna.massKg +
    currentPayload.massKg;

  const isOverBudget = totalCost > DOWNLINK_BUDGET_LIMIT;
  const isOverMass = totalMass > DOWNLINK_MASS_LIMIT;
  const canLaunch = !isOverBudget && !isOverMass;

  // Active scenario and choices
  const currentScenario =
    DOWNLINK_SCENARIOS[gameState.turn - 1] ?? DOWNLINK_SCENARIOS[0];
  const activeChoice = currentScenario.choices.find(
    (c) => c.id === selectedChoiceId
  );
  const preview =
    activeChoice && gameState.phase === "choosing"
      ? previewChoice(gameState, activeChoice)
      : null;
  const lastResult = gameState.history.at(-1);

  // Helper: check why an action might be unavailable
  function getUnavailabilityReason(choice: Choice): string | null {
    if (gameState.phase !== "choosing") return "Shift in progress";
    if (gameState.resources.power + choice.delta.power < 0) {
      return `Needs ${Math.abs(choice.delta.power)}% battery (have ${gameState.resources.power}%)`;
    }
    if (gameState.resources.water + choice.delta.water < 0) {
      return `Needs ${Math.abs(choice.delta.water)} MB stored data (have ${gameState.resources.water} MB)`;
    }
    if (gameState.resources.oxygen + choice.delta.oxygen < 0) {
      return `Link signal too low (needs +${choice.delta.oxygen}%)`;
    }
    return null;
  }

  // Active illustration mode
  let illustrationMode: "idle" | "charging" | "scanning" | "downlinking" =
    "idle";
  if (screen === "operations") {
    if (gameState.phase === "choosing" && activeChoice) {
      if (activeChoice.icon === "sun") illustrationMode = "charging";
      else if (activeChoice.icon === "water") illustrationMode = "scanning";
      else if (activeChoice.icon === "science")
        illustrationMode = "downlinking";
    } else if (gameState.phase === "consequence" && lastResult) {
      if (lastResult.scienceGained > 0) illustrationMode = "downlinking";
      else if (lastResult.actualDelta.power > 0)
        illustrationMode = "charging";
      else illustrationMode = "scanning";
    }
  }

  // Handlers
  function handleLaunchMission() {
    if (!canLaunch) return;
    const initialBattery = currentBattery.batteryBonus ?? 70;
    // Reset and initialize engine with design values
    dispatch({ type: "REPLAY" });
    // Apply starting battery and start choosing phase
    const freshState = createInitialState({
      resources: { power: initialBattery, water: 20, oxygen: 80 },
    });
    // Start engine
    dispatch({ type: "START" });
    setScreen("operations");
    setSelectedChoiceId(null);
  }

  function handleExecuteChoice() {
    if (!selectedChoiceId) return;
    dispatch({ type: "CHOOSE", choiceId: selectedChoiceId });
  }

  function handleNextOrbit() {
    setSelectedChoiceId(null);
    dispatch({ type: "CONTINUE" });
  }

  function handleRestartMission() {
    setSelectedChoiceId(null);
    dispatch({ type: "REPLAY" });
    setScreen("briefing");
  }

  function handleRedesign() {
    setSelectedChoiceId(null);
    dispatch({ type: "REPLAY" });
    setScreen("design");
  }

  function applyPreset(preset: (typeof BENCHMARK_DESIGNS)[0]) {
    if (preset.id === "benchmark-scout") {
      setSelectedComponents({
        solar: "solar-compact",
        battery: "battery-lithium",
        antenna: "antenna-omni",
        payload: "payload-camera",
      });
    } else if (preset.id === "benchmark-relay") {
      setSelectedComponents({
        solar: "solar-deployable",
        battery: "battery-advanced",
        antenna: "antenna-dish",
        payload: "payload-spectral",
      });
    } else if (preset.id === "benchmark-laser") {
      setSelectedComponents({
        solar: "solar-deployable",
        battery: "battery-advanced",
        antenna: "antenna-laser",
        payload: "payload-camera",
      });
    }
  }

  return (
    <div className="app-shell downlink-theme">
      <a className="skip-link" href="#downlink-main">
        Skip to Downlink operations
      </a>

      {/* TOPBAR */}
      <header className="topbar">
        <div className="brand-group">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setScreen("briefing");
            }}
            aria-label="Downlink mission home"
          >
            <span className="brand-orbit downlink-orbit">
              <Satellite size={28} strokeWidth={1.75} />
            </span>
            <span>
              DOWNLINK
              <span className="brand-caption">
                LUNAR SATELLITE COMMUNICATIONS ORBITER
              </span>
            </span>
          </a>

          {/* Mission Switcher Pill */}
          {onSwitchMission && (
            <button
              className="mission-switch-pill"
              onClick={onSwitchMission}
              title="Switch to Lunar Outpost Base"
            >
              <ArrowRight size={13} /> Switch to Lunar Base
            </button>
          )}
        </div>

        <div className="top-actions">
          {screen === "operations" && (
            <span className="prototype-tag orbit-tag">
              <span className="live-dot" /> ORBIT {gameState.turn} / 6
            </span>
          )}
          <button
            className="text-button"
            onClick={() => setGuideOpen(true)}
            aria-label="Open Satellite Field Guide"
          >
            <CircleHelp size={17} /> Satellite field guide
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main id="downlink-main">
        {/* ============================================================== */}
        {/* SCREEN 1: MISSION BRIEFING                                      */}
        {/* ============================================================== */}
        {screen === "briefing" && (
          <section className="downlink-screen briefing-screen" aria-label="Mission Briefing">
            <div className="page-heading">
              <div>
                <p className="eyebrow">
                  <span className="cyan-dot" /> ORBITAL RELAY · PROJECT DOWNLINK
                </p>
                <h1 ref={headingRef} tabIndex={-1}>
                  Orbit the Moon. <span>Bridge the dark.</span>
                </h1>
                <p className="intro-copy">
                  The Moon’s far side never faces Earth, and deep polar craters hide from ground stations.
                  Design and operate <strong>Downlink</strong> to keep humanity connected.
                </p>
              </div>

              <div className="crew-badge">
                <span className="crew-avatar cyan-avatar">
                  <Satellite size={26} />
                </span>
                <div>
                  <span className="eyebrow">YOUR ROLE</span>
                  <strong>Orbital Systems Engineer</strong>
                  <span className="muted">Flight Director · Ages 7–12</span>
                </div>
              </div>
            </div>

            <div className="briefing-grid">
              <div className="briefing-card illustration-card">
                <SatelliteIllustration
                  components={selectedComponents}
                  activeMode="idle"
                  batteryLevel={75}
                  dataLevel={20}
                  showLabels={true}
                />
                <div className="illustration-caption">
                  <span>
                    <Info size={14} /> Modular 2D Orbiter Bus: Solar Arrays, Dish, Payload & Battery
                  </span>
                </div>
              </div>

              <div className="briefing-card story-card">
                <span className="mission-icon cyan-icon">
                  <Radio size={28} />
                </span>
                <p className="eyebrow">MISSION OBJECTIVE</p>
                <h2>Your 3 Engineering Directives</h2>

                <div className="briefing-steps">
                  <div className="step-item">
                    <span className="step-num">01</span>
                    <div>
                      <strong>Design Within Limits</strong>
                      <p>
                        Stay within <strong>$100M budget</strong> and <strong>100 kg launch mass</strong>.
                        Every part has a trade-off.
                      </p>
                    </div>
                  </div>

                  <div className="step-item">
                    <span className="step-num">02</span>
                    <div>
                      <strong>Keep Batteries Charged</strong>
                      <p>
                        Passing behind the Moon plunges you into -130°C darkness. Never let battery reach 0%.
                      </p>
                    </div>
                  </div>

                  <div className="step-item">
                    <span className="step-num">03</span>
                    <div>
                      <strong>Downlink 3 Science Packages</strong>
                      <p>
                        Scan craters to store data, then beam it to Earth when in line-of-sight to complete your mission.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="demo-note cyan-note">
                  <Sparkles size={18} />
                  <p>
                    <strong>Six Orbits. Real Decisions.</strong>
                    <span>
                      Connects directly to the simulation engine. Every orbit advances your position and tests your satellite design.
                    </span>
                  </p>
                </div>

                <button
                  className="primary-button cyan-button"
                  onClick={() => setScreen("design")}
                >
                  Enter Satellite Design Studio <ArrowRight size={19} />
                </button>
                <p className="button-caption">No timer. Take your time, engineer.</p>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* SCREEN 2: COMPONENT-SELECTION SCREEN                           */}
        {/* ============================================================== */}
        {screen === "design" && (
          <section className="downlink-screen design-screen" aria-label="Satellite Component Selection">
            <div className="page-heading">
              <div>
                <p className="eyebrow">
                  <span className="cyan-dot" /> STEP 1 · SATELLITE DESIGN STUDIO
                </p>
                <h1 ref={headingRef} tabIndex={-1}>
                  Equip your <span>Downlink orbiter.</span>
                </h1>
                <p className="intro-copy">
                  Balance mass and budget. Lighter parts leave room for powerful science antennas.
                </p>
              </div>

              <div className="preset-selector" role="group" aria-label="Quick preset designs">
                <span className="preset-label">Quick Presets:</span>
                {BENCHMARK_DESIGNS.map((b) => (
                  <button
                    key={b.id}
                    className="preset-btn"
                    onClick={() => applyPreset(b)}
                    title={b.highlight}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* RESOURCE METERS BAR */}
            <div className="design-constraints-bar">
              {/* BUDGET METER */}
              <div className={`constraint-card ${isOverBudget ? "danger" : ""}`}>
                <div className="constraint-top">
                  <span>
                    <Zap size={16} /> Launch Budget
                  </span>
                  <strong>
                    ${totalCost}M <span>/ ${DOWNLINK_BUDGET_LIMIT}M limit</span>
                  </strong>
                </div>
                <div
                  className="meter"
                  role="meter"
                  aria-label="Budget spent"
                  aria-valuenow={totalCost}
                  aria-valuemin={0}
                  aria-valuemax={DOWNLINK_BUDGET_LIMIT}
                >
                  <span
                    style={{
                      width: `${Math.min(100, (totalCost / DOWNLINK_BUDGET_LIMIT) * 100)}%`,
                    }}
                    className={isOverBudget ? "meter-danger" : "meter-cyan"}
                  />
                </div>
                <span className="constraint-sub">
                  {isOverBudget ? (
                    <b className="cost">Over budget by ${totalCost - DOWNLINK_BUDGET_LIMIT}M! Downgrade a part.</b>
                  ) : (
                    `$${DOWNLINK_BUDGET_LIMIT - totalCost}M remaining`
                  )}
                </span>
              </div>

              {/* MASS METER */}
              <div className={`constraint-card ${isOverMass ? "danger" : ""}`}>
                <div className="constraint-top">
                  <span>
                    <Scale size={16} /> Rocket Payload Mass
                  </span>
                  <strong>
                    {totalMass} kg <span>/ {DOWNLINK_MASS_LIMIT} kg limit</span>
                  </strong>
                </div>
                <div
                  className="meter"
                  role="meter"
                  aria-label="Mass used"
                  aria-valuenow={totalMass}
                  aria-valuemin={0}
                  aria-valuemax={DOWNLINK_MASS_LIMIT}
                >
                  <span
                    style={{
                      width: `${Math.min(100, (totalMass / DOWNLINK_MASS_LIMIT) * 100)}%`,
                    }}
                    className={isOverMass ? "meter-danger" : "meter-cyan"}
                  />
                </div>
                <span className="constraint-sub">
                  {isOverMass ? (
                    <b className="cost">Too heavy (+{totalMass - DOWNLINK_MASS_LIMIT} kg)! Rocket cannot launch.</b>
                  ) : (
                    `${DOWNLINK_MASS_LIMIT - totalMass} kg available margin`
                  )}
                </span>
              </div>

              {/* BATTERY STAT */}
              <div className="constraint-card stat-summary">
                <div className="constraint-top">
                  <span>
                    <Battery size={16} /> Start Battery
                  </span>
                  <strong className="gain">{currentBattery.batteryBonus}%</strong>
                </div>
                <p className="constraint-note">{currentBattery.shortDescription}</p>
              </div>

              {/* ANTENNA / SPEED STAT */}
              <div className="constraint-card stat-summary">
                <div className="constraint-top">
                  <span>
                    <HardDrive size={16} /> Downlink Rate
                  </span>
                  <strong className="gain">{currentAntenna.statValue}</strong>
                </div>
                <p className="constraint-note">{currentAntenna.shortDescription}</p>
              </div>
            </div>

            {/* DESIGN WORKBENCH LAYOUT */}
            <div className="design-layout">
              {/* LEFT: 2D SATELLITE ILLUSTRATION */}
              <div className="design-preview-col">
                <div className="preview-box">
                  <div className="preview-header">
                    <span>
                      <Satellite size={16} /> SATELLITE SCHEMATIC VIEW
                    </span>
                    <span className="live-pill">LIVE BLUEPRINT</span>
                  </div>
                  <SatelliteIllustration
                    components={selectedComponents}
                    highlightSlot={highlightSlot}
                    batteryLevel={currentBattery.batteryBonus ?? 75}
                    dataLevel={20}
                    showLabels={true}
                  />
                  <div className="preview-footer">
                    <span>Selected: {currentSolar.name} · {currentAntenna.name}</span>
                  </div>
                </div>

                {/* LAUNCH BUTTON */}
                <div className="launch-box">
                  {!canLaunch && (
                    <div className="launch-warning">
                      <CircleAlert size={18} />
                      <span>
                        {isOverBudget && isOverMass
                          ? "Satellite exceeds both budget and rocket mass limits!"
                          : isOverBudget
                            ? `Over budget by $${totalCost - DOWNLINK_BUDGET_LIMIT}M. Choose more affordable parts.`
                            : `Over rocket mass limit by ${totalMass - DOWNLINK_MASS_LIMIT} kg. Pick lighter components.`}
                      </span>
                    </div>
                  )}

                  <button
                    className="primary-button cyan-button"
                    disabled={!canLaunch}
                    onClick={handleLaunchMission}
                  >
                    Confirm Design & Launch to Orbit 🚀
                  </button>
                  <p className="button-caption">
                    Locks your configuration for the 6-orbit mission.
                  </p>
                </div>
              </div>

              {/* RIGHT: COMPONENT SELECTION SLOTS */}
              <div className="design-slots-col">
                {/* 1. POWER / SOLAR PANELS */}
                <div className="slot-group">
                  <div className="slot-header">
                    <span className="slot-badge">SLOT 1</span>
                    <h3>Power & Solar Arrays</h3>
                    <small>Generates energy when orbiting in direct sunlight.</small>
                  </div>
                  <div className="component-options">
                    {SATELLITE_COMPONENTS.solar.map((item) => {
                      const isSelected = selectedComponents.solar === item.id;
                      const addedCost = item.costMillion - currentSolar.costMillion;
                      const addedMass = item.massKg - currentSolar.massKg;
                      const wouldExceedBudget = totalCost + addedCost > DOWNLINK_BUDGET_LIMIT;
                      const wouldExceedMass = totalMass + addedMass > DOWNLINK_MASS_LIMIT;
                      const disabled = !isSelected && (wouldExceedBudget || wouldExceedMass);

                      return (
                        <button
                          key={item.id}
                          className={`component-card ${isSelected ? "selected" : ""} ${disabled ? "unaffordable" : ""}`}
                          onClick={() =>
                            setSelectedComponents((prev) => ({
                              ...prev,
                              solar: item.id,
                            }))
                          }
                          onMouseEnter={() => setHighlightSlot("solar")}
                          onMouseLeave={() => setHighlightSlot(null)}
                          disabled={disabled}
                          aria-pressed={isSelected}
                        >
                          <div className="component-card-top">
                            <strong>{item.name}</strong>
                            <span className="component-cost">
                              ${item.costMillion}M · {item.massKg} kg
                            </span>
                          </div>
                          <p className="component-desc">{item.shortDescription}</p>
                          <div className="tradeoff-box">
                            <span className="tradeoff-why">✓ {item.tradeOffWhy}</span>
                            <span className="tradeoff-catch">⚠ {item.tradeOffCatch}</span>
                          </div>
                          {disabled && (
                            <span className="unaffordable-badge">
                              {wouldExceedBudget
                                ? `Exceeds budget by $${totalCost + addedCost - DOWNLINK_BUDGET_LIMIT}M`
                                : `Exceeds mass by ${totalMass + addedMass - DOWNLINK_MASS_LIMIT} kg`}
                            </span>
                          )}
                          <span className="radio-dot">
                            {isSelected && <Check size={12} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. BATTERY STORAGE */}
                <div className="slot-group">
                  <div className="slot-header">
                    <span className="slot-badge">SLOT 2</span>
                    <h3>Battery Storage Pack</h3>
                    <small>Stores energy to survive the Moon’s deep eclipse shadow.</small>
                  </div>
                  <div className="component-options">
                    {SATELLITE_COMPONENTS.battery.map((item) => {
                      const isSelected = selectedComponents.battery === item.id;
                      const addedCost = item.costMillion - currentBattery.costMillion;
                      const addedMass = item.massKg - currentBattery.massKg;
                      const wouldExceedBudget = totalCost + addedCost > DOWNLINK_BUDGET_LIMIT;
                      const wouldExceedMass = totalMass + addedMass > DOWNLINK_MASS_LIMIT;
                      const disabled = !isSelected && (wouldExceedBudget || wouldExceedMass);

                      return (
                        <button
                          key={item.id}
                          className={`component-card ${isSelected ? "selected" : ""} ${disabled ? "unaffordable" : ""}`}
                          onClick={() =>
                            setSelectedComponents((prev) => ({
                              ...prev,
                              battery: item.id,
                            }))
                          }
                          onMouseEnter={() => setHighlightSlot("battery")}
                          onMouseLeave={() => setHighlightSlot(null)}
                          disabled={disabled}
                          aria-pressed={isSelected}
                        >
                          <div className="component-card-top">
                            <strong>{item.name}</strong>
                            <span className="component-cost">
                              ${item.costMillion}M · {item.massKg} kg
                            </span>
                          </div>
                          <p className="component-desc">{item.shortDescription}</p>
                          <div className="tradeoff-box">
                            <span className="tradeoff-why">✓ {item.tradeOffWhy}</span>
                            <span className="tradeoff-catch">⚠ {item.tradeOffCatch}</span>
                          </div>
                          {disabled && (
                            <span className="unaffordable-badge">
                              {wouldExceedBudget
                                ? `Exceeds budget by $${totalCost + addedCost - DOWNLINK_BUDGET_LIMIT}M`
                                : `Exceeds mass by ${totalMass + addedMass - DOWNLINK_MASS_LIMIT} kg`}
                            </span>
                          )}
                          <span className="radio-dot">
                            {isSelected && <Check size={12} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. COMMUNICATIONS ANTENNA */}
                <div className="slot-group">
                  <div className="slot-header">
                    <span className="slot-badge">SLOT 3</span>
                    <h3>Downlink Transmitter & Antenna</h3>
                    <small>Beams science and telemetry across 384,000 km back to Earth.</small>
                  </div>
                  <div className="component-options">
                    {SATELLITE_COMPONENTS.antenna.map((item) => {
                      const isSelected = selectedComponents.antenna === item.id;
                      const addedCost = item.costMillion - currentAntenna.costMillion;
                      const addedMass = item.massKg - currentAntenna.massKg;
                      const wouldExceedBudget = totalCost + addedCost > DOWNLINK_BUDGET_LIMIT;
                      const wouldExceedMass = totalMass + addedMass > DOWNLINK_MASS_LIMIT;
                      const disabled = !isSelected && (wouldExceedBudget || wouldExceedMass);

                      return (
                        <button
                          key={item.id}
                          className={`component-card ${isSelected ? "selected" : ""} ${disabled ? "unaffordable" : ""}`}
                          onClick={() =>
                            setSelectedComponents((prev) => ({
                              ...prev,
                              antenna: item.id,
                            }))
                          }
                          onMouseEnter={() => setHighlightSlot("antenna")}
                          onMouseLeave={() => setHighlightSlot(null)}
                          disabled={disabled}
                          aria-pressed={isSelected}
                        >
                          <div className="component-card-top">
                            <strong>{item.name}</strong>
                            <span className="component-cost">
                              ${item.costMillion}M · {item.massKg} kg
                            </span>
                          </div>
                          <p className="component-desc">{item.shortDescription}</p>
                          <div className="tradeoff-box">
                            <span className="tradeoff-why">✓ {item.tradeOffWhy}</span>
                            <span className="tradeoff-catch">⚠ {item.tradeOffCatch}</span>
                          </div>
                          {disabled && (
                            <span className="unaffordable-badge">
                              {wouldExceedBudget
                                ? `Exceeds budget by $${totalCost + addedCost - DOWNLINK_BUDGET_LIMIT}M`
                                : `Exceeds mass by ${totalMass + addedMass - DOWNLINK_MASS_LIMIT} kg`}
                            </span>
                          )}
                          <span className="radio-dot">
                            {isSelected && <Check size={12} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. SCIENCE PAYLOAD */}
                <div className="slot-group">
                  <div className="slot-header">
                    <span className="slot-badge">SLOT 4</span>
                    <h3>Science Sensor Payload</h3>
                    <small>Scans craters, maps minerals, and finds polar water ice.</small>
                  </div>
                  <div className="component-options">
                    {SATELLITE_COMPONENTS.payload.map((item) => {
                      const isSelected = selectedComponents.payload === item.id;
                      const addedCost = item.costMillion - currentPayload.costMillion;
                      const addedMass = item.massKg - currentPayload.massKg;
                      const wouldExceedBudget = totalCost + addedCost > DOWNLINK_BUDGET_LIMIT;
                      const wouldExceedMass = totalMass + addedMass > DOWNLINK_MASS_LIMIT;
                      const disabled = !isSelected && (wouldExceedBudget || wouldExceedMass);

                      return (
                        <button
                          key={item.id}
                          className={`component-card ${isSelected ? "selected" : ""} ${disabled ? "unaffordable" : ""}`}
                          onClick={() =>
                            setSelectedComponents((prev) => ({
                              ...prev,
                              payload: item.id,
                            }))
                          }
                          onMouseEnter={() => setHighlightSlot("payload")}
                          onMouseLeave={() => setHighlightSlot(null)}
                          disabled={disabled}
                          aria-pressed={isSelected}
                        >
                          <div className="component-card-top">
                            <strong>{item.name}</strong>
                            <span className="component-cost">
                              ${item.costMillion}M · {item.massKg} kg
                            </span>
                          </div>
                          <p className="component-desc">{item.shortDescription}</p>
                          <div className="tradeoff-box">
                            <span className="tradeoff-why">✓ {item.tradeOffWhy}</span>
                            <span className="tradeoff-catch">⚠ {item.tradeOffCatch}</span>
                          </div>
                          {disabled && (
                            <span className="unaffordable-badge">
                              {wouldExceedBudget
                                ? `Exceeds budget by $${totalCost + addedCost - DOWNLINK_BUDGET_LIMIT}M`
                                : `Exceeds mass by ${totalMass + addedMass - DOWNLINK_MASS_LIMIT} kg`}
                            </span>
                          )}
                          <span className="radio-dot">
                            {isSelected && <Check size={12} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* SCREEN 3: SIX-STEP MISSION OPERATIONS SCREEN                   */}
        {/* ============================================================== */}
        {screen === "operations" && (
          <section className="downlink-screen operations-screen" aria-label="Mission Operations">
            {/* LIVE TELEMETRY METERS */}
            <div className="resources" aria-label="Orbital Telemetry Reserves">
              {/* BATTERY METER (Engine: power) */}
              <div className="resource-card battery-card">
                <div className="resource-top">
                  <span>
                    <Zap size={17} /> Battery Power
                  </span>
                  <span className="resource-note">
                    {lastResult && gameState.phase === "consequence" ? (
                      <b className={lastResult.actualDelta.power > 0 ? "gain" : "cost"}>
                        {signed(lastResult.actualDelta.power)}% this pass
                      </b>
                    ) : (
                      "SPACECRAFT POWER"
                    )}
                  </span>
                </div>
                <div className="resource-number">
                  <strong data-resource="power">{gameState.resources.power}</strong>
                  <span>
                    / 100 <small>%</small>
                  </span>
                </div>
                <div
                  className="meter"
                  role="meter"
                  aria-label="Battery charge percentage"
                  aria-valuenow={gameState.resources.power}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span
                    style={{ width: `${gameState.resources.power}%` }}
                    className={
                      gameState.resources.power < 20
                        ? "meter-danger"
                        : gameState.resources.power < 50
                          ? "meter-amber"
                          : "meter-green"
                    }
                  />
                </div>
                <p>Powers transmitter, heaters, and sensors.</p>
              </div>

              {/* STORED DATA METER (Engine: water) */}
              <div className="resource-card data-card">
                <div className="resource-top">
                  <span>
                    <Database size={17} /> Stored Data Buffer
                  </span>
                  <span className="resource-note">
                    {lastResult && gameState.phase === "consequence" ? (
                      <b className={lastResult.actualDelta.water > 0 ? "gain" : "cost"}>
                        {signed(lastResult.actualDelta.water)} MB
                      </b>
                    ) : (
                      "ONBOARD STORAGE"
                    )}
                  </span>
                </div>
                <div className="resource-number">
                  <strong data-resource="water">{gameState.resources.water}</strong>
                  <span>
                    / 100 <small>MB</small>
                  </span>
                </div>
                <div
                  className="meter"
                  role="meter"
                  aria-label="Stored data in memory buffer"
                  aria-valuenow={gameState.resources.water}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span
                    style={{ width: `${gameState.resources.water}%` }}
                    className="meter-purple"
                  />
                </div>
                <p>Sensor readings waiting to be downlinked.</p>
              </div>

              {/* LINK SIGNAL METER (Engine: oxygen) */}
              <div className="resource-card link-card">
                <div className="resource-top">
                  <span>
                    <Radio size={17} /> Link Signal Health
                  </span>
                  <span className="resource-note">
                    {lastResult && gameState.phase === "consequence" ? (
                      <b className={lastResult.actualDelta.oxygen > 0 ? "gain" : "cost"}>
                        {signed(lastResult.actualDelta.oxygen)}%
                      </b>
                    ) : (
                      "RF STABILITY"
                    )}
                  </span>
                </div>
                <div className="resource-number">
                  <strong data-resource="oxygen">{gameState.resources.oxygen}</strong>
                  <span>
                    / 100 <small>%</small>
                  </span>
                </div>
                <div
                  className="meter"
                  role="meter"
                  aria-label="Link signal quality"
                  aria-valuenow={gameState.resources.oxygen}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span
                    style={{ width: `${gameState.resources.oxygen}%` }}
                    className="meter-cyan"
                  />
                </div>
                <p>Antenna lock and spacecraft health.</p>
              </div>

              {/* RETURNED DATA GOAL (Engine: science) */}
              <div className="resource-card science returned-data-card">
                <div className="resource-top">
                  <span>
                    <Satellite size={17} /> Returned Data Goal
                  </span>
                  <span className="resource-note">MISSION SUCCESS</span>
                </div>
                <div className="science-count">
                  <strong>
                    {gameState.science}
                    <span> / {DOWNLINK_MISSION.scienceGoal}</span>
                  </strong>
                  <div className="sample-icons" aria-hidden="true">
                    {Array.from({ length: DOWNLINK_MISSION.scienceGoal }, (_, i) => (
                      <Radio
                        key={i}
                        size={21}
                        className={i < gameState.science ? "filled cyan-fill" : ""}
                      />
                    ))}
                  </div>
                </div>
                <p>
                  Downlink 3 science packages across 6 orbits.
                  <br />
                  <span className="muted">
                    Budget spent: ${totalCost}M · Mass: {totalMass} kg
                  </span>
                </p>
              </div>
            </div>

            {/* MISSION OPERATIONS PANEL */}
            <div className="mission-layout">
              {/* LEFT: 2D SATELLITE ACTIVE VIEW */}
              <section className="outpost-view downlink-orbiter-view" aria-label="Orbital Satellite View">
                <div className="view-top">
                  <div>
                    <span className="live-dot" /> DOWNLINK-01 IN LUNAR ORBIT
                    <span className="view-coordinate">
                      POLAR ALTITUDE 100 KM · SPEED 1.63 KM/S
                    </span>
                  </div>
                  <span className="view-chip cyan-chip">
                    <span /> TELEMETRY STREAMING
                  </span>
                </div>

                <div className="scene-wrap downlink-scene-wrap">
                  <SatelliteIllustration
                    components={selectedComponents}
                    activeMode={illustrationMode}
                    batteryLevel={gameState.resources.power}
                    dataLevel={gameState.resources.water}
                    showLabels={false}
                  />

                  <div className="orbit-status-overlay">
                    <span className="eyebrow">
                      {illustrationMode === "downlinking"
                        ? "TRANSMITTING DATA DOWNLINK"
                        : illustrationMode === "charging"
                          ? "SOLAR ARRAYS HARVESTING SUNLIGHT"
                          : illustrationMode === "scanning"
                            ? "SCIENCE SENSORS MAPPING TERRAIN"
                            : "COASTING IN LUNAR ORBIT"}
                    </span>
                    <p>
                      {currentScenario.title}
                    </p>
                  </div>
                </div>

                <div className="view-bottom">
                  <span>
                    <span className="cyan-dot" /> EQUIPPED: {currentAntenna.name} & {currentSolar.name}
                  </span>
                  <span>
                    2D SCHEMATIC MODE
                  </span>
                </div>
              </section>

              {/* RIGHT: DECISIONS & CONSEQUENCE PANEL */}
              <section className="mission-panel" id="mission" aria-label="Orbital Command Decisions">
                <div className="panel-top">
                  <span className="eyebrow">FLIGHT DIRECTOR CONSOLE</span>
                  <span className="shift-tag cyan-tag">
                    ORBIT {gameState.turn} <span>/ {DOWNLINK_MISSION.totalShifts}</span>
                  </span>
                </div>

                {/* PHASE: CHOOSING */}
                {gameState.phase === "choosing" && (
                  <div className="panel-content choosing">
                    <p className="eyebrow cyan-eyebrow">ORBITAL PASS CHALLENGE</p>
                    <h2 ref={headingRef} tabIndex={-1}>
                      {currentScenario.title}
                    </h2>
                    <p>{currentScenario.situation}</p>
                    <h3>{currentScenario.question}</h3>

                    <div className="choices" role="group" aria-label="Select orbital command">
                      {currentScenario.choices.map((choice) => {
                        const isSelected = selectedChoiceId === choice.id;
                        const affordable = canChoose(gameState, choice);
                        const effect = previewChoice(gameState, choice);
                        const reason = !affordable ? getUnavailabilityReason(choice) : null;

                        return (
                          <button
                            key={choice.id}
                            className={`choice-card ${isSelected ? "selected" : ""} ${!affordable ? "unaffordable" : ""}`}
                            aria-pressed={isSelected}
                            onClick={() => setSelectedChoiceId(choice.id)}
                            disabled={!affordable}
                          >
                            <span className="choice-icon cyan-icon">
                              {choice.icon === "sun" ? (
                                <Sun size={20} />
                              ) : choice.icon === "science" ? (
                                <Radio size={20} />
                              ) : (
                                <Database size={20} />
                              )}
                            </span>
                            <span className="choice-copy">
                              <strong>{choice.title}</strong>
                              <span>{choice.description}</span>
                              <span className="choice-deltas">
                                <span className={effect.actualDelta.power >= 0 ? "gain" : "cost"}>
                                  {signed(effect.actualDelta.power)}% battery
                                </span>
                                <span className={effect.actualDelta.water >= 0 ? "gain" : "cost"}>
                                  {signed(effect.actualDelta.water)} MB data
                                </span>
                                {choice.science > 0 && (
                                  <span className="gain">
                                    +{choice.science} returned data
                                  </span>
                                )}
                              </span>
                              {!affordable && reason && (
                                <span className="unavailable-reason-tag">
                                  <CircleAlert size={12} /> {reason}
                                </span>
                              )}
                            </span>
                            <span className="choice-radio">
                              {isSelected && <Check size={12} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="selection-hint">
                      {preview
                        ? `Projected: ${preview.after.power}% battery · ${preview.after.water} MB buffer · ${preview.after.oxygen}% signal`
                        : "Select an orbital maneuver to preview your power and data changes."}
                    </p>

                    <button
                      className="primary-button cyan-button"
                      disabled={!activeChoice || !canChoose(gameState, activeChoice)}
                      onClick={handleExecuteChoice}
                    >
                      Execute Orbit Maneuver <ArrowRight size={19} />
                    </button>
                  </div>
                )}

                {/* PHASE: CONSEQUENCE */}
                {gameState.phase === "consequence" && lastResult && (
                  <div className="panel-content consequence">
                    <span className="mission-icon cyan-icon">
                      <Check size={30} />
                    </span>
                    <p className="eyebrow">MANEUVER LOGGED · ORBIT {gameState.turn}</p>
                    <h2 ref={headingRef} tabIndex={-1}>
                      {lastResult.consequence.title}
                    </h2>
                    <p>{lastResult.consequence.explanation}</p>

                    {/* RESOURCE TABLE */}
                    <div className="result-table" aria-label="Orbital telemetry changes">
                      <div>
                        <span>
                          <Zap size={16} /> Battery Power
                        </span>
                        <span>
                          {lastResult.before.power}% <ArrowRight size={14} />{" "}
                          <strong>{lastResult.after.power}%</strong>
                          <b className={lastResult.actualDelta.power >= 0 ? "gain" : "cost"}>
                            {signed(lastResult.actualDelta.power)}%
                          </b>
                        </span>
                      </div>
                      <div>
                        <span>
                          <Database size={16} /> Stored Data Buffer
                        </span>
                        <span>
                          {lastResult.before.water} MB <ArrowRight size={14} />{" "}
                          <strong>{lastResult.after.water} MB</strong>
                          <b className={lastResult.actualDelta.water >= 0 ? "gain" : "cost"}>
                            {signed(lastResult.actualDelta.water)} MB
                          </b>
                        </span>
                      </div>
                      <div>
                        <span>
                          <Radio size={16} /> Link Signal
                        </span>
                        <span>
                          {lastResult.before.oxygen}% <ArrowRight size={14} />{" "}
                          <strong>{lastResult.after.oxygen}%</strong>
                          <b className={lastResult.actualDelta.oxygen >= 0 ? "gain" : "cost"}>
                            {signed(lastResult.actualDelta.oxygen)}%
                          </b>
                        </span>
                      </div>
                      {lastResult.scienceGained > 0 && (
                        <div>
                          <span>
                            <Satellite size={16} /> Returned Data
                          </span>
                          <b className="gain">+{lastResult.scienceGained} package downlinked!</b>
                        </div>
                      )}
                    </div>

                    <div className="learning-note cyan-learning">
                      <Sparkles size={21} />
                      <div>
                        <span className="eyebrow">ASTRONOMICAL INSIGHT</span>
                        <p>{lastResult.consequence.lesson}</p>
                      </div>
                    </div>

                    <button className="primary-button cyan-button" onClick={handleNextOrbit}>
                      {gameState.turn < DOWNLINK_MISSION.totalShifts
                        ? `Continue to Orbit ${gameState.turn + 1}`
                        : "See Final Mission Results"}{" "}
                      <ArrowRight size={19} />
                    </button>
                  </div>
                )}
              </section>
            </div>

            {/* SIX-ORBIT JOURNEY TRACKER */}
            <section className="journey" aria-label="Six-orbit mission flight path">
              <div className="journey-heading">
                <span className="eyebrow">YOUR SIX-ORBIT TRAJECTORY</span>
                <span>Advancing around the Moon in polar synchrony.</span>
              </div>
              <ol>
                {DOWNLINK_MISSION.shiftNames.map((name, i) => (
                  <li
                    key={name}
                    className={
                      i === gameState.turn - 1
                        ? "current"
                        : i < gameState.history.length
                          ? "completed"
                          : "locked"
                    }
                  >
                    <span className="shift-node">
                      {i < gameState.history.length ? (
                        <Check size={15} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <span>
                      <strong>{name.split(" · ")[0]}</strong>
                      <small>
                        {i < gameState.history.length
                          ? "Completed"
                          : i === gameState.turn - 1
                            ? "In Flight"
                            : "Upcoming"}
                      </small>
                    </span>
                    {i < 5 && <ChevronRight size={14} className="journey-chevron" />}
                  </li>
                ))}
              </ol>
            </section>
          </section>
        )}

        {/* ============================================================== */}
        {/* SCREEN 4: RESULTS AND DESIGN-COMPARISON SCREEN                 */}
        {/* ============================================================== */}
        {screen === "results" && (
          <section className="downlink-screen results-screen" aria-label="Mission Results & Design Comparison">
            <div className="page-heading">
              <div>
                <p className="eyebrow">
                  <span className="cyan-dot" /> MISSION DEBRIEF & BENCHMARK
                </p>
                <h1 ref={headingRef} tabIndex={-1}>
                  {gameState.ending === "mission-complete"
                    ? "Mission Accomplished!"
                    : "Mission Safe Standby."}
                </h1>
                <p className="intro-copy">
                  {gameState.ending === "mission-complete"
                    ? "Your Downlink satellite completed 6 orbits, balanced its power reserves, and returned crucial science data to Earth!"
                    : "Your orbiter entered safe standby. Review your design trade-offs and try another configuration."}
                </p>
              </div>

              <div className="crew-badge">
                <span className="crew-avatar cyan-avatar">
                  {gameState.ending === "mission-complete" ? (
                    <ShieldCheck size={28} />
                  ) : (
                    <ShieldAlert size={28} />
                  )}
                </span>
                <div>
                  <span className="eyebrow">FLIGHT RATING</span>
                  <strong>
                    {gameState.ending === "mission-complete"
                      ? "Master Orbital Engineer"
                      : "Cadet Systems Specialist"}
                  </strong>
                  <span className="muted">
                    {gameState.science >= DOWNLINK_MISSION.scienceGoal
                      ? "Data Goal Exceeded"
                      : "Needs More Downlink Passes"}
                  </span>
                </div>
              </div>
            </div>

            {/* RESULTS METRICS GRID */}
            <div className="results-metrics-grid">
              <div className="results-metric-card">
                <span>
                  <Radio size={18} /> Returned Data
                </span>
                <strong>
                  {gameState.science} <span>/ {DOWNLINK_MISSION.scienceGoal} packages</span>
                </strong>
                <p className="gain">
                  {gameState.science >= DOWNLINK_MISSION.scienceGoal
                    ? "✓ Mission Target Met"
                    : "Target: 3 packages"}
                </p>
              </div>

              <div className="results-metric-card">
                <span>
                  <Battery size={18} /> Final Battery
                </span>
                <strong className={gameState.resources.power > 20 ? "gain" : "cost"}>
                  {gameState.resources.power}%
                </strong>
                <p>{gameState.resources.power > 0 ? "Surviving reserves" : "Depleted in shadow"}</p>
              </div>

              <div className="results-metric-card">
                <span>
                  <Database size={18} /> Remaining Buffer
                </span>
                <strong>{gameState.resources.water} MB</strong>
                <p>Onboard storage left</p>
              </div>

              <div className="results-metric-card">
                <span>
                  <Scale size={18} /> Design Mass
                </span>
                <strong>{totalMass} kg</strong>
                <p>Limit: {DOWNLINK_MASS_LIMIT} kg</p>
              </div>

              <div className="results-metric-card">
                <span>
                  <Zap size={18} /> Launch Budget
                </span>
                <strong>${totalCost}M</strong>
                <p>Budget: ${DOWNLINK_BUDGET_LIMIT}M</p>
              </div>
            </div>

            {/* DESIGN-COMPARISON SECTION */}
            <div className="comparison-section">
              <div className="comparison-header">
                <div>
                  <span className="eyebrow">ENGINEERING BENCHMARK MATRIX</span>
                  <h2>How your satellite compares to benchmark designs</h2>
                </div>
                <p className="intro-copy">
                  Every satellite architecture represents a distinct philosophy. See how your choices compare.
                </p>
              </div>

              <div className="comparison-table-wrap">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th scope="col">Design Metric</th>
                      <th scope="col" className="your-design-col">
                        Your Orbiter (Custom)
                      </th>
                      {BENCHMARK_DESIGNS.map((b) => (
                        <th key={b.id} scope="col">
                          {b.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">Architecture</th>
                      <td className="your-design-col">
                        <strong>{currentAntenna.name}</strong> + {currentPayload.name}
                      </td>
                      {BENCHMARK_DESIGNS.map((b) => (
                        <td key={b.id}>
                          <strong>{b.components.antenna}</strong>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">Launch Cost</th>
                      <td className="your-design-col">
                        <strong className={isOverBudget ? "cost" : "gain"}>
                          ${totalCost}M
                        </strong>
                      </td>
                      {BENCHMARK_DESIGNS.map((b) => (
                        <td key={b.id}>${b.costMillion}M</td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">Payload Mass</th>
                      <td className="your-design-col">
                        <strong className={isOverMass ? "cost" : "gain"}>
                          {totalMass} kg
                        </strong>
                      </td>
                      {BENCHMARK_DESIGNS.map((b) => (
                        <td key={b.id}>{b.massKg} kg</td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">Antenna Type</th>
                      <td className="your-design-col">{currentAntenna.statValue}</td>
                      {BENCHMARK_DESIGNS.map((b) => (
                        <td key={b.id}>{b.components.antenna.split(" ")[0]}</td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">Science Output</th>
                      <td className="your-design-col">
                        <strong className="gain">{gameState.science} packages</strong>
                      </td>
                      {BENCHMARK_DESIGNS.map((b) => (
                        <td key={b.id}>{b.expectedReturnedData} packages</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* POST-MORTEM DESIGN ANALYSIS */}
              <div className="design-analysis-card">
                <div className="analysis-icon">
                  <Sparkles size={24} />
                </div>
                <div>
                  <span className="eyebrow">FLIGHT DIRECTOR DESIGN ANALYSIS</span>
                  <h3>Why your configuration performed this way</h3>
                  <p>
                    Your satellite used <strong>{currentSolar.name}</strong> alongside the{" "}
                    <strong>{currentAntenna.name}</strong>. This gave you{" "}
                    {currentAntenna.id === "antenna-laser"
                      ? "massive optical downlink bandwidth to empty your data buffer quickly during Orbit 4 and Orbit 6."
                      : currentAntenna.id === "antenna-dish"
                        ? "a dependable high-gain beam that delivered steady science return to Earth stations."
                        : "an ultra-light payload, though low-gain downlink required careful data scheduling."}
                  </p>
                  <p className="analysis-secondary">
                    Your <strong>{currentBattery.name}</strong>{" "}
                    {gameState.resources.power > 20
                      ? "successfully kept critical heaters alive through the cold eclipse on Orbit 3!"
                      : "faced severe power drain during shadow passes, showing the challenge of orbital thermal survival."}
                  </p>
                </div>
              </div>
            </div>

            {/* RESULTS ACTIONS */}
            <div className="results-actions">
              <button className="primary-button cyan-button" onClick={handleRedesign}>
                <Wrench size={18} /> Redesign Satellite & Fly Again
              </button>
              <button className="secondary-button" onClick={handleRestartMission}>
                <RotateCcw size={18} /> Restart from Briefing
              </button>
              {onSwitchMission && (
                <button className="secondary-button" onClick={onSwitchMission}>
                  <Flag size={18} /> Switch to Lunar Outpost Base
                </button>
              )}
            </div>
          </section>
        )}
      </main>

      {/* FOOTER */}
      <footer>
        <p>
          Downlink Lunar Orbiter · Built for curious minds.{" "}
          <span>Inspired by NASA LRO, CAPSTONE & DSN.</span>
        </p>
        <button onClick={() => setGuideOpen(true)}>
          Educational assumptions & references <ArrowUpRight size={13} />
        </button>
      </footer>

      {/* FIELD GUIDE DIALOG */}
      <dialog
        ref={dialogRef}
        onCancel={() => setGuideOpen(false)}
        onClose={() => setGuideOpen(false)}
        className="field-guide"
        aria-labelledby="downlink-guide-title"
      >
        <div className="guide-header">
          <span className="eyebrow">SATELLITE SYSTEMS FIELD GUIDE</span>
          <button
            className="icon-button"
            aria-label="Close field guide"
            onClick={() => setGuideOpen(false)}
          >
            ✕
          </button>
        </div>
        <h2 id="downlink-guide-title">Orbital Engineering Fundamentals</h2>

        <h3>How Downlink Works</h3>
        <p>
          1. <strong>Design:</strong> Select your solar arrays, battery, antenna, and science sensor within budget and mass constraints.
          <br />
          2. <strong>Launch:</strong> Fly through 6 orbital passes around the Moon.
          <br />
          3. <strong>Collect & Downlink:</strong> Sensors fill your stored data buffer. Transmitters beam stored data to Earth or the lunar base to earn Returned Data points.
          <br />
          4. <strong>Survive:</strong> Protect battery charge above 0% through lunar eclipses and cold shadow.
        </p>

        <h3>Educational Assumptions</h3>
        <p>
          All numerical values (budget in $M, mass in kg, battery %, and data buffer in MB) are invented educational assumptions designed for balanced gameplay for ages 7–12. They are not physical flight telemetry, NASA flight constraints, or real dollar budgets.
        </p>
        <p>
          Action deltas clamp cleanly between 0 and 100 points, powered directly by the pure deterministic simulation engine.
        </p>

        <h3>Source References (Conceptual Support)</h3>
        <p>These real-world NASA missions inspired the satellite design and orbital mechanics:</p>
        <div className="sources-list">
          <a
            href="https://www.nasa.gov/mission/lunar-reconnaissance-orbiter/"
            target="_blank"
            rel="noreferrer"
          >
            NASA · Lunar Reconnaissance Orbiter (LRO) <ArrowUpRight size={14} />
          </a>
          <a
            href="https://www.nasa.gov/directorates/somd/space-communications-navigation/deep-space-network/"
            target="_blank"
            rel="noreferrer"
          >
            NASA · Deep Space Network (DSN) Communications <ArrowUpRight size={14} />
          </a>
          <a
            href="https://www.nasa.gov/mission/capstone/"
            target="_blank"
            rel="noreferrer"
          >
            NASA · CAPSTONE Lunar Relay CubeSat <ArrowUpRight size={14} />
          </a>
          <a
            href="https://www.nasa.gov/directorates/stmd/laser-communications-relay-demonstration/"
            target="_blank"
            rel="noreferrer"
          >
            NASA · Optical Laser Communications (LCRD / LLCD) <ArrowUpRight size={14} />
          </a>
        </div>

        <p className="muted">
          An independent Space Apps educational prototype. No NASA affiliation or endorsement is implied.
        </p>

        <button className="primary-button cyan-button" onClick={() => setGuideOpen(false)}>
          Back to Satellite Console <Check size={18} />
        </button>
      </dialog>
    </div>
  );
}
