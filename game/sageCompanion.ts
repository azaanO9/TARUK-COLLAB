/** Sage's dock is presentation-only: movement does not affect mission supplies. */
export const SAGE_DOCK = { x: 5, z: 8 } as const;
export type SagePosition = { x: number; z: number };

export function sageDestination(follow: boolean, player: { x: number; z: number; yaw: number }): SagePosition {
  if (!follow) return SAGE_DOCK;
  return {
    x: player.x + Math.cos(player.yaw) * 1.8 + Math.sin(player.yaw) * .5,
    z: player.z - Math.sin(player.yaw) * 1.8 + Math.cos(player.yaw) * .5,
  };
}

export function stepSage(position: SagePosition, destination: SagePosition, seconds: number): SagePosition {
  const dt = Math.max(0, Math.min(seconds, .1));
  const dx = destination.x - position.x, dz = destination.z - position.z;
  const distance = Math.hypot(dx, dz);
  const blend = distance ? Math.min(1 - Math.exp(-6 * dt), 9 * dt / distance) : 0;
  return { x: position.x + dx * blend, z: position.z + dz * blend };
}
