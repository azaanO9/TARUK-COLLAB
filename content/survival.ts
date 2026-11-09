import type {
  Day,
  Effect,
  Plan,
  Reserves,
  Station,
} from "../game/survivalTypes.ts";
// EDUCATIONAL ASSUMPTIONS: all points, geometry, costs, forecasts and ten-day
// sequence are fictional teaching choices. Radiation is a current risk index,
// never a dose measurement. Walking does not spend reserves or advance time.
export const INITIAL_RESERVES: Reserves = {
  power: 70,
  water: 75,
  food: 80,
  oxygen: 80,
};
export const DAILY_USE: Reserves = {
  power: -5,
  water: -5,
  food: -5,
  oxygen: -4,
};
export const SPACE_SOURCES = [
  {
    name: "NASA · Eclipses and the Moon",
    url: "https://science.nasa.gov/moon/eclipses/",
    note: "Earth's shadow removes sunlight at the Moon; conserving stored energy matters.",
  },
  {
    name: "NASA · Solar flares explained",
    url: "https://science.nasa.gov/blogs/solar-cycle-25/2022/06/10/solar-flares-faqs/",
    note: "Flares are bursts of electromagnetic radiation. Flares, CMEs and particle events are related but distinct.",
  },
  {
    name: "NASA · Space radiation",
    url: "https://srag.jsc.nasa.gov/SpaceRadiation/What/What.cfm",
    note: "Energetic particles and cosmic rays contribute to radiation risk outside Earth's protection.",
  },
];
export const STATIONS: Station[] = [
  {
    id: "research",
    name: "Crater research station",
    x: 46,
    z: -37,
    kind: "science",
    description:
      "A research station lies beyond a crater field. Compare steep loose slopes with the marked gentler route before sending MICA's rover.",
  },
  {
    id: "solar",
    name: "Solar array",
    x: -12,
    z: -12,
    kind: "dust",
    description:
      "Grey dust hides the blue cells. A dry-cleaning tool is clipped to the frame. Light must reach the cells to generate power.",
  },
  {
    id: "oxygen",
    name: "Oxygen cylinder",
    x: -4,
    z: -3,
    kind: "oxygen",
    description:
      "A labelled oxygen reserve feeds the habitat. The connector checklist shows how to isolate and reseal a leaking fitting.",
  },
  {
    id: "water",
    name: "Water recycler",
    x: 11,
    z: -8,
    kind: "water",
    description:
      "A collection pipe returns water to the treatment loop. Drops near the bypass show where useful water is being lost.",
  },
  {
    id: "food",
    name: "Food locker",
    x: 4,
    z: -17,
    kind: "food",
    description:
      "Sealed meals are sorted by date. Count intact packs and use the oldest approved meals first. Growing a whole meal is not instant.",
  },
  {
    id: "battery",
    name: "Battery bank",
    x: -11,
    z: 1,
    kind: "power",
    description:
      "Stored energy keeps essential systems running when sunlight is unavailable. Optional lights can wait; life support cannot.",
  },
  {
    id: "monitor",
    name: "Space-weather monitor",
    x: 3,
    z: -3,
    kind: "radiation",
    description:
      "Read both the forecast and local sensors. A flare is a burst of light and radiation; a solar particle event is a separate hazard that may accompany solar activity.",
  },
  {
    id: "shelter",
    name: "Shielded storm shelter",
    x: -21,
    z: -9,
    kind: "shelter",
    description:
      "This training shelter has extra shielding and protected supplies. Going inside can reduce current exposure; it does not undo a radiation dose already received.",
  },
  {
    id: "rover",
    name: "MICA's supply rover",
    x: 17,
    z: 10,
    kind: "rover",
    description:
      "MICA's rover needs to reach the research station. The direct route crosses steep, loose crater slopes; the marked longer route stays on gentler ground. Check the terrain before choosing.",
  },
  {
    id: "science",
    name: "Science bench",
    x: 16,
    z: -19,
    kind: "science",
    description:
      "A field notebook records place, time and conditions. Good records help separate observations from guesses.",
  },
  {
    id: "relay",
    name: "Communications mast",
    x: -27,
    z: -24,
    kind: "signal",
    description:
      "The relay route passes above the ridge. Pointing at the receiver matters more than simply turning up transmitter power.",
  },
  {
    id: "lookout",
    name: "Ridge observation marker",
    x: -43,
    z: -38,
    kind: "science",
    description:
      "An eclipse is geometry: Earth can block sunlight reaching this lunar site. A lunar eclipse seen from Earth is a solar eclipse seen from the Moon. Darkness alone is not a particle storm.",
  },
  {
    id: "cache",
    name: "Outer supply cache",
    x: 39,
    z: 22,
    kind: "food",
    description:
      "This marked cache belongs to the outpost. Explore freely, but supplies enter the daily inventory only through the day's approved plan.",
  },
];
type Wrong = [string, string, Effect?];
const zero: Reserves = { power: 0, water: 0, food: 0, oxygen: 0 };
function day(
  n: number,
  title: string,
  target: string,
  clues: string[],
  objective: string,
  radio: string,
  event: Day["event"],
  risk: number,
  goodTitle: string,
  delta: Partial<Reserves>,
  riskDelta: number,
  lesson: string,
  wrongs: Wrong[][],
  science = 0,
): Day {
  const effect = STATIONS.find((s) => s.id === target)!.kind;
  const visual = (
    effect === "shelter"
      ? "radiation"
      : effect === "science"
        ? "signal"
        : effect
  ) as Effect;
  const good: Plan = {
    id: `day-${n}-safe`,
    title: goodTitle,
    good: true,
    delta: { ...zero, ...delta },
    risk: riskDelta,
    effect: visual,
    action: goodTitle,
    equipment: "The correct system is stabilized.",
    consequence: `MICA confirms the checklist. ${lesson}`,
    lesson,
  };
  return {
    id: `day-${n}`,
    title,
    target,
    clues,
    objective,
    radio,
    event,
    risk,
    lesson,
    science,
    weather:
      event === "eclipse"
        ? "EARTH ECLIPSE · SOLAR INPUT LOW"
        : event === "flare"
          ? "FLARE ALERT · CHECK PARTICLE FORECAST"
          : event === "particles"
            ? "SOLAR PARTICLE EVENT · SHELTER ADVISED"
            : "QUIET SPACE WEATHER · BACKGROUND RISK",
    source:
      event === "eclipse"
        ? SPACE_SOURCES[0].url
        : event === "flare" || event === "particles"
          ? SPACE_SOURCES[1].url
          : undefined,
    plans: wrongs.map((bank, b) => [
      good,
      ...bank.map(
        ([title, consequence, e], i): Plan => ({
          id: `day-${n}-bank-${b}-wrong-${i}`,
          title,
          good: false,
          delta: {
            ...zero,
            power: -6,
            ...(e === "water" ? { water: -9 } : {}),
            ...(e === "food" ? { food: -8 } : {}),
            ...(e === "oxygen" ? { oxygen: -10 } : {}),
          },
          risk:
            e === "radiation" && (event === "flare" || event === "particles")
              ? 22
              : 0,
          effect: e ?? visual,
          action: title,
          equipment:
            e === "radiation"
              ? event === "flare" || event === "particles"
                ? "The monitor still reports elevated exposure risk."
                : "Check the monitor: this shadow is not a particle storm."
              : "The underlying problem has not been solved.",
          consequence,
          lesson: consequence,
        }),
      ),
    ]),
  };
}
export const DAYS: Day[] = [
  day(
    1,
    "First light",
    "solar",
    ["solar"],
    "Restore the dusty solar array.",
    "Welcome, Scout. Ten days until the crew arrives. First: let's get our little base charging again.",
    "quiet",
    8,
    "Isolate the array and use its dry-cleaning tool",
    { power: 18, water: -1, oxygen: -1 },
    0,
    "Clear cells collect more sunlight. Save drinking water for the crew.",
    [
      [
        [
          "Wait for wind to clear the panel",
          "The Moon has no Earth-like wind to sweep the dust away. The battery keeps supplying the base.",
          "dust",
        ],
        [
          "Wash it with drinking water",
          "The wash is stopped by the training interlock. Precious drinking water is not the panel-cleaning tool.",
          "water",
        ],
      ],
      [
        [
          "Cover the dusty cells",
          "A cover over dust still blocks the light. Generation stays low.",
          "dust",
        ],
        [
          "Run cabin lamps to charge the panels",
          "The lamps use more battery energy than the panels can recover from them.",
          "power",
        ],
      ],
      [
        [
          "Turn the cells away from sunlight",
          "Less light reaches the cells, so generation falls further.",
          "dust",
        ],
        [
          "Shake the live panel frame",
          "Stop and isolate the equipment before using its approved cleaning tool.",
          "power",
        ],
      ],
    ],
  ),
  day(
    2,
    "Every drop returns",
    "water",
    ["water", "oxygen"],
    "Trace the recycler loop and protect the water supply.",
    "Yesterday we found the light. Today, let's keep our water coming home. Check the recycler and the life-support reserve.",
    "quiet",
    8,
    "Reconnect the collection pipe using the checklist",
    { water: 18, power: -5 },
    0,
    "Recovery keeps useful water in the treatment loop.",
    [
      [
        [
          "Vent the water vapour outside",
          "Venting loses recoverable water. Follow the collection pipe instead.",
          "water",
        ],
        [
          "Ignore the bypass drip",
          "A small continuing loss still wastes a limited supply.",
          "water",
        ],
      ],
      [
        [
          "Open the drinking tank to the surface",
          "Stored water belongs inside its sealed system.",
          "water",
        ],
        [
          "Turn up the pump before checking pipes",
          "A stronger pump does not repair a disconnected collection path.",
          "power",
        ],
      ],
      [
        [
          "Throw away every collection filter",
          "Use the checklist to identify the part that needs attention first.",
          "water",
        ],
        [
          "Use the oxygen connector as a water hose",
          "Connectors have specific jobs. Follow the labelled recovery path.",
          "oxygen",
        ],
      ],
    ],
  ),
  day(
    3,
    "A place at the table",
    "food",
    ["food", "science"],
    "Inventory the sealed meals and record a food plan.",
    "I don't eat sandwiches, but I take sandwich storage very seriously. Count the sealed packs, then write a careful record.",
    "quiet",
    10,
    "Inventory intact packs and rotate the dated meals",
    { food: 18, power: -4, water: -3 },
    0,
    "A measured food plan protects supplies without skipping meals.",
    [
      [
        [
          "Open every meal at once",
          "Opened packs are harder to keep protected. Inventory sealed meals first.",
          "food",
        ],
        [
          "Skip all meals to save food",
          "The crew needs regular food. Plan sensible portions from the real inventory.",
          "food",
        ],
      ],
      [
        [
          "Trust a guess instead of counting",
          "A food plan based on a guess can promise supplies that are not there.",
          "food",
        ],
        [
          "Grow a full harvest this afternoon",
          "Crops need time and suitable conditions. Today's sealed meals are already here.",
          "food",
        ],
      ],
      [
        [
          "Leave food packs in the open dust",
          "Keep food protected from contamination.",
          "food",
        ],
        [
          "Throw away labels and dates",
          "Dates help the crew rotate supplies reliably.",
          "food",
        ],
      ],
    ],
    1,
  ),
  day(
    4,
    "Earth crosses the Sun",
    "battery",
    ["battery", "monitor"],
    "Prepare stored power for an eclipse at the lunar site.",
    "Earth is moving across our view of the Sun. It's an eclipse here on the Moon. Check the battery and weather monitor: darkness is not the same thing as a radiation storm.",
    "eclipse",
    8,
    "Use stored power and pause optional equipment",
    { power: -7 },
    0,
    "Earth blocks sunlight, so solar input drops. Battery planning helps; an eclipse does not itself create a solar particle storm.",
    [
      [
        [
          "Keep every optional light running",
          "Extra demand uses the stored energy needed by essential systems.",
          "power",
        ],
        [
          "Treat darkness as proof of a particle storm",
          "Check the radiation monitor. An eclipse and a solar particle event are different things.",
          "radiation",
        ],
      ],
      [
        [
          "Point the panels at Earth's dark silhouette",
          "Panels need available sunlight; the battery bridges this shadow.",
          "dust",
        ],
        [
          "Switch off life support first",
          "Keep essential systems supplied. Pause optional loads instead.",
          "oxygen",
        ],
      ],
      [
        [
          "Expect the battery to fill in darkness",
          "Stored energy is being used while sunlight is blocked.",
          "power",
        ],
        [
          "Turn off the weather monitor permanently",
          "Keep evidence available so the crew can distinguish different events.",
          "power",
        ],
      ],
    ],
  ),
  day(
    5,
    "Seal the small gap",
    "oxygen",
    ["oxygen", "water"],
    "Find the oxygen connector problem before using more reserve.",
    "The reserve gauge has a story to tell. Inspect the labelled cylinder and the nearby life-support loop before deciding.",
    "quiet",
    10,
    "Isolate and reseal the connector using the checklist",
    { oxygen: 18, power: -3 },
    0,
    "Repair the leak's cause before using more stored oxygen.",
    [
      [
        [
          "Open another cylinder into the leaking line",
          "More oxygen escapes while the bad connection remains.",
          "oxygen",
        ],
        [
          "Tape over the gauge",
          "Hiding a warning does not seal a connector.",
          "oxygen",
        ],
      ],
      [
        [
          "Disconnect every life-support line",
          "Isolate only the affected connection using its checklist.",
          "oxygen",
        ],
        [
          "Ignore the quiet leak",
          "A slow leak still uses a limited reserve.",
          "oxygen",
        ],
      ],
      [
        [
          "Use a food wrapper as the seal",
          "Approved fittings and procedures matter in a pressure system.",
          "oxygen",
        ],
        [
          "Keep increasing pressure",
          "Higher pressure does not repair the leaking connection.",
          "oxygen",
        ],
      ],
    ],
  ),
  day(
    6,
    "Read the Sun's message",
    "shelter",
    ["monitor", "shelter"],
    "Respond to a flare alert and a forecast of energetic particles.",
    "A flare alert just arrived. A flare is a burst of radiation; a particle event is a related but different danger. Read the forecast, then inspect our shielded shelter.",
    "flare",
    65,
    "Pause outside work and follow the shelter forecast",
    { power: -3 },
    -53,
    "Monitoring and shielding reduce current exposure risk. Not every flare produces a particle event at our location.",
    [
      [
        [
          "Go outside for a better look at the flare",
          "Being outside gives less shielding. Read the instruments from protection.",
          "radiation",
        ],
        [
          "Use sunglasses instead of the shelter",
          "Sunglasses are not shielding against energetic space particles.",
          "radiation",
        ],
      ],
      [
        [
          "Assume every flare misses the Moon",
          "Use the event forecast and local sensors, not an assumption.",
          "radiation",
        ],
        [
          "Turn off the warning to make it safe",
          "Silencing a monitor does not remove the hazard.",
          "radiation",
        ],
      ],
      [
        [
          "Hide behind a solar panel as the only shield",
          "Use the designated shelter with its additional shielding.",
          "radiation",
        ],
        [
          "Rush a long outside science walk",
          "Pause outside tasks while the forecast calls for protection.",
          "radiation",
        ],
      ],
    ],
    1,
  ),
  day(
    7,
    "A longer way around",
    "rover",
    ["rover", "research"],
    "Choose a safe route through the crater field to the research station.",
    "The short route is steep and loose. My wheels prefer a boring detour to an exciting tumble. Can you check the terrain?",
    "quiet",
    10,
    "Choose the longer marked route over gentler ground",
    { food: 15, water: 10, power: -4 },
    0,
    "A longer route over gentler terrain can reduce the chance of a rover slipping or becoming stuck. Check the terrain and mission guidance.",
    [
      [
        [
          "Race straight across the steep loose slope",
          "The wheels slip on loose ground and the rover stops. A shorter route is not always a safer route.",
          "rover",
        ],
        [
          "Drive into the crater without checking the route",
          "The rover cannot safely assess the steep crater wall after rushing in. Examine the terrain first.",
          "rover",
        ],
      ],
      [
        [
          "Drive faster to skip the map check",
          "Speed does not tell us whether the crater slope is safe.",
          "rover",
        ],
        [
          "Assume the shortest line is always safest",
          "Distance alone does not reveal slope or loose soil. Compare routes first.",
          "rover",
        ],
      ],
      [
        [
          "Navigate by guessing where the craters are",
          "A terrain map helps reveal hazards before the rover reaches them.",
          "rover",
        ],
        [
          "Ignore the loose-soil warning",
          "Loose ground can make traction uncertain. Choose a gentler marked path.",
          "rover",
        ],
      ],
    ],
  ),
  day(
    8,
    "A reserve for tomorrow",
    "solar",
    ["solar", "battery"],
    "Check solar collection and store energy for the next alert.",
    "Good survival is also preparation. Let's check the collection angle and the battery before tomorrow's planned exercise.",
    "quiet",
    8,
    "Check the array angle and charge the reserve bank",
    { power: 26, water: -2 },
    0,
    "Collect energy while sunlight is available and keep a reserve for interruptions.",
    [
      [
        [
          "Empty the battery into decorative lights",
          "Optional lighting uses tomorrow's reserve.",
          "power",
        ],
        [
          "Turn the panel away from the Sun",
          "A poor collection angle leaves less energy for storage.",
          "dust",
        ],
      ],
      [
        [
          "Unplug the battery while charging",
          "The reserve needs its approved charging connection.",
          "power",
        ],
        [
          "Put a dark cover over the array",
          "The cover prevents useful light reaching the cells.",
          "dust",
        ],
      ],
      [
        [
          "Assume a full battery needs no check",
          "Read the actual reserve and check the charging path.",
          "power",
        ],
        [
          "Charge the panel from the battery in a loop",
          "That loop loses energy rather than creating it.",
          "power",
        ],
      ],
    ],
  ),
  day(
    9,
    "The particle warning",
    "shelter",
    ["shelter", "monitor"],
    "Protect the crew during a solar energetic particle event.",
    "Today's exercise reports elevated energetic particles associated with a solar eruption. The threat is measured by instruments, not by a change in sky colour.",
    "particles",
    75,
    "Use the shielded shelter and monitor for an all-clear",
    { power: -4 },
    -63,
    "Shielding and limiting exposure protect the crew. Shelter reduces current risk; it cannot erase a dose already received.",
    [
      [
        [
          "Keep working outside until you feel radiation",
          "You cannot rely on feeling or seeing energetic particles. Use the monitors.",
          "radiation",
        ],
        [
          "Assume an ordinary thin suit provides all shielding",
          "Use the designated storm shelter and the mission guidance.",
          "radiation",
        ],
      ],
      [
        [
          "Leave shelter because the sky looks calm",
          "The sky's appearance is not a radiation measurement.",
          "radiation",
        ],
        [
          "Declare every CME an identical event",
          "Solar eruptions and particle paths vary. Follow this event's forecast.",
          "radiation",
        ],
      ],
      [
        [
          "Turn off the detector to clear the warning",
          "A switched-off detector cannot establish an all-clear.",
          "radiation",
        ],
        [
          "Use an eclipse forecast as the particle forecast",
          "An eclipse forecast predicts a shadow, not an energetic-particle hazard.",
          "radiation",
        ],
      ],
    ],
  ),
  day(
    10,
    "A home worth calling",
    "relay",
    ["relay", "science"],
    "Send the survival log and science record to the incoming crew.",
    "Ten days of small, careful decisions. Send our records over the relay. Tell the next crew what worked—and what we learned by trying again.",
    "quiet",
    8,
    "Aim at the orbital relay and transmit the checked log",
    { power: -7 },
    0,
    "A clear relay path and trustworthy records help the next crew arrive prepared.",
    [
      [
        [
          "Boost power into the blocking ridge",
          "Power cannot replace a clear communication path.",
          "signal",
        ],
        [
          "Send a guessed science record",
          "Send measured observations and honest uncertainty.",
          "signal",
        ],
      ],
      [
        [
          "Point the dish at the ground",
          "Use the known orbital relay direction.",
          "signal",
        ],
        [
          "Delete the retry history",
          "Recording corrections helps the next crew learn.",
          "signal",
        ],
      ],
      [
        [
          "Transmit with the relay connection unplugged",
          "Check the full signal path before transmitting.",
          "signal",
        ],
        [
          "Send labels without their observation locations",
          "Location and context are part of a useful science record.",
          "signal",
        ],
      ],
    ],
    1,
  ),
];
export const QUICK_RESPONSES = [
  {
    id: "pause",
    title: "Pause optional work. Check the evidence with MICA.",
    good: true,
    text: "Good pause. The situation is steadier, but we still need to fix the day's original problem. Retry with your clues.",
  },
  {
    id: "boost",
    title: "Turn every system up and hope it clears.",
    good: false,
    text: "Adding demand does not fix the cause. The instruments still show the problem. Let's return to the checkpoint.",
  },
  {
    id: "hide",
    title: "Silence the monitor and continue.",
    good: false,
    text: "A hidden warning is not a solved problem. We can use the evidence and try another plan.",
  },
];
