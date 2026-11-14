import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {streamingCandidate,streamingBenchmarkPass,streamedHeight,STREAM_LIMIT} from "../game/terrainStreaming.ts";
import {createStreamedMars} from "../ui/world/streamedMars.ts";
import {marsHeight} from "../ui/world/marsTerrain.ts";
import {stepWalker,spawnWalker} from "../game/navigation.ts";
import {spawnRoverVehicle,exitRover} from "../game/roverVehicle.ts";
test("streaming stays off on low-end, unknown and mobile devices regardless of quality",()=>{
 for(const gpu of ["Intel Iris Xe","SwiftShader","", "AMD Radeon Vega 8"])assert.equal(streamingCandidate(gpu,16,16,false,"ultra"),false);
 assert.equal(streamingCandidate("NVIDIA GeForce RTX 4060",8,8,false,"auto"),true);
 for(const args of [[4,8,false,"auto"],[8,4,false,"auto"],[8,8,true,"auto"],[8,8,false,"performance"]])assert.equal(streamingCandidate("GeForce RTX 4060",...args),false);
});
test("representative warmup requires stable headroom rather than GPU name alone",()=>{
 assert.equal(streamingBenchmarkPass(Array(12).fill(12)),true);
 assert.equal(streamingBenchmarkPass(Array(12).fill(25)),false);
 assert.equal(streamingBenchmarkPass([10,10]),false);
 assert.equal(streamingBenchmarkPass([...Array(10).fill(10),60,60]),false);
 assert.equal(streamingBenchmarkPass(Array(12).fill(NaN)),false);
});
test("walking and rover exit can use extended bounds without changing the finite default",()=>{
 const initial={...spawnWalker(),x:500,z:0};
 assert.ok(stepWalker(initial,new Set(["d"]),.05,[],5,true,undefined,STREAM_LIMIT).x>500);
 assert.ok(exitRover(spawnRoverVehicle(500,0,0),[],STREAM_LIMIT).exitPosition);
 assert.equal(exitRover(spawnRoverVehicle(500,0,0)).exitPosition,null);
});
test("streamed chunks share borders, match contact heights, recycle and dispose their pool",()=>{
 const root=new T.Group(), material=new T.MeshStandardMaterial();
 const ground=new T.Mesh(new T.PlaneGeometry(1,1),material);
 const stream=createStreamedMars(root,ground,marsHeight);
 function fill(x,z){stream.update(x,z,1000);while(stream.pending())stream.update(x,z,1000);}
 fill(500,500);
 assert.equal(root.children.length,49);
 const chunks=root.children.filter(m=>m.visible);
 assert.equal(chunks.length,49);
 const first=chunks[0].geometry.attributes.position;
 for(const i of [0,23,70,2555,5040])assert.ok(Math.abs(first.getY(i)-stream.heightAt(first.getX(i),first.getZ(i)))<1e-5);
 const a=streamedHeight(560,501.25,marsHeight),b=streamedHeight(560-1e-7,501.25,marsHeight);
 assert.ok(Math.abs(a-b)<1e-5);
 const expected=stream.heightAt(501.25,502.5);
 fill(-600,-600);fill(500,500);
 assert.equal(stream.heightAt(501.25,502.5),expected);
 assert.equal(root.children.length,49);
 stream.dispose();assert.equal(root.children.length,0);ground.geometry.dispose();material.dispose();
});
