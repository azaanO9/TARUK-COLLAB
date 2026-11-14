import test from "node:test";
import assert from "node:assert/strict";
import {safeLookDelta} from "../game/mouseLook.ts";
test("normal look movement is preserved while pointer warps and invalid deltas are ignored",()=>{
 for(const value of [-100,-12.5,0,3,100]) assert.equal(safeLookDelta(value),value);
 for(const value of [-1000,101,Infinity,NaN]) assert.equal(safeLookDelta(value),0);
});

import { WORLD_LIMIT, stepWalker, spawnWalker } from "../game/navigation.ts";
import { ROVER_LIMIT } from "../game/roverVehicle.ts";
test("expanded exploration crosses the former boundary and remains on the ground mesh",()=>{
 let walker={...spawnWalker(),x:90,z:0};
 for(let i=0;i<120;i++)walker=stepWalker(walker,new Set(["d"]),1/60);
 assert.ok(walker.x>99);
 assert.equal(WORLD_LIMIT,176);
 assert.ok(ROVER_LIMIT>170 && ROVER_LIMIT<WORLD_LIMIT);
 assert.ok(WORLD_LIMIT<210);
});
