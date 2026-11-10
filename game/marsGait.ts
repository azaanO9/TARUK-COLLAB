/**
 * Procedural Mars-Walking Gait Engine
 *
 * Implements low-gravity (approx. 0.38g) locomotion physics for a human in an
 * EVA planetary space suit:
 * 1. Bounding / Floatiness: Slower, floating stride frequency with higher vertical
 *    oscillation (sinusoidal hip bounce with extended ballistic hang time).
 * 2. Foot Plant: Legs extend forward during strides to absorb forward momentum.
 * 3. Counter-Balance: Arms sway in opposition to the legs with space-suit lateral abduction.
 * 4. Grounding: Smooth foot arc and plant angles to prevent clipping or floating weightlessly.
 * 5. Airborne & Idle Blending: Smooth transitions between stationary breathing, walking,
 *    and low-gravity jump/flight poses.
 */

export type MarsGaitPose = {
  // Hips / Pelvis
  hipOffsetY: number;       // Vertical oscillation in metres
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
  time: number;           // Running time for idle oscillations
};

export function createMarsGaitState(): MarsGaitState {
  return {
    phase: 0,
    blend: 0,
    airborneBlend: 0,
    time: 0,
  };
}

export type MarsGaitOptions = {
  gravityFactor?: number;      // 0.38 for Mars
  bounceAmplitude?: number;    // Vertical bounce height in metres (~0.08m)
  strideReach?: number;        // Forward leg extension in radians (~0.52 rad)
  armSwingAmplitude?: number;  // Arm counter-swing in radians (~0.36 rad)
  suitAbduction?: number;      // Base outward arm angle in radians (~0.22 rad)
};

const DEFAULT_OPTIONS: Required<MarsGaitOptions> = {
  gravityFactor: 0.38,
  bounceAmplitude: 0.085,
  strideReach: 0.52,
  armSwingAmplitude: 0.36,
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
): MarsGaitPose {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const safeDt = Math.max(0, Math.min(dt, 0.1));

  state.time += safeDt;

  // 1. Blend towards walking when moving, decay to idle when stopped
  const targetBlend = speed > 0.25 && !isAirborne ? Math.min(speed / 2.8, 1) : 0;
  const blendRate = targetBlend > state.blend ? 9 : 6;
  state.blend += (targetBlend - state.blend) * (1 - Math.exp(-blendRate * safeDt));

  // 2. Blend airborne state for low-gravity float
  const targetAirborne = isAirborne ? 1 : 0;
  state.airborneBlend += (targetAirborne - state.airborneBlend) * (1 - Math.exp(-12 * safeDt));

  // 3. Cadence & Phase Accumulation
  // Under 0.38g, natural pendulum stride is slower than Earth:
  // Base frequency ~ 1.2 Hz, scaling gently with speed
  const cadence = (1.4 + Math.min(speed / 4.0, 1.2) * 1.5) * Math.sqrt(opts.gravityFactor / 0.38);
  if (state.blend > 0.01) {
    state.phase = (state.phase + cadence * safeDt * Math.PI) % (Math.PI * 2);
  }

  const p = state.phase;
  const b = state.blend;
  const ab = state.airborneBlend;
  const groundBlend = (1 - ab) * b;

  // 4. Low-Gravity Vertical Oscillation (Sine wave bounding with ballistic hang time)
  // Two bounces per full stride cycle (one per step).
  // In 0.38g, push-off floats upward with a rounded ballistic apex:
  const rawBounce = Math.pow(Math.abs(Math.sin(p)), 0.85);
  const hipOffsetY = rawBounce * opts.bounceAmplitude * groundBlend;

  // 5. Pelvic Dynamics (Yaw & Roll)
  // Stance hip lifts slightly (roll); pelvis rotates forward with the swing leg (yaw)
  const hipYaw = Math.sin(p) * 0.08 * groundBlend;
  const hipRoll = Math.cos(p) * 0.05 * groundBlend;
  const hipPitch = (0.04 + 0.03 * groundBlend) * (1 - ab);

  // 6. Spine Counter-Balance & Idle Breathing
  // Spine twists opposite to hips to keep shoulders/helmet forward
  const breathe = Math.sin(state.time * 1.8) * 0.016 * (1 - groundBlend);
  const idleSway = Math.sin(state.time * 0.8) * 0.012 * (1 - groundBlend);

  const spineYaw = -hipYaw * 0.75;
  const spineRoll = -hipRoll * 0.65 + idleSway;
  const spinePitch = 0.02 * groundBlend + breathe - ab * 0.05;

  // 7. Leg Dynamics (Forward Foot Plant & Low-Gravity Grounding)
  // Left leg: phase p; Right leg: phase p + PI
  const leftPhase = p;
  const rightPhase = p + Math.PI;

  const calcLeg = (legPhase: number) => {
    const s = Math.sin(legPhase);
    const c = Math.cos(legPhase);

    // Forward reach: extended forward during swing to absorb forward momentum in 0.38g
    // Forward swing is positive pitch; backward push-off is negative pitch
    const swingReach = s > 0 ? s * opts.strideReach * 1.05 : s * opts.strideReach * 0.75;
    const thighPitch = swingReach * groundBlend;

    // Knee flexion: bends during swing (s > 0) to clear terrain,
    // extends before touchdown, cushions into stance
    const swingKnee = Math.max(0, s) * 0.62;
    const plantKnee = Math.max(0, -c) * 0.14; // soft landing absorption
    const kneePitch = (swingKnee + plantKnee) * groundBlend;

    // Ankle: dorsiflexes (toes up) during swing to avoid stubbing;
    // flattens during stance for firm grounding without clipping
    const ankleSwing = s > 0 ? -s * 0.22 : Math.max(-0.06, s * 0.15);
    const anklePitch = ankleSwing * groundBlend;

    return { thighPitch, kneePitch, anklePitch };
  };

  const leftLeg = calcLeg(leftPhase);
  const rightLeg = calcLeg(rightPhase);

  // 8. Arm Dynamics (Space-Suit Lateral Abduction & Counter-Balance)
  // Left arm opposes left leg (syncs with right leg phase); right arm opposes right leg
  const calcArm = (armPhase: number, isLeft: boolean) => {
    const s = Math.sin(armPhase);
    const c = Math.cos(armPhase);

    // Forward/backward swing
    const armPitch = -s * opts.armSwingAmplitude * groundBlend;

    // Natural EVA space-suit lateral abduction (suit pressure holds arms slightly outward)
    const baseAbduct = opts.suitAbduction;
    const armRoll = (baseAbduct + Math.abs(c) * 0.06 * groundBlend) * (isLeft ? 1 : -1);

    // Subtle arm yaw twist
    const armYaw = c * 0.06 * groundBlend * (isLeft ? 1 : -1);

    // Elbow: natural bent space-suit posture + extra flex during forward pump
    const forearmPitch = (0.35 + Math.max(0, -s) * 0.22) * groundBlend + (1 - groundBlend) * 0.25;

    return { armPitch, armRoll, armYaw, forearmPitch };
  };

  const leftArm = calcArm(leftPhase, true);
  const rightArm = calcArm(rightPhase, false);

  // 9. Airborne / Low-Gravity Jump Blend
  // In low gravity, legs hang relaxed with soft knee bend; arms raise for balance
  if (ab > 0.01) {
    const floatThigh = -0.15 * ab;
    const floatKnee = 0.28 * ab;
    const floatArmPitch = -0.38 * ab;
    const floatArmRollExtra = 0.18 * ab;

    leftLeg.thighPitch = leftLeg.thighPitch * (1 - ab) + floatThigh;
    rightLeg.thighPitch = rightLeg.thighPitch * (1 - ab) + floatThigh;
    leftLeg.kneePitch = leftLeg.kneePitch * (1 - ab) + floatKnee;
    rightLeg.kneePitch = rightLeg.kneePitch * (1 - ab) + floatKnee;

    leftArm.armPitch = leftArm.armPitch * (1 - ab) + floatArmPitch;
    rightArm.armPitch = rightArm.armPitch * (1 - ab) + floatArmPitch;
    leftArm.armRoll += floatArmRollExtra;
    rightArm.armRoll -= floatArmRollExtra;
  }

  return {
    hipOffsetY,
    hipPitch,
    hipRoll,
    hipYaw,
    spinePitch,
    spineRoll,
    spineYaw,
    leftThighPitch: leftLeg.thighPitch,
    leftThighRoll: -0.04 * groundBlend,
    leftKneePitch: leftLeg.kneePitch,
    leftAnklePitch: leftLeg.anklePitch,
    rightThighPitch: rightLeg.thighPitch,
    rightThighRoll: 0.04 * groundBlend,
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
