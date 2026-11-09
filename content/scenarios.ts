import type { Scenario } from "../game/types.ts";

// EDUCATIONAL ASSUMPTIONS: every number is invented for game balance.
// These points are not physical quantities or NASA operating limits.
export const MISSION = {
  totalShifts: 6,
  scienceGoal: 3,
  capacity: 100,
  initialResources: { power: 60, water: 70, oxygen: 80 },
  shiftNames: [
    "A dusty arrival",
    "Water works",
    "Room to breathe",
    "Into the shadow",
    "A curious discovery",
    "Homeward signal",
  ],
} as const;

// Only shift 1 is authored. Adding scenarios unlocks subsequent shifts in order.
export const SCENARIOS: readonly Scenario[] = [
  {
    id: "dusty-arrival",
    title: "A dusty arrival",
    situation:
      "Your lander kicked up Moon dust. Now it covers the solar panels, and your outpost needs a plan.",
    question: "What will your crew do first?",
    choices: [
      {
        id: "clean-panels",
        title: "Brush off the panels",
        description: "Take a spacewalk to help the panels catch sunlight.",
        icon: "sun",
        focus: "power",
        delta: { power: 18, water: -8, oxygen: -6 },
        science: 0,
        consequence: {
          title: "A brighter start!",
          explanation:
            "Your crew cleared the dust. The panels can catch more sunlight, so your stored power rises. The spacewalk used water and oxygen from your supplies.",
          lesson:
            "Looking after equipment can restore one resource while using others.",
        },
      },
      {
        id: "recycle-water",
        title: "Run the water recycler",
        description: "Use stored power to turn used water into clean water.",
        icon: "water",
        focus: "water",
        delta: { power: -12, water: 20, oxygen: -4 },
        science: 0,
        consequence: {
          title: "Every drop counts!",
          explanation:
            "The recycler cleaned used water for your crew. Your water supply grows, but the machine needed power. Your crew also used some oxygen during the shift.",
          lesson:
            "Recycling helps supplies last longer, but the machines need energy.",
        },
      },
      {
        id: "scan-rocks",
        title: "Send the science rover",
        description: "Study a nearby Moon rock and collect one science sample.",
        icon: "science",
        focus: "science",
        delta: { power: -16, water: -6, oxygen: -8 },
        science: 1,
        consequence: {
          title: "One small rock. One big discovery.",
          explanation:
            "Your rover studied a rock and sent back useful data. You earned a science sample! The rover used power while your crew used water and oxygen to support the trip.",
          lesson:
            "Science brings discoveries. Planning supplies makes exploration possible.",
        },
      },
    ],
  },
];
