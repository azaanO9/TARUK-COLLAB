import test from "node:test";
import assert from "node:assert/strict";
import {convexRockOutline,rockContact,rockLiftAt,ROVER_ROCK_STEP} from "../game/rockContact.ts";
import {moveAndSlide,overlapBody} from "../game/collision.ts";
import {roverFootprint,stepRoverVehicle,spawnRoverVehicle,enterRover} from "../game/roverVehicle.ts";
const outline=convexRockOutline([{x:-1,z:-1},{x:1,z:-1},{x:1,z:1},{x:-1,z:1},{x:0,z:0},{x:1,z:1}]);
test("rover reaches the visible narrow rock edge instead of the oversized circle",()=>{
 const rock=rockContact(300,0,outline,2,.25,0,0,1);
 const body=roverFootprint(0,0,0);
 const moved=moveAndSlide(300,8,0,-12,[body],[rock],Infinity);
 assert.ok(Math.abs(moved.z-(2.475+.25))<.002,`stops at rock skin: ${moved.z}`);
 assert.equal(overlapBody(moved.x,moved.z,body,rock),null);
});
test("rock outline sweeps prevent tunnelling and handle rotated approach",()=>{
 for(const yaw of [0,.4,1.2,Math.PI/2]){
  const rock=rockContact(0,0,outline,2,.4,yaw,0,1);
  const body=roverFootprint(0,0,yaw);
  const moved=moveAndSlide(0,10,0,-20,[body],[rock],Infinity);
  assert.ok(moved.normals.length>0);assert.equal(overlapBody(moved.x,moved.z,body,rock),null);
 }
});
test("small rocks articulate suspension, while tall boulders block at distant coordinates",()=>{
 const small=rockContact(300,0,outline,.45,.45,.3,0,.4);
 const large=rockContact(300,0,outline,.45,.45,.3,0,1);
 assert.equal(small.traversable,true);assert.equal(large.traversable,false);
 assert.equal(rockContact(0,0,outline,1,1,0,0,ROVER_ROCK_STEP).traversable,true);
 assert.equal(rockLiftAt(300,0,small),.4);assert.equal(rockLiftAt(305,0,small),0);assert.equal(rockLiftAt(300,0,large),0);
 function drive(rock){let r=enterRover(spawnRoverVehicle(300,8));for(let i=0;i<180;i++)r=stepRoverVehicle(r,new Set(['w']),.05,[rock],(x,z)=>rockLiftAt(x,z,rock),()=>0,undefined,{worldLimit:Infinity});return r;}
 assert.ok(drive(small).z<0);assert.ok(drive(large).z>2);
});
