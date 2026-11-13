"use client";

import { useState } from "react";
import {
  type BaseModuleKind,
  type PlacedModule,
  type BaseGridTelemetry,
  MODULE_RECIPES,
  calculateBaseGrid,
} from "../game/baseBuilding";

type Props = {
  inventory: { titanium: number; iceCores: number };
  teamPower: number;
  modules: readonly PlacedModule[];
  selectedKind: BaseModuleKind | null;
  onSelectKind: (kind: BaseModuleKind | null) => void;
  onRotatePreview: () => void;
  onClose: () => void;
};

export function BaseBuildModal({
  inventory,
  teamPower,
  modules,
  selectedKind,
  onSelectKind,
  onRotatePreview,
  onClose,
}: Props) {
  const telemetry: BaseGridTelemetry = calculateBaseGrid(modules);

  return (
    <div className="mars-dialog-backdrop sci-backdrop">
      <section
        className="mars-dialog sci-modal sci-build-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Modular Base Building & Grid Fabricator"
      >
        <header className="sci-modal-head">
          <div>
            <p className="mars-kicker">OUTPOST ALPHA · MODULAR EXPANSION GRID</p>
            <h2>Modular Base Fabricator</h2>
          </div>
          <button type="button" className="sci-close-btn" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="sci-craft-stock">
          <span>Titanium: <b>{inventory.titanium}</b></span>
          <span>Ice Cores: <b>{inventory.iceCores}</b></span>
          <span>Base Power: <b>{Math.round(teamPower)}%</b></span>
          <span>Connected Modules: <b>{telemetry.connectedCount}</b></span>
          <span>Net Solar Wattage: <b>+{telemetry.totalPowerGeneration} W</b></span>
          <span>Bonus O₂ Capacity: <b>+{telemetry.bonusO2Capacity} L</b></span>
        </div>

        <p className="sci-empty-note">
          Select a structural module below to enter <b>Holographic Placement Mode</b>. Aim your crosshair across the Martian terrain (snaps to 4-meter grid) and click or press Space to build.
        </p>

        <div className="sci-craft-grid">
          {(["tunnel", "habitat", "solar_array"] as const).map((kind) => {
            const r = MODULE_RECIPES[kind];
            const isSelected = selectedKind === kind;
            const affordable =
              inventory.titanium >= r.titaniumCost &&
              inventory.iceCores >= r.iceCoreCost &&
              teamPower >= r.powerCost;

            return (
              <div
                key={kind}
                className={`sci-panel-card${isSelected ? " is-selected-blueprint" : ""}`}
              >
                <div className="sci-card-header">
                  <h3>{r.name}</h3>
                  {isSelected && <span className="sci-blueprint-badge">ACTIVE HOLOGRAM</span>}
                </div>
                <p>{r.description}</p>
                <div className="sci-cost-row">
                  <span>Ti {r.titaniumCost}</span>
                  {r.iceCoreCost > 0 && <span>Ice {r.iceCoreCost}</span>}
                  <span>Power {r.powerCost}%</span>
                  {r.powerOutput > 0 && <span>+{r.powerOutput} Power</span>}
                  {r.o2Bonus > 0 && <span>+{r.o2Bonus} O₂</span>}
                </div>
                <div className="sci-card-actions">
                  <button
                    type="button"
                    className={isSelected ? "sci-btn-accent" : "sci-btn-primary"}
                    disabled={!affordable && !isSelected}
                    onClick={() => onSelectKind(isSelected ? null : kind)}
                  >
                    {isSelected ? "Exit Placement" : affordable ? "Deploy Hologram [B]" : "Insufficient Resources"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {selectedKind && (
          <div className="sci-hologram-controls" role="status">
            <span>
              <b>Hologram Active:</b> {MODULE_RECIPES[selectedKind].name} · Move mouse to aim · Left Click to place
            </span>
            <button type="button" className="sci-btn-secondary" onClick={onRotatePreview}>
              Rotate 90° [R]
            </button>
            <button type="button" className="sci-btn-secondary" onClick={() => onSelectKind(null)}>
              Cancel [B]
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

