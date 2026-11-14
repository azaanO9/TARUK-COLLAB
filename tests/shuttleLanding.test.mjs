import test from "node:test";
import assert from "node:assert/strict";
import {landingPose} from "../game/shuttleLanding.ts";
test("landing slows to a non-penetrating touchdown before camera handoff",()=>{
 let last=Infinity;
 for(let t=0;t<=15;t+=.01){const p=landingPose(t);assert.ok(p.altitude>=0 && p.altitude<=last+1e-9);last=p.altitude;if(p.handoff>0)assert.equal(p.altitude,0);}
 assert.ok(landingPose(9.9).altitude<.01);
 assert.equal(landingPose(10).speed,0);
 assert.equal(landingPose(14).complete,true);
 assert.equal(landingPose(14).plume,0);
 assert.equal(landingPose(14).dust,0);
});

import * as T from "three";
import {createShuttleLanding} from "../ui/world/createShuttleLanding.ts";
test("all four feet meet sampled ground after skip and reduced motion avoids a flight",()=>{
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({width:32,height:32,getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
 const surface=(x,z)=>Math.sin(x*.3)*.15+z*.01;
 const landing=createShuttleLanding(surface,false);
 const reduced=createShuttleLanding(surface,true);
 try{
  landing.start();assert.equal(landing.isActive(),true);landing.skip();landing.root.updateMatrixWorld(true);
  let feet=0;
  landing.root.traverse(o=>{if(o.name==="landing-foot"){const p=o.getWorldPosition(new T.Vector3());assert.ok(Math.abs(p.y-.06-surface(p.x,p.z))<1e-7);feet++;}});
  assert.equal(feet,4);assert.equal(landing.isActive(),false);
  reduced.start();assert.equal(reduced.update(.016,new T.PerspectiveCamera(),{x:12,y:0,z:22}).active,false);
 }finally{landing.dispose();reduced.dispose();globalThis.document=previous;}
});
