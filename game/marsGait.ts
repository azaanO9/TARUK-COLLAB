/** Authored EVA animation: distance-based strides, continuous flight poses,
 * and impact-weighted landing compression. World jump physics live in navigation.ts.
 */

export type MarsGaitPose = {
  // Hips / Pelvis
  hipOffsetY: number;       // Vertical oscillation in metres
  hipOffsetX: number;       // Lateral weight shift in metres
  hipPitch: number;         // Forward lean / pitch (radians)
  hipRoll: number;          // Lateral pelvic roll (radians)
  hipYaw: number;           // Pelvic twist / yaw (radians)

  // Spine & Chest
  spinePitch: number;       // Spine counter-pitch (radians)
  spineRoll: number;        // Spine counter-roll (radians)
  spineYaw: number;         // Spine counter-yaw (radians)

  // Left Leg
  leftThighPitch: number;   // Hip flexion/extension (radians)
  leftThighRoll: number;    // Stance stability (radians)
  leftKneePitch: number;    // Knee flexion (radians)
  leftAnklePitch: number;   // Foot dorsiflexion / plant (radians)

  // Right Leg
  rightThighPitch: number;
  rightThighRoll: number;
  rightKneePitch: number;
  rightAnklePitch: number;

  // Left Arm (Opposes left leg, syncs with right leg)
  leftArmPitch: number;     // Shoulder flexion/extension (radians)
  leftArmRoll: number;      // Space-suit lateral abduction (radians)
  leftArmYaw: number;       // Inward/outward rotation (radians)
  leftForearmPitch: number; // Elbow flexion (radians)

  // Right Arm (Opposes right leg, syncs with left leg)
  rightArmPitch: number;
  rightArmRoll: number;
  rightArmYaw: number;
  rightForearmPitch: number;
};

export type MarsGaitState = {
  phase: number;          // Stride phase in radians [0, 2*PI)
  blend: number;          // Locomotion blend [0 = idle, 1 = full gait]
  airborneBlend: number;  // Jump / airborne blend [0 = grounded, 1 = airborne]
  landingBlend: number;   // Landing compression blend [0 = recovered, 1 = max impact]
  prevAirborne: boolean;  // Tracks previous frame airborne state to detect touchdown
  impactSpeed: number;
  landingTime: number;
  landingStrength: number;
  time: number;           // Running time for idle oscillations
};

export function createMarsGaitState(): MarsGaitState {
  return {
    phase: 0,
    blend: 0,
    airborneBlend: 0,
    landingBlend: 0,
    prevAirborne: false,
    impactSpeed: 0,
    landingTime: 1,
    landingStrength: 0,
    time: 0,
  };
}

export type MarsGaitOptions = {
  gravityFactor?: number;      // 0.38 for Mars
  bounceAmplitude?: number;    // Vertical bounce height in metres (~0.11m)
  strideReach?: number;        // Forward leg extension in radians (~0.65 rad)
  armSwingAmplitude?: number;  // Arm counter-swing in radians (~0.48 rad)
  suitAbduction?: number;      // Base outward arm angle in radians (~0.24 rad)
};

const DEFAULT_OPTIONS: Required<MarsGaitOptions> = {
  gravityFactor: 0.38,
  bounceAmplitude: 0.08,
  strideReach: 0.52,
  armSwingAmplitude: 0.40,
  suitAbduction: 0.22,
};

/**
 * Step the Mars gait simulation and return the procedural bone angles and offsets.
 *
 * @param state Persistent gait state
 * @param speed Current horizontal speed (m/s)
 * @param isAirborne Whether the astronaut is in a jump or falling off terrain
 * @param dt Delta time in seconds
 * @param options Configurable tuning parameters
 */
export function stepMarsGait(
  state: MarsGaitState,
  speed: number,
  isAirborne: boolean,
  dt: number,
  options?: MarsGaitOptions,
  verticalVelocity = 0,
): MarsGaitPose {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const safeDt = Math.max(0, Math.min(dt, 0.1));

  state.time += safeDt;

  // 1. Blend towards walking when moving, decay to idle when stopped
  const targetBlend = speed > 0.12 && !isAirborne ? Math.min(speed / 1.5, 1) : 0;
  const blendRate = targetBlend > state.blend ? 8 : 5;
  state.blend += (targetBlend - state.blend) * (1 - Math.exp(-blendRate * safeDt));

  // Capture descent speed before the jump integrator resets velocity at contact.
  if (isAirborne) state.impactSpeed = Math.max(0, -verticalVelocity);
  if (state.prevAirborne && !isAirborne) {
    state.landingTime = 0;
    state.landingStrength = Math.min(1, Math.max(state.impactSpeed, -verticalVelocity) / 4.2);
  }
  state.prevAirborne = isAirborne;
  const targetAirborne = isAirborne ? 1 : 0;
  state.airborneBlend += (targetAirborne - state.airborneBlend) * (1 - Math.exp(-12 * safeDt));
  // Compression builds after contact, then recovers over half a second.
  state.landingTime += safeDt;
  const contactPhase = Math.min(1, state.landingTime / .52);
  state.landingBlend = Math.sin(Math.PI * contactPhase) ** 2 * state.landingStrength;

  // 3. Cadence & Phase Accumulation
  // Synchronized directly to ground travel: ~2.35m stride distance per 2-step cycle.
  // Distance-based cadence reduces visible skating as movement speed changes.
  const strideDistance = 2.35;
  const cadence = (Math.max(0.5, speed) / strideDistance) * (Math.PI * 2) * Math.sqrt(opts.gravityFactor / 0.38);
  if (state.blend > 0.005 && !isAirborne) {
    state.phase = (state.phase + cadence * safeDt) % (Math.PI * 2);
  }

  const p = state.phase;
  const b = state.blend;
  const ab = state.airborneBlend;
  const groundBlend = (1 - ab) * b;

  // 4. Low-Gravity Vertical Oscillation & Lateral Weight Shift
  // Parabolic float at the apex of each stride + lateral sway over stance leg
  const rawBounce = Math.sin(p) ** 2;
  let hipOffsetY = rawBounce * opts.bounceAmplitude * groundBlend;
  const hipOffsetX = Math.sin(p) * 0.022 * groundBlend;

  // 5. Pelvic Dynamics (Yaw, Roll, Forward Lean)
  const hipYaw = Math.sin(p) * 0.08 * groundBlend;
  const hipRoll = Math.cos(p) * 0.05 * groundBlend;
  // Forward lean increases with speed / sprint (GTA 5 character posture):
  const forwardLean = 0.03 + 0.09 * Math.min(speed / 5.5, 1.0);
  const hipPitch = (forwardLean + 0.03 * groundBlend) * (1 - ab);

  // 6. Spine Counter-Balance & Forward Drive
  const breathe = Math.sin(state.time * 1.8) * 0.018 * (1 - groundBlend);
  const idleSway = Math.sin(state.time * 0.8) * 0.012 * (1 - groundBlend);

  const spineYaw = -hipYaw * 0.7;
  const spineRoll = -hipRoll * 0.6 + idleSway;
  let spinePitch = forwardLean * 0.7 * groundBlend + breathe - ab * 0.05;

  // 7. Leg Dynamics (Forward Foot Plant, Heel Strike & Low-Gravity Grounding)
  // Left leg: phase p; Right leg: phase p + PI
  const leftPhase = p;
  const rightPhase = p + Math.PI;

  const sprintFactor = 1.0 + 0.22 * Math.min(Math.max(0, speed - 2.5) / 3.0, 1.0);

  const calcLeg = (legPhase: number) => {
    const s = Math.sin(legPhase);
    const c = Math.cos(legPhase);

    // Forward reach: extended forward during swing to absorb forward momentum in 0.38g
    const swingReach = s > 0 ? s * opts.strideReach * 1.08 * sprintFactor : s * opts.strideReach * 0.82;
    const thighPitch = swingReach * groundBlend;

    // Knee flexion: bends during swing (s > 0) to clear terrain, lifts higher in sprint
    const swingKnee = Math.max(0, s) * (0.64 * sprintFactor);
    const plantKnee = Math.max(0, -c) * 0.14; // soft landing absorption
    const kneePitch = (swingKnee + plantKnee) * groundBlend;

    // Ankle: dorsiflexes (toes up, heel strike) during swing;
    // flattens during stance, pushes off with toes at end of stance
    const ankleSwing = s > 0 ? -s * 0.22 : Math.max(-0.06, s * 0.16);
    const anklePitch = ankleSwing * groundBlend;

    return { thighPitch, kneePitch, anklePitch };
  };

  const leftLeg = calcLeg(leftPhase);
  const rightLeg = calcLeg(rightPhase);

  // 8. Arm Dynamics (Space-Suit Lateral Abduction & Counter-Balance)
  // Left arm opposes left leg (syncs with right leg phase); right arm opposes right leg
  const sprintArmFactor = 1.0 + 0.25 * Math.min(Math.max(0, speed - 2.5) / 3.0, 1.0);

  const calcArm = (armPhase: number, isLeft: boolean) => {
    const s = Math.sin(armPhase);
    const c = Math.cos(armPhase);

    // Forward/backward swing
    const armPitch = -s * opts.armSwingAmplitude * sprintArmFactor * groundBlend;

    // Natural EVA space-suit lateral abduction (suit pressure holds arms slightly outward)
    const baseAbduct = opts.suitAbduction;
    const armRoll = (baseAbduct + Math.abs(c) * 0.08 * groundBlend) * (isLeft ? 1 : -1);

    // Subtle arm yaw twist
    const armYaw = c * 0.08 * groundBlend * (isLeft ? 1 : -1);

    // Elbow: natural bent space-suit posture + extra flex during forward pump
    const forearmPitch = (0.38 + Math.max(0, -s) * 0.30 * sprintArmFactor) * groundBlend + (1 - groundBlend) * 0.25;

    return { armPitch, armRoll, armYaw, forearmPitch };
  };

  const leftArm = calcArm(leftPhase, true);
  const rightArm = calcArm(rightPhase, false);

  // 9. Low-Gravity Ballistic Jump Flight Dynamics (0.38g Mars Arc)
  if (ab > 0.01) {
    const ascent = Math.max(0, Math.min(1, verticalVelocity / 2));
    const descent = Math.max(0, Math.min(1, -verticalVelocity / 2));

    // Relaxed trailing legs in low-gravity float (iconic Apollo / Mars astronaut float)
    const floatLeftThigh = -.12 - .12 * ascent + .20 * descent;
    const floatRightThigh = .08 - .24 * ascent - .12 * descent;

    // Knees: flex during ascent & apex; extend downward anticipating landing on descent
    const floatLeftKnee = .42 - .16 * descent;
    const floatRightKnee = .36 - .14 * descent;

    // Feet: push off (plantarflex) on ascent; toes tilt up (dorsiflex heel first) on descent
    const floatAnkle = -.06 + .26 * ascent - .12 * descent;

    // Arms: float upward and outward in EVA pressurized balance posture
    const floatArmPitch = -.38 - .10 * ascent + .10 * descent;
    const floatArmRollExtra = 0.24;
    const floatForearm = 0.46;

    leftLeg.thighPitch = leftLeg.thighPitch * (1 - ab) + floatLeftThigh * ab;
    rightLeg.thighPitch = rightLeg.thighPitch * (1 - ab) + floatRightThigh * ab;
    leftLeg.kneePitch = leftLeg.kneePitch * (1 - ab) + floatLeftKnee * ab;
    rightLeg.kneePitch = rightLeg.kneePitch * (1 - ab) + floatRightKnee * ab;
    leftLeg.anklePitch = leftLeg.anklePitch * (1 - ab) + floatAnkle * ab;
    rightLeg.anklePitch = rightLeg.anklePitch * (1 - ab) + floatAnkle * ab;

    leftArm.armPitch = leftArm.armPitch * (1 - ab) + floatArmPitch * ab;
    rightArm.armPitch = rightArm.armPitch * (1 - ab) + floatArmPitch * ab;
    leftArm.armRoll += floatArmRollExtra * ab;
    rightArm.armRoll -= floatArmRollExtra * ab;
    leftArm.forearmPitch = leftArm.forearmPitch * (1 - ab) + floatForearm * ab;
    rightArm.forearmPitch = rightArm.forearmPitch * (1 - ab) + floatForearm * ab;

    spinePitch += (-.05 * ascent + .08 * descent) * ab;
  }

  // 10. Planetary Landing Impact Compression & Shock Absorption
  if (state.landingBlend > 0.005) {
    const lb = state.landingBlend;

    // Deep knee flexion to absorb the kinetic impact of the 100+ kg EVA suit
    leftLeg.kneePitch += 0.52 * lb;
    rightLeg.kneePitch += 0.52 * lb;

    // Thighs flex forward with landing crouch
    leftLeg.thighPitch += 0.22 * lb;
    rightLeg.thighPitch += 0.22 * lb;

    // Boots plant firmly against the Martian surface
    leftLeg.anklePitch -= 0.14 * lb;
    rightLeg.anklePitch -= 0.14 * lb;

    // Heavy life-support backpack momentum tilts spine forward
    spinePitch += 0.18 * lb;

    // Arms lower and flare outwards to steady balance
    leftArm.armPitch += 0.20 * lb;
    rightArm.armPitch += 0.20 * lb;
    leftArm.armRoll += 0.14 * lb;
    rightArm.armRoll -= 0.14 * lb;
    leftArm.forearmPitch += 0.26 * lb;
    rightArm.forearmPitch += 0.26 * lb;

    // Hips drop down in world space to absorb shock
    hipOffsetY -= 0.14 * lb;
  }

  return {
    hipOffsetY,
    hipOffsetX,
    hipPitch,
    hipRoll,
    hipYaw,
    spinePitch,
    spineRoll,
    spineYaw,
    leftThighPitch: leftLeg.thighPitch,
    leftThighRoll: -0.05 * groundBlend,
    leftKneePitch: leftLeg.kneePitch,
    leftAnklePitch: leftLeg.anklePitch,
    rightThighPitch: rightLeg.thighPitch,
    rightThighRoll: 0.05 * groundBlend,
    rightKneePitch: rightLeg.kneePitch,
    rightAnklePitch: rightLeg.anklePitch,
    leftArmPitch: leftArm.armPitch,
    leftArmRoll: leftArm.armRoll,
    leftArmYaw: leftArm.armYaw,
    leftForearmPitch: leftArm.forearmPitch,
    rightArmPitch: rightArm.armPitch,
    rightArmRoll: rightArm.armRoll,
    rightArmYaw: rightArm.armYaw,
    rightForearmPitch: rightArm.forearmPitch,
  };
}
