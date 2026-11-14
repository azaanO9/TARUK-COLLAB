import test from "node:test";
import assert from "node:assert/strict";
import {landingPose,landingExitPose,LANDING_DURATION,ARRIVAL_SPAWN,ARRIVAL_YAW} from "../game/shuttleLanding.ts";
test("landing slows to a non-penetrating touchdown before camera handoff",()=>{
 let last=Infinity;
 for(let t=0;t<=LANDING_DURATION;t+=.01){const p=landingPose(t);assert.ok(p.altitude>=0 && p.altitude<=last+1e-9);last=p.altitude;if(p.handoff>0)assert.equal(p.altitude,0);}
 assert.ok(landingPose(9.9).altitude<.01);
 assert.equal(landingPose(10).speed,0);
 assert.equal(landingPose(LANDING_DURATION).complete,true);
 assert.equal(landingPose(14).complete,false);
 assert.equal(landingPose(14).plume,0);
 assert.equal(landingPose(14).dust,0);
});

test('astronaut waits for touchdown and an open door, hops once, then reaches the playable spawn',()=>{
 let lastZ=2.1,lastY=0;
 for(let t=0;t<=LANDING_DURATION;t+=.01){
  const p=landingExitPose(t),ship=landingPose(t);
  if(p.visible){assert.equal(ship.altitude,0);assert.equal(ship.hatch,1);}
  assert.ok(p.localZ>=lastZ-1e-7);lastZ=p.localZ;
  assert.ok(p.deckHeight>=0&&p.hopHeight>=0&&p.hopHeight<=.501);
  if(t>13)assert.ok(Math.abs(p.deckHeight+p.hopHeight-lastY)<.05,'feet do not teleport between phases');
  lastY=p.deckHeight+p.hopHeight;
  if(ship.handoff>0){assert.equal(p.grounded,true);assert.equal(p.speed,0);}
 }
 const end=landingExitPose(LANDING_DURATION);
 assert.equal(end.localZ+12,ARRIVAL_SPAWN.z);
 assert.ok(Math.abs(end.yaw-(Math.PI*2+ARRIVAL_YAW))<1e-8);
 assert.equal(end.deckHeight+end.hopHeight,0);
});

import * as T from "three";
import {createShuttleLanding} from "../ui/world/createShuttleLanding.ts";
test("all four feet meet sampled ground after skip and reduced motion avoids a flight",()=>{
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({width:32,height:32,getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){},fillText(){}})})};
 const surface=(x,z)=>Math.sin(x*.3)*.15+z*.01;
 const landing=createShuttleLanding(surface,false);
 const reduced=createShuttleLanding(surface,true);
 try{
  landing.start();assert.equal(landing.isActive(),true);landing.skip();landing.root.updateMatrixWorld(true);
  let feet=0;
  landing.root.traverse(o=>{if(o.name==="landing-foot"){const p=o.getWorldPosition(new T.Vector3());assert.ok(Math.abs(p.y-.06-surface(p.x,p.z))<1e-7);feet++;}});
  assert.equal(feet,4);assert.equal(landing.isActive(),false);
  reduced.start();const completed=reduced.update(.016,new T.PerspectiveCamera(),{...ARRIVAL_SPAWN,y:0});
  assert.equal(completed.active,false);assert.equal(completed.astronaut.z,ARRIVAL_SPAWN.z);
  assert.equal(completed.astronaut.y,surface(ARRIVAL_SPAWN.x,ARRIVAL_SPAWN.z));
 }finally{landing.dispose();reduced.dispose();globalThis.document=previous;}
});
