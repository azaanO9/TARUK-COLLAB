"use client";

import { useState } from "react";
import {
  type SkillBranchId,
  type SkillNodeId,
  SKILL_TREE,
  calculatePlayerProgress,
  canUnlockSkill,
} from "../game/crewSkills";

type Props = {
  callsign: string;
  totalXp: number;
  unlockedSkills: readonly SkillNodeId[];
  onUnlockSkill: (id: SkillNodeId) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
};

const BRANCHES: { id: SkillBranchId; label: string; icon: string; kicker: string }[] = [
  { id: "engineering", label: "Engineering & Defense", icon: "⚙️", kicker: "INFRASTRUCTURE & WEAPON SYSTEMS" },
  { id: "botany", label: "Botany & Biosphere", icon: "🌿", kicker: "LIFE SUPPORT & HYDROPONICS" },
  { id: "astrogation", label: "Astrogation & Vehicles", icon: "🧭", kicker: "TRAVERSAL & RADAR SENSORS" },
];

export function SkillTreeModal({
  callsign,
  totalXp,
  unlockedSkills,
  onUnlockSkill,
  onClose,
}: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const progress = calculatePlayerProgress(totalXp, unlockedSkills);

  const handleUnlock = async (id: SkillNodeId) => {
    const res = await onUnlockSkill(id);
    if (res.ok) {
      setFeedback(`Specialization unlocked: ${SKILL_TREE[id].name}!`);
    } else {
      setFeedback(res.error || "Unable to unlock skill.");
    }
  };

  return (
    <div className="mars-dialog-backdrop sci-backdrop">
      <section
        className="mars-dialog sci-modal sci-skill-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Crew Specialization & Skill Trees"
      >
        <header className="sci-modal-head">
          <div>
            <p className="mars-kicker">ARES CREW SPECIALIZATION · RPG LAYER</p>
            <h2>Astronaut Skill Trees</h2>
          </div>
          <button type="button" className="sci-close-btn" onClick={onClose}>
            ✕
          </button>
        </header>

        {/* Level and XP bar */}
        <div className="sci-skill-header">
          <div className="sci-rank-badge">
            <span className="sci-rank-lvl">LVL {progress.level}</span>
            <strong className="sci-rank-name">{callsign}</strong>
          </div>
          <div className="sci-xp-track">
            <div className="sci-xp-labels">
              <span>EXP: {progress.currentLevelXp} / {progress.nextLevelXp} XP (Total: {progress.totalXp})</span>
              <span>Available Skill Points: <b className="sci-sp-count">{progress.availablePoints} SP</b></span>
            </div>
            <div className="sci-xp-meter">
              <div
                className="sci-xp-fill"
                style={{ width: `${Math.round(progress.progressRatio * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3 Skill Branches */}
        <div className="sci-skill-columns">
          {BRANCHES.map((b) => {
            const branchNodes = (Object.keys(SKILL_TREE) as SkillNodeId[])
              .map((id) => SKILL_TREE[id])
              .filter((node) => node.branch === b.id)
              .sort((a, bNode) => a.tier - bNode.tier);

            return (
              <div key={b.id} className="sci-skill-branch">
                <div className="sci-branch-mast">
                  <span className="sci-branch-icon">{b.icon}</span>
                  <div>
                    <span className="sci-branch-kicker">{b.kicker}</span>
                    <h3>{b.label}</h3>
                  </div>
                </div>

                <div className="sci-branch-nodes">
                  {branchNodes.map((node) => {
                    const isUnlocked = unlockedSkills.includes(node.id);
                    const check = canUnlockSkill(node.id, unlockedSkills, progress.availablePoints);

                    return (
                      <div
                        key={node.id}
                        className={`sci-skill-node tier-${node.tier}${
                          isUnlocked ? " is-unlocked" : check.ok ? " is-ready" : " is-locked"
                        }`}
                      >
                        <div className="sci-node-head">
                          <span className="sci-node-icon">{node.icon}</span>
                          <div>
                            <span className="sci-node-tier">TIER {node.tier} · {node.cost} SP</span>
                            <h4>{node.name}</h4>
                          </div>
                        </div>
                        <p className="sci-node-desc">{node.shortDesc}</p>
                        <small className="sci-node-detail">{node.detail}</small>

                        <div className="sci-node-footer">
                          {isUnlocked ? (
                            <span className="sci-unlocked-tag">✓ ACTIVE SPECIALIZATION</span>
                          ) : (
                            <button
                              type="button"
                              className="sci-btn-accent"
                              disabled={!check.ok}
                              onClick={() => void handleUnlock(node.id)}
                            >
                              {check.ok ? `Unlock · ${node.cost} SP` : check.reason}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {feedback && <p className="sci-feedback-bar" role="status">{feedback}</p>}
      </section>
    </div>
  );
}

