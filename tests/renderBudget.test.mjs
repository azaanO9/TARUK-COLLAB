import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { occlusionSize, BoundedGTAOPass } from '../ui/world/BoundedGTAOPass.ts';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';

test('contact shading remains bounded at laptop, retina and narrow-screen sizes',()=>{
  for(const [w,h] of [[1280,720],[3840,2160],[390,844],[1,1]]) {
    const [x,y]=occlusionSize(w,h);
    assert.ok(x>=1&&y>=1&&Math.max(x,y)<=768);
    assert.ok(x*y<=Math.max(1,w*h*.251));
    assert.ok(Math.abs(x/y-w/h)<.02);
  }
});

test('contact shading restores visibility and shadow state even if rendering fails',()=>{
  const scene=new T.Scene(), pane=new T.Mesh(new T.PlaneGeometry(),new T.MeshBasicMaterial({transparent:true}));
  const particles=new T.Points(), line=new T.Line(), override=new T.MeshNormalMaterial();
  scene.add(pane,particles,line);
  const pass=new BoundedGTAOPass(scene,new T.PerspectiveCamera(),64,64);
  const renderer={shadowMap:{autoUpdate:true,needsUpdate:true},autoClear:true};
  const original=GTAOPass.prototype.render;
  GTAOPass.prototype.render=function(){
    assert.equal(renderer.shadowMap.autoUpdate,false);assert.equal(renderer.shadowMap.needsUpdate,false);
    assert.equal(pane.visible,false);assert.equal(particles.visible,false);assert.equal(line.visible,false);
    renderer.autoClear=false;scene.overrideMaterial=override;
    throw new Error('simulated context failure');
  };
  try {assert.throws(()=>pass.render(renderer,null,null),/simulated context failure/);}
  finally {GTAOPass.prototype.render=original;pass.dispose();for(const o of [pane,particles,line]){o.geometry.dispose();o.material.dispose();}override.dispose();}
  assert.equal(renderer.shadowMap.autoUpdate,true);assert.equal(renderer.shadowMap.needsUpdate,true);assert.equal(pane.visible,true);
  assert.equal(particles.visible,true);assert.equal(line.visible,true);
  assert.equal(renderer.autoClear,true);assert.equal(scene.overrideMaterial,null);
});
