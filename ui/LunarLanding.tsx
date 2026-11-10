"use client";
import { useEffect } from "react";
import { assetUrl } from "../lib/assetUrl";
import "./lunarLanding.css";
export default function LunarLanding({
  onComplete,
  planet = "moon",
  paused = false,
}: {
  onComplete: () => void;
  planet?: "moon" | "mars";
  paused?: boolean;
}) {
  useEffect(() => {
    if (paused) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = setTimeout(onComplete, reduced ? 1200 : 7000);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onComplete();
    };
    window.addEventListener("keydown", key);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", key);
    };
  }, [onComplete, paused]);
  return (
    <section
      className={`landing-scene ${planet === "mars" ? "landing-mars" : ""} ${paused ? "landing-paused" : ""}`}
      role="dialog"
      aria-label={planet === "mars" ? "Illustrated Mars landing" : "The lunar landing"}
    >
      <div className="landing-stars" />
      <div className="landing-earth" />
      <div className="landing-ridge" />
      <div className="landing-dust" />
      <div className="landing-ship" aria-hidden="true">
        {planet === "mars" ? <img src={assetUrl("/art/mars-lander.webp")} alt="" /> :
        <svg viewBox="0 0 240 270">
          <path
            d="M120 12C80 48 61 96 66 175L43 212H197L174 175C179 96 160 48 120 12Z"
            fill="#c8d2cf"
            stroke="#60717a"
            strokeWidth="5"
          />
          <path d="M81 125H159V177H81Z" fill="#314b59" />
          <circle
            cx="120"
            cy="87"
            r="23"
            fill="#65a5ab"
            stroke="#e2c08f"
            strokeWidth="7"
          />
          <path
            d="M66 169L28 225H70M174 169L212 225H170"
            fill="none"
            stroke="#d8c8ad"
            strokeWidth="12"
          />
          <path d="M95 211L120 260L145 211" fill="#ed9c58" opacity=".8" />
        </svg>}
      </div>
      <div className="landing-copy">
        <p>{planet === "mars" ? "MARS OUTPOST · APPROACH" : "TRANQUILITY OUTPOST · APPROACH"}</p>
        <h1>
          A rough landing.
          <br />A new beginning.
        </h1>
        <span>
          {planet === "mars" ? "The lander touches down near the outpost. Sage is ready to help you explore." : "The lander touches down hard. Scout and MICA are safe—but the outpost needs care."}
        </span>
      </div>
      <button onClick={onComplete}>Skip landing ↗</button>
    </section>
  );
}
