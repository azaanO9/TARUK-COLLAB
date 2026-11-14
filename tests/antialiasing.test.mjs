import test from "node:test";
import assert from "node:assert/strict";
import {ResolutionFXAAPass} from "../ui/world/ResolutionFXAAPass.ts";

test("FXAA samples physical pixels after resizing and changing render scale",()=>{
 const pass=new ResolutionFXAAPass();
 try {
  for(const [width,height] of [[1920,1080],[1280,720],[640,360],[390,844],[0,0]]){
   pass.setSize(width,height);
   assert.equal(pass.uniforms.resolution.value.x,1/Math.max(1,width));
   assert.equal(pass.uniforms.resolution.value.y,1/Math.max(1,height));
  }
 }finally{pass.dispose();}
});
