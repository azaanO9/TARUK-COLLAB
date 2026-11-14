import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {MARS_REGION as R,marsToWorld,worldToMars,sampleMarsElevation,marsRegionalHeight,isSurveyedRegion} from '../game/marsRegion.ts';
import {MARS_LANDMARKS} from '../content/marsLandmarks.ts';
import {marsExpeditionHeight} from '../game/marsExpeditionTerrain.ts';
import {createStreamedMars} from '../ui/world/streamedMars.ts';
import {streamedHeight} from '../game/terrainStreaming.ts';
import {mapPoint} from '../game/minimap.ts';

test('NASA crop uses the requested extent, round-trips coordinates and keeps north at negative Z',()=>{
 assert.equal(R.width,513);assert.equal(R.height,385);assert.equal(R.quantum,16);
 assert.equal(R.dataset,'MGS-M-MOLA-5-MEGDR-L3-V1.0');
 assert.deepEqual(marsToWorld(R.centerLongitude,R.centerLatitude),{x:0,z:0});
 for(const p of MARS_LANDMARKS){const q=worldToMars(p.x,p.z);assert.ok(Math.abs(q.latitude-p.latitude)<1e-10);assert.ok(Math.abs(q.longitude-p.longitude)<1e-10);assert.equal(isSurveyedRegion(p.x,p.z),true);}
 const north=marsToWorld(R.centerLongitude,R.centerLatitude+1);assert.equal(north.z,-12);
 assert.equal(mapPoint(north.x,north.z,0,0).y<100,true);
});

test('landmarks are twice as close while their heights, map pins and survey bounds stay registered',()=>{
 assert.equal(R.gameMetresPerDegree,12);assert.equal(R.elevationDivisor,480);
 const datum=sampleMarsElevation(R.centerLongitude,R.centerLatitude);
 for(const p of MARS_LANDMARKS){
  const previousX=(p.longitude-R.centerLongitude)*24*Math.cos(R.centerLatitude*Math.PI/180);
  const previousZ=(R.centerLatitude-p.latitude)*24;
  assert.ok(Math.abs(p.x*2-previousX)<1e-9);assert.ok(Math.abs(p.z*2-previousZ)<1e-9);
  assert.ok(Math.abs(marsRegionalHeight(p.x,p.z)-(sampleMarsElevation(p.longitude,p.latitude)-datum)/480)<1e-8);
 }
});

test('decoded big-endian PDS topography retains observed volcano/plains elevation ordering',()=>{
 // Broad physical ranges independently checked against the downloaded source IMG.
 assert.ok(sampleMarsElevation(147.21,25.02)>9500);
 assert.ok(sampleMarsElevation(150.47,18.87)>3000);
 assert.ok(sampleMarsElevation(126.74,19.88)<-3000);
 assert.ok(sampleMarsElevation(154.74,2.98)<-2000);
 assert.equal(marsRegionalHeight(0,0),0);
 for(const [lon,lat] of [[R.west,R.north],[R.east,R.south],[R.west-5,R.north+5]])assert.ok(Number.isFinite(sampleMarsElevation(lon,lat)));
});

test('regional surface is continuous, spawn is graded and infinite continuation stays finite',()=>{
 for(const [x,z] of [[0,12],[0,21],[17,10]])assert.equal(marsExpeditionHeight(x,z),0);
 for(let x=-600;x<600;x+=19)for(let z=-500;z<500;z+=23){const a=marsExpeditionHeight(x,z);assert.ok(Number.isFinite(a));assert.ok(Math.abs(a-marsExpeditionHeight(x+.001,z))<.05);}
 assert.equal(isSurveyedRegion(10000,10000),false);
 assert.ok(Number.isFinite(marsExpeditionHeight(10000,10000)));
});

test('streaming uses the measured height sampler on both sides of a tile seam and recycles at landmarks',()=>{
 const root=new T.Group(),ground=new T.Mesh(new T.PlaneGeometry(),new T.MeshStandardMaterial());
 // Nearby landmarks now enter the permanent spawn mesh; its sampler is also barycentric.
 const baseHeight=(x,z)=>streamedHeight(x,z,marsExpeditionHeight);
 const stream=createStreamedMars(root,ground,baseHeight,{radius:1,rocks:2,pebbles:1,sampleHeight:marsExpeditionHeight});
 try{
  for(const p of MARS_LANDMARKS.slice(0,4)){
   stream.update(p.x,p.z,1000);while(stream.pending())stream.update(p.x,p.z,1000);
   assert.ok(Math.abs(stream.heightAt(p.x,p.z)-streamedHeight(p.x,p.z,marsExpeditionHeight))<1e-8);
   assert.equal(root.children.length,18);
   for(const tile of root.children.filter(m=>m.name==='streamed-ground'&&m.visible)){
    const v=tile.geometry.attributes.position;
    for(const i of [0,35,70,5040])assert.ok(Math.abs(v.getY(i)-marsExpeditionHeight(v.getX(i)+tile.position.x,v.getZ(i)+tile.position.z))<1e-4);
   }
  }
  const x=280,z=-300.25;assert.ok(Math.abs(stream.heightAt(x-1e-7,z)-stream.heightAt(x,z))<1e-5);
 }finally{stream.dispose();ground.geometry.dispose();ground.material.dispose();}
});
