"use client";

import { useState } from "react";
import type { NetworkPlayerState, TradeResourceKind } from "../game/multiplayerTypes";

type Props = {
  selfPlayer: NetworkPlayerState;
  teammates: readonly NetworkPlayerState[];
  onTransfer: (toPlayerId: string, resource: TradeResourceKind, amount: number) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
};

const RESOURCE_OPTIONS: { id: TradeResourceKind; label: string; step: number }[] = [
  { id: "oxygen", label: "O₂ Canister (+10)", step: 10 },
  { id: "water", label: "Water Ration (+10)", step: 10 },
  { id: "powerCells", label: "Power Cell (+10)", step: 10 },
  { id: "iceCores", label: "Cryo Ice Core (+1)", step: 1 },
  { id: "titanium", label: "Titanium Ore (+1)", step: 1 },
];

export function TeamTradeModal({ selfPlayer, teammates, onTransfer, onClose }: Props) {
  const [recipientId, setRecipientId] = useState(teammates[0]?.id ?? "");
  const [status, setStatus] = useState<string | null>(null);

  const selected = teammates.find((t) => t.id === recipientId) ?? teammates[0];

  const sendItem = async (resource: TradeResourceKind, amount: number) => {
    if (!selected) return;
    const res = await onTransfer(selected.id, resource, amount);
    if (res.ok) {
      setStatus(`Sent ${amount} ${resource} to ${selected.callsign}.`);
    } else {
      setStatus(res.error || "Transfer failed.");
    }
  };

  return (
    <div className="mars-dialog-backdrop sci-backdrop">
      <section className="mars-dialog sci-modal sci-trade-modal" role="dialog" aria-modal="true" aria-label="Team Resource Trading">
        <header className="sci-modal-head">
          <div>
            <p className="mars-kicker">CREW LOGISTICS EXCHANGE</p>
            <h2>Team Resource Trading</h2>
          </div>
          <button type="button" className="sci-close-btn" onClick={onClose}>✕</button>
        </header>

        <div className="sci-craft-stock">
          <span>Your O₂: <b>{Math.round(selfPlayer.supplies.oxygen)}</b></span>
          <span>Water: <b>{Math.round(selfPlayer.supplies.water)}</b></span>
          <span>Power Cells: <b>{Math.round(selfPlayer.supplies.powerCells)}</b></span>
          <span>Ice/Ti: <b>{selfPlayer.supplies.iceCores}/{selfPlayer.supplies.titanium}</b></span>
        </div>

        {teammates.length === 0 ? (
          <p className="sci-empty-note">No other crewmates connected in this session yet. Share your room code so 2–4 astronauts can trade supplies!</p>
        ) : (
          <>
            <label className="sci-recipient-select">
              RECIPIENT ASTRONAUT
              <select value={selected?.id ?? ""} onChange={(e) => setRecipientId(e.target.value)}>
                {teammates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.patch} {t.callsign} (O₂ {Math.round(t.supplies.oxygen)} · PWR {Math.round(t.supplies.powerCells)} · SUIT {Math.round(t.supplies.suitIntegrity)})
                  </option>
                ))}
              </select>
            </label>

            <div className="sci-trade-grid">
              {RESOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="sci-btn-primary"
                  disabled={(selfPlayer.supplies[opt.id] ?? 0) < opt.step || !selected}
                  onClick={() => void sendItem(opt.id, opt.step)}
                >
                  Send {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        {status && <p className="sci-feedback-bar" role="status">{status}</p>}
      </section>
    </div>
  );
}

