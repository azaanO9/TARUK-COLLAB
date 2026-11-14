import test from "node:test";
import assert from "node:assert/strict";
import {nightAmount,daylightPhase,DAYLIGHT_CYCLE_SECONDS} from "../game/daylightCycle.ts";
test("two-minute daylight keeps changing smoothly through sunset, night and sunrise",()=>{
 assert.equal(DAYLIGHT_CYCLE_SECONDS,120);
 assert.equal(daylightPhase(0),"Day");assert.equal(daylightPhase(30),"Sunset");assert.equal(daylightPhase(60),"Night");assert.equal(daylightPhase(90),"Sunrise");
 assert.equal(nightAmount(0),0);assert.equal(nightAmount(60),1);assert.equal(nightAmount(120),0);
 assert.ok(nightAmount(10)>0);assert.ok(nightAmount(20)>nightAmount(10));
 for(let t=0;t<240;t+=.1){const n=nightAmount(t);assert.ok(n>=0&&n<=1);assert.ok(Math.abs(n-nightAmount(t+.1))<.003);}
 for(let t=0;t<60;t++)assert.ok(nightAmount(t+1)>nightAmount(t));
 for(let t=60;t<120;t++)assert.ok(nightAmount(t+1)<nightAmount(t));
 for(const t of [20,50,60,80,110,120])assert.ok(Math.abs(nightAmount(t-.001)-nightAmount(t+.001))<.00006);
});
