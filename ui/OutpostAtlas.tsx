import { useState } from "react";
import { STATIONS } from "../content/marsBase";
import { flightPlan, stationNames } from "../content/marsFlightPlan";
import type { Mission } from "../game/juniorMission";
import "./outpost.css";

type Props = {
 mission:Mission; target:string; position:{x:number;z:number}; mapTravel:boolean;
 onTrack:(id:string)=>void; onTravel:(x:number,z:number)=>void; onInspect:(id:string)=>void; onClose:()=>void;
};
export function OutpostAtlas({mission,target,position,mapTravel,onTrack,onTravel,onInspect,onClose}:Props) {
 const [selected,setSelected]=useState(target);
 const pad=STATIONS.find(s=>s.id===selected)!;
 const distance=Math.hypot(pad.x-position.x,pad.z-position.z);
 const sol=flightPlan[mission.sol-1];
 const toPct = (v: number) => Math.max(4, Math.min(96, ((v + 76) / 152) * 100)) + "%";
 return <section className="outpost-atlas" aria-label="Mars base map">
 <small>ARES FIELD CAMP　/　SOL {mission.sol}</small><h2>{sol.title}</h2>
 <p>Assignment · {stationNames[sol.station]}</p>
 <div className="outpost-map">{flightPlan.map((f,i)=>{
   const s=STATIONS.find(item=>item.id===f.station)!;
   return <button key={s.id} aria-pressed={selected===s.id} aria-label={stationNames[s.id]} className={s.id===selected?"active":""} onClick={()=>setSelected(s.id)} style={{left:toPct(s.x),top:toPct(s.z)}}>{String(i+1).padStart(2,"0")}</button>
 })}<span aria-label="Your position" className="atlas-player" style={{left:toPct(position.x),top:toPct(position.z)}}>◆</span></div>
 <p aria-live="polite">{stationNames[selected]} · {Math.round(distance)} m</p>
 {mapTravel ? distance>5.5?<button onClick={()=>onTravel(pad.x,pad.z+3)}>Approach {stationNames[selected]}</button>:<button onClick={()=>onInspect(selected)}>Interact with {stationNames[selected]}</button>:
 <button onClick={()=>onTrack(selected)}>Mark route to {stationNames[selected]}</button>}
 <button onClick={onClose}>Close map</button></section>
}
