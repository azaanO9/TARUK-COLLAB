/** Pure mobile/orientation helpers shared by Mars and Lunar modes. */
export function isMobilePortraitPhone(
  width: number,
  height: number,
  coarsePointer: boolean,
): boolean {
  if (!coarsePointer) return false;
  if (width <= 0 || height <= 0) return false;
  return Math.min(width, height) <= 600 && height > width;
}

export function isCoarsePointerDevice(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Best-effort landscape fullscreen request triggered only inside a user gesture.
 * Gracefully no-ops where unsupported (e.g. iOS Safari tabs).
 */
export async function tryEnterLandscape(): Promise<void> {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // Fullscreen can be declined or unsupported without blocking rotation.
  }
  try {
    const orientation = window.screen?.orientation as
      | (ScreenOrientation & { lock?: (mode: string) => Promise<void> })
      | undefined;
    if (orientation?.lock) {
      await orientation.lock("landscape");
    }
  } catch {
    // Orientation lock is browser-restricted on some devices.
  }
}

