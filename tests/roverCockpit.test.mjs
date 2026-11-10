import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createRoverCockpit, positionRoverCockpitCamera, ROVER_DRIVER_EYE } from '../ui/world/roverCockpit.ts';

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

