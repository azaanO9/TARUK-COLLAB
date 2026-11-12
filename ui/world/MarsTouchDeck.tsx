"use client";
import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import { ArrowUpFromLine, Camera, CarFront, Hand, Move } from "lucide-react";
import type { TouchControlProps } from "./TouchControlsOverlay";

export function MarsTouchDeck({roverNear, canInspect, onWalkAxes, onHoldKey, onToggleRover, onToggleView, onInspectNearby}: TouchControlProps) {
  const pad = useRef<HTMLDivElement>(null);
  const origin = useRef<{id:number;x:number;y:number}|null>(null);
  const reset = useCallback(()=>{
    origin.current=null;
    pad.current?.removeAttribute("data-held");
    onWalkAxes({side:0,forward:0,sprint:false});
    onHoldKey("jump",false);
  },[onWalkAxes,onHoldKey]);
  useEffect(()=>{
    reset();
    window.addEventListener("blur",reset);
    return ()=>{window.removeEventListener("blur",reset);reset()};
  },[reset]);
  function move(e:PointerEvent<HTMLDivElement>){
    const start=origin.current;
    if(!start || start.id!==e.pointerId)return;
    const dx=e.clientX-start.x, dy=e.clientY-start.y;
    const distance=Math.hypot(dx,dy), scale=1/Math.max(38,distance);
    const side=distance<5?0:dx*scale, forward=distance<5?0:-dy*scale;
    e.currentTarget.style.setProperty("--dx",side*26+"px");
    e.currentTarget.style.setProperty("--dy",-forward*26+"px");
    onWalkAxes({side,forward,sprint:distance>34});
  }
  function releaseStick(e:PointerEvent<HTMLDivElement>){
    if(origin.current?.id!==e.pointerId)return;
    origin.current=null;
    e.currentTarget.removeAttribute("data-held");
    onWalkAxes({side:0,forward:0,sprint:false});
  }
  function action(active:boolean){
    onHoldKey("jump",active);
  }
  return <>
    <div ref={pad} className="flight-pad" aria-label="Move" onPointerDown={e=>{
      e.stopPropagation();if(origin.current)return;
      const rect=e.currentTarget.getBoundingClientRect();
      origin.current={id:e.pointerId,x:e.clientX,y:e.clientY};
      e.currentTarget.dataset.held="";
      e.currentTarget.style.setProperty("--x",e.clientX-rect.left+"px");
      e.currentTarget.style.setProperty("--y",e.clientY-rect.top+"px");
      e.currentTarget.setPointerCapture(e.pointerId);move(e);
    }} onPointerMove={e=>{e.stopPropagation();move(e)}} onPointerUp={releaseStick} onLostPointerCapture={releaseStick} onPointerCancel={releaseStick}>
      <i><Move size={24}/></i>
    </div>
    <div className="flight-actions">
      <button className="flight-view" aria-label="Switch camera" onClick={onToggleView}><Camera/></button>
      {roverNear&&<button className="flight-board" aria-label="Drive rover" onClick={onToggleRover}><CarFront/></button>}
      {canInspect&&<button className="flight-use" aria-label="Interact with station" onClick={onInspectNearby}><Hand/></button>}
      <button className="flight-main" aria-label="Jump" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);action(true)}} onLostPointerCapture={()=>action(false)} onPointerUp={()=>action(false)} onPointerCancel={()=>action(false)} onKeyDown={e=>{if(e.key===" "||e.key==="Enter")action(true)}} onKeyUp={()=>action(false)}><ArrowUpFromLine/></button>
    </div>
  </>;
}
