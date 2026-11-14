"use client";
import {useState} from "react";
import type {View} from "./SurvivalWorld";
import {mapPoint,mapHeading,mapLidarContacts,MAP_RANGE} from "../game/minimap";
import {LIDAR_RANGE} from "../game/roverLidar";

/** Reuse view reports and the existing rover scan; never render another 3D camera. */
export default function ExplorationMinimap({view}:{view:View}){
 const [open,setOpen]=useState(true);
 const driving=Boolean(view.roverDriving);
 const x=driving?view.roverX??view.x:view.x,z=driving?view.roverZ??view.z:view.z;
 const scan=driving?view.lidar:undefined;
 const range=driving?scan?.range??LIDAR_RANGE:MAP_RANGE;
 const home=mapPoint(0,12,x,z,range);
 const crew=mapPoint(view.roverX??x,view.roverZ??z,x,z,range);
 const scout=view.curiosityX===undefined?null:mapPoint(view.curiosityX,view.curiosityZ??0,x,z,range);
 const gridStep=driving?10:20,gridSize=gridStep*88/range;
 const gridX=((x%gridStep)+gridStep)%gridStep*88/range,gridZ=((z%gridStep)+gridStep)%gridStep*88/range;
 const threat=scan?.threatDistance;
 const blocked=threat!==null&&threat!==undefined;
 const status=driving?(blocked?`Obstacle · ${threat.toFixed(1)} m`:scan?"Path clear · 12 m":"Scanning…"):"LiDAR in rover";
 return <aside className="roam-minimap" data-driving={driving} data-open={open} data-blocked={blocked} aria-label="Exploration minimap and rover LiDAR">
  <button type="button" aria-label={open?"Hide map":"Show map"} aria-expanded={open} aria-controls="exploration-map" onClick={()=>setOpen(!open)}>{open?"Hide map":"Show map"}</button>
  {open&&<div id="exploration-map">
   <p className="roam-map-mode">{driving?"LiDAR":"Local map"} · {range} m</p>
   <svg viewBox="0 0 200 200" role="img" aria-label={`North-up ${range} metre map. You are the arrow. H: landing, R: crew rover, C: Curiosity. ${driving?"LiDAR circles show detected objects; diamonds with an exclamation mark are in your path.":"Dots show nearby rocks."} Distant destinations stay at the edge.`}>
    <defs>
     <clipPath id="map-circle"><circle cx="100" cy="100" r="96"/></clipPath>
     <pattern id="map-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse" x={100-gridX} y={100-gridZ}><path d={`M${gridSize} 0H0V${gridSize}`} fill="none" stroke="#b9a88a" strokeOpacity=".22"/></pattern>
    </defs>
    <circle cx="100" cy="100" r="97" fill="#1b2a2f" stroke="#e4c195"/>
    <g clipPath="url(#map-circle)">
     <rect width="200" height="200" fill="url(#map-grid)"/>
     {driving&&<g className="roam-lidar-rings" fill="none" stroke="#a6e4ff" strokeOpacity=".36">
      <circle cx="100" cy="100" r={88/3}/><circle cx="100" cy="100" r={88*2/3}/><circle cx="100" cy="100" r="88"/>
     </g>}
     {scan&&<g className="roam-lidar-sweep" aria-hidden="true"><path d="M100 100L65 19A88 88 0 0 1 100 12Z" fill="#a6e4ff" opacity=".09"/><path d="M100 100V12" stroke="#a6e4ff" strokeOpacity=".5"/></g>}
     {!driving&&(view.mapRocks??[]).map((r,i)=>{const p=mapPoint(r.x,r.z,x,z);return !p.edge&&<circle key={i} cx={p.x} cy={p.y} r={Math.max(1.5,r.radius*88/MAP_RANGE)} fill="#b39879"/>;})}
     {scan&&mapLidarContacts(scan,x,z).map((contact,i)=><g key={i} className="roam-lidar-contact" data-hazard={contact.inPath} transform={`translate(${contact.x} ${contact.y})`}>
      {contact.inPath?<><path d="M0 -8L8 0L0 8L-8 0Z" fill="#ffce84" stroke="#261b0a"/><text y="5" textAnchor="middle" fill="#261b0a">!</text></>:<circle r={contact.radius} fill="#a6e4ff" stroke="#0d1922"/>}
     </g>)}
     <g transform={`translate(${home.x} ${home.y})`}><rect x="-8" y="-8" width="16" height="16" rx="3" fill="#ffd296"/><text textAnchor="middle" y="5" fill="#241b10">H</text></g>
     {!driving&&<g transform={`translate(${crew.x} ${crew.y})`}><rect x="-8" y="-8" width="16" height="16" rx="3" fill="#a6e4ff"/><text textAnchor="middle" y="5" fill="#172331">R</text></g>}
     {scout&&<g transform={`translate(${scout.x} ${scout.y})`}><circle r="8" fill="#d7bfff"/><text textAnchor="middle" y="5" fill="#21172e">C</text></g>}
     <path d="M0 -9L6 7L0 4L-6 7Z" transform={`translate(100 100) rotate(${mapHeading(driving?view.roverYaw??view.yaw:view.yaw)})`} fill="#fff" stroke="#101d29" strokeWidth="2"/>
    </g><text x="100" y="19" textAnchor="middle" fill="#fff">N</text>
   </svg>
   <p className="roam-lidar-status">{status}</p>
   <p className="roam-map-legend">H Landing · R Rover · C Curiosity</p>
  </div>}
 </aside>;
}
