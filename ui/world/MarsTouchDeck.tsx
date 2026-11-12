"use client";
import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import { ArrowUpFromLine, Camera, CarFront, CircleStop, Hand, LogOut, Move } from "lucide-react";
import type { TouchControlProps } from "./TouchControlsOverlay";

export function MarsTouchDeck({roverDriving, roverNear, canInspect, onWalkAxes, onDriveAxes, onHoldKey, onToggleRover, onToggleView, onInspectNearby}: TouchControlProps) {
  const pad = useRef<HTMLDivElement>(null);
  const origin = useRef<{id:number;x:number;y:number}|null>(null);
  const drive = useRef({steer:0, throttle:0, handbrake:false});
  const reset = useCallback(()=>{
    origin.current=null;
    pad.current?.removeAttribute("data-held");
    onWalkAxes({side:0,forward:0,sprint:false});
    drive.current={steer:0,throttle:0,handbrake:false};
    onDriveAxes({...drive.current});
    onHoldKey("jump",false);
  },[onWalkAxes,onDriveAxes,onHoldKey]);
  useEffect(()=>{
    reset();
    window.addEventListener("blur",reset);
    return ()=>{window.removeEventListener("blur",reset);reset()};
  },[roverDriving,reset]);
  function move(e:PointerEvent<HTMLDivElement>){
    const start=origin.current;
    if(!start || start.id!==e.pointerId)return;
    const dx=e.clientX-start.x, dy=e.clientY-start.y;
    const distance=Math.hypot(dx,dy), scale=1/Math.max(38,distance);
    const side=distance<5?0:dx*scale, forward=distance<5?0:-dy*scale;
    e.currentTarget.style.setProperty("--dx",side*26+"px");
    e.currentTarget.style.setProperty("--dy",-forward*26+"px");
    if(roverDriving){
      drive.current={...drive.current,steer:-side,throttle:forward};
      onDriveAxes({...drive.current});
    }else onWalkAxes({side,forward,sprint:distance>34});
  }
  function releaseStick(e:PointerEvent<HTMLDivElement>){
    if(origin.current?.id!==e.pointerId)return;
    origin.current=null;
    e.currentTarget.removeAttribute("data-held");
    onWalkAxes({side:0,forward:0,sprint:false});
    drive.current={...drive.current,steer:0,throttle:0};
    onDriveAxes({...drive.current});
  }
  function action(active:boolean){
    if(!roverDriving){onHoldKey("jump",active);return}
    drive.current={...drive.current,handbrake:active};
    onDriveAxes({...drive.current});
  }
  return <>
    <div ref={pad} className="flight-pad" aria-label={roverDriving?"Drive and steer":"Move"} onPointerDown={e=>{
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
      {(roverDriving||roverNear)&&<button className="flight-board" aria-label={roverDriving?"Exit rover":"Drive rover"} onClick={onToggleRover}>{roverDriving?<LogOut/>:<CarFront/>}</button>}
      {canInspect&&!roverDriving&&<button className="flight-use" aria-label="Interact with station" onClick={onInspectNearby}><Hand/></button>}
      <button className="flight-main" aria-label={roverDriving?"Handbrake":"Jump"} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);action(true)}} onLostPointerCapture={()=>action(false)} onPointerUp={()=>action(false)} onPointerCancel={()=>action(false)} onKeyDown={e=>{if(e.key===" "||e.key==="Enter")action(true)}} onKeyUp={()=>action(false)}>{roverDriving?<CircleStop/>:<ArrowUpFromLine/>}</button>
    </div>
  </>;
}
