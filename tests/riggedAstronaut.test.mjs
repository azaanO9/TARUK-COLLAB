import test from "node:test";
import assert from "node:assert/strict";
import {
  createMarsGaitState,
  stepMarsGait,
} from "../game/marsGait.ts";

test("Mars gait: initializes in clean idle state", () => {
  const state = createMarsGaitState();
  assert.equal(state.phase, 0);
  assert.equal(state.blend, 0);
  assert.equal(state.airborneBlend, 0);

  // Stepping with 0 speed should produce near-zero gait blend
  const pose = stepMarsGait(state, 0, false, 0.016);
  assert.ok(state.blend < 0.05, "Blend should stay low when stationary");
  assert.ok(Math.abs(pose.hipOffsetY) < 0.01, "Idle hip vertical offset should be near 0");
  assert.ok(Math.abs(pose.leftThighPitch) < 0.01, "Idle leg pitch should be near 0");
});

test("Mars gait: walking accumulates phase and increases blend", () => {
  const state = createMarsGaitState();
  for (let i = 0; i < 20; i++) {
    stepMarsGait(state, 3.2, false, 0.016);
  }
  assert.ok(state.blend > 0.5, "Blend should rise when moving at 3.2 m/s");
  assert.ok(state.phase > 0, "Phase should accumulate over time");
});

test("Mars gait: vertical hip bounce exhibits low-gravity bounding oscillation", () => {
  const state = createMarsGaitState();
  // Warm up blend
  for (let i = 0; i < 30; i++) {
    stepMarsGait(state, 3.0, false, 0.016);
  }

  // Sample across one full stride cycle and verify oscillation
  let minBounce = 1.0;
  let maxBounce = -1.0;
  for (let i = 0; i < 60; i++) {
    const pose = stepMarsGait(state, 3.0, false, 0.016);
    if (pose.hipOffsetY < minBounce) minBounce = pose.hipOffsetY;
    if (pose.hipOffsetY > maxBounce) maxBounce = pose.hipOffsetY;
  }

  assert.ok(maxBounce > 0.05, `Max hip bounce should reach low-gravity amplitude (got ${maxBounce}m)`);
  assert.ok(minBounce >= 0, `Min bounce should stay grounded (got ${minBounce}m)`);
  assert.ok(maxBounce - minBounce > 0.04, "Vertical oscillation amplitude must be clearly pronounced");
});

test("Mars gait: forward foot plant extends leg to absorb low-gravity momentum", () => {
  const state = createMarsGaitState();
  // Warm up
  for (let i = 0; i < 30; i++) {
    stepMarsGait(state, 3.5, false, 0.016);
  }

  let maxForwardPitch = -1;
  let maxBackPitch = 1;
  for (let i = 0; i < 80; i++) {
    const pose = stepMarsGait(state, 3.5, false, 0.016);
    if (pose.leftThighPitch > maxForwardPitch) maxForwardPitch = pose.leftThighPitch;
    if (pose.leftThighPitch < maxBackPitch) maxBackPitch = pose.leftThighPitch;
  }

  // Forward stride extends forward (> 0.4 rad, approx 25+ degrees)
  assert.ok(maxForwardPitch > 0.4, `Thigh forward reach should exceed 0.4 rad (got ${maxForwardPitch})`);
  assert.ok(maxBackPitch < -0.2, `Thigh backward push should reach back (got ${maxBackPitch})`);
});

test("Mars gait: arms sway in opposition to legs with space-suit lateral abduction", () => {
  const state = createMarsGaitState();
  // Warm up
  for (let i = 0; i < 30; i++) {
    stepMarsGait(state, 3.0, false, 0.016);
  }

  // Find a point where left leg is swung forward (leftThighPitch > 0.3)
  let foundOpposition = false;
  let observedAbduction = false;

  for (let i = 0; i < 80; i++) {
    const pose = stepMarsGait(state, 3.0, false, 0.016);
    // Arms maintain outward suit abduction (positive for left, negative for right)
    if (pose.leftArmRoll > 0.18 && pose.rightArmRoll < -0.18) {
      observedAbduction = true;
    }

    if (pose.leftThighPitch > 0.35) {
      // Left arm should swing back (counter-balance), right arm should swing forward
      assert.ok(pose.leftArmPitch < 0, `Left arm should pitch back when left leg reaches forward (got ${pose.leftArmPitch})`);
      assert.ok(pose.rightArmPitch > 0, `Right arm should pitch forward when left leg reaches forward (got ${pose.rightArmPitch})`);
      foundOpposition = true;
      break;
    }
  }

  assert.ok(foundOpposition, "Must exhibit arm-to-leg counter-balance opposition");
  assert.ok(observedAbduction, "Must exhibit space-suit outward arm abduction");
});

test("Mars gait: airborne/jump blends into low-gravity floating pose", () => {
  const state = createMarsGaitState();
  // Warm up in air
  for (let i = 0; i < 40; i++) {
    stepMarsGait(state, 2.0, true, 0.016);
  }

  const pose = stepMarsGait(state, 2.0, true, 0.016);
  assert.ok(state.airborneBlend > 0.9, "Airborne blend should be high when in air");
  assert.ok(pose.leftKneePitch > 0.15, "Airborne knees should have relaxed flexion");
  assert.ok(pose.leftArmPitch < -0.2, "Airborne arms should raise for low-gravity balance");
});

test("Mars gait: touchdown triggers physical landing impact compression and recovery", () => {
  const state = createMarsGaitState();

  // Jump into air
  for (let i = 0; i < 30; i++) {
    stepMarsGait(state, 2.5, true, 0.016, undefined, 2.0);
  }
  assert.equal(state.landingBlend, 0, "No landing compression while airborne");

  // Touchdown onto Mars surface
  let impactPose = stepMarsGait(state, 2.5, false, 0.016, undefined, -3.5);
  assert.ok(state.landingBlend < .05, "Compression should build smoothly after contact");
  for (let i = 0; i < 15; i++) impactPose = stepMarsGait(state, 0, false, .016);
  assert.ok(state.landingBlend > .8, "Landing compression should peak after contact");
  assert.ok(impactPose.leftKneePitch > 0.35, "Knees should flex deeply on landing impact");
  assert.ok(impactPose.hipOffsetY < 0, "Hips should compress downward on impact");

  // Recover over 30 frames (~0.5s)
  for (let i = 0; i < 30; i++) {
    stepMarsGait(state, 2.5, false, 0.016);
  }
  assert.ok(state.landingBlend < 0.05, "Landing compression should recover smoothly to walking stance");
});

test("Rigged skeleton: bone matching and procedural Mars deformation", async () => {
  const T = await import("three");
  const root = new T.Group();

  // Create mock skeleton matching user's bone names
  const hips = new T.Bone(); hips.name = "Hips"; hips.position.set(0, 1.0, 0); root.add(hips);
  const spine = new T.Bone(); spine.name = "Spine"; spine.position.set(0, 0.4, 0); hips.add(spine);
  const leftUpLeg = new T.Bone(); leftUpLeg.name = "LeftUpLeg"; leftUpLeg.position.set(-0.2, 0, 0); hips.add(leftUpLeg);
  const rightUpLeg = new T.Bone(); rightUpLeg.name = "RightUpLeg"; rightUpLeg.position.set(0.2, 0, 0); hips.add(rightUpLeg);
  const leftLeg = new T.Bone(); leftLeg.name = "LeftLeg"; leftLeg.position.set(0, -0.4, 0); leftUpLeg.add(leftLeg);
  const rightLeg = new T.Bone(); rightLeg.name = "RightLeg"; rightLeg.position.set(0, -0.4, 0); rightUpLeg.add(rightLeg);
  const leftArm = new T.Bone(); leftArm.name = "LeftArm"; leftArm.position.set(-0.35, 0.35, 0); spine.add(leftArm);
  const rightArm = new T.Bone(); rightArm.name = "RightArm"; rightArm.position.set(0.35, 0.35, 0); spine.add(rightArm);

  const state = createMarsGaitState();
  // Simulate 30 walking steps
  for (let i = 0; i < 30; i++) {
    const pose = stepMarsGait(state, 3.2, false, 0.016);
    // Apply hips vertical bounce
    hips.position.y = 1.0 + pose.hipOffsetY;
    leftUpLeg.rotation.x = pose.leftThighPitch;
    rightUpLeg.rotation.x = pose.rightThighPitch;
    leftArm.rotation.x = pose.leftArmPitch;
    rightArm.rotation.x = pose.rightArmPitch;
  }

  assert.ok(hips.position.y >= 1.0, "Hips should oscillate at or above rest position");
  assert.ok(Math.abs(leftUpLeg.rotation.x) > 0.05, "Left leg should have non-zero pitch during walk");
  assert.ok(Math.abs(rightArm.rotation.x) > 0.05, "Right arm should have non-zero pitch during walk");
});


test("Mars flight pose crosses ascent thresholds without snapping", () => {
  const before = createMarsGaitState();
  before.airborneBlend = 1;
  before.prevAirborne = true;
  const after = { ...before };
  const a = stepMarsGait(before, 0, true, 0, undefined, .601);
  const b = stepMarsGait(after, 0, true, 0, undefined, .599);
  for (const key of Object.keys(a)) assert.ok(Math.abs(a[key] - b[key]) < .002, key);
});

test("Mars landing captures descent velocity before ground integration resets it", () => {
  const soft = createMarsGaitState(), hard = createMarsGaitState();
  stepMarsGait(soft, 0, true, .016, undefined, -.5);
  stepMarsGait(hard, 0, true, .016, undefined, -4);
  for (let i = 0; i < 16; i++) {
    stepMarsGait(soft, 0, false, .016);
    stepMarsGait(hard, 0, false, .016);
  }
  assert.ok(hard.landingBlend > soft.landingBlend * 4);
});
