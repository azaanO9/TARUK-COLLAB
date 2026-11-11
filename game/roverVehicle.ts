/** Pure exploration rover vehicle physics, 6-wheel rocker-bogie suspension, and open-world kinematics. */
import { boxObstacle, moveAndSlide, overlapBody, overlapDisc, type CollisionObstacle } from "./collision.ts";
export const ROVER_LIMIT = 85;
export const ROVER_ENTER_RADIUS = 4.8;
export const ROVER_MAX_FORWARD = 30 / 3.6; // Authored exploration rover top speed: 30 km/h (~8.33 m/s)
export const ROVER_MAX_REVERSE = 10 / 3.6; // Authored exploration rover reverse limit: 10 km/h (~2.78 m/s)
export const ROVER_ACCELERATION = 1.6; // Authored gradual acceleration in m/s^2
export const ROVER_BRAKE = 4.5;        // m/s^2 active service brake
export const ROVER_HANDBRAKE = 7.5;    // m/s^2 emergency stop
export const ROVER_COAST_DRAG = 0.85;  // rolling friction m/s^2
export const ROVER_STEER_MAX = 0.52;   // ~30 degrees max front wheel turn
export const ROVER_STEER_SPEED = 3.4;  // rad/s steering response
export const ROVER_WHEEL_BASE = 2.849;   // meters between front and rear axles
export const ROVER_TRACK_WIDTH = 2.85;  // meters between left and right wheel track
export const ROVER_WHEEL_RADIUS = 0.3206;// meters inner tire radius
export const ROVER_WHEEL_OUTER_RADIUS = 0.3206; // tire + tread rib outer radius
export const ROVER_COLLISION_RADIUS = Math.hypot(1.69, 2.475);
export const roverFootprint = (x:number,z:number,yaw:number) => boxObstacle(x,z,1.69,2.475,"parked-rover",yaw);
export const ROVER_CHASSIS_CLEARANCE = 0.015; // anti-Z-fighting surface clearance bias

export const ROVER_WHEEL_OFFSETS: readonly (readonly [number, number])[] = [
  [-1.425, -1.0313], // 0: Front Left
  [1.425, -1.0313],  // 1: Front Right
  [-1.425, 0.3934],  // 2: Mid Left
  [1.425, 0.3934],   // 3: Mid Right
  [-1.425, 1.8179],  // 4: Rear Left
  [1.425, 1.8179],   // 5: Rear Right
];

export type RoverGear = "D" | "R" | "N";

export type RoverObstacle = CollisionObstacle;

export type RoverVehicle = {
  x: number;
  z: number;
  yaw: number;
  speed: number;        // forward positive, reverse negative (m/s)
  steerAngle: number;   // radians, positive left, negative right
  wheelRoll: number;    // cumulative wheel rotation in radians
  pitch: number;        // chassis terrain slope pitch in radians (positive = nose up)
  roll: number;         // chassis terrain slope roll in radians (positive = right side up)
  chassisY: number;     // anti-clipped world Y position of rover root
  wheelContacts: [number, number, number, number, number, number];
  wheelCompression: [number, number, number, number, number, number];
  leftRockerAngle: number;
  rightRockerAngle: number;
  leftBogieAngle: number;
  rightBogieAngle: number;
  mudDepth: number;     // 0..1 current soft regolith/mud factor under rover
  driving: boolean;     // whether astronaut is seated inside driving
  handbrake: boolean;   // whether handbrake is active
};

export function getRoverGear(speed: number): RoverGear {
  if (speed > 0.12) return "D";
  if (speed < -0.12) return "R";
  return "N";
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export function solveRockerBogieSuspension(
  x: number,
  z: number,
  yaw: number,
  prevChassisY: number,
  prevPitch: number,
  prevRoll: number,
  prevCompression: readonly number[],
  heightAt: (wx: number, wz: number) => number,
  mudAt: (wx: number, wz: number) => number,
  dt: number,
) {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);

  const contacts: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
  let mudSum = 0;

  for (let i = 0; i < 6; i++) {
    const [lx, lz] = ROVER_WHEEL_OFFSETS[i];
    const wx = x + lx * cosY + lz * sinY;
    const wz = z - lx * sinY + lz * cosY;
    const mud = clamp(mudAt(wx, wz), 0, 1);
    mudSum += mud;
    // Tires press slightly into soft mud while hard regolith holds zero sinkage
    const sink = mud * 0.075;
    contacts[i] = heightAt(wx, wz) - sink;
  }

  const mudDepth = mudSum / 6;
  const centerGround = heightAt(x, z) - mudDepth * 0.05;

  const frontAvg = 0.5 * (contacts[0] + contacts[1]);
  const rearAvg = 0.5 * (contacts[4] + contacts[5]);
  const leftAvg = (contacts[0] + contacts[2] + contacts[4]) / 3;
  const rightAvg = (contacts[1] + contacts[3] + contacts[5]) / 3;

  // Corrected right-handed Euler("YXZ") signs:
  // +pitch lifts -Z (front) UP; +roll lifts +X (right) UP.
  const targetPitch = Math.atan2(frontAvg - rearAvg, ROVER_WHEEL_BASE);
  const targetRoll = Math.atan2(rightAvg - leftAvg, ROVER_TRACK_WIDTH);

  const orientBlend = dt > 0 ? 1 - Math.exp(-14 * dt) : 1;
  const pitch = prevPitch + (targetPitch - prevPitch) * orientBlend;
  const roll = prevRoll + (targetRoll - prevRoll) * orientBlend;

  const sinP = Math.sin(pitch);
  const cosP = Math.cos(pitch);
  const sinR = Math.sin(roll);
  const verticalScale = cosP * Math.cos(roll);

  // Prevent belly skid frame (bottom at +0.34m) from clipping crests,
  // and prevent any individual wheel from exceeding maximum upward suspension travel (+0.32m).
  const maxComp = 0.32;
  let minChassisFromWheels = -Infinity;
  let supportHeight = 0;
  for (let i = 0; i < 6; i++) {
    const [lx, lz] = ROVER_WHEEL_OFFSETS[i];
    const planeOffset = lx * sinR * cosP - lz * sinP;
    supportHeight += (contacts[i] - planeOffset + ROVER_WHEEL_OUTER_RADIUS * (1 - verticalScale)) / 6;
    const req = contacts[i] - planeOffset + ROVER_WHEEL_OUTER_RADIUS * (1 - verticalScale) - maxComp * verticalScale;
    if (req > minChassisFromWheels) minChassisFromWheels = req;
  }
  const bellyGuardY = centerGround - 0.14;
  const targetChassisY = Math.max(supportHeight, bellyGuardY, minChassisFromWheels) + ROVER_CHASSIS_CLEARANCE;

  const heightBlend = dt > 0 ? 1 - Math.exp(-18 * dt) : 1;
  // Never lag below the required ground support height when climbing slopes or rocks
  const blendedY = prevChassisY + (targetChassisY - prevChassisY) * heightBlend;
  const chassisY = Math.max(blendedY, targetChassisY);

  const compression: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
  const suspBlend = dt > 0 ? 1 - Math.exp(-22 * dt) : 1;
  for (let i = 0; i < 6; i++) {
    const [lx, lz] = ROVER_WHEEL_OFFSETS[i];
    const nominalWheelBottomY = chassisY + lx * sinR * cosP - lz * sinP
      + ROVER_WHEEL_OUTER_RADIUS * (verticalScale - 1);
    const rawDelta = clamp((contacts[i] - nominalWheelBottomY) / Math.max(.1, verticalScale), -0.26, maxComp);
    const previous = prevCompression[i] ?? 0;
    const damped = previous + (rawDelta - previous) * suspBlend;
    compression[i] = Math.max(rawDelta, damped);
  }

  // Bogie pivots between Mid (z=0.0) and Rear (z=1.6), Rocker connects Front (z=-1.6) to Bogie pivot (z=+0.8)
  const leftBogieAngle = Math.atan2(compression[2] - compression[4], 1.6);
  const rightBogieAngle = Math.atan2(compression[3] - compression[5], 1.6);
  const leftBogieLift = 0.5 * (compression[2] + compression[4]);
  const rightBogieLift = 0.5 * (compression[3] + compression[5]);
  const leftRockerAngle = Math.atan2(compression[0] - leftBogieLift, 2.4);
  const rightRockerAngle = Math.atan2(compression[1] - rightBogieLift, 2.4);

  return {
    chassisY,
    pitch,
    roll,
    contacts,
    compression,
    leftRockerAngle,
    rightRockerAngle,
    leftBogieAngle,
    rightBogieAngle,
    mudDepth,
  };
}

export const spawnRoverVehicle = (
  x = 17,
  z = 10,
  yaw = 0,
  heightAt: (wx: number, wz: number) => number = () => 0,
): RoverVehicle => {
  const initialY = heightAt(x, z) + ROVER_CHASSIS_CLEARANCE;
  const settled = solveRockerBogieSuspension(
    x,
    z,
    yaw,
    initialY,
    0,
    0,
    [0, 0, 0, 0, 0, 0],
    heightAt,
    () => 0,
    0,
  );
  return {
    x,
    z,
    yaw,
    speed: 0,
    steerAngle: 0,
    wheelRoll: 0,
    pitch: settled.pitch,
    roll: settled.roll,
    chassisY: settled.chassisY,
    wheelContacts: settled.contacts,
    wheelCompression: settled.compression,
    leftRockerAngle: settled.leftRockerAngle,
    rightRockerAngle: settled.rightRockerAngle,
    leftBogieAngle: settled.leftBogieAngle,
    rightBogieAngle: settled.rightBogieAngle,
    mudDepth: 0,
    driving: false,
    handbrake: false,
  };
};

export function canEnterRover(
  walker: { x: number; z: number },
  rover: { x: number; z: number; driving: boolean },
  radius = ROVER_ENTER_RADIUS,
): boolean {
  if (rover.driving) return false;
  return Math.hypot(walker.x - rover.x, walker.z - rover.z) <= radius;
}

export function enterRover(rover: RoverVehicle): RoverVehicle {
  return {
    ...rover,
    driving: true,
    speed: 0,
    handbrake: false,
  };
}

export function exitRover(
  rover: RoverVehicle,
  obstacles: readonly RoverObstacle[] = [],
): { rover: RoverVehicle; exitPosition: { x: number; z: number } | null } {
  // Exit to the driver's side (left flank of the vehicle)
  let exitPosition: {x:number;z:number}|null=null;
  for(const [side,end] of [[-2.4,0],[2.4,0],[-2.4,1.5],[2.4,1.5],[0,3.2],[0,-3.2]]){
    const x=rover.x+Math.cos(rover.yaw)*side+Math.sin(rover.yaw)*end;
    const z=rover.z-Math.sin(rover.yaw)*side+Math.cos(rover.yaw)*end;
    if(Math.abs(x)>ROVER_LIMIT||Math.abs(z)>ROVER_LIMIT)continue;
    if(!obstacles.some(o=>o.id!=="rover"&&overlapDisc(x,z,.36,o))){exitPosition={x,z};break;}
  }
  if(!exitPosition)return {rover,exitPosition:null};
  return {
    rover: {
      ...rover,
      driving: false,
      speed: 0,
      handbrake: true,
    },
    exitPosition,
  };
}

export function stepRoverVehicle(
  rover: RoverVehicle,
  keys: ReadonlySet<string>,
  seconds: number,
  obstacles: readonly RoverObstacle[] = [],
  heightAt: (x: number, z: number) => number = () => 0,
  mudAt: (x: number, z: number) => number = () => 0,
): RoverVehicle {
  const dt = Math.max(0, Math.min(seconds, 0.05));
  if (dt <= 0) return rover;

  if (!rover.driving) {
    // When parked, friction holds the rover stationary and suspension settles on terrain
    const speed = Math.abs(rover.speed) < 0.05 ? 0 : rover.speed * Math.exp(-14 * dt);
    const settled = solveRockerBogieSuspension(
      rover.x,
      rover.z,
      rover.yaw,
      rover.chassisY,
      rover.pitch,
      rover.roll,
      rover.wheelCompression,
      heightAt,
      mudAt,
      dt,
    );
    return {
      ...rover,
      speed,
      handbrake: true,
      steerAngle: rover.steerAngle * Math.exp(-6 * dt),
      chassisY: settled.chassisY,
      pitch: settled.pitch,
      roll: settled.roll,
      wheelContacts: settled.contacts,
      wheelCompression: settled.compression,
      leftRockerAngle: settled.leftRockerAngle,
      rightRockerAngle: settled.rightRockerAngle,
      leftBogieAngle: settled.leftBogieAngle,
      rightBogieAngle: settled.rightBogieAngle,
      mudDepth: settled.mudDepth,
    };
  }

  const forwardKey = keys.has("w") || keys.has("arrowup");
  const reverseKey = keys.has("s") || keys.has("arrowdown");
  const leftKey = keys.has("a") || keys.has("arrowleft");
  const rightKey = keys.has("d") || keys.has("arrowright");
  const handbrakeKey = keys.has(" ") || keys.has("space") || keys.has("handbrake");

  let speed = clamp(rover.speed, -ROVER_MAX_REVERSE, ROVER_MAX_FORWARD);
  const handbrake = handbrakeKey;

  // SnowRunner mud drag slows top cruise speed slightly in deep soft regolith while keeping torque high
  const mudFactor = clamp(rover.mudDepth, 0, 1);
  const effectiveMaxForward = ROVER_MAX_FORWARD * (1 - mudFactor * 0.28);
  const effectiveCoastDrag = ROVER_COAST_DRAG * (1 + mudFactor * 1.15);

  // Steering angle rate of change
  const steerInput = Number(leftKey) - Number(rightKey);
  const targetSteer = steerInput * ROVER_STEER_MAX;
  const steerDiff = targetSteer - rover.steerAngle;
  const steerStep = ROVER_STEER_SPEED * dt;
  let steerAngle = rover.steerAngle;
  if (Math.abs(steerDiff) <= steerStep) {
    steerAngle = targetSteer;
  } else {
    steerAngle += Math.sign(steerDiff) * steerStep;
  }

  // Throttle and braking
  if (handbrakeKey) {
    if (speed > 0) {
      speed = Math.max(0, speed - ROVER_HANDBRAKE * dt);
    } else if (speed < 0) {
      speed = Math.min(0, speed + ROVER_HANDBRAKE * dt);
    }
  } else if (forwardKey && !reverseKey) {
    if (speed < 0) {
      speed = Math.min(0, speed + ROVER_BRAKE * dt);
    } else {
      speed = Math.min(effectiveMaxForward, speed + ROVER_ACCELERATION * dt);
    }
  } else if (reverseKey && !forwardKey) {
    if (speed > 0) {
      speed = Math.max(0, speed - ROVER_BRAKE * dt);
    } else {
      speed = Math.max(-ROVER_MAX_REVERSE, speed - ROVER_ACCELERATION * 0.75 * dt);
    }
  } else {
    if (speed > 0) {
      speed = Math.max(0, speed - effectiveCoastDrag * dt);
    } else if (speed < 0) {
      speed = Math.min(0, speed + effectiveCoastDrag * dt);
    }
  }

  // Turn rate: Ackermann bicycle kinematics
  // Forward in this coordinate system is along (-sin(yaw), -cos(yaw))
  let yaw = rover.yaw;
  if (Math.abs(speed) > 0.05) {
    const turnRate = (speed / ROVER_WHEEL_BASE) * Math.tan(steerAngle);
    yaw += turnRate * dt;
    while (yaw > Math.PI) yaw -= Math.PI * 2;
    while (yaw < -Math.PI) yaw += Math.PI * 2;
  }

  const solid = obstacles.filter(o=>o.id!=="rover"&&!o.traversable);
  // Reject rotation into nearby hardware instead of letting the rear swing through it.
  const turn=Math.atan2(Math.sin(yaw-rover.yaw),Math.cos(yaw-rover.yaw));
  let safeYaw=rover.yaw;
  const turns=Math.max(1,Math.ceil(Math.abs(turn)/.015));
  for(let i=1;i<=turns;i++){
    const candidate=rover.yaw+turn*i/turns, shape=roverFootprint(0,0,candidate);
    if(solid.some(o=>overlapBody(rover.x,rover.z,shape,o)))break;
    safeYaw=candidate;
  }
  yaw=safeYaw;
  const shape=roverFootprint(0,0,yaw);
  const moved=moveAndSlide(rover.x,rover.z,-Math.sin(yaw)*speed*dt,-Math.cos(yaw)*speed*dt,[shape],solid,ROVER_LIMIT);
  let x=moved.x,z=moved.z;
  const travelled=(x-rover.x)*-Math.sin(yaw)+(z-rover.z)*-Math.cos(yaw);
  if(moved.normals.length) speed=Math.sign(speed)*Math.min(Math.abs(speed),Math.max(0,travelled*Math.sign(speed)/dt));

  // Boundary limits
  if (x < -ROVER_LIMIT || x > ROVER_LIMIT) {
    x = Math.max(-ROVER_LIMIT, Math.min(ROVER_LIMIT, x));
    speed = 0;
  }
  if (z < -ROVER_LIMIT || z > ROVER_LIMIT) {
    z = Math.max(-ROVER_LIMIT, Math.min(ROVER_LIMIT, z));
    speed = 0;
  }

  // Wheel rolling rotation (subtle extra wheel spin in soft mud!)
  const slipRatio = 1 + mudFactor * 0.25;
  const wheelRoll = rover.wheelRoll + travelled * slipRatio / ROVER_WHEEL_OUTER_RADIUS;

  // 6-wheel Rocker-Bogie terrain clamping & articulation
  const suspension = solveRockerBogieSuspension(
    x,
    z,
    yaw,
    rover.chassisY,
    rover.pitch,
    rover.roll,
    rover.wheelCompression,
    heightAt,
    mudAt,
    dt,
  );

  return {
    x,
    z,
    yaw,
    speed,
    steerAngle,
    wheelRoll,
    pitch: suspension.pitch,
    roll: suspension.roll,
    chassisY: suspension.chassisY,
    wheelContacts: suspension.contacts,
    wheelCompression: suspension.compression,
    leftRockerAngle: suspension.leftRockerAngle,
    rightRockerAngle: suspension.rightRockerAngle,
    leftBogieAngle: suspension.leftBogieAngle,
    rightBogieAngle: suspension.rightBogieAngle,
    mudDepth: suspension.mudDepth,
    driving: true,
    handbrake,
  };
}
