import test from "node:test";
import assert from "node:assert/strict";
import {mapPoint,mapHeading,MAP_RANGE} from "../game/minimap.ts";
test("minimap tracks world coordinates without an infinite-map origin limit",()=>{
 assert.deepEqual(mapPoint(10000,-9000,10000,-9000),{x:100,y:100,edge:false});
 assert.equal(mapPoint(10000+MAP_RANGE,-9000,10000,-9000).x,188);
 assert.equal(mapPoint(10000,-9000-MAP_RANGE,10000,-9000).y,12);
 const far=mapPoint(0,0,10000,-9000);assert.equal(far.edge,true);assert.ok(Math.abs(Math.hypot(far.x-100,far.y-100)-88)<1e-8);
 assert.equal(mapHeading(Math.PI/2),-90);
});
