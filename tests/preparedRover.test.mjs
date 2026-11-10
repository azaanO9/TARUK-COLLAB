import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import { bindPreparedRover } from '../ui/world/roverWheelAssembly.ts';
import { ROVER_WHEEL_OFFSETS, ROVER_WHEEL_OUTER_RADIUS } from '../game/roverVehicle.ts';

const read = name => { const bytes=fs.readFileSync(new URL(`../public/models/${name}.glb`,import.meta.url)); return {bytes,json:JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)))}; };
test('prepared NASA rover preserves all triangles with a smaller download and no PNG fallbacks',()=>{
  const original=read('space-exploration-vehicle'), prepared=read('space-exploration-vehicle-ready');
  const triangles=j=>j.meshes.reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>n+j.accessors[p.indices].count,0),0);
  assert.equal(triangles(prepared.json),triangles(original.json));
  assert.equal(prepared.json.meshes.length,13);
  assert.ok(prepared.bytes.length<original.bytes.length*.4);
  assert.ok(prepared.json.images.every(image=>image.mimeType==='image/webp'));
});

test('prepared wheel rig binds directly and keeps each upright independent of tire spin',()=>{
  const {json}=read('space-exploration-vehicle-ready');
  const objects=json.nodes.map(n=>{ const o=n.mesh===undefined?new T.Object3D():new T.Mesh();o.name=n.name; if(n.translation)o.position.fromArray(n.translation);return o; });
  json.nodes.forEach((n,i)=>(n.children??[]).forEach(c=>objects[i].add(objects[c])));
  const root=new T.Group();json.scenes[json.scene??0].nodes.forEach(i=>root.add(objects[i]));
  const rig=bindPreparedRover(root);assert.ok(rig);assert.equal(rig.wheels.length,6);
  rig.wheels.forEach((w,k)=>{
    assert.ok(Math.abs(w.baseX-ROVER_WHEEL_OFFSETS[k][0])<1e-6);
    assert.ok(Math.abs(w.baseZ-ROVER_WHEEL_OFFSETS[k][1])<1e-6);
    assert.ok(Math.abs(w.baseY-ROVER_WHEEL_OUTER_RADIUS)<1e-6);
    const upright=root.getObjectByName(`upright-${k}`);root.updateMatrixWorld(true);
    const before=upright.matrixWorld.clone();w.wheelMesh.rotation.x=2;root.updateMatrixWorld(true);
    assert.deepEqual(upright.matrixWorld.elements,before.elements);
    const node=json.nodes.find(n=>n.name===`tire-${k}`);
    const accessor=json.accessors[json.meshes[node.mesh].primitives[0].attributes.POSITION];
    assert.ok(accessor.max[1]<.323&&accessor.min[1]>-.323);
  });
});
