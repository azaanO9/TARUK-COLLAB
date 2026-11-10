import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { batchStaticMeshes } from "../ui/world/batchStaticMeshes.ts";

test("static batching reduces meshes while preserving transformed bounds and animated hardware", () => {
  const scene = new T.Scene(), owner = new T.Group(), nested = new T.Group();
  scene.add(owner); owner.position.set(12, 3, -7); owner.rotation.y = .7; owner.add(nested); nested.position.x = 2;
  const material = new T.MeshStandardMaterial();
  for (let i = 0; i < 8; i++) {
    const mesh = new T.Mesh(i % 2 ? new T.BoxGeometry(1, 2, 1) : new T.CylinderGeometry(.5, .5, 2, 8), material);
    mesh.position.set(i, i % 3, -i); mesh.castShadow = true; nested.add(mesh);
  }
  const animated = new T.Mesh(new T.BoxGeometry(), material); owner.add(animated);
  owner.updateWorldMatrix(true, true);
  const before = new T.Box3().setFromObject(owner, true);
  assert.equal(batchStaticMeshes(owner, new Set([animated])), 7);
  const after = new T.Box3().setFromObject(owner, true);
  assert.ok(before.min.distanceTo(after.min) < .00001);
  assert.ok(before.max.distanceTo(after.max) < .00001);
  assert.equal(animated.parent, owner);
  animated.position.y = 5;
  assert.equal(animated.position.y, 5);
});

test("excluded station subtrees stay separately raycastable after scenery batching", () => {
  const root = new T.Group(), station = new T.Group(), material = new T.MeshStandardMaterial();
  station.userData.station = "oxygen"; root.add(station);
  station.add(new T.Mesh(new T.BoxGeometry(), material));
  for (let i = 0; i < 4; i++) { const m = new T.Mesh(new T.BoxGeometry(), material); m.position.x = i + 3; root.add(m); }
  assert.equal(batchStaticMeshes(root, new Set([station])), 3);
  root.updateMatrixWorld(true);
  const hits = new T.Raycaster(new T.Vector3(0, 0, 4), new T.Vector3(0, 0, -1)).intersectObject(station, true);
  assert.ok(hits.length > 0);
  assert.equal(hits[0].object.parent.userData.station, "oxygen");
});

test("vertex-coloured scenery keeps its colour and fills uncoloured vertices when batched",()=>{
  const root=new T.Group(),material=new T.MeshStandardMaterial({vertexColors:true});
  const tinted=new T.BoxGeometry();const colour=new Float32Array(tinted.attributes.position.count*3);for(let i=0;i<colour.length;i+=3){colour[i]=.7;colour[i+1]=.3;colour[i+2]=.1;}tinted.setAttribute('color',new T.BufferAttribute(colour,3));
  root.add(new T.Mesh(tinted,material));const plain=new T.Mesh(new T.BoxGeometry(),material);plain.position.x=2;root.add(plain);
  assert.equal(batchStaticMeshes(root,new Set()),1);const merged=root.children[0];assert.ok(merged.geometry.attributes.color);const values=merged.geometry.attributes.color.array;assert.ok(values.some(v=>Math.abs(v-.3)<.0001));assert.ok(values.some(v=>v===1));assert.ok(values.every(Number.isFinite));
});
