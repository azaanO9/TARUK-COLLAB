/** Ignore pointer-warp spikes rather than turning them into a large camera snap. */
export function safeLookDelta(value: number): number {
  return Number.isFinite(value) && Math.abs(value) <= 100 ? value : 0;
}
