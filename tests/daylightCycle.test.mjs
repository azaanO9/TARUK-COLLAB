import test from "node:test";
import assert from "node:assert/strict";
import {nightAmount,daylightPhase,DAYLIGHT_CYCLE_SECONDS} from "../game/daylightCycle.ts";
test("ten-minute daylight keeps changing smoothly through sunset, night and sunrise",()=>{
 assert.equal(DAYLIGHT_CYCLE_SECONDS,600);
 assert.equal(daylightPhase(0),"Day");assert.equal(daylightPhase(150),"Sunset");assert.equal(daylightPhase(300),"Night");assert.equal(daylightPhase(450),"Sunrise");
 assert.equal(nightAmount(0),0);assert.equal(nightAmount(300),1);assert.equal(nightAmount(600),0);
 assert.ok(nightAmount(10)>0);assert.ok(nightAmount(20)>nightAmount(10));
 for(let t=0;t<1200;t+=.1){const n=nightAmount(t);assert.ok(n>=0&&n<=1);assert.ok(Math.abs(n-nightAmount(t+.1))<.0006);}
 for(let t=0;t<300;t++)assert.ok(nightAmount(t+1)>nightAmount(t));
 for(let t=300;t<600;t++)assert.ok(nightAmount(t+1)<nightAmount(t));
 for(const t of [100,250,300,400,550,600])assert.ok(Math.abs(nightAmount(t-.001)-nightAmount(t+.001))<.00002);
 assert.equal(daylightPhase(600),'Day');assert.equal(nightAmount(-2),0);
});
