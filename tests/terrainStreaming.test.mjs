import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {streamingBudget,streamedRock,streamedHeight,STREAM_LIMIT} from "../game/terrainStreaming.ts";
import {createStreamedMars} from "../ui/world/streamedMars.ts";
import {marsHeight} from "../ui/world/marsTerrain.ts";
import {stepWalker,spawnWalker} from "../game/navigation.ts";
import {spawnRoverVehicle,exitRover} from "../game/roverVehicle.ts";
test("every device streams with a bounded capability budget",()=>{
 const high=streamingBudget("NVIDIA GeForce RTX 4060",8,8,false,"auto");
 for(const gpu of ["Intel Iris Xe","SwiftShader","", "AMD Radeon Vega 8"]){const low=streamingBudget(gpu,4,4,true,"auto");assert.equal(low.radius,2);assert.ok(low.rocks>0);assert.ok(low.rocks<high.rocks);assert.ok(low.generationMs<high.generationMs);}
 assert.equal(high.radius,3);
 assert.equal(streamingBudget("NVIDIA GeForce RTX 4060",8,8,false,"performance").radius,2);
 assert.equal(STREAM_LIMIT,Infinity);
 assert.deepEqual(streamedRock(100,-20,3),streamedRock(100,-20,3));
});
test("walking and rover exit can use extended bounds without changing the finite default",()=>{
 const initial={...spawnWalker(),x:50000,z:0};
 assert.ok(stepWalker(initial,new Set(["d"]),.05,[],5,true,undefined,STREAM_LIMIT).x>50000);
 assert.ok(exitRover(spawnRoverVehicle(500,0,0),[],STREAM_LIMIT).exitPosition);
 assert.equal(exitRover(spawnRoverVehicle(500,0,0)).exitPosition,null);
});
test("streamed chunks share borders, match contact heights, recycle and dispose their pool",()=>{
 const root=new T.Group(), material=new T.MeshStandardMaterial();
 const ground=new T.Mesh(new T.PlaneGeometry(1,1),material);
 const obstacles=[];
 const stream=createStreamedMars(root,ground,marsHeight,{obstacles});
 function fill(x,z){stream.update(x,z,1000);while(stream.pending())stream.update(x,z,1000);}
 fill(500,500);
 assert.equal(root.children.length,98);
 const chunks=root.children.filter(m=>m.visible&&m.name==="streamed-ground");
 assert.equal(chunks.length,49);
 const first=chunks[0].geometry.attributes.position;
 for(const i of [0,23,70,2555,5040])assert.ok(Math.abs(first.getY(i)-stream.heightAt(first.getX(i)+chunks[0].position.x,first.getZ(i)+chunks[0].position.z))<1e-5);
 const a=streamedHeight(560,501.25,marsHeight),b=streamedHeight(560-1e-7,501.25,marsHeight);
 assert.ok(Math.abs(a-b)<1e-5);
 const expected=stream.heightAt(501.25,502.5);
 fill(-600,-600);fill(500,500);
 assert.equal(stream.heightAt(501.25,502.5),expected);
 assert.equal(root.children.length,98);
 assert.equal(obstacles.length,49*18);
 const small=obstacles.find(o=>o.traversable),large=obstacles.find(o=>!o.traversable);
 assert.ok(small&&large,"generated terrain includes climbable rocks and blocking boulders");
 assert.ok(stream.roverHeightAt(small.x,small.z)>stream.heightAt(small.x,small.z)+.2);
 assert.equal(stream.roverHeightAt(large.x,large.z),stream.heightAt(large.x,large.z));
 assert.ok(obstacles.every(o=>o.hull.length>=3));
 stream.dispose();assert.equal(obstacles.length,0);assert.equal(root.children.length,0);ground.geometry.dispose();material.dispose();
});
