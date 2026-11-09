/** Pure exploration rover vehicle physics and open-world kinematics. */
export const ROVER_LIMIT = 85;
export const ROVER_ENTER_RADIUS = 4.8;
export const ROVER_MAX_FORWARD = 13.5; // ~48.6 km/h illustrative top speed
export const ROVER_MAX_REVERSE = 5.2;  // ~18.7 km/h illustrative reverse speed
export const ROVER_ACCELERATION = 8.5; // m/s^2 forward drive
export const ROVER_BRAKE = 14.0;       // m/s^2 active service brake
export const ROVER_HANDBRAKE = 24.0;   // m/s^2 emergency stop
export const ROVER_COAST_DRAG = 3.4;   // rolling friction m/s^2
export const ROVER_STEER_MAX = 0.52;   // ~30 degrees max front wheel turn
export const ROVER_STEER_SPEED = 3.4;  // rad/s steering response
export const ROVER_WHEEL_BASE = 3.2;   // meters between front and rear axles
export const ROVER_TRACK_WIDTH = 2.4;  // meters between left and right wheel track
export const ROVER_WHEEL_RADIUS = 0.58;// meters radius of heavy tire
export const ROVER_COLLISION_RADIUS = 1.9; // bounding obstacle radius

export type RoverVehicle = {
  x: number;
  z: number;
  yaw: number;
  speed: number;        // forward positive, reverse negative (m/s)
  steerAngle: number;   // radians, positive left, negative right
  wheelRoll: number;    // cumulative wheel rotation in radians
  pitch: number;        // chassis terrain slope pitch in radians
  roll: number;         // chassis terrain slope roll in radians
  driving: boolean;     // whether astronaut is seated inside driving
  handbrake: boolean;   // whether handbrake is active
};

export const spawnRoverVehicle = (x = 17, z = 10, yaw = 0): RoverVehicle => ({
  x,
  z,
  yaw,
  speed: 0,
  steerAngle: 0,
  wheelRoll: 0,
  pitch: 0,
  roll: 0,
  driving: false,
  handbrake: false,
});

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
): { rover: RoverVehicle; exitPosition: { x: number; z: number } } {
  // Exit to the driver's side (left flank of the vehicle)
  const exitX = rover.x - Math.cos(rover.yaw) * 2.3;
  const exitZ = rover.z + Math.sin(rover.yaw) * 2.3;
  return {
    rover: {
      ...rover,
      driving: false,
      speed: 0,
      handbrake: true,
    },
    exitPosition: {
      x: Math.max(-ROVER_LIMIT, Math.min(ROVER_LIMIT, exitX)),
      z: Math.max(-ROVER_LIMIT, Math.min(ROVER_LIMIT, exitZ)),
    },
  };
}

export function stepRoverVehicle(
  rover: RoverVehicle,
  keys: ReadonlySet<string>,
  seconds: number,
  obstacles: readonly { x: number; z: number; radius: number }[] = [],
  heightAt: (x: number, z: number) => number = () => 0,
): RoverVehicle {
  const dt = Math.max(0, Math.min(seconds, 0.05));
  if (dt <= 0) return rover;

  if (!rover.driving) {
    // When parked, friction holds the rover stationary
    const speed = Math.abs(rover.speed) < 0.05 ? 0 : rover.speed * Math.exp(-14 * dt);
    return {
      ...rover,
      speed,
      handbrake: true,
      steerAngle: rover.steerAngle * Math.exp(-6 * dt),
    };
  }

  const forwardKey = keys.has("w") || keys.has("arrowup");
  const reverseKey = keys.has("s") || keys.has("arrowdown");
  const leftKey = keys.has("a") || keys.has("arrowleft");
  const rightKey = keys.has("d") || keys.has("arrowright");
  const handbrakeKey = keys.has(" ") || keys.has("space") || keys.has("handbrake");

  let speed = rover.speed;
  let handbrake = handbrakeKey;

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
      // Act as brake if moving backwards
      speed = Math.min(0, speed + ROVER_BRAKE * dt);
    } else {
      speed = Math.min(ROVER_MAX_FORWARD, speed + ROVER_ACCELERATION * dt);
    }
  } else if (reverseKey && !forwardKey) {
    if (speed > 0) {
      // Act as brake if moving forward
      speed = Math.max(0, speed - ROVER_BRAKE * dt);
    } else {
      speed = Math.max(-ROVER_MAX_REVERSE, speed - ROVER_ACCELERATION * 0.75 * dt);
    }
  } else {
    // Rolling resistance when no pedals pressed
    if (speed > 0) {
      speed = Math.max(0, speed - ROVER_COAST_DRAG * dt);
    } else if (speed < 0) {
      speed = Math.min(0, speed + ROVER_COAST_DRAG * dt);
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

  // Displacement
  let x = rover.x - Math.sin(yaw) * speed * dt;
  let z = rover.z - Math.cos(yaw) * speed * dt;

  // Obstacle collision deflection
  for (const o of obstacles) {
    const dx = x - o.x;
    const dz = z - o.z;
    const minDist = o.radius + ROVER_COLLISION_RADIUS;
    const d = Math.hypot(dx, dz);
    if (d < minDist && d > 0.0001) {
      const nx = dx / d;
      const nz = dz / d;
      x = o.x + nx * minDist;
      z = o.z + nz * minDist;
      speed *= 0.35; // absorb impact
    }
  }

  // Boundary limits
  if (x < -ROVER_LIMIT || x > ROVER_LIMIT) {
    x = Math.max(-ROVER_LIMIT, Math.min(ROVER_LIMIT, x));
    speed = 0;
  }
  if (z < -ROVER_LIMIT || z > ROVER_LIMIT) {
    z = Math.max(-ROVER_LIMIT, Math.min(ROVER_LIMIT, z));
    speed = 0;
  }

  // Wheel rolling rotation
  const wheelRoll = rover.wheelRoll + (speed * dt) / ROVER_WHEEL_RADIUS;

  // Pitch and roll conform to terrain slope
  const halfWheelBase = ROVER_WHEEL_BASE * 0.5;
  const frontX = x - Math.sin(yaw) * halfWheelBase;
  const frontZ = z - Math.cos(yaw) * halfWheelBase;
  const rearX = x + Math.sin(yaw) * halfWheelBase;
  const rearZ = z + Math.cos(yaw) * halfWheelBase;
  const frontY = heightAt(frontX, frontZ);
  const rearY = heightAt(rearX, rearZ);
  const targetPitch = Math.atan2(rearY - frontY, ROVER_WHEEL_BASE);

  const halfTrack = ROVER_TRACK_WIDTH * 0.5;
  const leftX = x - Math.cos(yaw) * halfTrack;
  const leftZ = z + Math.sin(yaw) * halfTrack;
  const rightX = x + Math.cos(yaw) * halfTrack;
  const rightZ = z - Math.sin(yaw) * halfTrack;
  const leftY = heightAt(leftX, leftZ);
  const rightY = heightAt(rightX, rightZ);
  const targetRoll = Math.atan2(leftY - rightY, ROVER_TRACK_WIDTH);

  const blend = 1 - Math.exp(-12 * dt);
  const pitch = rover.pitch + (targetPitch - rover.pitch) * blend;
  const roll = rover.roll + (targetRoll - rover.roll) * blend;

  return {
    x,
    z,
    yaw,
    speed,
    steerAngle,
    wheelRoll,
    pitch,
    roll,
    driving: true,
    handbrake,
  };
}

