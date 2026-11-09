import type { Scenario } from "../game/types.ts";

// EDUCATIONAL ASSUMPTIONS: every number below is invented for game balance and teaching.
// These are not real NASA mission telemetry or physical engineering formulas.

export interface SatelliteComponent {
  id: string;
  name: string;
  category: "solar" | "battery" | "antenna" | "payload";
  costMillion: number;
  massKg: number;
  shortDescription: string;
  tradeOffWhy: string;
  tradeOffCatch: string;
  statLabel: string;
  statValue: string;
  // Starting values or modifiers
  batteryBonus?: number;
  dataBufferMax?: number;
  downlinkBonus?: number;
}

export const DOWNLINK_BUDGET_LIMIT = 100; // $100 Million
export const DOWNLINK_MASS_LIMIT = 100; // 100 kg launcher payload limit

export const SATELLITE_COMPONENTS: Record<string, SatelliteComponent[]> = {
  solar: [
    {
      id: "solar-compact",
      name: "Compact Solar Wings",
      category: "solar",
      costMillion: 18,
      massKg: 16,
      shortDescription: "Fixed dual solar wings with standard silicon cells.",
      tradeOffWhy: "Low cost and light weight leave budget and mass for heavier payloads.",
      tradeOffCatch: "Recharges battery more slowly when leaving lunar shadow.",
      statLabel: "Sun Recharge",
      statValue: "+18% per sun pass",
    },
    {
      id: "solar-deployable",
      name: "Deployable Triple-Junction Panels",
      category: "solar",
      costMillion: 28,
      massKg: 24,
      shortDescription: "Gimbaled high-efficiency photovoltaic wings.",
      tradeOffWhy: "Strong, reliable power generation that tracks the Sun automatically.",
      tradeOffCatch: "Moderate cost and mass require balanced component choices.",
      statLabel: "Sun Recharge",
      statValue: "+24% per sun pass",
    },
    {
      id: "solar-sails",
      name: "Ultra-Tracking Solar Sails",
      category: "solar",
      costMillion: 38,
      massKg: 32,
      shortDescription: "Expansive flexible solar arrays with maximum surface area.",
      tradeOffWhy: "Fastest battery recharge; keeps power high even in grazing light.",
      tradeOffCatch: "Heavy and expensive, leaving tight budget for science sensors.",
      statLabel: "Sun Recharge",
      statValue: "+30% per sun pass",
    },
  ],
  battery: [
    {
      id: "battery-lithium",
      name: "Standard Lithium Pack",
      category: "battery",
      costMillion: 16,
      massKg: 15,
      shortDescription: "Reliable space-rated lithium battery pack.",
      tradeOffWhy: "Lightweight and affordable for tight launch budgets.",
      tradeOffCatch: "Lower starting charge; runs low during extended shadow passes.",
      statLabel: "Starting Charge",
      statValue: "60% Battery",
      batteryBonus: 60,
    },
    {
      id: "battery-advanced",
      name: "Advanced Solid-State Battery",
      category: "battery",
      costMillion: 26,
      massKg: 22,
      shortDescription: "Cold-resistant solid-state cells with ceramic insulation.",
      tradeOffWhy: "High starting charge that survives extreme lunar eclipse cold.",
      tradeOffCatch: "Costs more credits, requiring savings elsewhere.",
      statLabel: "Starting Charge",
      statValue: "75% Battery",
      batteryBonus: 75,
    },
    {
      id: "battery-cryo",
      name: "Heavy Deep-Space Cryo Bank",
      category: "battery",
      costMillion: 36,
      massKg: 30,
      shortDescription: "Massive thermal-jacketed battery bank.",
      tradeOffWhy: "Maximum safety reserve; your satellite will almost never run out of juice.",
      tradeOffCatch: "Very heavy! Uses nearly a third of your rocket mass limit.",
      statLabel: "Starting Charge",
      statValue: "90% Battery",
      batteryBonus: 90,
    },
  ],
  antenna: [
    {
      id: "antenna-omni",
      name: "Low-Gain Omni Whip",
      category: "antenna",
      costMillion: 12,
      massKg: 10,
      shortDescription: "Broad-coverage dipole whip antenna.",
      tradeOffWhy: "Ultra-light and cheap; does not need precise pointing at Earth.",
      tradeOffCatch: "Slow downlink speed; delivers data in smaller packets.",
      statLabel: "Downlink Speed",
      statValue: "15 MB/pass",
      downlinkBonus: 1,
    },
    {
      id: "antenna-dish",
      name: "Steerable Parabolic Dish",
      category: "antenna",
      costMillion: 26,
      massKg: 20,
      shortDescription: "High-gain motorized reflector dish for Deep Space Network.",
      tradeOffWhy: "Fast data rates to Earth; high-throughput science return.",
      tradeOffCatch: "Needs careful attitude pointing and uses more transmitter power.",
      statLabel: "Downlink Speed",
      statValue: "30 MB/pass",
      downlinkBonus: 2,
    },
    {
      id: "antenna-laser",
      name: "Optical Laser Transceiver",
      category: "antenna",
      costMillion: 38,
      massKg: 28,
      shortDescription: "Pulsed near-infrared laser communication system.",
      tradeOffWhy: "Huge bandwidth! Can beam massive chunks of stored data instantly.",
      tradeOffCatch: "Premium price and heavy mass; requires high transmitter energy.",
      statLabel: "Downlink Speed",
      statValue: "50 MB/pass",
      downlinkBonus: 3,
    },
  ],
  payload: [
    {
      id: "payload-camera",
      name: "High-Res Lunar Camera",
      category: "payload",
      costMillion: 16,
      massKg: 14,
      shortDescription: "Multi-angle optical mapping camera with zoom lenses.",
      tradeOffWhy: "Economical and light; maps landing sites and surface boulders.",
      tradeOffCatch: "Only works in illuminated areas; cannot see through shadows.",
      statLabel: "Science Output",
      statValue: "20 MB/scan",
      dataBufferMax: 60,
    },
    {
      id: "payload-spectral",
      name: "Multispectral Mineral Scanner",
      category: "payload",
      costMillion: 26,
      massKg: 22,
      shortDescription: "Infrared and ultraviolet spectrometer to detect water ice.",
      tradeOffWhy: "Detects ice and valuable metals hidden in crater shadows.",
      tradeOffCatch: "Moderate mass and higher power draw per scan.",
      statLabel: "Science Output",
      statValue: "30 MB/scan",
      dataBufferMax: 80,
    },
    {
      id: "payload-radar",
      name: "Subsurface Ice Sounding Radar",
      category: "payload",
      costMillion: 36,
      massKg: 28,
      shortDescription: "Dual-dipole ground-penetrating radar array.",
      tradeOffWhy: "Discovers underground ice layers deep below lunar dust.",
      tradeOffCatch: "Highest cost and mass; uses heavy power during active pulses.",
      statLabel: "Science Output",
      statValue: "40 MB/scan",
      dataBufferMax: 100,
    },
  ],
};

export interface BenchmarkDesign {
  id: string;
  name: string;
  tagline: string;
  components: {
    solar: string;
    battery: string;
    antenna: string;
    payload: string;
  };
  costMillion: number;
  massKg: number;
  expectedReturnedData: number;
  highlight: string;
}

export const BENCHMARK_DESIGNS: BenchmarkDesign[] = [
  {
    id: "benchmark-scout",
    name: "The Swift Scout",
    tagline: "Ultra-light, low-cost baseline orbiter",
    components: {
      solar: "Compact Solar Wings",
      battery: "Standard Lithium Pack",
      antenna: "Low-Gain Omni Whip",
      payload: "High-Res Lunar Camera",
    },
    costMillion: 62,
    massKg: 55,
    expectedReturnedData: 2,
    highlight: "Saves money and weight, but struggles to downlink large files quickly.",
  },
  {
    id: "benchmark-relay",
    name: "The Deep Ice Relay",
    tagline: "High-bandwidth ice detection powerhouse",
    components: {
      solar: "Deployable Triple-Junction Panels",
      battery: "Advanced Solid-State Battery",
      antenna: "Steerable Parabolic Dish",
      payload: "Multispectral Mineral Scanner",
    },
    costMillion: 106, // intentionally shows near or slightly above budget to teach trade-offs
    massKg: 88,
    expectedReturnedData: 3,
    highlight: "Balanced workhorse with strong downlink capacity and science return.",
  },
  {
    id: "benchmark-laser",
    name: "The Optical Speedster",
    tagline: "Cutting-edge laser downlink platform",
    components: {
      solar: "Deployable Triple-Junction Panels",
      battery: "Advanced Solid-State Battery",
      antenna: "Optical Laser Transceiver",
      payload: "High-Res Lunar Camera",
    },
    costMillion: 108,
    massKg: 88,
    expectedReturnedData: 4,
    highlight: "Blazing fast downlink speed empties data buffers in a single pass.",
  },
];

export const DOWNLINK_MISSION = {
  totalShifts: 6,
  scienceGoal: 3, // At least 3 returned data packages
  capacity: 100, // 100 points maximum for battery and stored data
  initialResources: { power: 70, water: 20, oxygen: 80 }, // power = battery %, water = stored data MB, oxygen = link signal %
  shiftNames: [
    "Orbit 1 · Orbit Insertion & Sun Lock",
    "Orbit 2 · Far-Side Radio Shadow",
    "Orbit 3 · Lunar Eclipse & Cold Pass",
    "Orbit 4 · Earth Downlink Window",
    "Orbit 5 · Polar Crater Ice Survey",
    "Orbit 6 · Grand Downlink & Final Relay",
  ],
} as const;

export const DOWNLINK_SCENARIOS: readonly Scenario[] = [
  {
    id: "orbit-1",
    title: "Orbit 1 · Orbit Insertion & Sun Lock",
    situation:
      "Downlink has fired its braking thruster and settled into a polar lunar orbit. Sunlight streams across the spacecraft, but sensors report slight attitude wobble.",
    question: "How will you orient your satellite on its first orbit?",
    choices: [
      {
        id: "sun-lock",
        title: "Lock solar panels to the Sun",
        description: "Point solar panels directly at sunlight to charge your battery.",
        icon: "sun",
        focus: "power",
        delta: { power: 22, water: 0, oxygen: -4 },
        science: 0,
        consequence: {
          title: "Batteries topped up!",
          explanation:
            "Your solar panels tracked the bright Sun, topping up your battery storage. Your attitude thrusters burned a small amount of propellant to steady the spin.",
          lesson:
            "Satellites need power before anything else. Charging your battery early prepares you for cold shadows.",
        },
      },
      {
        id: "first-scan",
        title: "Run initial camera & sensor test",
        description: "Snap calibration pictures of the sunlit lunar highlands.",
        icon: "water",
        focus: "water",
        delta: { power: -14, water: 28, oxygen: -6 },
        science: 0,
        consequence: {
          title: "First images saved to memory!",
          explanation:
            "Your instruments captured crisp test images of craters and saved 28 MB of data into your memory buffer. The sensor processors drew moderate battery power.",
          lesson:
            "Gathering science data fills your onboard memory buffer. You will need to downlink it later to score science!",
        },
      },
      {
        id: "ping-earth",
        title: "Downlink telemetry beacon home",
        description: "Beam a high-frequency status greeting back to Earth.",
        icon: "science",
        focus: "science",
        delta: { power: -16, water: -15, oxygen: -6 },
        science: 1,
        consequence: {
          title: "Earth confirms receipt: First data delivered!",
          explanation:
            "Mission control on Earth received your telemetry and confirmed all satellite systems are healthy! That counts as your first returned data package.",
          lesson:
            "Downlinking sends data across 384,000 kilometers of space. It uses battery power, but gets findings safely to Earth.",
        },
      },
    ],
  },
  {
    id: "orbit-2",
    title: "Orbit 2 · Far-Side Radio Shadow",
    situation:
      "Downlink passes behind the Moon! 3,474 kilometers of solid lunar rock completely blocks radio contact with Earth. You are on your own.",
    question: "What will you do during the far-side radio silence?",
    choices: [
      {
        id: "far-side-survey",
        title: "Scan South Pole-Aitken Basin",
        description: "Use your science sensors to scan the gigantic far-side impact basin.",
        icon: "water",
        focus: "water",
        delta: { power: -18, water: 32, oxygen: -4 },
        science: 0,
        consequence: {
          title: "High-value far-side data stored!",
          explanation:
            "Your sensors mapped ancient impact ridges hidden from Earth's view, storing 32 MB of valuable data. The deep scan used a chunk of your battery.",
          lesson:
            "Because the Moon keeps the same face to Earth, the far side can only be studied from orbit when the satellite is out of contact.",
        },
      },
      {
        id: "far-side-drift",
        title: "Standby drift to save energy",
        description: "Shut down active instruments and coast smoothly through orbit.",
        icon: "sun",
        focus: "power",
        delta: { power: 6, water: 0, oxygen: -2 },
        science: 0,
        consequence: {
          title: "Energy conserved safely.",
          explanation:
            "With instruments in quiet standby, stray solar reflection trickled a small charge into your battery with minimal wear on satellite systems.",
          lesson:
            "Sometimes coasting is the smart engineering move when you anticipate heavy operations ahead.",
        },
      },
      {
        id: "relay-outpost",
        title: "Relay short burst to lunar outpost",
        description: "Angle your transmitter down to the surface base before disappearing.",
        icon: "science",
        focus: "science",
        delta: { power: -15, water: -18, oxygen: -8 },
        science: 1,
        consequence: {
          title: "Lunar base receives surface map!",
          explanation:
            "The lunar habitat dish picked up your transmission just before line-of-sight broke. 18 MB of stored data was downlinked and converted into a science package!",
          lesson:
            "Orbital relays allow surface astronauts to communicate and receive tactical navigation maps.",
        },
      },
    ],
  },
  {
    id: "orbit-3",
    title: "Orbit 3 · Lunar Eclipse & Cold Pass",
    situation:
      "Downlink slips into the Moon's long shadow. The temperature plummets to -130°C and your solar panels cannot generate a single watt.",
    question: "How will you manage power and thermal balance in the cold?",
    choices: [
      {
        id: "run-heaters",
        title: "Activate battery thermal heaters",
        description: "Keep battery cells and electronics warm to prevent freeze damage.",
        icon: "sun",
        focus: "power",
        delta: { power: -10, water: 0, oxygen: 10 },
        science: 0,
        consequence: {
          title: "Systems kept warm and healthy!",
          explanation:
            "Thermostatic heaters protected the sensitive battery electrolyte and radio circuits from the deep chill, preserving full signal health.",
          lesson:
            "Extreme space cold can permanently degrade batteries. Thermal control keeps space hardware alive.",
        },
      },
      {
        id: "shadow-infrared",
        title: "Infrared thermal scan of dark craters",
        description: "Measure heat retained by rocks in permanently shadowed craters.",
        icon: "water",
        focus: "water",
        delta: { power: -16, water: 24, oxygen: -6 },
        science: 0,
        consequence: {
          title: "Thermal signatures recorded!",
          explanation:
            "Your infrared sensors mapped rock heat retention, adding 24 MB of new observations to your memory buffer. The sensor draw depleted battery reserve in the dark.",
          lesson:
            "Rocks retain heat differently than fine dust. Infrared sensors can detect hidden rock fields in the pitch black.",
        },
      },
      {
        id: "deep-sleep",
        title: "Minimal power safe mode",
        description: "Shut off all non-vital circuits and let thermal blankets do the work.",
        icon: "sun",
        focus: "power",
        delta: { power: -5, water: 0, oxygen: -4 },
        science: 0,
        consequence: {
          title: "Exited shadow with battery intact!",
          explanation:
            "Your satellite drifted quietly through the cold shadow, losing only 5% of its stored battery before sunlight broke over the horizon.",
          lesson:
            "Knowing when to sleep is just as important as knowing when to transmit.",
        },
      },
    ],
  },
  {
    id: "orbit-4",
    title: "Orbit 4 · Earth Downlink Window",
    situation:
      "Line-of-sight with Earth opens wide! NASA's Goldstone Deep Space Network dish is locked onto Downlink's radio beacon with clear skies.",
    question: "This is your prime downlink window. What is your command?",
    choices: [
      {
        id: "high-gain-downlink",
        title: "High-power science downlink to Earth",
        description: "Power up your main transmitter to beam a massive batch of stored data.",
        icon: "science",
        focus: "science",
        delta: { power: -22, water: -35, oxygen: -6 },
        science: 1,
        consequence: {
          title: "Huge data transfer: Earth scientists cheering!",
          explanation:
            "Your transmitter beamed 35 MB of stored data across the void. Earth ground stations confirmed a 100% clean reception, earning another science package!",
          lesson:
            "Downlinking stored data frees up memory space and guarantees that your science isn't lost if something goes wrong later.",
        },
      },
      {
        id: "sun-recharge-and-trickle",
        title: "Recharge panels with trickle downlink",
        description: "Angle panels to full sunlight while sending a modest data stream.",
        icon: "sun",
        focus: "power",
        delta: { power: 18, water: -14, oxygen: -4 },
        science: 1,
        consequence: {
          title: "Battery replenished while returning data!",
          explanation:
            "You angled into bright sunlight, gaining 18% battery charge while still beaming 14 MB of data home to earn a science package.",
          lesson:
            "Multi-tasking orbital maneuvers lets you rebuild reserves without missing a downlink window completely.",
        },
      },
      {
        id: "double-survey",
        title: "Continue scanning surface features",
        description: "Prioritize gathering more sensor observations over transmitting.",
        icon: "water",
        focus: "water",
        delta: { power: -18, water: 30, oxygen: -6 },
        science: 0,
        consequence: {
          title: "Memory buffer almost full!",
          explanation:
            "You captured dramatic imagery of the Copernicus crater crater-rim, packing 30 MB more into storage. But your memory is getting crowded!",
          lesson:
            "If your memory buffer gets too full, you won't be able to store new discoveries. You must downlink to make room.",
        },
      },
    ],
  },
  {
    id: "orbit-5",
    title: "Orbit 5 · Polar Crater Ice Survey",
    situation:
      "Orbit drops to lowest altitude over the lunar South Pole. Deep, permanently shadowed craters pass directly beneath Downlink's sensor suite.",
    question: "How will you explore the icy craters of the South Pole?",
    choices: [
      {
        id: "deep-radar-pulse",
        title: "Pulse radar into Shackleton Crater",
        description: "Fire active sounding waves deep into the shadowed crater floor.",
        icon: "water",
        focus: "water",
        delta: { power: -22, water: 34, oxygen: -6 },
        science: 0,
        consequence: {
          title: "Strong ice reflections detected!",
          explanation:
            "Radar echoes indicate water ice deposits buried beneath 2 meters of regolith! 34 MB of high-priority science is safely stored in your buffer.",
          lesson:
            "Water ice at the Moon's poles could provide drinking water, oxygen, and rocket fuel for future human bases.",
        },
      },
      {
        id: "rim-sun-harvest",
        title: "Harvest low grazing rim sunlight",
        description: "Tilt panels to catch continuous sunlight on the mountain peaks.",
        icon: "sun",
        focus: "power",
        delta: { power: 22, water: 0, oxygen: -2 },
        science: 0,
        consequence: {
          title: "Sun-tracking recharge complete!",
          explanation:
            "The peaks of eternal light at the lunar pole bathed your solar panels in steady sunlight, providing a +22% battery boost for the final pass.",
          lesson:
            "Certain crater rims at the lunar poles never see night, making them ideal power stations for future space missions.",
        },
      },
      {
        id: "ice-telemetry-burst",
        title: "Burst downlink ice coordinates to base",
        description: "Immediately transmit ice location data to the lunar outpost base.",
        icon: "science",
        focus: "science",
        delta: { power: -18, water: -25, oxygen: -6 },
        science: 1,
        consequence: {
          title: "Lunar base receives direct ice coordinates!",
          explanation:
            "Your antenna beamed 25 MB of ice coordinates straight to the lunar outpost habitat! The surface rover has already set course, scoring science!",
          lesson:
            "Direct satellite-to-base links allow real-time exploration guidance for astronauts on the ground.",
        },
      },
    ],
  },
  {
    id: "orbit-6",
    title: "Orbit 6 · Grand Downlink & Final Relay",
    situation:
      "Final scheduled orbit of the mission. Both Earth and the lunar base are in direct line-of-sight. This is your last chance to deliver your findings home!",
    question: "How will you finish the Downlink mission?",
    choices: [
      {
        id: "grand-downlink",
        title: "Maximum-power grand data downlink",
        description: "Crank transmitter to maximum power to beam all stored data home.",
        icon: "science",
        focus: "science",
        delta: { power: -24, water: -35, oxygen: -8 },
        science: 2,
        consequence: {
          title: "Mission triumph: Full science archive delivered!",
          explanation:
            "A dazzling high-speed transmission dumped 35 MB of raw observations into Earth's receiving antennas! Two full science packages logged!",
          lesson:
            "A well-timed final transmission delivers the full fruit of a satellite's mission to science teams around the globe.",
        },
      },
      {
        id: "balanced-relay",
        title: "Split data between Earth and lunar base",
        description: "Send half to the surface outpost crew and half to mission control.",
        icon: "science",
        focus: "science",
        delta: { power: -16, water: -22, oxygen: -4 },
        science: 1,
        consequence: {
          title: "Shared mission success across space and Earth!",
          explanation:
            "The lunar habitat and Earth receiving stations both confirmed crisp data packets. A solid, balanced finish with plenty of battery to spare.",
          lesson:
            "Reliable orbital relays keep astronauts connected to Earth and to each other.",
        },
      },
      {
        id: "final-portrait",
        title: "Orient to sun & snap 'Earthrise' portrait",
        description: "Angle panels to harvest sunlight while taking a low-power parting photo.",
        icon: "sun",
        focus: "power",
        delta: { power: 6, water: 10, oxygen: -2 },
        science: 0,
        consequence: {
          title: "A breathtaking view of home.",
          explanation:
            "Your solar panels gathered sunlight to stabilize power while your camera snapped an iconic picture of Earth rising over the lunar horizon.",
          lesson:
            "Looking back at Earth from space reminds us how precious and interconnected our home planet really is.",
        },
      },
    ],
  },
];
