// Content and narrative for animated consequences and quick-decision moments.
// EDUCATIONAL ASSUMPTIONS: All equipment states, fictional telemetry, and recovery procedures
// are simplified for ages 7–12. Not real NASA technical manuals.

export interface ConsequenceChain {
  actionTitle: string;
  actionDetail: string;
  equipmentState: string;
  outpostEffect: string;
  micaExplanation: string;
}

export interface ConsequenceVisual {
  choiceId: string;
  system: "solar" | "water" | "airlock" | "rover" | "sample" | "comms";
  statusBadge: string;
  chain: ConsequenceChain;
  soundCue?: "equipment-warn" | "equipment-action";
}

export interface FollowUpOption {
  id: string;
  label: string;
  kind: "thoughtful" | "impulsive";
  reaction: string;
  lesson: string;
  outpostStatus: string;
}

export interface QuickDecision {
  choiceId: string;
  prompt: string; // e.g. "What should we do first?"
  micaCall: string; // e.g. "The panel is making less power..."
  situation: string;
  options: readonly [FollowUpOption, FollowUpOption, FollowUpOption];
}

// ---------------------------------------------------------------------------
// 1. Authored Consequence Sequences for all failed choices across all 6 missions
// ---------------------------------------------------------------------------
export const CONSEQUENCE_VISUALS: Record<string, ConsequenceVisual> = {
  // === Mission 1: Solar Garden ===
  "wait-wind": {
    choiceId: "wait-wind",
    system: "solar",
    statusBadge: "GENERATION LOW · 14%",
    chain: {
      actionTitle: "Waiting for lunar breeze",
      actionDetail: "Waiting for wind that never arrives on an airless world.",
      equipmentState: "Dust blanket remains undisturbed across the photovoltaic cells.",
      outpostEffect: "Solar generation drops to a trickle; battery reserve begins draining to support base systems.",
      micaExplanation: "Because the Moon has no atmosphere, wind cannot blow the dust away. Blocked cells make less power.",
    },
    soundCue: "equipment-warn",
  },
  "wash-panels": {
    choiceId: "wash-panels",
    system: "solar",
    statusBadge: "WATER SYSTEM INTERRUPTED",
    chain: {
      actionTitle: "Washing array with drinking water",
      actionDetail: "Diverting precious habitat water to spray the dusty glass.",
      equipmentState: "Safety interlock trips; dry regolith turns into sticky lunar mud across the array.",
      outpostEffect: "Drinking water tank drops sharply; base alerts sound as life-support loop loses water.",
      micaExplanation: "Water is far too valuable to pour onto outdoor equipment, especially when the outpost has a dry-cleaning brush.",
    },
    soundCue: "equipment-warn",
  },
  "solar-cover": {
    choiceId: "solar-cover",
    system: "solar",
    statusBadge: "LIGHT PATH BLOCKED",
    chain: {
      actionTitle: "Placing clear cover over dust",
      actionDetail: "Covering the panel without removing the grime underneath.",
      equipmentState: "The plastic shield traps the lunar dust directly against the blue silicon cells.",
      outpostEffect: "Power production stays near zero; auxiliary systems switch to emergency battery draw.",
      micaExplanation: "Putting a blanket under a window doesn't clean the glass. Light still can't reach the solar cells.",
    },
    soundCue: "equipment-warn",
  },
  "solar-lamp": {
    choiceId: "solar-lamp",
    system: "solar",
    statusBadge: "ENERGY LOOP INVERTED",
    chain: {
      actionTitle: "Shining cabin lamps at the array",
      actionDetail: "Attempting to charge solar panels with battery-powered indoor lamps.",
      equipmentState: "Indoor lamps pull massive electrical current from the habitat battery.",
      outpostEffect: "Battery reserve drops fast; the panels produce far less power than the lamps consume.",
      micaExplanation: "Using battery power to make light to charge that same battery always loses energy. Sunlight is free outside!",
    },
    soundCue: "equipment-warn",
  },
  "solar-away": {
    choiceId: "solar-away",
    system: "solar",
    statusBadge: "ANGLE MISALIGNED",
    chain: {
      actionTitle: "Turning array away from the Sun",
      actionDetail: "Rotating the panels into the dark shadow.",
      equipmentState: "Direct sunlight no longer hits the cells; the dust remains stuck in place.",
      outpostEffect: "Generation drops to zero; outpost life-support switches entirely to stored power.",
      micaExplanation: "Turning away removes the sunlight completely without solving the dust problem on the surface.",
    },
    soundCue: "equipment-warn",
  },
  "solar-bump": {
    choiceId: "solar-bump",
    system: "solar",
    statusBadge: "EQUIPMENT SAFETY TRIP",
    chain: {
      actionTitle: "Ramming array with MICA",
      actionDetail: "Trying to shake off dust with a rover impact.",
      equipmentState: "Shock sensors detect a collision; array support bracket bends; emergency safety stops rover.",
      outpostEffect: "Rover motor locks for diagnostic safety; solar alignment mechanism jams.",
      micaExplanation: "A rover is an exploration partner, not a hammer. Delicate solar brackets can bend or crack.",
    },
    soundCue: "equipment-warn",
  },

  // === Mission 2: Water Loop ===
  "vent-steam": {
    choiceId: "vent-steam",
    system: "water",
    statusBadge: "HABITAT VENT OPEN · MOISTURE ESCAPING",
    chain: {
      actionTitle: "Venting damp air outside",
      actionDetail: "Opening the habitat exhaust valve to clear the foggy window.",
      equipmentState: "Warm air rushes through the exhaust port straight into the cold lunar vacuum.",
      outpostEffect: "Condensed water droplets flash into vapor outside; total outpost water reserves drop.",
      micaExplanation: "The window cleared, but all that water escaped into space! In a space outpost, we must recycle every drop.",
    },
    soundCue: "equipment-warn",
  },
  "ignore-water": {
    choiceId: "ignore-water",
    system: "water",
    statusBadge: "PUMP POWER OFF · LOOP STALLED",
    chain: {
      actionTitle: "Switching off water system",
      actionDetail: "Leaving the recovery pump unpowered to save electricity.",
      equipmentState: "Collection tray overflows; puddles accumulate around electrical conduits.",
      outpostEffect: "Water reserves stagnate while moisture pools on electronics; humidity alarm triggers.",
      micaExplanation: "Saving a few watts doesn't help if it stops our water recycler from keeping the crew hydrated.",
    },
    soundCue: "equipment-warn",
  },
  "water-discard": {
    choiceId: "water-discard",
    system: "water",
    statusBadge: "RECOVERY STREAM CUT",
    chain: {
      actionTitle: "Discarding moisture cloth in trash",
      actionDetail: "Wiping condensation and tossing the damp cloth into waste disposal.",
      equipmentState: "The wet cloth is locked in the trash airlock, cut off from the recovery pipes.",
      outpostEffect: "The recycled water reservoir remains empty; valuable moisture is discarded forever.",
      micaExplanation: "Wiping only works if that captured water is squeezed back into the recycling filtration system.",
    },
    soundCue: "equipment-warn",
  },
  "water-bypass": {
    choiceId: "water-bypass",
    system: "water",
    statusBadge: "PURITY ALERT · UNFILTERED WATER",
    chain: {
      actionTitle: "Bypassing water filter",
      actionDetail: "Routing window runoff directly to drinking tanks without filtration.",
      equipmentState: "Bio-contaminant sensors detect dust and bacteria; emergency shut-off halts the loop.",
      outpostEffect: "Tanks lock to prevent contaminated water from entering the drinking supply.",
      micaExplanation: "Never skip the cleaning filter! Condensed water can carry dust and microbes that make astronauts sick.",
    },
    soundCue: "equipment-warn",
  },
  "water-heater": {
    choiceId: "water-heater",
    system: "water",
    statusBadge: "HEATER AT MAX · STEAM EXPANDING",
    chain: {
      actionTitle: "Blasting cabin heater",
      actionDetail: "Cranking the heater to vaporize window droplets.",
      equipmentState: "Heater coils draw heavy power; water evaporates back into hot, humid cabin air.",
      outpostEffect: "Power drains rapidly; humidity climbs back up and droplets re-condense on other cold walls.",
      micaExplanation: "Heating turns liquid water into gas, but doesn't store it. It just moves the humidity somewhere else!",
    },
    soundCue: "equipment-warn",
  },
  "water-outside": {
    choiceId: "water-outside",
    system: "water",
    statusBadge: "TRAY DETACHED FROM BASE",
    chain: {
      actionTitle: "Moving collection tray outside",
      actionDetail: "Carrying the water collection tray out onto the lunar surface.",
      equipmentState: "Water instantly boils in the vacuum, then freezes into scattered ice crystals.",
      outpostEffect: "The collected water is lost to the Moon; recycler pipes inside the base run dry.",
      micaExplanation: "Without atmospheric pressure, liquid water cannot exist outside. It boiled and vanished into space.",
    },
    soundCue: "equipment-warn",
  },

  // === Mission 3: Habitat Airlock ===
  "more-air": {
    choiceId: "more-air",
    system: "airlock",
    statusBadge: "HATCH SEAL LEAK · PRESSURE DROPPING",
    chain: {
      actionTitle: "Opening second oxygen tank",
      actionDetail: "Feeding fresh air into the habitat while the hatch is still unsealed.",
      equipmentState: "A steady hiss sounds at the door; high-pressure oxygen streams past the jammed packing strip.",
      outpostEffect: "Oxygen reserves drain at double speed; habitat pressure continues to fall.",
      micaExplanation: "Pumping more air into a leaky room just blows more oxygen outside. We have to seal the leak first!",
    },
    soundCue: "equipment-warn",
  },
  "mute-alarm": {
    choiceId: "mute-alarm",
    system: "airlock",
    statusBadge: "ALARM SILENCED · PRESSURE FALLING",
    chain: {
      actionTitle: "Muting the pressure warning",
      actionDetail: "Silencing the cabin alarm to wait and see if the reading stabilizes.",
      equipmentState: "The audio alert goes silent, but the digital barometer needle continues sinking.",
      outpostEffect: "Oxygen reserve steadily drops; habitat enters low-pressure caution state.",
      micaExplanation: "Silencing a warning doesn't fix what triggered it. The packing strip is still stuck in the door seal.",
    },
    soundCue: "equipment-warn",
  },
  "air-cover-sensor": {
    choiceId: "air-cover-sensor",
    system: "airlock",
    statusBadge: "WARNING LIGHT COVERED",
    chain: {
      actionTitle: "Covering the warning light",
      actionDetail: "Putting tape over the flashing amber warning beacon.",
      equipmentState: "The amber glow is hidden, but the physical leak continues uninterrupted.",
      outpostEffect: "Oxygen levels slip into emergency reserve; the hiss at the airlock seal grows louder.",
      micaExplanation: "Covering an indicator light doesn't solve the physical problem. The air is still escaping.",
    },
    soundCue: "equipment-warn",
  },
  "air-fans": {
    choiceId: "air-fans",
    system: "airlock",
    statusBadge: "CABIN FANS AT 100%",
    chain: {
      actionTitle: "Running ventilation fans on high",
      actionDetail: "Spinning ceiling circulation fans to blow air around the habitat.",
      equipmentState: "Fans pull heavy electrical current; swirling air creates drafts toward the leaky hatch.",
      outpostEffect: "Power is wasted and oxygen continues escaping through the unsealed door.",
      micaExplanation: "Circulating air inside doesn't seal the air from getting out. Fix the doorway first!",
    },
    soundCue: "equipment-warn",
  },
  "air-push-strip": {
    choiceId: "air-push-strip",
    system: "airlock",
    statusBadge: "SEAL DEFORMED",
    chain: {
      actionTitle: "Forcing door latch over packing strip",
      actionDetail: "Slamming the heavy latch down against the wedged foam strip.",
      equipmentState: "The latch mechanism jams half-closed; the rubber seal pinches and deforms.",
      outpostEffect: "The leak gap widens; oxygen hisses faster through the distorted seal.",
      micaExplanation: "Never force a latch closed over an obstruction! It bends the seal and makes the gap bigger.",
    },
    soundCue: "equipment-warn",
  },
  "air-reset-display": {
    choiceId: "air-reset-display",
    system: "airlock",
    statusBadge: "GAUGE REBOOTING",
    chain: {
      actionTitle: "Rebooting the pressure monitor",
      actionDetail: "Restarting the computer screen hoping for a better number.",
      equipmentState: "The screen turns black, reboots, and immediately reports the pressure falling again.",
      outpostEffect: "valuable time is lost while oxygen continues seeping into the lunar vacuum.",
      micaExplanation: "The meter was telling the truth! Restarting a computer gauge doesn't repair the leaky door.",
    },
    soundCue: "equipment-warn",
  },

  // === Mission 4: Rover Track ===
  "boost-motor": {
    choiceId: "boost-motor",
    system: "rover",
    statusBadge: "ROVER MOTOR OVERHEATING · 88°C",
    chain: {
      actionTitle: "Gunning motor to maximum throttle",
      actionDetail: "Commanding the drive motors to spin with 100% torque against the wedged stone.",
      equipmentState: "The wheel tires slip violently; gears whine and motor coils heat up dangerously.",
      outpostEffect: "Battery reserve drops sharply; thermal protection shuts MICA's drive system down.",
      micaExplanation: "Applying brute force against a solid rock just burns electricity and risks breaking MICA's gearbox.",
    },
    soundCue: "equipment-warn",
  },
  "leave-mica": {
    choiceId: "leave-mica",
    system: "rover",
    statusBadge: "ROVER STRANDED · SAMPLES IN JEOPARDY",
    chain: {
      actionTitle: "Leaving MICA behind on the trail",
      actionDetail: "Deciding to walk back alone and retrieve the rover later.",
      equipmentState: "MICA powers down to standby; cold lunar shadow begins creeping toward the chassis.",
      outpostEffect: "Science box remains trapped on MICA's rack; next mission goals cannot proceed.",
      micaExplanation: "Astronauts and rovers work as a team. We need MICA and the sample box to complete our mission!",
    },
    soundCue: "equipment-warn",
  },
  "rover-push": {
    choiceId: "rover-push",
    system: "rover",
    statusBadge: "SAFETY INTERLOCK ENGAGED",
    chain: {
      actionTitle: "Pushing rover while motor is spinning",
      actionDetail: "Trying to muscle the chassis forward while drive wheels are active.",
      equipmentState: "Suit proximity alert screams; safety interlock cuts motor to protect Scout's hands.",
      outpostEffect: "Power is wasted and the rock remains wedged tightly against the wheel hub.",
      micaExplanation: "Safety first! Always power down machinery before working beside a trapped wheel.",
    },
    soundCue: "equipment-warn",
  },
  "rover-camera": {
    choiceId: "rover-camera",
    system: "rover",
    statusBadge: "NEW CAMERA INSTALLED · STILL STUCK",
    chain: {
      actionTitle: "Replacing MICA's navigation camera",
      actionDetail: "Swapping out the camera sensor instead of freeing the blocked wheel.",
      equipmentState: "The new lens produces a crystal-clear high-definition photo of the exact same stuck pebble.",
      outpostEffect: "Outpost parts and time spent, but the rover wheels cannot turn an inch.",
      micaExplanation: "Fix the part your evidence pointed to! The camera could see fine; it was the wheel that was jammed.",
    },
    soundCue: "equipment-warn",
  },
  "rover-steer": {
    choiceId: "rover-steer",
    system: "rover",
    statusBadge: "STEERING SERVO STRAIN",
    chain: {
      actionTitle: "Wiggling steering back and forth",
      actionDetail: "Twisting the steering servo rapidly against the trapped rock.",
      equipmentState: "The steering arm pushes against the unyielding stone; servo motor draws heavy power.",
      outpostEffect: "Steering linkage flexes under strain; the rock remains firmly wedged.",
      micaExplanation: "The rock doesn't move when steered into. We need to clear the physical obstruction with tools.",
    },
    soundCue: "equipment-warn",
  },
  "rover-tow": {
    choiceId: "rover-tow",
    system: "rover",
    statusBadge: "TRAIL ROUGH · MORE ROCKS AHEAD",
    chain: {
      actionTitle: "Dragging MICA through the boulder field",
      actionDetail: "Towing the rover along the rough short route with sharp jagged rocks.",
      equipmentState: "Chassis scrapes over jagged basalt; two more wheels get wedged into crevices.",
      outpostEffect: "Rover becomes even more deeply stuck; recovery requires clearing multiple wheels.",
      micaExplanation: "The short route caused this problem! The longer, smooth detour you scouted is the safe way home.",
    },
    soundCue: "equipment-warn",
  },

  // === Mission 5: Science Bench ===
  "mix-samples": {
    choiceId: "mix-samples",
    system: "sample",
    statusBadge: "SAMPLES CONTAMINATED · DATA LOST",
    chain: {
      actionTitle: "Putting both rocks in one container",
      actionDetail: "Tossing the crater sample and habitat sample together into a single pouch.",
      equipmentState: "The rocks bump and grind against each other, mixing dust grains and fragments.",
      outpostEffect: "Earth scientists will be unable to tell which minerals came from which lunar site.",
      micaExplanation: "When samples mix, their unique scientific stories are scrambled. Every discovery needs clean separation.",
    },
    soundCue: "equipment-warn",
  },
  "polish-samples": {
    choiceId: "polish-samples",
    system: "sample",
    statusBadge: "SURFACE CONTAMINATED BY GREASE",
    chain: {
      actionTitle: "Polishing rocks with dirty work cloth",
      actionDetail: "Buffing the samples with a used maintenance rag to make them shiny.",
      equipmentState: "Machine grease and synthetic fibers from the rag rub into the porous lunar regolith.",
      outpostEffect: "Spectrometer detects human tool grease on the rock; pure lunar evidence is tainted.",
      micaExplanation: "Science is about truth, not shininess! Wiping samples with dirty cloth destroys primordial lunar evidence.",
    },
    soundCue: "equipment-warn",
  },
  "sample-no-label": {
    choiceId: "sample-no-label",
    system: "sample",
    statusBadge: "UNLABELED CONTAINERS",
    chain: {
      actionTitle: "Sealing containers without labels",
      actionDetail: "Packing the rocks into clean jars but skipping the field coordinate tags.",
      equipmentState: "Two identical-looking grey rocks sit in identical sealed jars without ID markings.",
      outpostEffect: "Without origin tags, laboratories on Earth cannot verify where either rock was gathered.",
      micaExplanation: "Earth wasn't here to watch you pick them up! A rock without a location record is just an unknown pebble.",
    },
    soundCue: "equipment-warn",
  },
  "sample-food-bag": {
    choiceId: "sample-food-bag",
    system: "sample",
    statusBadge: "ORGANIC CONTAMINATION DETECTED",
    chain: {
      actionTitle: "Storing samples in old snack pouch",
      actionDetail: "Saving the clean containers and dropping the rocks into an empty food bag.",
      equipmentState: "Salt and sugar residue inside the pouch coat the ancient lunar mineral surface.",
      outpostEffect: "Science scanner alarms sound: false detection of biological sugars on the Moon.",
      micaExplanation: "Food residue contaminates geological samples! Always use pristine, sterile collection boxes.",
    },
    soundCue: "equipment-warn",
  },
  "sample-vague-label": {
    choiceId: "sample-vague-label",
    system: "sample",
    statusBadge: "VAGUE METADATA ERROR",
    chain: {
      actionTitle: "Writing 'Moon rock' on both jars",
      actionDetail: "Slapping the same generic title on two different collection containers.",
      equipmentState: "Both containers share identical non-descriptive labels.",
      outpostEffect: "Database cannot differentiate the deep-crater basalt from the surface soil sample.",
      micaExplanation: "Both came from the Moon, but from different geological features! Specific labels matter.",
    },
    soundCue: "equipment-warn",
  },
  "sample-gloves": {
    choiceId: "sample-gloves",
    system: "sample",
    statusBadge: "TOOL DUST ON SAMPLES",
    chain: {
      actionTitle: "Handling rocks with oily repair gloves",
      actionDetail: "Picking up delicate mineral specimens with gloves covered in rover lubricant.",
      equipmentState: "Petroleum grease from the rover rescue transfers directly to the crystal grains.",
      outpostEffect: "The analytical bench flags the specimen as contaminated with industrial synthetic oils.",
      micaExplanation: "Clean hands for clean science! Swap greasy repair gloves for fresh science tools.",
    },
    soundCue: "equipment-warn",
  },

  // === Mission 6: Communications Mast ===
  "radio-full": {
    choiceId: "radio-full",
    system: "comms",
    statusBadge: "TRANSMITTER OVERLOAD · BLOCKED BY RIDGE",
    chain: {
      actionTitle: "Blasting transmitter at maximum power",
      actionDetail: "Turning amplifier gain to 100% while antenna is pointed directly into a solid hill.",
      equipmentState: "Radio waves reflect off the rocky crater ridge and bounce harmlessly into the dirt.",
      outpostEffect: "Power reserves plunge as the transmitter overheats; Earth receives zero data packets.",
      micaExplanation: "A louder voice doesn't travel through a mountain! We need to aim around the ridge at the orbital relay.",
    },
    soundCue: "equipment-warn",
  },
  "erase-records": {
    choiceId: "erase-records",
    system: "comms",
    statusBadge: "PROTECTION INTERLOCK ENGAGED",
    chain: {
      actionTitle: "Deleting science records to shrink message",
      actionDetail: "Erasing all mission logs hoping a tiny packet might sneak through.",
      equipmentState: "Mission safety computer prevents file deletion and locks the transmitter console.",
      outpostEffect: "Valuable antenna alignment time is lost; the misdirected dish is still aimed at the ridge.",
      micaExplanation: "Never throw away your hard-won discoveries! The message size wasn't the problem—the dish direction was.",
    },
    soundCue: "equipment-warn",
  },
  "relay-habitat": {
    choiceId: "relay-habitat",
    system: "comms",
    statusBadge: "BEAM AIMED AT CABIN WALL",
    chain: {
      actionTitle: "Pointing antenna at the habitat",
      actionDetail: "Aiming the transmission beam toward our own living quarters.",
      equipmentState: "The high-gain radio signal bounces off the habitat metal roof with loud static.",
      outpostEffect: "Cabin electronics buzz with interference; zero signal reaches space or Earth.",
      micaExplanation: "The habitat doesn't have an interplanetary relay! Check the sky map for the satellite.",
    },
    soundCue: "equipment-warn",
  },
  "relay-no-ack": {
    choiceId: "relay-no-ack",
    system: "comms",
    statusBadge: "RECEIVER OFF · UNCONFIRMED",
    chain: {
      actionTitle: "Shutting off receiver after transmission",
      actionDetail: "Sending one blind burst and immediately powering off the radio.",
      equipmentState: "The receiver goes dead just as Earth's orbital relay sends back a data-check ping.",
      outpostEffect: "The transmission is dropped as incomplete; no confirmation receipt arrives.",
      micaExplanation: "Communication is a two-way conversation. You have to listen for the reply to know they heard you!",
    },
    soundCue: "equipment-warn",
  },
  "relay-repeat": {
    choiceId: "relay-repeat",
    system: "comms",
    statusBadge: "TRANSMISSION BLOCKED REPEATEDLY",
    chain: {
      actionTitle: "Repeatedly sending into the same hill",
      actionDetail: "Pounding the send button 50 times without changing the antenna direction.",
      equipmentState: "Every single pulse slams into the same basalt ridge and scatters in all directions.",
      outpostEffect: "Radio battery drains heavily while the antenna orientation stays misaligned.",
      micaExplanation: "Doing the same thing again and again won't move the mountain. Turn the dish toward the open sky!",
    },
    soundCue: "equipment-warn",
  },
  "relay-below": {
    choiceId: "relay-below",
    system: "comms",
    statusBadge: "DISH POINTED AT REGOLITH",
    chain: {
      actionTitle: "Aiming antenna down at the ground",
      actionDetail: "Tilting the dish downward toward the dusty crater floor.",
      equipmentState: "The parabolic dish points directly into the grey lunar dirt at Scout's feet.",
      outpostEffect: "Signal absorbed immediately by lunar soil; orbital satellite overhead receives nothing.",
      micaExplanation: "The satellite relay is up in orbit around the Moon, not buried underground! Look upward.",
    },
    soundCue: "equipment-warn",
  },
};

// ---------------------------------------------------------------------------
// 2. Authored Quick-Decision Moments for Selected Failure Branches
// ---------------------------------------------------------------------------
export const QUICK_DECISIONS: Record<string, QuickDecision> = {
  // Mission 1: Solar Panel
  "wait-wind": {
    choiceId: "wait-wind",
    prompt: "What should we do first?",
    micaCall: "The panel is making less power while the dust sits there. What should we do first?",
    situation: "Power generation has plummeted to 14%. Equipment is drawing from backup batteries.",
    options: [
      {
        id: "solar-qd-devices",
        label: "Switch on every backup device",
        kind: "impulsive",
        reaction: "That added more demand while the panel was still struggling. Batteries drained even faster!",
        lesson: "Adding more power loads when energy is scarce makes battery reserves collapse.",
        outpostStatus: "Battery drain accelerated · Demand spiked",
      },
      {
        id: "solar-qd-pause",
        label: "Pause optional equipment and check the panel with MICA",
        kind: "thoughtful",
        reaction: "Pausing optional lights gave us breathing room, but the dust still blocks the Sun. Let's fix the root cause.",
        lesson: "Reducing nonessential demand stabilizes reserves while you investigate the real physical problem.",
        outpostStatus: "Demand stabilized · Dust still blocks array",
      },
      {
        id: "solar-qd-cover",
        label: "Cover more of the panel to protect it",
        kind: "impulsive",
        reaction: "Covering the array blocked even more sunlight! Now generation is down to zero.",
        lesson: "Hiding equipment doesn't solve the problem; solar cells need clear, direct sunlight.",
        outpostStatus: "Total shadow · Generation 0%",
      },
    ],
  },
  "solar-cover": {
    choiceId: "solar-cover",
    prompt: "What should we do first?",
    micaCall: "The cover is on, but light still can't get through the grime underneath! What should we do first?",
    situation: "The cells are trapped under dirty glass. Solar output remains dangerously low.",
    options: [
      {
        id: "solar-cov-qd-rip",
        label: "Rip the cover off quickly and throw it",
        kind: "impulsive",
        reaction: "Yanking it threw loose dust all over MICA's camera! The panel is just as dusty as before.",
        lesson: "Rushing with frustration creates new problems without solving the original one.",
        outpostStatus: "Dust kicked into air · Camera obscured",
      },
      {
        id: "solar-cov-qd-assess",
        label: "Remove the cover calmly and inspect the surface with the dry tool",
        kind: "thoughtful",
        reaction: "Good thinking. Taking a breath and inspecting the surface shows the dry brush is ready.",
        lesson: "Careful inspection reveals the right maintenance tool for the job.",
        outpostStatus: "Surface visible · Approved brush identified",
      },
      {
        id: "solar-cov-qd-tape",
        label: "Add another layer of plastic tape",
        kind: "impulsive",
        reaction: "More tape made the window even darker. Sunlight cannot penetrate thick layers of plastic.",
        lesson: "Adding more barriers between solar cells and the Sun reduces energy even further.",
        outpostStatus: "Darkened surface · Generation trapped",
      },
    ],
  },

  // Mission 2: Water Loop
  "vent-steam": {
    choiceId: "vent-steam",
    prompt: "What should we do first?",
    micaCall: "The vent valve opened and moisture is hissing out into space! What should we do first?",
    situation: "Water vapor is venting through the exterior exhaust port into the lunar vacuum.",
    options: [
      {
        id: "water-qd-valve",
        label: "Close the exhaust valve immediately and seal the loop",
        kind: "thoughtful",
        reaction: "Valve closed! That stopped the air leak, but the window drops still need to be recycled.",
        lesson: "Quickly isolating a leak stops further loss, giving you time to use the proper recycling loop.",
        outpostStatus: "Vent valve sealed · Droplets remain on window",
      },
      {
        id: "water-qd-wider",
        label: "Open the vent wider to clear the window faster",
        kind: "impulsive",
        reaction: "Opening it wider blew our entire humidity reserve into space! Now the cabin air is desert-dry.",
        lesson: "Speeding up a harmful action causes catastrophic resource loss.",
        outpostStatus: "Massive venting · Water lost to space",
      },
      {
        id: "water-qd-pour",
        label: "Splash drinking water on the window to rinse it",
        kind: "impulsive",
        reaction: "That dumped fresh drinking water into the vent stream! Water is far too precious to waste.",
        lesson: "Never throw good resources after bad; preserve remaining supplies.",
        outpostStatus: "Fresh water depleted · Vent still open",
      },
    ],
  },

  // Mission 3: Habitat Airlock
  "more-air": {
    choiceId: "more-air",
    prompt: "What should we do first?",
    micaCall: "The backup tank is dumping oxygen straight past the unsealed door! What should we do first?",
    situation: "Airlock pressure is dropping despite feeding extra oxygen into the habitat.",
    options: [
      {
        id: "air-qd-crank",
        label: "Crank the oxygen valve to full blast",
        kind: "impulsive",
        reaction: "Pumping air faster against an unsealed hatch just blew more oxygen into the vacuum of space!",
        lesson: "Feeding more resources into an open leak accelerates the loss without fixing the hole.",
        outpostStatus: "Oxygen venting at high velocity",
      },
      {
        id: "air-qd-isolate",
        label: "Isolate the feed, step back, and check the door seal with MICA",
        kind: "thoughtful",
        reaction: "Feed isolated! We saved the rest of the tank. Now we can see the packing strip blocking the door.",
        lesson: "Stopping the flow protects reserves while you inspect what is preventing the door from sealing.",
        outpostStatus: "Tanks protected · Obstruction pinpointed",
      },
      {
        id: "air-qd-siren",
        label: "Turn off the warning sirens so we can think",
        kind: "impulsive",
        reaction: "Silencing the noise didn't stop the pressure leak. The hiss at the doorway continues.",
        lesson: "Turning off alarms treats the noise, not the physical danger.",
        outpostStatus: "Silent cabin · Pressure still falling",
      },
    ],
  },

  // Mission 4: Rover Track
  "boost-motor": {
    choiceId: "boost-motor",
    prompt: "What should we do first?",
    micaCall: "My wheel is wedged tight and my motor temperature is climbing! What should we do first?",
    situation: "MICA's drive motor is drawing heavy current against a stubborn rock. Heat warning active.",
    options: [
      {
        id: "rover-qd-cut",
        label: "Cut motor power immediately and make the rover safe",
        kind: "thoughtful",
        reaction: "Motor powered down! That saved MICA's gearbox from burning out. The rock is still in the wheel, though.",
        lesson: "Safety comes first: power down strained machinery before investigating mechanical jams.",
        outpostStatus: "Motors safe · Temperature cooling · Wheel blocked",
      },
      {
        id: "rover-qd-reverse",
        label: "Slam the throttle into reverse at maximum power",
        kind: "impulsive",
        reaction: "The sudden reversal ground the drive gears with a loud clatter! The stone didn't budge.",
        lesson: "Jerking mechanical parts under heavy load can strip gears and damage motors.",
        outpostStatus: "Gearbox strain alert · Rock still wedged",
      },
      {
        id: "rover-qd-kick",
        label: "Kick the rover tire with your heavy space boot",
        kind: "impulsive",
        reaction: "Ouch! Kicking a metal wheel in a pressurized spacesuit risks tearing your suit fabric.",
        lesson: "Never use physical aggression against equipment. Always use approved tools safely.",
        outpostStatus: "Suit caution warning · Wheel unmoved",
      },
    ],
  },

  // Mission 5: Science Bench
  "mix-samples": {
    choiceId: "mix-samples",
    prompt: "What should we do first?",
    micaCall: "Both rocks are rolling around together in the same bag! What should we do first?",
    situation: "Specimens from two distinct geological sites are rubbing together and mixing surface dust.",
    options: [
      {
        id: "sample-qd-shake",
        label: "Shake the container to see if they separate",
        kind: "impulsive",
        reaction: "Shaking ground them together even harder! Fragile crystal edges crumbled into mixed powder.",
        lesson: "Shaking mixed materials blends them deeper. Pause before touching delicate science evidence.",
        outpostStatus: "Mineral dust mixed · Evidence degraded",
      },
      {
        id: "sample-qd-pause",
        label: "Hold the container completely still and check the field map",
        kind: "thoughtful",
        reaction: "Good pause. Holding still stopped further damage. But Earth scientists will still need clean, separate samples.",
        lesson: "Pausing prevents compounding an error, letting you plan a proper clean collection.",
        outpostStatus: "Movement stopped · Need pristine collection",
      },
      {
        id: "sample-qd-guess",
        label: "Guess which one is which and stick quick labels on them",
        kind: "impulsive",
        reaction: "Guessing is not scientific proof! If Earth makes a discovery based on a guess, the science is untrustworthy.",
        lesson: "Scientific integrity means recording verified facts, never guessing when data is scrambled.",
        outpostStatus: "Unverified labels · Data untrusted",
      },
    ],
  },

  // Mission 6: Communications Mast
  "radio-full": {
    choiceId: "radio-full",
    prompt: "What should we do first?",
    micaCall: "The transmitter is overheating at 100% power, but the ridge is blocking every watt! What should we do first?",
    situation: "High-power radio amplifier is radiating heat into the mast. Transmission path blocked by basalt ridge.",
    options: [
      {
        id: "comm-qd-boost",
        label: "Overdrive the transmitter voltage even higher",
        kind: "impulsive",
        reaction: "The amplifier circuit tripped an emergency breaker! Now the radio has zero power.",
        lesson: "Pushing electronics beyond safety limits trips breakers and risks permanent hardware failure.",
        outpostStatus: "Circuit breaker tripped · Power dead",
      },
      {
        id: "comm-qd-reduce",
        label: "Drop transmitter power to standby and consult the relay orbital map",
        kind: "thoughtful",
        reaction: "Power dropped to standby. The battery is safe. Now we can see the clear sky angle on our map.",
        lesson: "Lowering power preserves battery reserves while you find an open line-of-sight communication path.",
        outpostStatus: "Transmitter cool · Clear path identified",
      },
      {
        id: "comm-qd-ground",
        label: "Point the dish at the ground to see if it bounces",
        kind: "impulsive",
        reaction: "Radio waves were completely absorbed by the lunar soil. Not a single decibel reached space.",
        lesson: "Radio waves do not magically bounce through planetary soil. Aim where the receiver is.",
        outpostStatus: "Signal absorbed in soil · No contact",
      },
    ],
  },
};

export function getConsequenceVisual(choiceId: string | null | undefined): ConsequenceVisual | null {
  if (!choiceId) return null;
  return CONSEQUENCE_VISUALS[choiceId] ?? null;
}

export function getQuickDecision(choiceId: string | null | undefined): QuickDecision | null {
  if (!choiceId) return null;
  return QUICK_DECISIONS[choiceId] ?? null;
}

