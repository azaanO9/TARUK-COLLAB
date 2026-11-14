import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {PERSEVERANCE_LANDING as P,surveyRegionLabel} from '../content/marsLandingSites.ts';
import {MARS_LANDMARKS} from '../content/marsLandmarks.ts';
import {worldToMars} from '../game/marsRegion.ts';
import {marsExpeditionHeight} from '../game/marsExpeditionTerrain.ts';
import {createPerseveranceRover,perseveranceFootprint,PERSEVERANCE_CLEARING} from '../ui/world/createPerseveranceRover.ts';
import {createStreamedMars} from '../ui/world/streamedMars.ts';
import {overlapDisc} from '../game/collision.ts';

test('Perseverance uses historical touchdown coordinates and the same projected map pin',()=>{
 assert.equal(P.latitude,18.4446);assert.equal(P.longitude,77.4509);
 assert.equal(P.date,'18 February 2021');
 const geographic=worldToMars(P.x,P.z),pin=MARS_LANDMARKS.find(p=>p.id==='perseverance');
 assert.ok(Math.abs(geographic.latitude-P.latitude)<1e-10);assert.ok(Math.abs(geographic.longitude-P.longitude)<1e-10);
 assert.equal(pin.x,P.x);assert.equal(pin.z,P.z);assert.equal(pin.number,7);
 assert.equal(surveyRegionLabel(P.x,P.z),'JEZERO · PERSEVERANCE');
 assert.ok(Math.hypot(P.x,P.z)>650&&Math.hypot(P.x,P.z)<700);
 const obstacle=perseveranceFootprint();assert.ok(overlapDisc(P.x,P.z,.36,obstacle));
 assert.equal(overlapDisc(P.x+3,P.z,.36,obstacle),null);
});

test('original rover is grounded, batched, distance-culled and disposes its geometry/materials once',()=>{
 const model=createPerseveranceRover(()=>5),bounds=new T.Box3().setFromObject(model.root);
 assert.equal(model.root.position.x,P.x);assert.equal(model.root.position.z,P.z);
 assert.ok(bounds.min.y>4.97&&bounds.min.y<5.01);assert.ok(bounds.max.y<8);
 let calls=0,triangles=0;const geometries=new Set(),materials=new Set();
 model.root.traverse(o=>{if(o instanceof T.Mesh){calls++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;geometries.add(o.geometry);materials.add(o.material);}});
 assert.ok(calls<=8,`${calls} draw calls`);assert.ok(triangles<20000,`${triangles} triangles`);
 model.updateVisibility(0,0,true);assert.equal(model.root.visible,false);
 model.updateVisibility(P.x+180,P.z,false);assert.equal(model.root.visible,true);
 model.updateVisibility(P.x+180,P.z,true);assert.equal(model.root.visible,false);
 model.updateVisibility(P.x,P.z,true);assert.equal(model.root.visible,true);
 let disposed=0;for(const resource of [...geometries,...materials])resource.addEventListener('dispose',()=>disposed++);
 model.dispose();model.dispose();assert.equal(disposed,geometries.size+materials.size);
});

test('streamed rock clearance protects Perseverance and keeps its collision after chunk recycling',()=>{
 const root=new T.Group(),ground=new T.Mesh(new T.PlaneGeometry(),new T.MeshStandardMaterial());
 const fixed=perseveranceFootprint(),obstacles=[fixed];
 const stream=createStreamedMars(root,ground,marsExpeditionHeight,{radius:1,rocks:30,pebbles:8,sampleHeight:marsExpeditionHeight,obstacles,clearings:[PERSEVERANCE_CLEARING]});
 try{
  for(const [x,z] of [[P.x,P.z],[P.x+500,P.z],[P.x,P.z]]){
   stream.update(x,z,1000);while(stream.pending())stream.update(x,z,1000);
   assert.ok(obstacles.includes(fixed));assert.equal(root.children.length,18);
   for(const rock of obstacles.slice(1))assert.ok(Math.hypot(rock.x-P.x,rock.z-P.z)>=PERSEVERANCE_CLEARING.radius+rock.radius-.001);
  }
 }finally{stream.dispose();ground.geometry.dispose();ground.material.dispose();}
});

test('contact shadow conforms to sloped terrain and generated textures are disposed once',()=>{
 const originalDocument=globalThis.document;
 const context=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key]??(()=>{})});
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
 const heightAt=(x,z)=>5+(x-P.x)*.12+(z-P.z)*.08;
 let model;
 try{
  model=createPerseveranceRover(heightAt);
  const contact=model.root.getObjectByName('perseverance-contact-shadow');
  assert.ok(contact);const vertices=contact.geometry.attributes.position;
  for(let i=0;i<vertices.count;i++)assert.ok(Math.abs(vertices.getY(i)+5-heightAt(P.x+vertices.getX(i),P.z+vertices.getZ(i))-.022)<1e-6);
  const textures=new Set();let calls=0;
  model.root.traverse(o=>{if(o instanceof T.Mesh){calls++;if(o.material.map)textures.add(o.material.map);}});
  assert.ok(calls<=8);assert.equal(textures.size,2);
  let disposed=0;for(const texture of textures)texture.addEventListener('dispose',()=>disposed++);
  model.dispose();model.dispose();assert.equal(disposed,2);
 }finally{model?.dispose();if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;}
});
