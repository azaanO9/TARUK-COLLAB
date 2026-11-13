"use client";

import { useState } from "react";
import {
  type RoverUpgradeId,
  ROVER_UPGRADES,
  canPurchaseRoverUpgrade,
} from "../game/roverUpgrades";

type Props = {
  installedUpgrades: readonly RoverUpgradeId[];
  inventory: { titanium: number; iceCores: number };
  teamPower: number;
  roverSpeed: number;
  roverGear: string;
  onUpgrade: (id: RoverUpgradeId) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
};

export function GarageModal({
  installedUpgrades,
  inventory,
  teamPower,
  roverSpeed,
  roverGear,
  onUpgrade,
  onClose,
}: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleApply = async (id: RoverUpgradeId) => {
    const res = await onUpgrade(id);
    if (res.ok) {
      setFeedback(`Successfully installed ${ROVER_UPGRADES[id].name}!`);
    } else {
      setFeedback(res.error || "Unable to install upgrade.");
    }
  };

  return (
    <div className="mars-dialog-backdrop sci-backdrop">
      <section
        className="mars-dialog sci-modal sci-garage-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Ares Vehicle Maintenance and Upgrade Bay"
      >
        <header className="sci-modal-head">
          <div>
            <p className="mars-kicker">OUTPOST ALPHA · VEHICLE REPAIR &amp; TUNING BAY</p>
            <h2>Exploration Rover Modification Station</h2>
          </div>
          <button type="button" className="sci-close-btn" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="sci-craft-stock">
          <span>Titanium: <b>{inventory.titanium}</b></span>
          <span>Cryo Ice Cores: <b>{inventory.iceCores}</b></span>
          <span>Base Solar Power: <b>{Math.round(teamPower)}%</b></span>
          <span>Installed Upgrades: <b>{installedUpgrades.length}/3</b></span>
          <span>Vehicle Speed: <b>{roverSpeed} KM/H</b></span>
          <span>Transmission: <b>GEAR {roverGear}</b></span>
        </div>

        <div className="sci-craft-grid">
          {(["mud_tires", "heavy_winch", "robotic_arm"] as const).map((id) => {
            const def = ROVER_UPGRADES[id];
            const isInstalled = installedUpgrades.includes(id);
            const check = canPurchaseRoverUpgrade(id, installedUpgrades, inventory, teamPower);

            return (
              <div
                key={id}
                className={`sci-panel-card${isInstalled ? " is-installed-card" : ""}`}
              >
                <div className="sci-card-header">
                  <span className="sci-card-icon">{def.icon}</span>
                  <h3>{def.name}</h3>
                </div>
                <p>{def.description}</p>
                <div className="sci-cost-row">
                  <span>Ti {def.titaniumCost}</span>
                  {def.iceCoreCost > 0 && <span>Ice {def.iceCoreCost}</span>}
                  <span>Power {def.powerCost}%</span>
                </div>
                <button
                  type="button"
                  className={isInstalled ? "sci-btn-installed" : "sci-btn-accent"}
                  disabled={isInstalled || !check.ok}
                  onClick={() => void handleApply(id)}
                >
                  {isInstalled ? "✓ ONLINE IN CHASSIS" : check.ok ? "Fabricate & Install" : check.reason}
                </button>
              </div>
            );
          })}
        </div>

        {feedback && <p className="sci-feedback-bar" role="status">{feedback}</p>}
      </section>
    </div>
  );
}

