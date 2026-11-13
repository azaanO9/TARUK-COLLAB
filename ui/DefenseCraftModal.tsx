"use client";

import { useState } from "react";
import {
  DEFENSE_RECIPES,
  canCraftDefense,
  type BaseDefenseUnit,
  type CraftInventory,
  type DefenseKind,
} from "../game/baseDefenses";

type Props = {
  inventory: CraftInventory;
  teamPower: number;
  defenses: readonly BaseDefenseUnit[];
  playerX: number;
  playerZ: number;
  inCave: boolean;
  onDeploy: (kind: DefenseKind, x: number, z: number) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
};

export function DefenseCraftModal({
  inventory,
  teamPower,
  defenses,
  playerX,
  playerZ,
  inCave,
  onDeploy,
  onClose,
}: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCraft = async (kind: DefenseKind) => {
    if (inCave) {
      setFeedback("Return to Jezero surface to deploy solar-linked base defenses.");
      return;
    }
    const res = await onDeploy(kind, playerX, playerZ);
    if (res.ok) {
      setFeedback(`Deployed ${DEFENSE_RECIPES[kind].name} at (${Math.round(playerX)}, ${Math.round(playerZ)}).`);
    } else {
      setFeedback(res.error || "Unable to deploy unit.");
    }
  };

  return (
    <div className="mars-dialog-backdrop sci-backdrop">
      <section className="mars-dialog sci-modal sci-defense-modal" role="dialog" aria-modal="true" aria-label="Base Perimeter Defense Fabricator">
        <header className="sci-modal-head">
          <div>
            <p className="mars-kicker">OUTPOST ALPHA PERIMETER DEFENSE</p>
            <h2>Base Defense Fabricator</h2>
          </div>
          <button type="button" className="sci-close-btn" onClick={onClose}>✕</button>
        </header>

        <div className="sci-craft-stock">
          <span>Titanium: <b>{inventory.titanium}</b></span>
          <span>Cryo Ice Cores: <b>{inventory.iceCores}</b></span>
          <span>Base Solar Power: <b>{Math.round(teamPower)}%</b></span>
          <span>Deployed Units: <b>{defenses.length}</b></span>
        </div>

        <div className="sci-craft-grid">
          {(["laser_grid", "emp_emitter"] as const).map((kind) => {
            const r = DEFENSE_RECIPES[kind];
            const check = canCraftDefense(kind, inventory, teamPower);
            return (
              <div key={kind} className="sci-panel-card">
                <h3>{r.name}</h3>
                <p>{r.description}</p>
                <div className="sci-cost-row">
                  <span>Ti {r.titaniumCost}</span>
                  <span>Ice {r.iceCoreCost}</span>
                  <span>Power {r.powerCost}%</span>
                  <span>Radius {r.radius} m</span>
                </div>
                <button
                  type="button"
                  className="sci-btn-accent"
                  disabled={!check.ok || inCave}
                  onClick={() => void handleCraft(kind)}
                >
                  {inCave ? "Surface Deployment Only" : check.ok ? "Fabricate & Deploy Here" : check.reason}
                </button>
              </div>
            );
          })}
        </div>

        {feedback && <p className="sci-feedback-bar" role="status">{feedback}</p>}

        {defenses.length > 0 && (
          <div className="sci-deployed-list">
            <h4>ACTIVE SOLAR GRID PERIMETER UNITS</h4>
            {defenses.map((u) => (
              <div key={u.id} className="sci-room-row">
                <span>
                  <b>{u.kind === "emp_emitter" ? "EMP Emitter" : "Laser Grid"}</b> ({Math.round(u.x)}, {Math.round(u.z)}) · by {u.ownerCallsign}
                </span>
                <span className={u.active ? "sci-ready-yes" : "sci-ready-wait"}>
                  {u.active ? `ONLINE · ${u.radius}m` : "LOW POWER"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

