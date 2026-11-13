/** RPG-lite Crew Specialization (Skill Trees): Engineering, Botany, Astrogation, XP leveling, and active passive modifiers. */

export type SkillBranchId = "engineering" | "botany" | "astrogation";

export type SkillNodeId =
  | "eng_1_rapid_fab"
  | "eng_2_fortification"
  | "eng_3_overcharge"
  | "bot_1_hydro_opt"
  | "bot_2_closed_loop"
  | "bot_3_spore_shield"
  | "ast_1_efficient_drive"
  | "ast_2_deep_sonar"
  | "ast_3_pathfinder";

export type SkillNode = {
  id: SkillNodeId;
  branch: SkillBranchId;
  tier: 1 | 2 | 3;
  name: string;
  shortDesc: string;
  detail: string;
  cost: number;
  prerequisiteId?: SkillNodeId;
  icon: string;
};

export const SKILL_TREE: Record<SkillNodeId, SkillNode> = {
  // Engineering branch
  eng_1_rapid_fab: {
    id: "eng_1_rapid_fab",
    branch: "engineering",
    tier: 1,
    name: "Rapid Fabrication",
    shortDesc: "Station interactions & repairs are 40% faster.",
    detail: "Accelerates robotic tool calibration and maintenance drills across all Outpost Alpha facilities.",
    cost: 1,
    icon: "🔧",
  },
  eng_2_fortification: {
    id: "eng_2_fortification",
    branch: "engineering",
    tier: 2,
    name: "Structural Fortification",
    shortDesc: "Perimeter Laser Grids & EMP Emitters gain +50% range.",
    detail: "Enhances optical collimators and pulse spires to repel Martian Stalkers from greater distances.",
    cost: 1,
    prerequisiteId: "eng_1_rapid_fab",
    icon: "🛡️",
  },
  eng_3_overcharge: {
    id: "eng_3_overcharge",
    branch: "engineering",
    tier: 3,
    name: "Overcharged Grid",
    shortDesc: "Modules draw 30% less power; solar panels output +25% wattage.",
    detail: "Superconducting busbars minimize line loss throughout all base modules and conduits.",
    cost: 2,
    prerequisiteId: "eng_2_fortification",
    icon: "⚡",
  },

  // Botany branch
  bot_1_hydro_opt: {
    id: "bot_1_hydro_opt",
    branch: "botany",
    tier: 1,
    name: "Hydroponic Optimization",
    shortDesc: "Hydroponic greenhouse food output increased by 50%.",
    detail: "Fine-tunes LED spectral ratios and aeroponic nutrient feeds to accelerate spirulina and potato growth.",
    cost: 1,
    icon: "🌱",
  },
  bot_2_closed_loop: {
    id: "bot_2_closed_loop",
    branch: "botany",
    tier: 2,
    name: "Closed-Loop Recovery",
    shortDesc: "Crew water consumption reduced by 35%.",
    detail: "Advanced moisture condensing coils reclaim 96% of respiration humidity inside the Habitat.",
    cost: 1,
    prerequisiteId: "bot_1_hydro_opt",
    icon: "💧",
  },
  bot_3_spore_shield: {
    id: "bot_3_spore_shield",
    branch: "botany",
    tier: 3,
    name: "Biosphere Morale Shield",
    shortDesc: "Morale decay completely halted; storm stress reduced by 50%.",
    detail: "Aromatherapy terpenes and lush green canopy relieve psychological isolation on the Martian surface.",
    cost: 2,
    prerequisiteId: "bot_2_closed_loop",
    icon: "🌿",
  },

  // Astrogation branch
  ast_1_efficient_drive: {
    id: "ast_1_efficient_drive",
    branch: "astrogation",
    tier: 1,
    name: "Efficient Inverters",
    shortDesc: "Rover power & battery drain reduced by 40%.",
    detail: "Field-oriented motor controllers recover kinetic energy during deceleration down crater slopes.",
    cost: 1,
    icon: "🔋",
  },
  ast_2_deep_sonar: {
    id: "ast_2_deep_sonar",
    branch: "astrogation",
    tier: 2,
    name: "Deep-Penetration Sonar",
    shortDesc: "Tactical radar and Ice Cave sonar range doubled (30m → 60m).",
    detail: "Emits low-frequency seismic pulses that pinpoint Titanium veins and cavern crystal deposits.",
    cost: 1,
    prerequisiteId: "ast_1_efficient_drive",
    icon: "📡",
  },
  ast_3_pathfinder: {
    id: "ast_3_pathfinder",
    branch: "astrogation",
    tier: 3,
    name: "Martian Pathfinder",
    shortDesc: "Walking speed +25%; rover max speed +20% with drift stabilization.",
    detail: "Mastery of low-gravity locomotion and regolith drift physics gives unparalleled field mobility.",
    cost: 2,
    prerequisiteId: "ast_2_deep_sonar",
    icon: "🧭",
  },
};

export const XP_PER_EVENT = {
  station_complete: 120,
  mineral_mined: 45,
  sol_survived: 150,
  storm_survived: 100,
  module_built: 80,
  defense_deployed: 60,
  rover_upgraded: 90,
} as const;

export function getXpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  // Level 2: 150, Level 3: 350, Level 4: 600, Level 5: 900, Level 6: 1300, etc.
  return Math.round(50 * Math.pow(level, 1.85));
}

export type PlayerProgressState = {
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressRatio: number;
  availablePoints: number;
  spentPoints: number;
  unlockedSkills: SkillNodeId[];
};

export function calculatePlayerProgress(
  totalXp: number,
  unlockedSkills: readonly SkillNodeId[],
): PlayerProgressState {
  let level = 1;
  while (totalXp >= getXpThresholdForLevel(level + 1)) {
    level++;
  }
  const currentThreshold = getXpThresholdForLevel(level);
  const nextThreshold = getXpThresholdForLevel(level + 1);
  const currentLevelXp = totalXp - currentThreshold;
  const neededXp = Math.max(1, nextThreshold - currentThreshold);
  const progressRatio = Math.min(1, Math.max(0, currentLevelXp / neededXp));

  // 1 skill point awarded per level-up
  const totalEarnedPoints = Math.max(0, level - 1);
  let spentPoints = 0;
  for (const id of unlockedSkills) {
    if (SKILL_TREE[id]) {
      spentPoints += SKILL_TREE[id].cost;
    }
  }
  const availablePoints = Math.max(0, totalEarnedPoints - spentPoints);

  return {
    totalXp,
    level,
    currentLevelXp,
    nextLevelXp: neededXp,
    progressRatio,
    availablePoints,
    spentPoints,
    unlockedSkills: [...unlockedSkills],
  };
}

export function canUnlockSkill(
  skillId: SkillNodeId,
  unlocked: readonly SkillNodeId[],
  availablePoints: number,
): { ok: true } | { ok: false; reason: string } {
  if (unlocked.includes(skillId)) {
    return { ok: false, reason: "Skill already unlocked." };
  }
  const node = SKILL_TREE[skillId];
  if (!node) {
    return { ok: false, reason: "Unknown skill." };
  }
  if (availablePoints < node.cost) {
    return { ok: false, reason: `Requires ${node.cost} Skill Points (have ${availablePoints}).` };
  }
  if (node.prerequisiteId && !unlocked.includes(node.prerequisiteId)) {
    const prereq = SKILL_TREE[node.prerequisiteId];
    return { ok: false, reason: `Requires prerequisite: ${prereq?.name ?? node.prerequisiteId}` };
  }
  return { ok: true };
}

// Active perk multipliers calculated from unlocked skills
export function getActivePerks(skills: readonly SkillNodeId[]) {
  const set = new Set(skills);
  return {
    repairSpeedMultiplier: set.has("eng_1_rapid_fab") ? 1.4 : 1.0,
    defenseRadiusMultiplier: set.has("eng_2_fortification") ? 1.5 : 1.0,
    gridEfficiencyMultiplier: set.has("eng_3_overcharge") ? 1.25 : 1.0,
    foodYieldMultiplier: set.has("bot_1_hydro_opt") ? 1.5 : 1.0,
    waterDrainMultiplier: set.has("bot_2_closed_loop") ? 0.65 : 1.0,
    moraleImmunity: set.has("bot_3_spore_shield"),
    roverPowerEfficiency: set.has("ast_1_efficient_drive") ? 0.6 : 1.0,
    radarRangeMultiplier: set.has("ast_2_deep_sonar") ? 2.0 : 1.0,
    walkSpeedMultiplier: set.has("ast_3_pathfinder") ? 1.25 : 1.0,
    roverSpeedMultiplier: set.has("ast_3_pathfinder") ? 1.2 : 1.0,
  };
}

