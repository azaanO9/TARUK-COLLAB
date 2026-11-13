/** Three.js procedural renderer for modular base structures (Tunnels, Habitats, Solar Arrays) and interactive holographic placement cursor. */

import * as THREE from "three";
import {
  type BaseModuleKind,
  type PlacedModule,
  MODULE_RECIPES,
  GRID_SNAP_SIZE,
} from "../../game/baseBuilding";

export type BaseModulesRenderer = {
  group: THREE.Group;
  previewGroup: THREE.Group;
  setPreview: (
    kind: BaseModuleKind | null,
    x: number,
    z: number,
    valid: boolean,
    rotationY?: number,
    heightAt?: (x: number, z: number) => number,
  ) => void;
  update: (
    modules: readonly PlacedModule[],
    heightAt: (x: number, z: number) => number,
    simTime: number,
  ) => void;
  dispose: () => void;
};

// Reusable PBR materials
function createMaterials() {
  const metalTitanium = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.85,
    roughness: 0.35,
  });
  const darkFrame = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.9,
    roughness: 0.45,
  });
  const solarPanelMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0x0284c7,
    emissiveIntensity: 0.22,
    metalness: 0.95,
    roughness: 0.15,
  });
  const conduitGlow = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });
  const windowGlow = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const holographicValid = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    wireframe: true,
    transparent: true,
    opacity: 0.65,
  });
  const holographicInvalid = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    wireframe: true,
    transparent: true,
    opacity: 0.65,
  });

  return {
    metalTitanium,
    darkFrame,
    solarPanelMat,
    conduitGlow,
    windowGlow,
    holographicValid,
    holographicInvalid,
  };
}

export function buildModuleMesh(kind: BaseModuleKind, materials: ReturnType<typeof createMaterials>): THREE.Group {
  const root = new THREE.Group();

  if (kind === "tunnel") {
    // Cylindrical / hexagonal conduit corridor
    const geom = new THREE.CylinderGeometry(1.4, 1.4, 4.0, 8);
    geom.rotateZ(Math.PI / 2);
    const body = new THREE.Mesh(geom, materials.metalTitanium);
    body.position.y = 1.35;
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);

    // Rib rings
    for (let i = -1.6; i <= 1.6; i += 0.8) {
      const ringGeom = new THREE.TorusGeometry(1.48, 0.08, 6, 12);
      ringGeom.rotateY(Math.PI / 2);
      const ring = new THREE.Mesh(ringGeom, materials.darkFrame);
      ring.position.set(i, 1.35, 0);
      root.add(ring);
    }

    // Top glowing conduit pipe
    const pipeGeom = new THREE.CylinderGeometry(0.12, 0.12, 4.1, 6);
    pipeGeom.rotateZ(Math.PI / 2);
    const pipe = new THREE.Mesh(pipeGeom, materials.conduitGlow);
    pipe.position.set(0, 2.76, 0);
    root.add(pipe);

    // Airlock collars on ends
    for (const offset of [-2.02, 2.02]) {
      const collarGeom = new THREE.CylinderGeometry(1.6, 1.6, 0.2, 8);
      collarGeom.rotateZ(Math.PI / 2);
      const collar = new THREE.Mesh(collarGeom, materials.darkFrame);
      collar.position.set(offset, 1.35, 0);
      root.add(collar);
    }
  } else if (kind === "habitat") {
    // Dome / Hexagonal pod
    const domeGeom = new THREE.SphereGeometry(3.2, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const dome = new THREE.Mesh(domeGeom, materials.metalTitanium);
    dome.position.y = 0.05;
    dome.castShadow = true;
    dome.receiveShadow = true;
    root.add(dome);

    // Base skirt foundation
    const skirtGeom = new THREE.CylinderGeometry(3.3, 3.4, 0.6, 12);
    const skirt = new THREE.Mesh(skirtGeom, materials.darkFrame);
    skirt.position.y = 0.3;
    root.add(skirt);

    // Viewing ports (windows)
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.1), materials.windowGlow);
      win.position.set(Math.sin(a) * 2.8, 1.9, Math.cos(a) * 2.8);
      win.rotation.y = a;
      root.add(win);
    }

    // Roof comms spire & beacon
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.0, 6), materials.darkFrame);
    mast.position.y = 4.2;
    root.add(mast);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), materials.conduitGlow);
    beacon.position.y = 5.2;
    root.add(beacon);
  } else if (kind === "solar_array") {
    // Heavy dual-wing photovoltaic tracking array
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3.2, 8), materials.darkFrame);
    mast.position.y = 1.6;
    mast.castShadow = true;
    root.add(mast);

    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.25, 0.25), materials.darkFrame);
    crossbar.position.y = 3.2;
    root.add(crossbar);

    // Left and right solar wings tilted toward sun
    for (const xOff of [-2.0, 2.0]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 1.8), materials.solarPanelMat);
      panel.position.set(xOff, 3.2, 0);
      panel.rotation.x = -0.38; // 22 degree solar tilt
      panel.castShadow = true;
      root.add(panel);
    }
  }

  return root;
}

export function createBaseModulesRenderer(scene: THREE.Scene): BaseModulesRenderer {
  const group = new THREE.Group();
  group.name = "outpost-base-modules";
  scene.add(group);

  const previewGroup = new THREE.Group();
  previewGroup.name = "module-hologram-preview";
  previewGroup.visible = false;
  scene.add(previewGroup);

  const materials = createMaterials();
  const placedMeshes = new Map<string, THREE.Group>();

  // Ground grid projection ring for placement preview
  const ringGeom = new THREE.RingGeometry(0.2, 3.6, 24);
  ringGeom.rotateX(-Math.PI / 2);
  const ringMesh = new THREE.Mesh(
    ringGeom,
    new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
  );
  ringMesh.position.y = 0.08;
  previewGroup.add(ringMesh);

  let currentPreviewKind: BaseModuleKind | null = null;
  let previewModel: THREE.Group | null = null;

  return {
    group,
    previewGroup,

    setPreview(kind, x, z, valid, rotationY = 0, heightAt) {
      if (!kind) {
        previewGroup.visible = false;
        return;
      }
      previewGroup.visible = true;

      if (currentPreviewKind !== kind || !previewModel) {
        if (previewModel) previewGroup.remove(previewModel);
        currentPreviewKind = kind;
        previewModel = buildModuleMesh(kind, materials);
        // Replace all materials in previewModel with holographic wireframe
        previewModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = valid ? materials.holographicValid : materials.holographicInvalid;
          }
        });
        previewGroup.add(previewModel);
      } else {
        const mat = valid ? materials.holographicValid : materials.holographicInvalid;
        previewModel.traverse((child) => {
          if (child instanceof THREE.Mesh) child.material = mat;
        });
        (ringMesh.material as THREE.MeshBasicMaterial).color.setHex(valid ? 0x22c55e : 0xef4444);
      }

      const gy = heightAt ? heightAt(x, z) : 0;
      previewGroup.position.set(x, gy, z);
      previewGroup.rotation.y = rotationY;
    },

    update(modules, heightAt, simTime) {
      const activeIds = new Set<string>();

      for (const m of modules) {
        activeIds.add(m.id);
        let mesh = placedMeshes.get(m.id);
        if (!mesh) {
          mesh = buildModuleMesh(m.kind, materials);
          group.add(mesh);
          placedMeshes.set(m.id, mesh);
        }
        const gy = heightAt(m.x, m.z);
        mesh.position.set(m.x, gy, m.z);
        mesh.rotation.y = m.rotationY;

        // Subtle solar tracking motion for solar arrays
        if (m.kind === "solar_array") {
          const sunTrack = Math.sin(simTime * 0.05) * 0.2;
          mesh.children[2].rotation.x = -0.38 + sunTrack;
          mesh.children[3].rotation.x = -0.38 + sunTrack;
        }
      }

      // Cleanup removed modules
      for (const [id, mesh] of placedMeshes) {
        if (!activeIds.has(id)) {
          group.remove(mesh);
          mesh.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              o.geometry?.dispose();
            }
          });
          placedMeshes.delete(id);
        }
      }
    },

    dispose() {
      scene.remove(group);
      scene.remove(previewGroup);
      for (const mesh of placedMeshes.values()) {
        mesh.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry?.dispose();
        });
      }
      placedMeshes.clear();
      previewModel?.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry?.dispose();
      });
      ringGeom.dispose();
      for (const mat of Object.values(materials)) mat.dispose();
    },
  };
}

