"use client";

import { useCallback, useEffect, useRef } from "react";
import { Camera, ChevronsUp, ChevronsDown, CircleStop, ArrowUpFromLine } from "lucide-react";
import type { MoveAxes } from "../../game/navigation";
import type { RoverAnalogInput } from "../../game/roverVehicle";

export type TouchControlProps = {
  enabled: boolean;
  roverDriving: boolean;
  roverNear: boolean;
  canInspect: boolean;
  thirdPerson: boolean;
  onWalkAxes: (axes: MoveAxes) => void;
  onDriveAxes: (axes: RoverAnalogInput) => void;
  onHoldKey: (key: string, active: boolean) => void;
  onToggleView: () => void;
  onToggleRover: () => void;
  onInspectNearby: () => void;
};

const STICK_DEADZONE = 0.14;

/** Multi-touch left analog thumbstick and right-hand action cluster for mobile exploration and rover driving. */
export function TouchControlsOverlay({
  enabled,
  roverDriving,
  roverNear,
  canInspect,
  thirdPerson,
  onWalkAxes,
  onDriveAxes,
  onHoldKey,
  onToggleView,
  onToggleRover,
  onInspectNearby,
}: TouchControlProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const puckRef = useRef<HTMLDivElement>(null);
  const stickPointer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0, radius: 38 });
  const stickSteer = useRef(0);
  const driveState = useRef({ gas: false, rev: false, brake: false });

  const pushDriveState = useCallback(() => {
    const d = driveState.current;
    const throttle = d.gas && !d.rev ? 1 : d.rev && !d.gas ? -1 : 0;
    onDriveAxes({
      steer: stickSteer.current,
      throttle,
      handbrake: d.brake,
    });
  }, [onDriveAxes]);

  const resetStick = useCallback(() => {
    stickPointer.current = null;
    stickSteer.current = 0;
    if (puckRef.current) {
      puckRef.current.style.transform = "translate3d(0px, 0px, 0px)";
    }
    if (baseRef.current) {
      baseRef.current.classList.remove("active", "sprinting");
      baseRef.current.style.removeProperty("--stick-x");
      baseRef.current.style.removeProperty("--stick-y");
    }
    onWalkAxes({ side: 0, forward: 0, sprint: false });
    pushDriveState();
  }, [onWalkAxes, pushDriveState]);

  const releaseAll = useCallback(() => {
    driveState.current = { gas: false, rev: false, brake: false };
    onHoldKey("jump", false);
    resetStick();
  }, [onHoldKey, resetStick]);

  useEffect(() => {
    if (!enabled) releaseAll();
  }, [enabled, releaseAll]);

  useEffect(() => {
    releaseAll();
  }, [roverDriving, releaseAll]);

  useEffect(() => {
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("blur", releaseAll);
      releaseAll();
    };
  }, [releaseAll]);

  const updateStickFromPointer = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const { x, y, radius } = origin.current;
    const rawDx = clientX - x;
    const rawDy = roverDriving ? 0 : clientY - y;
    const dist = Math.hypot(rawDx, rawDy);
    const clampedDist = Math.min(dist, radius);
    const scale = dist > 0 ? clampedDist / dist : 0;
    const dx = rawDx * scale;
    const dy = roverDriving ? 0 : rawDy * scale;

    if (puckRef.current) {
      puckRef.current.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0px)`;
    }

    const normMag = clampedDist / radius;
    if (normMag <= STICK_DEADZONE) {
      base.classList.remove("sprinting");
      stickSteer.current = 0;
      onWalkAxes({ side: 0, forward: 0, sprint: false });
      pushDriveState();
      return;
    }

    const rescaled = (normMag - STICK_DEADZONE) / (1 - STICK_DEADZONE);
    const dirX = dist > 0 ? rawDx / dist : 0;
    const dirY = dist > 0 ? rawDy / dist : 0;
    const sx = dirX * rescaled;
    const sy = dirY * rescaled;

    if (roverDriving) {
      const steerX = dx / radius;
      const magX = Math.abs(steerX);
      stickSteer.current =
        magX <= STICK_DEADZONE
          ? 0
          : -Math.sign(steerX) * ((magX - STICK_DEADZONE) / (1 - STICK_DEADZONE));
      pushDriveState();
    } else {
      const sprint = normMag > 0.84;
      base.classList.toggle("sprinting", sprint);
      onWalkAxes({ side: sx, forward: -sy, sprint });
    }
  };

  const holdDriveButton = (which: "gas" | "rev" | "brake", active: boolean) => {
    driveState.current[which] = active;
    pushDriveState();
  };

  return (
    <>
      <div
        ref={baseRef}
        className={`sv-touch-stick${roverDriving ? " is-steering" : ""}`}
        aria-label={roverDriving ? "Rover steering thumbstick" : "Movement thumbstick"}
        onPointerDown={(e) => {
          if (!enabled || stickPointer.current !== null) return;
          e.stopPropagation();
          e.preventDefault();
          stickPointer.current = e.pointerId;
          const rect = e.currentTarget.getBoundingClientRect();
          origin.current = { x: e.clientX, y: e.clientY, radius: Math.min(rect.width, rect.height) * 0.26 };
          e.currentTarget.style.setProperty("--stick-x", `${e.clientX - rect.left - rect.width / 2}px`);
          e.currentTarget.style.setProperty("--stick-y", `${e.clientY - rect.top - rect.height / 2}px`);
          e.currentTarget.setPointerCapture(e.pointerId);
          e.currentTarget.classList.add("active");
          updateStickFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (stickPointer.current !== e.pointerId) return;
          e.stopPropagation();
          updateStickFromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (stickPointer.current !== e.pointerId) return;
          e.stopPropagation();
          resetStick();
        }}
        onPointerCancel={(e) => {
          if (stickPointer.current !== e.pointerId) return;
          e.stopPropagation();
          resetStick();
        }}
        onLostPointerCapture={(e) => {
          if (stickPointer.current === e.pointerId) resetStick();
        }}
      >
        <div className="sv-stick-ring" aria-hidden="true">
          {roverDriving ? (
            <span className="sv-stick-steer-hint">← STEER →</span>
          ) : (
            <span className="sv-stick-sprint-hint">SPRINT</span>
          )}
        </div>
        <div ref={puckRef} className="sv-stick-puck" aria-hidden="true" />
      </div>

      {!roverDriving ? (
        <div className="sv-touch-actions" aria-label="Explorer touch actions">
          {(canInspect || roverNear) && (
            <div className="sv-touch-context-row">
              {canInspect && (
                <button
                  type="button"
                  className="sv-touch-ctx-btn inspect"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={onInspectNearby}
                >
                  Inspect
                </button>
              )}
              {roverNear && (
                <button
                  type="button"
                  className="sv-touch-ctx-btn drive"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={onToggleRover}
                >
                  Drive Rover
                </button>
              )}
            </div>
          )}
          <div className="sv-touch-primary-row">
            <button
              type="button"
              className="sv-touch-pill"
              aria-label={thirdPerson ? "Switch to first person view" : "Switch to third person view"}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onToggleView}
            >
              <Camera aria-hidden="true" /><span>View</span>
            </button>
            <button
              type="button"
              className="sv-touch-jump"
              aria-label="Jump"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                onHoldKey("jump", true);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onHoldKey("jump", false);
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                onHoldKey("jump", false);
              }}
              onLostPointerCapture={() => onHoldKey("jump", false)}
            >
              <ArrowUpFromLine aria-hidden="true" /><span>Jump</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="sv-rover-touch-pedals" aria-label="Rover driving touch controls">
          <div className="sv-touch-context-row">
            <button
              type="button"
              className="sv-touch-pill"
              aria-label={thirdPerson ? "Switch to cockpit view" : "Switch to chase view"}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onToggleView}
            >
              <Camera aria-hidden="true" /><span>{thirdPerson ? "Cab" : "Chase"}</span>
            </button>
            <button
              type="button"
              className="sv-touch-ctx-btn exit"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onToggleRover}
            >
              Exit Rover
            </button>
          </div>
          <div className="sv-pedal-row">
            <button
              type="button"
              className="sv-pedal brake"
              aria-label="Handbrake"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                holdDriveButton("brake", true);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                holdDriveButton("brake", false);
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                holdDriveButton("brake", false);
              }}
              onLostPointerCapture={() => holdDriveButton("brake", false)}
            >
              <CircleStop aria-hidden="true" /><span>Brake</span>
            </button>
            <button
              type="button"
              className="sv-pedal rev"
              aria-label="Reverse"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                holdDriveButton("rev", true);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                holdDriveButton("rev", false);
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                holdDriveButton("rev", false);
              }}
              onLostPointerCapture={() => holdDriveButton("rev", false)}
            >
              <ChevronsDown aria-hidden="true" /><span>Reverse</span>
            </button>
            <button
              type="button"
              className="sv-pedal gas"
              aria-label="Drive forward"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                holdDriveButton("gas", true);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                holdDriveButton("gas", false);
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                holdDriveButton("gas", false);
              }}
              onLostPointerCapture={() => holdDriveButton("gas", false)}
            >
              <ChevronsUp aria-hidden="true" /><span>Gas</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

