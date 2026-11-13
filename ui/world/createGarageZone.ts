/** Physical 3D Outpost Garage structure (maintenance gantry, hydraulic lift pads, hazard stripes, floodlights) and physical winch cable renderer. */

import * as THREE from "three";
import { GARAGE_PAD } from "../../game/roverUpgrades";

export type GarageZoneRenderer = {
  group: THREE.Group;
  updateWinch: (
    roverPos: { x: number; y: number; z: number; yaw: number } | null,
    anchorPos: { x: number; y: number; z: number } | null,
    active: boolean,
  ) => void;
  update: (timeSec: number) => void;
  dispose: () => void;
};

export function createGarageZone(
  scene: THREE.Scene,
  heightAt: (x: number, z: number) => number,
): GarageZoneRenderer {
  const group = new THREE.Group();
  group.name = "outpost-rover-garage";
  scene.add(group);

  const padY = heightAt(GARAGE_PAD.x, GARAGE_PAD.z);
  group.position.set(GARAGE_PAD.x, padY, GARAGE_PAD.z);

  // Materials
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.8,
    metalness: 0.2,
  });
  const steelGantryMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.85,
  });
  const hazardStripeMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: 0.35,
    roughness: 0.5,
  });
  const floodLightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffedd5,
    emissiveIntensity: 1.8,
  });
  const holoSignMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
  });

  // Base octagonal service pad
  const padGeom = new THREE.CylinderGeometry(5.2, 5.4, 0.25, 8);
  const padMesh = new THREE.Mesh(padGeom, concreteMat);
  padMesh.position.y = 0.12;
  padMesh.receiveShadow = true;
  group.add(padMesh);

  // Hazard border ring around vehicle lift
  const borderGeom = new THREE.RingGeometry(4.2, 4.8, 8);
  borderGeom.rotateX(-Math.PI / 2);
  const borderMesh = new THREE.Mesh(borderGeom, hazardStripeMat);
  borderMesh.position.y = 0.26;
  group.add(borderMesh);

  // Two hydraulic vehicle lift runners
  for (const xOff of [-1.5, 1.5]) {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 5.5), steelGantryMat);
    ramp.position.set(xOff, 0.3, 0);
    ramp.receiveShadow = true;
    ramp.castShadow = true;
    group.add(ramp);
  }

  // Heavy steel overhead gantry arches (4 corner pillars and 2 crossbeams)
  const pillarGeom = new THREE.BoxGeometry(0.35, 4.8, 0.35);
  const corners = [
    [-3.2, -2.6],
    [3.2, -2.6],
    [-3.2, 2.6],
    [3.2, 2.6],
  ];
  for (const [cx, cz] of corners) {
    const pillar = new THREE.Mesh(pillarGeom, steelGantryMat);
    pillar.position.set(cx, 2.4, cz);
    pillar.castShadow = true;
    group.add(pillar);
  }

  // Crossbeams
  for (const cz of [-2.6, 2.6]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.3, 0.35), steelGantryMat);
    beam.position.set(0, 4.8, cz);
    beam.castShadow = true;
    group.add(beam);
  }

  // Top overhead gantry rail
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 5.6), steelGantryMat);
  spine.position.set(0, 4.95, 0);
  group.add(spine);

  // Maintenance Crane Trolley & Hook
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), steelGantryMat);
  trolley.position.set(0, 4.7, 0.2);
  group.add(trolley);

  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 6), steelGantryMat);
  cable.position.set(0, 3.6, 0.2);
  group.add(cable);

  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 8, Math.PI * 1.5), hazardStripeMat);
  hook.position.set(0, 2.4, 0.2);
  hook.rotation.z = Math.PI * 0.75;
  group.add(hook);

  // Overhead floodlights pointing down at the rover
  const floodLamps = [
    [-2.2, 4.6, -2.0],
    [2.2, 4.6, -2.0],
    [-2.2, 4.6, 2.0],
    [2.2, 4.6, 2.0],
  ];
  for (const [fx, fy, fz] of floodLamps) {
    const lampHousing = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.3), steelGantryMat);
    lampHousing.position.set(fx, fy, fz);
    group.add(lampHousing);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), floodLightMat);
    bulb.position.set(fx, fy - 0.1, fz);
    group.add(bulb);
  }

  // Spot light for realistic garage illumination
  const garageSpot = new THREE.SpotLight(0xfff5eb, 3.8, 18, Math.PI * 0.28, 0.45, 1.2);
  garageSpot.position.set(0, 4.8, 0);
  garageSpot.target.position.set(0, 0, 0);
  group.add(garageSpot);
  group.add(garageSpot.target);

  // Holographic Garage Tuning Bay Signage
  const signPlate = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.6, 0.08), holoSignMat);
  signPlate.position.set(0, 5.4, 2.6);
  group.add(signPlate);

  // Dynamic Winch Cable
  const maxCablePoints = 12;
  const cableGeom = new THREE.BufferGeometry();
  const cablePositions = new Float32Array(maxCablePoints * 3);
  cableGeom.setAttribute("position", new THREE.BufferAttribute(cablePositions, 3));
  const cableLine = new THREE.Line(
    cableGeom,
    new THREE.LineBasicMaterial({ color: 0xe2e8f0, linewidth: 2 }),
  );
  cableLine.visible = false;
  scene.add(cableLine);

  return {
    group,

    updateWinch(roverPos, anchorPos, active) {
      if (!active || !roverPos || !anchorPos) {
        cableLine.visible = false;
        return;
      }
      cableLine.visible = true;

      // Front winch spool position on rover
      const cosY = Math.cos(roverPos.yaw);
      const sinY = Math.sin(roverPos.yaw);
      const spoolX = roverPos.x + -sinY * 2.2;
      const spoolY = roverPos.y + 0.9;
      const spoolZ = roverPos.z + -cosY * 2.2;

      const posAttr = cableGeom.attributes.position as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;

      // Catenary curve with slight gravity sag
      const totalDist = Math.hypot(anchorPos.x - spoolX, anchorPos.z - spoolZ);
      const sag = Math.min(1.2, totalDist * 0.04);

      for (let i = 0; i < maxCablePoints; i++) {
        const t = i / (maxCablePoints - 1);
        const px = spoolX + (anchorPos.x - spoolX) * t;
        const pz = spoolZ + (anchorPos.z - spoolZ) * t;
        const lineY = spoolY + (anchorPos.y - spoolY) * t;
        const sagY = Math.sin(t * Math.PI) * -sag;
        array[i * 3] = px;
        array[i * 3 + 1] = lineY + sagY;
        array[i * 3 + 2] = pz;
      }
      posAttr.needsUpdate = true;
    },

    update(timeSec) {
      // Subtle pulsing sign glow
      signPlate.material.opacity = 0.75 + Math.sin(timeSec * 2.4) * 0.15;
    },

    dispose() {
      scene.remove(group);
      scene.remove(cableLine);
      padGeom.dispose();
      borderGeom.dispose();
      pillarGeom.dispose();
      cableGeom.dispose();
      concreteMat.dispose();
      steelGantryMat.dispose();
      hazardStripeMat.dispose();
      floodLightMat.dispose();
      holoSignMat.dispose();
    },
  };
}

