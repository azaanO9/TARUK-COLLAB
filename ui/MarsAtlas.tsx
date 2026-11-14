"use client";
import {useEffect,useRef} from 'react';
import {MARS_LANDMARKS,MARS_TREK_URL} from '../content/marsLandmarks';
import {MARS_REGION,worldToMars,marsRegionalHeight,isSurveyedRegion} from '../game/marsRegion';

const RANGE=700;
/** Draw once from the shipped elevation crop; no second 3D renderer or network request. */
export default function MarsAtlas({x,z,selected,onSelect,onClose}:{x:number;z:number;selected:string;onSelect:(id:string)=>void;onClose:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const ctx=canvas.current?.getContext('2d');if(!ctx)return;
  const size=256,image=ctx.createImageData(size,size),step=RANGE*2/size;
  for(let y=0;y<size;y++)for(let col=0;col<size;col++){
   const wx=col*step-RANGE,wz=y*step-RANGE,h=marsRegionalHeight(wx,wz);
   const gradient=(h-marsRegionalHeight(wx-step,wz))*.1+(h-marsRegionalHeight(wx,wz-step))*.17;
   const shade=Math.max(.45,Math.min(1.5,.85+gradient)),contour=Math.abs(h/4-Math.round(h/4))<.045?.82:1;
   const i=(y*size+col)*4;image.data[i]=Math.min(255,(139+h*.7)*shade*contour);image.data[i+1]=(92+h*.45)*shade*contour;image.data[i+2]=(64+h*.3)*shade*contour;image.data[i+3]=255;
  }
  ctx.putImageData(image,0,0);
 },[]);
 const coordinates=worldToMars(x,z);
 return <>
  <h2 id="roam-dialog-title">Your Mars field map</h2>
  <button onClick={onClose}>Continue exploring</button>
  <p className="roam-atlas-source">NASA MOLA elevation · {MARS_REGION.scaleLabel}</p>
  <div className="roam-atlas-layout">
   <div className="roam-atlas-plot" aria-label="North-up elevation overview of the Elysium region">
    <canvas ref={canvas} width="256" height="256" aria-hidden="true"/>
    <span className="roam-atlas-north">N ↑</span>
    {MARS_LANDMARKS.map(p=><button key={p.id} style={{left:`${50+p.x/RANGE*50}%`,top:`${50+p.z/RANGE*50}%`}} aria-label={p.name} aria-pressed={selected===p.id} onClick={()=>onSelect(p.id)}>{p.number}</button>)}
    {Math.abs(x)<RANGE&&Math.abs(z)<RANGE&&<span className="roam-atlas-you" style={{left:`${50+x/RANGE*50}%`,top:`${50+z/RANGE*50}%`}}>You</span>}
    <span className="roam-atlas-scale">200 game m ≈ 494 km on Mars</span>
   </div>
   <ol className="roam-atlas-list">{MARS_LANDMARKS.map(p=><li key={p.id}>
    <button aria-pressed={selected===p.id} onClick={()=>onSelect(p.id)}>{p.number}. {p.name}<span>{Math.round(Math.hypot(p.x-x,p.z-z))} game m · {p.kind}</span></button>
    {selected===p.id&&<p>{p.description} <a href={p.source} target="_blank" rel="noreferrer">USGS source ↗</a></p>}
   </li>)}</ol>
  </div>
  <p>{isSurveyedRegion(x,z)?`${Math.abs(coordinates.latitude).toFixed(2)}° ${coordinates.latitude<0?'S':'N'} · ${coordinates.longitude.toFixed(2)}° E`:'Beyond the surveyed crop · procedural continuation'}. Select a landmark to highlight its bearing on your minimap.</p>
  <p>Real regional heights, shortened journeys. Relief is exaggerated about ten times relative to horizontal distances. Rocks, close-up sand and the landing site are artistic additions. This is an exploration model, not a navigation-grade Mars map.</p>
  <a href={MARS_TREK_URL} target="_blank" rel="noreferrer">Explore the source region in NASA Mars Trek ↗</a>
 </>;
}
