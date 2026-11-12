"use client";
import { useCallback, useEffect, useRef } from "react";
import { Camera, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import type { TouchControlProps } from "./TouchControlsOverlay";

type Control = "left" | "right" | "gas" | "rev" | "brake";
type Props = Pick<TouchControlProps,"onDriveAxes" | "onToggleView" | "onToggleRover">;

const PEDAL_LABELS: Record<"gas" | "rev" | "brake", string> = {
  gas: "FWD",
  rev: "REV",
  brake: "BRAKE",
};

export function RoverTouchDeck({onDriveAxes,onToggleView,onToggleRover}: Props) {
  const inputs = useRef(new Map<string,Control>());
  const reset = useCallback(()=>{
    inputs.current.clear();
    onDriveAxes({steer:0,throttle:0,handbrake:false});
  },[onDriveAxes]);
  useEffect(()=>{
    window.addEventListener("blur",reset);
    document.addEventListener("visibilitychange",reset);
    return ()=>{
      window.removeEventListener("blur",reset);
      document.removeEventListener("visibilitychange",reset);
      reset();
    };
  },[reset]);
  function update(id:string,control?:Control) {
    if(control) inputs.current.set(id,control);
    else if(!inputs.current.delete(id)) return;
    const held = new Set(inputs.current.values());
    const throttle =
      held.has("brake") ? 0 : held.has("gas") && !held.has("rev") ? 1 : held.has("rev") && !held.has("gas") ? -1 : 0;
    onDriveAxes({
      steer:Number(held.has("left"))-Number(held.has("right")),
      throttle,
      handbrake:held.has("brake")
    });
  }
  function button(control:Control,label:string) {
    return <button type="button" className={"wheel-"+control} aria-label={label}
      onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);update(String(e.pointerId),control)}}
      onPointerUp={e=>update(String(e.pointerId))} onPointerCancel={e=>update(String(e.pointerId))}
      onLostPointerCapture={e=>update(String(e.pointerId))}
      onKeyDown={e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();update("key-"+control,control)}}}
      onKeyUp={e=>{if(e.key===" "||e.key==="Enter")update("key-"+control)}} onBlur={()=>update("key-"+control)}>
      {control==="left"?<ChevronLeft/>:control==="right"?<ChevronRight/>:<><i aria-hidden="true"/><small>{PEDAL_LABELS[control]}</small></>}
    </button>;
  }
  return <>
    <div className="wheel-controls wheel-steering">{button("left","Steer left")}{button("right","Steer right")}</div>
    <div className="wheel-controls wheel-pedals">
      <div className="wheel-tools">
        <button type="button" aria-label="Switch camera" onClick={onToggleView}><Camera/></button>
        <button type="button" aria-label="Exit rover" onClick={onToggleRover}><LogOut/></button>
      </div>
      {button("brake","Brake")}{button("rev","Reverse")}{button("gas","Forward")}
    </div>
  </>;
}
