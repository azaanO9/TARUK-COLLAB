import type { Resources } from "../game/types.ts";

export interface RetryPlan {
  id: string;
  replaces: string;
  verb: string;
  detail: string;
  delta: Resources;
  title: string;
  consequence: string;
  lesson: string;
}

// EDUCATIONAL ASSUMPTIONS: all costs and fictional procedures are invented.
// Each bank supplies two new, incorrect approaches. The original correct plan
// is retained by the engine. Three banks cycle without adjacent repetition.
const plan = (
  id: string,
  replaces: string,
  verb: string,
  detail: string,
  delta: Resources,
  title: string,
  consequence: string,
  lesson: string,
): RetryPlan => ({
  id,
  replaces,
  verb,
  detail,
  delta,
  title,
  consequence,
  lesson,
});

export const STORY_RETRY_BANKS: Record<
  string,
  readonly (readonly RetryPlan[])[]
> = {
  "a-little-light": [
    [
      plan(
        "solar-cover",
        "wait-wind",
        "Put a clear cover over the dust",
        "Protect the array without cleaning it.",
        { power: -5, water: -1, oxygen: -2 },
        "A blanket under a window.",
        "The cover is clear, but the dust beneath it still blocks light from the cells. MICA points to the unused dry-cleaning tool.",
        "Protecting a panel does not remove the dust already on it.",
      ),
      plan(
        "solar-lamp",
        "wash-panels",
        "Shine cabin lamps at the array",
        "Use indoor lights to charge the battery.",
        { power: -12, water: -1, oxygen: -2 },
        "Borrowed light costs power.",
        "The lamps spend stored power while the array remains dusty. Sunlight is already available; the cells need a clear path to it.",
        "Solve the blocked-light problem before spending more energy.",
      ),
    ],
    [
      plan(
        "solar-away",
        "wait-wind",
        "Turn the array away from the Sun",
        "Try a different direction without removing dust.",
        { power: -6, water: -1, oxygen: -2 },
        "Less light, not less dust.",
        "The dust stays put, and turning away reduces the light reaching the array. The problem is on the surface of the panel.",
        "Use your observations to distinguish dust from a pointing problem.",
      ),
      plan(
        "solar-bump",
        "wash-panels",
        "Ask MICA to bump the array",
        "Shake the dust off with the rover.",
        { power: -8, water: -2, oxygen: -2 },
        "A rover isn't a cleaning tool.",
        "The training system stops the bump to protect both machines. The outpost has an approved tool for this exact task.",
        "Choose the intended maintenance tool instead of risking equipment.",
      ),
    ],
  ],
  "every-drop": [
    [
      plan(
        "water-discard",
        "vent-steam",
        "Wipe the drops away and discard the cloth",
        "Make the window clear as quickly as possible.",
        { power: -3, water: -7, oxygen: -2 },
        "The window is clear. The water is lost.",
        "The cloth collected the droplets, but throwing it away removed that water from the recovery loop. The recycler's tray is still empty.",
        "Collecting water only helps if it returns to the recovery system.",
      ),
      plan(
        "water-bypass",
        "ignore-water",
        "Route the water around the filter",
        "Skip a step to make the loop run faster.",
        { power: -4, water: -8, oxygen: -3 },
        "A shortcut around clean water.",
        "The training system blocks the bypass. Collected water needs the cleaning system before it can return to the crew's supply.",
        "A useful recycling loop must recover and clean its water.",
      ),
    ],
    [
      plan(
        "water-heater",
        "vent-steam",
        "Turn up the cabin heater",
        "Warm the glass until the drops disappear.",
        { power: -10, water: -3, oxygen: -2 },
        "Gone from the glass, still in the air.",
        "The drops evaporate into the cabin air. Heating changed their form, but did not return the water to storage.",
        "Water changing form is different from water being recovered.",
      ),
      plan(
        "water-outside",
        "ignore-water",
        "Move the collection tray outside",
        "Empty the tray so the window looks tidy.",
        { power: -2, water: -10, oxygen: -3 },
        "Outside the loop.",
        "The tray's water is no longer connected to the recycler. MICA traces the pipe back toward the pump and filter inside the habitat.",
        "Keep collected water connected to the closed recovery loop.",
      ),
    ],
  ],
  "door-behind": [
    [
      plan(
        "air-cover-sensor",
        "more-air",
        "Cover the pressure warning light",
        "Hide the distracting amber signal.",
        { power: -2, water: 0, oxygen: -9 },
        "Hidden doesn't mean repaired.",
        "The warning is covered, but the air reading keeps falling. The packing strip still prevents the hatch from sealing.",
        "A warning points toward a physical problem; hiding it doesn't fix the cause.",
      ),
      plan(
        "air-fans",
        "mute-alarm",
        "Run the cabin fans faster",
        "Move more air around the habitat.",
        { power: -8, water: -1, oxygen: -10 },
        "Moving air isn't sealing air.",
        "The fans circulate air inside while the hatch keeps leaking. Your inspection already identified the strip across the seal.",
        "Fix the escape path before adjusting unrelated equipment.",
      ),
    ],
    [
      plan(
        "air-push-strip",
        "more-air",
        "Push the packing strip further into the seal",
        "Try to force the latch around it.",
        { power: -3, water: -1, oxygen: -8 },
        "The obstruction is still there.",
        "The training latch stays amber because the strip is still crossing the seal. The checklist calls for clearing the obstruction first.",
        "Remove what blocks a seal rather than forcing the door around it.",
      ),
      plan(
        "air-reset-display",
        "mute-alarm",
        "Reset the pressure display",
        "Make the number start over.",
        { power: -2, water: 0, oxygen: -9 },
        "A new reading. The same leak.",
        "The display restarts, then shows pressure falling again. Resetting a measurement does not repair the hatch it is measuring.",
        "Measurements describe the system; changing a display doesn't change the system.",
      ),
    ],
  ],
  mica: [
    [
      plan(
        "rover-push",
        "boost-motor",
        "Push MICA while its motor is running",
        "Add your strength to the stuck wheel.",
        { power: -7, water: -3, oxygen: -3 },
        "Stop before you help.",
        "The training system pauses the push. The motor must be safely off before anyone works beside the trapped wheel.",
        "Make the equipment safe before investigating a mechanical blockage.",
      ),
      plan(
        "rover-camera",
        "leave-mica",
        "Replace MICA's camera",
        "Give the rover a better view of the route.",
        { power: -8, water: -3, oxygen: -3 },
        "A clearer picture of the same pebble.",
        "The new camera can see the obstacle, but the stone remains wedged beside the wheel. The view wasn't the part that stopped moving.",
        "Repair the part your evidence identifies, not an unrelated component.",
      ),
    ],
    [
      plan(
        "rover-steer",
        "boost-motor",
        "Steer the trapped wheel harder",
        "Try to twist past the stone.",
        { power: -10, water: -2, oxygen: -3 },
        "The stone doesn't take directions.",
        "The wheel still cannot turn freely. MICA's motor spends power against a physical obstruction that needs a careful repair.",
        "More force is not a substitute for removing an obstacle safely.",
      ),
      plan(
        "rover-tow",
        "leave-mica",
        "Tow MICA through the loose stones",
        "Keep using the shortest route.",
        { power: -8, water: -4, oxygen: -4 },
        "The short route repeats the problem.",
        "The training guide stops the tow beside more loose rocks. The clear, longer path you found is a better way to bring MICA back.",
        "Use route observations to avoid repeating a mechanical problem.",
      ),
    ],
  ],
  tomorrow: [
    [
      plan(
        "sample-no-label",
        "mix-samples",
        "Seal the samples but skip the location labels",
        "Save the writing for Earth.",
        { power: -5, water: -2, oxygen: -2 },
        "Earth wasn't here to see it.",
        "The rocks are separated, but the team cannot tell which collection site each one represents. The field map needs to travel with the evidence.",
        "A sample's collection record is part of the discovery.",
      ),
      plan(
        "sample-food-bag",
        "polish-samples",
        "Reuse an old food pouch for the rocks",
        "Save the clean science containers for later.",
        { power: -4, water: -3, oxygen: -3 },
        "An extra ingredient in the evidence.",
        "The used pouch may add material that wasn't part of either rock. Your clean, separate containers protect what the science team wants to study.",
        "Use clean collection containers to reduce contamination.",
      ),
    ],
    [
      plan(
        "sample-vague-label",
        "mix-samples",
        "Write 'Moon rock' on both labels",
        "Give both samples the same simple description.",
        { power: -4, water: -2, oxygen: -3 },
        "A label without a place.",
        "Both rocks came from the Moon, but from different collection sites. The matching labels lose the detail needed to compare those sites.",
        "Useful labels distinguish samples and record where they were collected.",
      ),
      plan(
        "sample-used-gloves",
        "polish-samples",
        "Use the dirty repair gloves to collect the rocks",
        "Keep working with the tools already on hand.",
        { power: -4, water: -4, oxygen: -3 },
        "Repair dust joins the sample.",
        "The training system spots material from the repair gloves near the sample. Clean collection tools help keep each rock's original evidence separate.",
        "Protect the sample from material introduced during collection.",
      ),
    ],
  ],
  "hello-earth": [
    [
      plan(
        "relay-habitat",
        "radio-full",
        "Point the antenna at the habitat",
        "Send the message toward the nearest building.",
        { power: -10, water: -2, oxygen: -2 },
        "The relay is somewhere else.",
        "The habitat receives no route to Earth from this antenna direction. The relay map marks a clear path above the horizon, away from the ridge.",
        "Use the communication map to choose the right destination.",
      ),
      plan(
        "relay-no-ack",
        "erase-records",
        "Send once, then switch off the receiver",
        "Assume Earth received everything.",
        { power: -7, water: -2, oxygen: -2 },
        "A message needs a reply.",
        "The training task cannot confirm receipt while the receiver is off. Keep the connection open and check the acknowledgement after aligning the antenna.",
        "Confirm that important records arrived instead of assuming they did.",
      ),
    ],
    [
      plan(
        "relay-repeat",
        "radio-full",
        "Keep resending in the same direction",
        "Try the blocked path again and again.",
        { power: -14, water: -2, oxygen: -3 },
        "Another message meets the same ridge.",
        "Repeating the transmission spends energy without changing its blocked route. The relay marker still shows a clear alternative path.",
        "When a route is blocked, change the route instead of repeating the same attempt.",
      ),
      plan(
        "relay-below",
        "erase-records",
        "Aim the antenna below the ridge",
        "Look for the relay along the ground.",
        { power: -8, water: -2, oxygen: -2 },
        "Look up to the relay.",
        "The marked relay is above the clear horizon. Pointing toward the ground keeps the signal away from that route.",
        "Match antenna pointing to the location shown in the relay map.",
      ),
    ],
  ],
};
