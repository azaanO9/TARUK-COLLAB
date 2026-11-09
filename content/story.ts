import type { StoryChapter } from "../game/storyTypes.ts";

// EDUCATIONAL ASSUMPTIONS: abstract game points, fictional mission procedures,
// six short story chapters, three science discoveries. Not NASA operating limits.
export const STORY_CONFIG = {
  initialResources: { power: 60, water: 70, oxygen: 80 },
  capacity: 100,
  scienceGoal: 3,
} as const;

export const STORY_CHAPTERS: readonly StoryChapter[] = [
  {
    id: "a-little-light",
    title: "A little light.",
    location: "THE SOLAR GARDEN",
    place: "solar",
    time: "06:12",
    objective: "Find out why the solar array is making so little power.",
    radio:
      "MICA here. I practiced saying ‘welcome home’ all morning. Then the lights went out. Could you take a look?",
    recoveredRadio:
      "You came back and tried again. I think that is a very good way to begin.",
    prompt: "The Sun is here. The power isn't. What's your move?",
    hint: "Compare the dusty panel with the footprints. The Moon has no wind to sweep either of them away.",
    requiredClues: 1,
    evidence: [
      {
        id: "dusty-panel",
        label: "Inspect solar panel",
        position: [-3, 1.4, 2.6],
        title: "A blanket of grey.",
        observation:
          "Sunlight falls on the array, but a layer of dust hides the blue cells. The power display is low.",
        inference:
          "Solar panels need light to reach their cells. Something is in the way.",
      },
      {
        id: "quiet-tracks",
        label: "Examine the tracks",
        position: [-4.9, 0.35, 3.3],
        title: "Footprints that stay.",
        observation:
          "Old rover tracks are still sharp. There is no breeze. MICA says the Moon has almost no atmosphere.",
        inference:
          "Waiting for wind won't clear the dust. Someone needs to help.",
      },
    ],
    choices: [
      {
        id: "wait-wind",
        verb: "Wait for a breeze",
        detail: "Let nature clean the panels.",
        succeeds: false,
        delta: { power: -8, water: 0, oxygen: -2 },
        science: 0,
        title: "The dust doesn't move.",
        consequence:
          "The array stays covered. Your outpost uses stored power while you wait. MICA points to the old footprints: they haven't moved either.",
        lesson:
          "There is no Earth-like wind on the Moon. Use the clues in the landscape.",
      },
      {
        id: "safe-clean",
        verb: "Isolate power. Clear the dust.",
        detail: "Use the outpost's approved dry-cleaning tool.",
        succeeds: true,
        delta: { power: 18, water: -3, oxygen: -3 },
        science: 0,
        title: "One window lights up. Then another.",
        consequence:
          "You follow the training checklist, switch the array off, and use its dry-cleaning tool. Light reaches the cells again. MICA's little blue eye brightens.",
        lesson: "Find the cause first. Restoring the light restores the power.",
      },
      {
        id: "wash-panels",
        verb: "Wash everything with water",
        detail: "Use your drinking supply to rinse the array.",
        succeeds: false,
        delta: { power: -4, water: -12, oxygen: -2 },
        science: 0,
        title: "The wrong job for precious water.",
        consequence:
          "The training system stops the wash. Your drinking water belongs in the life-support loop, and the array has a special dry-cleaning tool.",
        lesson:
          "Choose a tool that fits the place. Water is a valuable resource here.",
      },
    ],
  },
  {
    id: "every-drop",
    title: "Every drop comes home.",
    location: "THE WATER LOOP",
    place: "water",
    time: "07:05",
    objective: "Help the base reuse its water instead of losing it.",
    radio:
      "The lights are back. Excellent. Small problem: my window is wearing all your water. Well, some of it. I may be exaggerating.",
    recoveredRadio:
      "You found another way with the panels. Let's follow this water and see where it goes.",
    prompt: "Tiny drops cover the inside of the habitat window.",
    hint: "Water can change form without disappearing. Keep it inside the recovery loop.",
    requiredClues: 2,
    evidence: [
      {
        id: "window-drops",
        label: "Look at the window",
        position: [-0.4, 1.65, 0.3],
        title: "A cloud on the glass.",
        observation:
          "Warm, damp air meets a cooler window. Tiny drops collect on the inside. The water is still here.",
        inference: "Those droplets can be collected instead of thrown away.",
      },
      {
        id: "recycler",
        label: "Trace the water pipe",
        position: [3, 1.5, -1.8],
        title: "A loop, interrupted.",
        observation:
          "A pipe leads from the collection tray to a recycler. Its filter is ready, but the recovery pump is switched off.",
        inference:
          "The pump needs power to move used water through the cleaning system.",
      },
    ],
    choices: [
      {
        id: "vent-steam",
        verb: "Vent the damp air outside",
        detail: "Clear the window by opening the vent.",
        succeeds: false,
        delta: { power: -2, water: -10, oxygen: -5 },
        science: 0,
        title: "A clear window. A broken loop.",
        consequence:
          "The simulation shows water escaping with the damp air. Clearing the window did not recover the water. The pump is still waiting beside the collection tray.",
        lesson:
          "Keeping resources in a closed loop helps a space home use them again.",
      },
      {
        id: "collect-recycle",
        verb: "Collect. Filter. Reuse.",
        detail: "Route the droplets through the water recycler.",
        succeeds: true,
        delta: { power: -8, water: 16, oxygen: -3 },
        science: 1,
        title: "Nothing wasted. Something learned.",
        consequence:
          "The pump hums. Water moves from the tray through the cleaning system and back into storage. You save the loop diagram as your first science discovery.",
        lesson:
          "Water recovery uses energy, but helps the same supply last longer.",
      },
      {
        id: "ignore-water",
        verb: "Switch off the water system",
        detail: "Save the pump's power for later.",
        succeeds: false,
        delta: { power: 3, water: -8, oxygen: -3 },
        science: 0,
        title: "A saved watt isn't a saved drop.",
        consequence:
          "The pump stays quiet. Water keeps collecting on the glass instead of returning to storage. The base needs both power and a working water loop.",
        lesson:
          "Saving one resource can stop another system from doing its job.",
      },
    ],
  },
  {
    id: "door-behind",
    title: "The door we left behind.",
    location: "HABITAT AIRLOCK",
    place: "airlock",
    time: "08:20",
    objective: "Find the reason the habitat is losing air.",
    radio:
      "I can hear a tiny hiss in the training feed. You probably shouldn't be able to hear a tiny hiss in a home. Check the door before we blame the oxygen tank.",
    recoveredRadio:
      "The water loop took a second look, and you fixed it. Same idea now: follow the evidence.",
    prompt: "The oxygen reserve is falling. Which problem do you solve first?",
    hint: "Adding more air won't fix a place where air can escape.",
    requiredClues: 2,
    evidence: [
      {
        id: "hatch-seal",
        label: "Inspect the hatch",
        position: [1.7, 1.4, 0.75],
        title: "One latch, not quite home.",
        observation:
          "The hatch status light is amber. A strip of soft packing material is caught across the seal.",
        inference:
          "The hatch cannot seal properly while the strip is in the way.",
      },
      {
        id: "air-sensor",
        label: "Read the air sensor",
        position: [0.3, 2.5, -0.7],
        title: "The tank isn't the whole story.",
        observation:
          "The supply tank works, but the habitat pressure keeps dropping. The training display marks the airlock as the leak location.",
        inference: "Fix the leak before replenishing the air.",
      },
    ],
    choices: [
      {
        id: "more-air",
        verb: "Open a second oxygen tank",
        detail: "Replace the air as fast as it escapes.",
        succeeds: false,
        delta: { power: -3, water: -2, oxygen: -10 },
        science: 0,
        title: "More air. The same leak.",
        consequence:
          "The reserve drains faster because the hatch still cannot seal. The simulation pauses. MICA taps the amber hatch light with one small wheel.",
        lesson: "Treat the cause, not just the warning on the screen.",
      },
      {
        id: "seal-hatch",
        verb: "Clear the seal. Latch the hatch.",
        detail: "Follow the safe airlock checklist, then restore air.",
        succeeds: true,
        delta: { power: -6, water: -2, oxygen: 14 },
        science: 0,
        title: "The hiss becomes quiet.",
        consequence:
          "You follow the airlock checklist, clear the strip, and secure the hatch. The status light turns green. The training system replenishes the habitat from its reserve.",
        lesson: "A sealed habitat protects the breathable air inside.",
      },
      {
        id: "mute-alarm",
        verb: "Mute the warning",
        detail: "Wait to see whether the reading settles.",
        succeeds: false,
        delta: { power: -2, water: 0, oxygen: -12 },
        science: 0,
        title: "Quiet isn't always fixed.",
        consequence:
          "The sound stops, but the pressure keeps falling. A warning is a clue. Muting it doesn't repair the hatch.",
        lesson: "Check what a warning means before deciding it can wait.",
      },
    ],
  },
  {
    id: "mica",
    title: "Don't leave MICA behind.",
    location: "THE ROVER TRACK",
    place: "rover",
    time: "09:42",
    objective:
      "Work out why MICA cannot move, without wasting the rover's battery.",
    radio:
      "A small confession. I went to get your sample box and found a rock with my wheel. We are now very close friends. Please help.",
    recoveredRadio:
      "You didn't give up on the airlock. Good. Because I might need that same patience right now.",
    prompt: "MICA's motor works, but one wheel won't turn.",
    hint: "Look at the wheel and the route. More motor power won't move the rock safely.",
    requiredClues: 1,
    evidence: [
      {
        id: "trapped-wheel",
        label: "Check MICA's wheel",
        position: [3.7, 0.75, 2.65],
        title: "A pebble in the wrong place.",
        observation:
          "A loose stone is wedged beside the front wheel. The wheel is stuck, but the motor light is green.",
        inference: "This is a blocked wheel, not a flat battery.",
      },
      {
        id: "rover-path",
        label: "Study the rover trail",
        position: [4.8, 0.3, 1.2],
        title: "The long way is clear.",
        observation:
          "The short route crosses loose stones. A smooth path goes around them. It is a little longer.",
        inference:
          "A safer route may protect the rover and avoid another rescue.",
      },
    ],
    choices: [
      {
        id: "boost-motor",
        verb: "Give the motor full power",
        detail: "Push through the obstacle.",
        succeeds: false,
        delta: { power: -14, water: -2, oxygen: -2 },
        science: 0,
        title: "A busy motor. A stationary friend.",
        consequence:
          "The motor draws power, but the stone keeps the wheel stuck. The training system stops it before the rover is damaged. MICA would prefer the gentle plan.",
        lesson: "Diagnose a mechanical problem before spending more energy.",
      },
      {
        id: "free-mica",
        verb: "Stop the motor. Free the wheel.",
        detail: "Remove the stone, then take the clear route.",
        succeeds: true,
        delta: { power: -9, water: -5, oxygen: -5 },
        science: 0,
        title: "Six wheels. One very relieved rover.",
        consequence:
          "With the motor safely off, you free the wheel and mark the smooth route. MICA rolls back with the sample box. ‘I owe you one,’ says the little radio.",
        lesson:
          "A careful repair and a safer route can prevent a repeated problem.",
      },
      {
        id: "leave-mica",
        verb: "Order MICA to wait there",
        detail: "Collect the science box another time.",
        succeeds: false,
        delta: { power: -5, water: -2, oxygen: -2 },
        science: 0,
        title: "The mission needs its whole crew.",
        consequence:
          "The sample box is still on the stranded rover. Your next investigation needs it. You return to the wheel with a better idea of the problem.",
        lesson:
          "Exploration depends on looking after the equipment and teammates that make it possible.",
      },
    ],
  },
  {
    id: "tomorrow",
    title: "A tiny piece of tomorrow.",
    location: "THE SCIENCE BENCH",
    place: "sample",
    time: "11:08",
    objective: "Bring home a sample that scientists can trust.",
    radio:
      "I've found a remarkable Moon rock. I say remarkable because I found it. The science team says we also need to know exactly where it came from.",
    recoveredRadio:
      "You got my wheel unstuck. Now I'll hold this box completely still. Probably my best work today.",
    prompt: "Two rocks look alike. How will Earth know which is which?",
    hint: "A useful sample needs a clean container and a record of its location.",
    requiredClues: 2,
    evidence: [
      {
        id: "sample-tray",
        label: "Inspect the sample box",
        position: [-3.8, 0.9, -2.3],
        title: "Clean, and still empty.",
        observation:
          "Two separate, clean sample containers sit on the bench. A used cleaning cloth is nearby, outside the box.",
        inference:
          "Keeping material separate helps avoid mixing or contaminating samples.",
      },
      {
        id: "sample-map",
        label: "Read the field map",
        position: [-4.7, 0.6, -0.8],
        title: "A place gives a rock a story.",
        observation:
          "The map has two collection sites. One is beside the habitat; one is near a crater. The labels are blank.",
        inference:
          "Record where each sample came from so scientists can compare the sites.",
      },
    ],
    choices: [
      {
        id: "mix-samples",
        verb: "Put both rocks in one box",
        detail: "Save time and container space.",
        succeeds: false,
        delta: { power: -5, water: -3, oxygen: -3 },
        science: 0,
        title: "Two places become one mystery.",
        consequence:
          "The samples are mixed. Earth can no longer tell which site each rock represents. You still have your map, clean containers, and a chance to collect them correctly.",
        lesson:
          "Good records make a discovery useful to someone who wasn't there.",
      },
      {
        id: "label-samples",
        verb: "Separate. Seal. Label the places.",
        detail: "Use clean tools and record both collection sites.",
        succeeds: true,
        delta: { power: -8, water: -4, oxygen: -4 },
        science: 2,
        title: "Small rocks. Proper stories.",
        consequence:
          "You keep the samples separate, seal the containers, and attach their collection records. Two science discoveries are ready to share with Earth.",
        lesson:
          "Careful collection and location records help scientists trust and interpret a sample.",
      },
      {
        id: "polish-samples",
        verb: "Polish the rocks with the cloth",
        detail: "Make them look their best for Earth.",
        succeeds: false,
        delta: { power: -4, water: -6, oxygen: -3 },
        science: 0,
        title: "Pretty isn't the same as evidence.",
        consequence:
          "The used cloth could add material that wasn't on the Moon rock. The training team asks for a clean collection instead of a polished display.",
        lesson:
          "Protect a sample's original evidence. Appearance is not the science goal.",
      },
    ],
  },
  {
    id: "hello-earth",
    title: "Can you hear us, Earth?",
    location: "THE COMMUNICATIONS MAST",
    place: "antenna",
    time: "12:01",
    objective: "Send your discoveries and the crew's first message home.",
    radio:
      "I've been saving ‘welcome home’ for six whole shifts. Let's make sure someone hears it. The relay is there. We just have to find it.",
    recoveredRadio:
      "The science records are safe. You checked, learned, and tried again. Let's tell Earth what we found.",
    prompt: "The radio has power. The relay still can't hear you.",
    hint: "Use the signal map to find a clear path. Increasing power doesn't remove a hill.",
    requiredClues: 2,
    evidence: [
      {
        id: "mast-direction",
        label: "Check antenna direction",
        position: [-0.7, 3.9, -1],
        title: "A working radio, pointed away.",
        observation:
          "The transmitter is powered. The antenna points toward the ridge instead of the relay marker.",
        inference:
          "A working transmitter also needs the right pointing direction.",
      },
      {
        id: "relay-map",
        label: "Read the relay map",
        position: [-2, 0.5, -3.4],
        title: "A way around the dark.",
        observation:
          "The local map marks a relay satellite above the clear horizon. A direct path to Earth is blocked from this fictional site.",
        inference:
          "A relay can carry a message when Earth isn't directly visible.",
      },
    ],
    choices: [
      {
        id: "radio-full",
        verb: "Turn transmitter power to maximum",
        detail: "Try to force the message through the ridge.",
        succeeds: false,
        delta: { power: -16, water: -2, oxygen: -3 },
        science: 0,
        title: "A louder message. The same obstacle.",
        consequence:
          "Power drops, but the signal still points into the ridge. The route matters as much as the transmitter. MICA waits patiently beside the relay map.",
        lesson:
          "More energy does not solve every problem. Find a clear communication path.",
      },
      {
        id: "align-relay",
        verb: "Align with the relay. Send the records.",
        detail: "Use the marked clear path and confirm receipt.",
        succeeds: true,
        delta: { power: -12, water: -3, oxygen: -4 },
        science: 0,
        title: "‘We hear you, Tranquility.’",
        consequence:
          "The antenna turns. A signal crosses the quiet. Your science records arrive, followed by MICA's long-practiced message: ‘Welcome home.’ Earth sends one back: ‘You built one.’",
        lesson:
          "Exploration works when observation, resources, teamwork, and communication work together.",
      },
      {
        id: "erase-records",
        verb: "Delete the records and send a greeting",
        detail: "Make the message as small as possible.",
        succeeds: false,
        delta: { power: -4, water: -2, oxygen: -2 },
        science: 0,
        title: "The records are part of the mission.",
        consequence:
          "The training system protects your saved science records. A smaller message won't fix the antenna direction. The relay map is still your best clue.",
        lesson:
          "Preserve evidence and solve the connection problem instead of discarding your work.",
      },
    ],
  },
];
