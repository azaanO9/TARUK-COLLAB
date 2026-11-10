import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import * as T from 'three';
import { partitionRoverMesh } from '../ui/world/roverWheelAssembly.ts';
import { ROVER_WHEEL_OFFSETS, spawnRoverVehicle } from '../game/roverVehicle.ts';

test('all six suspension contacts sample their own measured wheel position', () => {
  for (let raised = 0; raised < 6; raised++) {
    const [x, z] = ROVER_WHEEL_OFFSETS[raised];
    const rover = spawnRoverVehicle(0, 0, 0, (wx, wz) => Math.hypot(wx-x, wz-z) < .1 ? .2 : 0);
    assert.deepEqual(rover.wheelContacts, Array.from({length:6}, (_, i) => i === raised ? .2 : 0));
    assert.ok(rover.wheelCompression[raised] > 0);
    assert.ok(rover.wheelCompression.some((v, i) => i !== raised && v !== rover.wheelCompression[raised]));
  }
});

test('actual NASA mesh keeps complete tires and suspension in separate transforms', async () => {
  const module = {exports:{}};
  vm.runInNewContext(fs.readFileSync(new URL('../public/draco/draco_wasm_wrapper.js', import.meta.url), 'utf8'), {
    module, exports: module.exports, require: createRequire(import.meta.url), __dirname: '.', process, console, Buffer, WebAssembly, TextDecoder, setTimeout, clearTimeout,
  });
  const draco = await module.exports({wasmBinary: fs.readFileSync(new URL('../public/draco/draco_decoder.wasm', import.meta.url))});
  const bytes = fs.readFileSync(new URL('../public/models/space-exploration-vehicle.glb', import.meta.url));
  const size = bytes.readUInt32LE(12), gltf = JSON.parse(bytes.subarray(20,20+size));
  const view = gltf.bufferViews[0], offset = 28+size+(view.byteOffset||0);
  const buffer = new draco.DecoderBuffer(), decoder = new draco.Decoder(), mesh = new draco.Mesh();
  const data = bytes.subarray(offset, offset+view.byteLength); buffer.Init(data,data.length);
  decoder.DecodeBufferToMesh(buffer,mesh);
  const values = new draco.DracoFloat32Array();
  decoder.GetAttributeFloatForAllPoints(mesh,decoder.GetAttributeByUniqueId(mesh,0),values);
  const positions = new Float32Array(values.size());
  const scale=4.95/5.91002;
  for(let i=0;i<positions.length;i+=3){ positions[i]=values.GetValue(i)*scale; positions[i+1]=-values.GetValue(i+2)*scale+2.24213*scale; positions[i+2]=-values.GetValue(i+1)*scale-.39988*scale; }
  const indices=[], face=new draco.DracoInt32Array();
  for(let i=0;i<mesh.num_faces();i++){decoder.GetFaceFromMesh(mesh,i,face);indices.push(face.GetValue(0),face.GetValue(1),face.GetValue(2));}
  const geometry = new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setIndex(indices);
  const rig=partitionRoverMesh(new T.Mesh(geometry,new T.MeshStandardMaterial()));
  assert.ok(rig); assert.equal(rig.wheels.length,6);
  let count=rig.chassisMesh.geometry.index.count;
  for(const wheel of rig.wheels){
    const tire=wheel.wheelMesh, upright=wheel.pivot.getObjectByName(`upright-${rig.wheels.indexOf(wheel)}`);
    count+=tire.geometry.index.count+upright.geometry.index.count;
    tire.geometry.computeBoundingBox(); const box=tire.geometry.boundingBox;
    assert.ok(Math.abs(box.max.y+box.min.y)<.002, 'axle is centered vertically in tire');
    assert.ok(box.max.y<.323 && box.min.y>-.323,'only the tire fits the rotating envelope');
    wheel.pivot.updateMatrixWorld(true);
    const before=upright.matrixWorld.clone();
    wheel.wheelMesh.rotation.x=2.3;wheel.pivot.updateMatrixWorld(true);
    assert.deepEqual(upright.matrixWorld.elements,before.elements);
    assert.deepEqual(upright.rotation.toArray(),[0,0,0,'XYZ']);
    assert.equal(upright.parent,wheel.pivot);assert.equal(tire.parent,wheel.steering);
    assert.ok(upright.geometry.attributes.position.count>1000);
  }
  assert.equal(count,indices.length,'every source triangle belongs to exactly one part');
  for(const obj of [values,face,buffer,mesh,decoder])draco.destroy(obj);
});
