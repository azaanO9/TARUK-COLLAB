"use client";
import {useState} from "react";
import type {View} from "./SurvivalWorld";
import {mapPoint,mapHeading,MAP_RANGE} from "../game/minimap";

/** SVG radar uses existing 10 Hz view reports, never a second 3D render. */
export default function ExplorationMinimap({view}:{view:View}){
 const [open,setOpen]=useState(true);
 const x=view.x,z=view.z;
 const home=mapPoint(0,12,x,z);
 const crew=mapPoint(view.roverX??x,view.roverZ??z,x,z);
 const scout=view.curiosityX===undefined?null:mapPoint(view.curiosityX,view.curiosityZ??0,x,z);
 const gridX=((x%20)+20)%20*88/MAP_RANGE,gridZ=((z%20)+20)%20*88/MAP_RANGE;
 return <aside className="roam-minimap" data-driving={view.roverDriving} data-open={open} aria-label="Exploration minimap">
  <button type="button" aria-label={open?"Hide map":"Show map"} aria-expanded={open} aria-controls="exploration-map" onClick={()=>setOpen(!open)}>{open?"Hide map":"Show map"}</button>
  {open&&<div id="exploration-map">
   <svg viewBox="0 0 200 200" role="img" aria-label="North-up local map: you are the arrow, H is the landing site, R is the crew rover, C is Curiosity. Distant markers stay at the edge.">
    <defs><clipPath id="map-circle"><circle cx="100" cy="100" r="96"/></clipPath><pattern id="map-grid" width="22" height="22" patternUnits="userSpaceOnUse" x={100-gridX} y={100-gridZ}><path d="M22 0H0V22" fill="none" stroke="#b9a88a" strokeOpacity=".22"/></pattern></defs>
    <circle cx="100" cy="100" r="97" fill="#302e2b" stroke="#e4c195"/>
    <g clipPath="url(#map-circle)"><rect width="200" height="200" fill="url(#map-grid)"/>
     {(view.mapRocks??[]).map((r,i)=>{const p=mapPoint(r.x,r.z,x,z);return !p.edge&&<circle key={i} cx={p.x} cy={p.y} r={Math.max(1.5,r.radius*88/MAP_RANGE)} fill="#b39879"/>;})}
     <g transform={`translate(${home.x} ${home.y})`}><rect x="-8" y="-8" width="16" height="16" rx="3" fill="#ffd296"/><text textAnchor="middle" y="5" fill="#241b10">H</text></g>
     {!view.roverDriving&&<g transform={`translate(${crew.x} ${crew.y})`}><rect x="-8" y="-8" width="16" height="16" rx="3" fill="#a6e4ff"/><text textAnchor="middle" y="5" fill="#172331">R</text></g>}
     {scout&&<g transform={`translate(${scout.x} ${scout.y})`}><circle r="8" fill="#d7bfff"/><text textAnchor="middle" y="5" fill="#21172e">C</text></g>}
     <path d="M0 -9L6 7L0 4L-6 7Z" transform={`translate(100 100) rotate(${mapHeading(view.roverDriving?view.roverYaw??view.yaw:view.yaw)})`} fill="#fff" stroke="#101d29" strokeWidth="2"/>
    </g><text x="100" y="19" textAnchor="middle" fill="#fff">N</text>
   </svg>
   <p>H Landing · R Rover · C Curiosity</p><p>{MAP_RANGE} m radius · North up</p>
  </div>}
 </aside>;
}
