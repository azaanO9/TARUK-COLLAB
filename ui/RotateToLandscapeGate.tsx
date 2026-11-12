"use client";

import { useEffect, useState } from "react";
import { isCoarsePointerDevice, isMobilePortraitPhone, tryEnterLandscape } from "./mobileDevice";

/**
 * Blocks 3D mobile phone gameplay in portrait until the user rotates sideways
 * to landscape, keeping controls and wide HUD unobstructed.
 */
export function RotateToLandscapeGate({
  onBlockedChange,
}: {
  onBlockedChange?: (blocked: boolean) => void;
}) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const evaluate = () => {
      const next = isMobilePortraitPhone(
        window.innerWidth,
        window.innerHeight,
        isCoarsePointerDevice(),
      );
      setBlocked(next);
      onBlockedChange?.(next);
    };
    evaluate();
    const media = window.matchMedia?.("(pointer: coarse)");
    window.addEventListener("resize", evaluate);
    window.addEventListener("orientationchange", evaluate);
    media?.addEventListener?.("change", evaluate);
    return () => {
      window.removeEventListener("resize", evaluate);
      window.removeEventListener("orientationchange", evaluate);
      media?.removeEventListener?.("change", evaluate);
      onBlockedChange?.(false);
    };
  }, [onBlockedChange]);

  if (!blocked) return null;

  return (
    <div
      className="sv-rotate-gate"
      role="dialog"
      aria-modal="true"
      aria-label="Rotate your phone to landscape to play"
    >
      <div className="sv-rotate-card">
        <div className="sv-rotate-icon" aria-hidden="true">
          <span className="sv-phone-outline" />
        </div>
        <p className="sv-rotate-kicker">MOBILE LANDSCAPE MODE</p>
        <h2>Rotate your phone to landscape</h2>
        <p>
          Turn your device sideways to unlock the virtual joystick, rover pedals,
          and full Mars/Lunar view.
        </p>
        <button
          type="button"
          className="sv-rotate-btn"
          onClick={() => void tryEnterLandscape()}
        >
          Try landscape fullscreen ↻
        </button>
      </div>
    </div>
  );
}

