import test from "node:test";
import assert from "node:assert/strict";
import {createTrackWindow,forTrackPatch} from "../game/trackWindow.ts";
import {createMarsTrackSystem} from "../ui/world/marsTrackDeformation.ts";
import {spawnRoverVehicle} from "../game/roverVehicle.ts";
import {spawnCuriosityRover} from "../game/curiosityRover.ts";

test("rolling pages preserve nearby marks and invalidate recycled positions without growing storage",()=>{
 const field=createTrackWindow(512),data=field.data;
 const near=(field.pixel(0)*512+field.pixel(20))*4;data[near]=200;
 const recycled=(field.pixel(0)*512+field.pixel(-46))*4;data[recycled]=255;
 field.moveTo(13,0);
 assert.equal(field.data,data);assert.equal(data.byteLength,1024*1024);
 assert.equal(data[near],200);assert.equal(data[recycled],0);
 assert.equal(field.contains(-46,0),false);assert.equal(field.ready(50,0),false);
 assert.equal(field.pending(),8);
 let page;while((page=field.nextPage())!==undefined)field.markReady(page);
 assert.equal(field.ready(50,0),true);assert.equal(data[recycled],0);
 field.moveTo(-50000,80000);assert.equal(field.contains(-50000,80000),true);
 assert.equal(field.ready(-50000,80000),false);assert.equal(field.pending(),64);
 assert.equal(data.byteLength,1024*1024);
});

test("wrapped uploads cover exactly one small patch with no out-of-bounds copies",()=>{
 for(const [x,y] of [[100,50],[-12,500],[500,500],[-20,-20]]){
  let pixels=0,calls=0;
  forTrackPatch(512,48,x,y,(sx,sy,w,h,dx,dy)=>{
   calls++;pixels+=w*h;assert.ok(dx>=0&&dy>=0&&dx+w<=512&&dy+h<=512);assert.ok(sx>=0&&sy>=0&&sx+w<=48&&sy+h<=48);
  });assert.equal(pixels,48*48);assert.ok(calls<=4);
 }
});

test("both graphics budgets stamp tracks far beyond spawn and discard off-window rover work",()=>{
 for(const light of [true,false]){
  const system=createMarsTrackSystem(light),calls=[];
  const renderer={copyTextureToTexture:(src,dst,region,pos)=>calls.push({w:region?region.max.x-region.min.x:src.image.width,h:region?region.max.y-region.min.y:src.image.height,x:pos.x,y:pos.y})};
  assert.equal(system.texture.image.width,light?512:1024);
  system.update(renderer,500,-500,light);
  assert.ok(calls.length<=(light?1:2),"page reclamation is bounded per frame");
  for(let i=0;i<64;i++)system.update(renderer,500,-500,light);
  calls.length=0;
  system.stampRover(renderer,{...spawnRoverVehicle(500,-500),speed:5,driving:true},()=>.25);
  assert.ok(system.texture.image.data.some((n,i)=>i%4===0&&n>0),"far tyre ruts are written");
  assert.ok(calls.length<=4);assert.equal(calls.reduce((n,c)=>n+c.w*c.h*4,0),48*48*4);
  calls.length=0;
  system.stampCuriosity(renderer,spawnCuriosityRover([],()=>0,{seed:1}),()=>0);
  assert.equal(calls.length,0,"remote autonomous rover cannot recenter or upload the player's atlas");
  let disposed=0;system.texture.addEventListener('dispose',()=>disposed++);system.maskTexture.addEventListener('dispose',()=>disposed++);
  system.dispose();assert.equal(disposed,2);
 }
});
