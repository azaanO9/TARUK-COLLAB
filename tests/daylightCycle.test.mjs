import test from "node:test";
import assert from "node:assert/strict";
import {nightAmount,daylightPhase} from "../game/daylightCycle.ts";
test("daylight eases through sunset, night and sunrise without jumps",()=>{
 assert.equal(daylightPhase(0),"Day");assert.equal(daylightPhase(100),"Sunset");assert.equal(daylightPhase(160),"Night");assert.equal(daylightPhase(260),"Sunrise");
 assert.equal(nightAmount(0),0);assert.equal(nightAmount(150),1);assert.equal(nightAmount(300),0);
 for(let t=0;t<600;t+=.1){const n=nightAmount(t);assert.ok(n>=0&&n<=1);assert.ok(Math.abs(n-nightAmount(t+.1))<.003);}
 for(let t=90;t<150;t++)assert.ok(nightAmount(t+1)>=nightAmount(t));
 for(let t=240;t<300;t++)assert.ok(nightAmount(t+1)<=nightAmount(t));
 for(const t of [90,150,240,300])assert.ok(Math.abs(nightAmount(t-.001)-nightAmount(t+.001))<.00001);
});
