"use client";

import { useEffect, useRef, useState } from "react";
import { TEAM_BRANDING } from "../content/branding";
import "./brandIntro.css";

/** The upper shutter moves up; the lower moves down. Branding approaches the viewer. */
export default function BrandIntro({ onComplete, planet = "moon" }: { onComplete: () => void; planet?: "moon" | "mars" }) {
  const [imageReady, setImageReady] = useState(!TEAM_BRANDING.logoPath);
  const [imageFailed, setImageFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const skip = useRef<HTMLButtonElement>(null);
  const logo = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setMounted(true);
    // A cached/SSR image may finish loading before React attaches onLoad.
    if (logo.current?.complete && logo.current.naturalWidth > 0)
      setImageReady(true);
    skip.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onComplete();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onComplete]);
  useEffect(() => {
    if (!imageReady || !mounted) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(onComplete, reduced ? 700 : 3500);
    return () => window.clearTimeout(timer);
  }, [imageReady, mounted, onComplete]);
  // An unavailable asset must never trap a player behind the opening.
  useEffect(() => {
    if (imageReady) return;
    const timer = window.setTimeout(() => {
      setImageFailed(true);
      setImageReady(true);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [imageReady]);
  return (
    <section
      className={`ss-brand-intro ss-team-intro ${imageReady && mounted ? "ss-intro-playing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${TEAM_BRANDING.teamName} presents ${TEAM_BRANDING.gameTitle}`}
    >
      <div className="ss-shutter ss-shutter-top" aria-hidden="true">
        <i />
        <span />
      </div>
      <div className="ss-shutter ss-shutter-bottom" aria-hidden="true">
        <i />
        <span />
      </div>
      <div className="ss-intro-seam" aria-hidden="true" />
      <div className="ss-intro-brand">
        {TEAM_BRANDING.logoPath && !imageFailed ? (
          <img
            ref={logo}
            className="ss-team-logo"
            src={TEAM_BRANDING.logoPath}
            alt={TEAM_BRANDING.teamName}
            width={1254}
            height={1254}
            fetchPriority="high"
            loading="eager"
            onLoad={() => setImageReady(true)}
            onError={() => {
              setImageFailed(true);
              setImageReady(true);
            }}
          />
        ) : (
          <div className="ss-team-name-fallback">{TEAM_BRANDING.teamName}</div>
        )}
        {(!TEAM_BRANDING.logoIncludesName ||
          imageFailed ||
          !TEAM_BRANDING.logoPath) && (
          <span className="ss-intro-team-caption">
            {TEAM_BRANDING.teamName}
          </span>
        )}
        <p className="ss-presents">presents</p>
        <h1>{TEAM_BRANDING.gameTitle}</h1>
        <p>{planet === "mars" ? "A NEW STORY ON MARS" : "A SMALL STORY ON THE MOON"}</p>
      </div>
      <button ref={skip} className="ss-intro-skip" onClick={onComplete}>
        Skip opening <span>↗</span>
      </button>
    </section>
  );
}
