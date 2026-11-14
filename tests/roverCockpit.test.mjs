import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createRoverCockpit, createRoverWindowLining, positionRoverCockpitCamera, ROVER_DRIVER_EYE } from '../ui/world/roverCockpit.ts';
import { ROVER_WINDOW_CONTOURS } from '../ui/world/roverWindowContours.ts';
import {spawnRoverVehicle} from '../game/roverVehicle.ts';

test('cockpit plots six landmark bearings and bounds map texture refresh to 8 Hz',t=>{
 const previous=globalThis.document,texts=[];
 const context=new Proxy({fillText:(text)=>texts.push(text)}, {get:(target,key)=>target[key]??(()=>{})});
 globalThis.document={createElement:()=>({getContext:()=>context})};
 let now=0;t.mock.method(performance,'now',()=>now);
 const cockpit=createRoverCockpit(),rover=spawnRoverVehicle(17,10,0);
 try{
  cockpit.update(rover);const version=cockpit.texture.version;
  for(let i=1;i<=6;i++)assert.ok(texts.includes(String(i)));
  assert.ok(texts.includes('ELYSIUM REGION · MARS'));
  assert.ok(!texts.some(v=>v.includes('JEZERO')||v==='2480'));
  now=75;rover.x+=1;cockpit.update(rover);assert.equal(cockpit.texture.version,version);
  now=126;cockpit.update(rover);assert.equal(cockpit.texture.version,version+1);
  now=260;rover.x=10000;cockpit.update(rover);assert.ok(texts.includes('PROCEDURAL FRONTIER'));
 }finally{globalThis.document=previous;cockpit.texture.dispose();cockpit.root.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.();});}
});

test('all seven measured panes are open while the intervening pressure wall is opaque', () => {
  const lining = new T.Mesh(createRoverWindowLining(), new T.MeshBasicMaterial({side:T.DoubleSide}));
  lining.updateMatrixWorld(true);
  assert.equal(ROVER_WINDOW_CONTOURS.length, 7);
  for (const points of ROVER_WINDOW_CONTOURS) {
    const center = points.reduce((v,p)=>v.add(new T.Vector3(...p)),new T.Vector3()).divideScalar(points.length);
    const ray = new T.Raycaster(new T.Vector3(center.x,center.y,-1.3),new T.Vector3(0,0,-1),0,2);
    assert.equal(ray.intersectObject(lining).length,0,'each window center must be a true aperture');
    for (const p of points) {
      const nearEdge = center.clone().lerp(new T.Vector3(...p),.90);
      ray.set(new T.Vector3(nearEdge.x,nearEdge.y,-1.3),new T.Vector3(0,0,-1));
      assert.equal(ray.intersectObject(lining).length,0,'curved corners must not be filled by the wall');
    }
  }
  for (const [x,y] of [[0,2.08],[0,1.62],[-.48,1.73],[.48,1.73],[0,2.40]]) {
    const ray = new T.Raycaster(new T.Vector3(x,y,-1.3),new T.Vector3(0,0,-1),0,2);
    assert.ok(ray.intersectObject(lining).length>0,'window dividers must remain solid');
  }
  lining.geometry.dispose(); lining.material.dispose();
});

test('driver eye and viewing direction follow chassis pitch, roll and yaw', () => {
  const root = new T.Group();
  root.position.set(10, 3, -12);
  root.rotation.set(.2, 1.3, -.15, 'YXZ');
  const camera = new T.PerspectiveCamera();
  positionRoverCockpitCamera(camera, root, 0, 0);
  const expected = ROVER_DRIVER_EYE.clone().applyMatrix4(root.matrixWorld);
  assert.ok(camera.position.distanceTo(expected) < 1e-10);
  assert.ok(camera.quaternion.angleTo(root.quaternion) < 1e-7);
});

test('cockpit has a clear forward windshield and bounded interior geometry', () => {
  const previous = globalThis.document;
  // Canvas drawing is not needed for geometry/raycast checks.
  globalThis.document = { createElement: () => ({getContext: () => ({})}) };
  try {
    const cockpit = createRoverCockpit();
    cockpit.root.visible = true;
    cockpit.root.updateMatrixWorld(true);
    for (const yaw of [-.2, 0, .2]) {
      const direction = new T.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
      const ray = new T.Raycaster(ROVER_DRIVER_EYE, direction, .01, 5);
      assert.equal(ray.intersectObject(cockpit.root, true).length, 0, 'driver windshield pane must be open');
    }
    const bounds = new T.Box3().setFromObject(cockpit.root);
    assert.ok(bounds.min.x > -1.2 && bounds.max.x < 1.2);
    assert.ok(bounds.min.z > -2.48 && bounds.max.z < 2.48);
    assert.ok(bounds.max.y < 3.32);
    for (const x of [-1, 0, 1]) {
      const rearRay = new T.Raycaster(new T.Vector3(x,1.76,1),new T.Vector3(0,0,1),0,1);
      assert.ok(rearRay.intersectObject(cockpit.root,true).length > 0,'rear shell must close the curved cabin, including its edges');
    }
  } finally {
    globalThis.document = previous;
  }
});

test('switching cockpit visibility keeps the scene light count stable',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>({})})};
  try {
    const cockpit=createRoverCockpit(),scene=new T.Scene();
    scene.add(cockpit.root,cockpit.cabinLight);
    const lights=()=>{let count=0;scene.traverseVisible(o=>{if(o.isLight)count++;});return count;};
    assert.equal(lights(),1);
    cockpit.root.visible=true;cockpit.cabinLight.intensity=2.4;assert.equal(lights(),1);
    cockpit.root.visible=false;cockpit.cabinLight.intensity=0;assert.equal(lights(),1);
  } finally {globalThis.document=previous;}
});

