import * as T from "three";
import {
  CAVE_BOUNDARY_RADIUS,
  CAVE_ENTRANCES,
  CAVE_EXIT_PORTAL,
  CAVE_PILLARS,
  INITIAL_CAVE_NODES,
  caveHeightAt,
  type MineableNode,
} from "../../game/marsCaveData.ts";

export type CaveBiomeHandle = {
  root: T.Group;
  surfacePortals: T.Group;
  update: (
    timeSec: number,
    minerals: readonly MineableNode[],
    inCave: boolean,
  ) => void;
  dispose: () => void;
};

/**
 * Creates both:
 * 1) Surface cave entrance archways & cryo vapor beacons at CAVE_ENTRANCES
 * 2) Isolated procedural underground Ice Cave biome hierarchy (`root`) with
 *    basalt cavern floor, stalagmite pillars, Cryo-Ice veins & Titanium deposits.
 */
export function createCaveBiomeScene(surfaceHeightAt: (x: number, z: number) => number): CaveBiomeHandle {
  const surfacePortals = new T.Group();
  surfacePortals.name = "SurfaceCavePortals";

  const portalRingMat = new T.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.72,
    side: T.DoubleSide,
  });
  const portalArchMat = new T.MeshStandardMaterial({
    color: 0x2c2422,
    roughness: 0.92,
    metalness: 0.08,
  });
  const iceAccentMat = new T.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x0284c7,
    emissiveIntensity: 0.55,
    roughness: 0.25,
    metalness: 0.15,
  });

  const portalRings: T.Mesh[] = [];

  for (const ent of CAVE_ENTRANCES) {
    const g = new T.Group();
    const gy = surfaceHeightAt(ent.surfaceX, ent.surfaceZ);
    g.position.set(ent.surfaceX, gy, ent.surfaceZ);
    g.userData.caveEntranceId = ent.id;

    // Dark recessed shaft throat
    const pit = new T.Mesh(
      new T.CylinderGeometry(2.1, 1.5, 0.4, 20),
      new T.MeshBasicMaterial({ color: 0x03070c }),
    );
    pit.position.y = 0.06;
    g.add(pit);

    // Sculpted basalt archway
    const arch = new T.Mesh(new T.TorusGeometry(2.3, 0.55, 8, 18, Math.PI), portalArchMat);
    arch.position.y = 0.2;
    arch.castShadow = true;
    arch.receiveShadow = true;
    g.add(arch);

    // Glowing ice crystals lining entrance
    for (const s of [-1, 1]) {
      const crystal = new T.Mesh(new T.OctahedronGeometry(0.42, 0), iceAccentMat);
      crystal.scale.set(0.65, 1.9, 0.65);
      crystal.position.set(s * 2.2, 0.85, 0.4);
      crystal.rotation.z = -s * 0.28;
      g.add(crystal);
    }

    const beaconRing = new T.Mesh(new T.RingGeometry(2.4, 2.7, 32), portalRingMat);
    beaconRing.rotation.x = -Math.PI / 2;
    beaconRing.position.y = 0.14;
    g.add(beaconRing);
    portalRings.push(beaconRing);

    surfacePortals.add(g);
  }

  // =============================================
  // UNDERGROUND ICE CAVE BIOME ROOT
  // =============================================
  const root = new T.Group();
  root.name = "UndergroundIceCaveBiome";
  root.visible = false;

  const span = CAVE_BOUNDARY_RADIUS * 2.3;
  const floorGeo = new T.PlaneGeometry(span, span, 72, 72);
  floorGeo.rotateX(-Math.PI / 2);
  const fPos = floorGeo.attributes.position;
  for (let i = 0; i < fPos.count; i++) {
    const x = fPos.getX(i);
    const z = fPos.getZ(i);
    const dist = Math.hypot(x, z);
    const bowlRise = Math.max(0, dist - (CAVE_BOUNDARY_RADIUS - 3)) * 0.65;
    fPos.setY(i, caveHeightAt(x, z) + bowlRise);
  }
  floorGeo.computeVertexNormals();

  const floorMat = new T.MeshStandardMaterial({
    color: 0x162432,
    roughness: 0.72,
    metalness: 0.18,
  });
  const floorMesh = new T.Mesh(floorGeo, floorMat);
  floorMesh.receiveShadow = true;
  root.add(floorMesh);

  // Vaulted Cavern Ceiling Dome with stalactite roughness
  const domeGeo = new T.SphereGeometry(CAVE_BOUNDARY_RADIUS + 4, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.54);
  const dPos = domeGeo.attributes.position;
  for (let i = 0; i < dPos.count; i++) {
    const vx = dPos.getX(i);
    const vy = dPos.getY(i);
    const vz = dPos.getZ(i);
    const warp = 1 + Math.sin(vx * 0.35 + vz * 0.25) * 0.08 + Math.cos(vz * 0.45) * 0.05;
    dPos.setXYZ(i, vx * warp, vy * 0.34, vz * warp);
  }
  domeGeo.computeVertexNormals();
  const domeMat = new T.MeshStandardMaterial({
    color: 0x0b121b,
    roughness: 0.94,
    metalness: 0.05,
    side: T.BackSide,
  });
  const domeMesh = new T.Mesh(domeGeo, domeMat);
  domeMesh.position.y = -0.8;
  root.add(domeMesh);

  // Basalt & Cryo-Glazed Cavern Pillars
  const pillarMat = new T.MeshStandardMaterial({
    color: 0x1f2b38,
    roughness: 0.85,
    metalness: 0.12,
  });
  for (const p of CAVE_PILLARS) {
    const h = 11.5;
    const baseY = caveHeightAt(p.x, p.z);
    const col = new T.Mesh(new T.CylinderGeometry(p.radius * 0.72, p.radius * 1.02, h, 9), pillarMat);
    col.position.set(p.x, baseY + h * 0.45, p.z);
    col.castShadow = true;
    col.receiveShadow = true;
    root.add(col);
  }

  // Exit Lift Portal to Surface
  const exitGroup = new T.Group();
  exitGroup.position.set(CAVE_EXIT_PORTAL.x, caveHeightAt(CAVE_EXIT_PORTAL.x, CAVE_EXIT_PORTAL.z), CAVE_EXIT_PORTAL.z);
  const exitPad = new T.Mesh(new T.CylinderGeometry(2.4, 2.7, 0.25, 24), pillarMat);
  exitPad.position.y = 0.12;
  exitGroup.add(exitPad);
  const exitBeam = new T.Mesh(
    new T.CylinderGeometry(0.95, 1.35, 9, 20, 1, true),
    new T.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.24,
      side: T.DoubleSide,
      depthWrite: false,
    }),
  );
  exitBeam.position.y = 4.5;
  exitGroup.add(exitBeam);
  root.add(exitGroup);

  // Cryo Ambient Point Lights
  const caveAmbient = new T.HemisphereLight(0x38bdf8, 0x090f18, 0.45);
  const exitLight = new T.PointLight(0x67e8f9, 4.5, 26, 1.5);
  exitLight.position.set(CAVE_EXIT_PORTAL.x, 3.8, CAVE_EXIT_PORTAL.z);
  root.add(caveAmbient, exitLight);

  // Mineable Cryo-Ice Core & Titanium Nodes
  const iceMat = new T.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x0284c7,
    emissiveIntensity: 0.85,
    roughness: 0.18,
    metalness: 0.2,
  });
  const tiMat = new T.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xb45309,
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.78,
  });

  const nodeMeshes = new Map<string, { group: T.Group; kind: MineableNode["kind"] }>();
  for (const node of INITIAL_CAVE_NODES) {
    const ng = new T.Group();
    ng.position.set(node.x, caveHeightAt(node.x, node.z), node.z);
    ng.userData.mineNodeId = node.id;

    const clusterCount = 3;
    for (let k = 0; k < clusterCount; k++) {
      const mesh = new T.Mesh(
        node.kind === "ice_core" ? new T.OctahedronGeometry(0.52, 0) : new T.DodecahedronGeometry(0.48, 0),
        node.kind === "ice_core" ? iceMat : tiMat,
      );
      mesh.scale.set(0.7 + k * 0.15, 1.45 - k * 0.2, 0.7 + k * 0.15);
      mesh.position.set((k - 1) * 0.45, 0.52, (k % 2 === 0 ? 1 : -1) * 0.25);
      mesh.rotation.set(k * 0.3, k * 1.1, (k - 1) * 0.25);
      mesh.castShadow = true;
      ng.add(mesh);
    }

    const aura = new T.PointLight(node.kind === "ice_core" ? 0x38bdf8 : 0xf59e0b, 1.8, 9, 1.8);
    aura.position.y = 1.1;
    ng.add(aura);

    root.add(ng);
    nodeMeshes.set(node.id, { group: ng, kind: node.kind });
  }

  return {
    root,
    surfacePortals,
    update(timeSec, minerals, inCave) {
      root.visible = inCave;
      surfacePortals.visible = !inCave;

      const pulse = 0.55 + Math.sin(timeSec * 2.8) * 0.25;
      portalRingMat.opacity = pulse;

      if (!inCave) return;
      exitBeam.rotation.y = timeSec * 0.6;
      for (const m of minerals) {
        const entry = nodeMeshes.get(m.id);
        if (entry) {
          entry.group.visible = !m.collected;
          if (!m.collected) {
            entry.group.rotation.y = Math.sin(timeSec * 0.6 + entry.group.position.x) * 0.08;
          }
        }
      }
    },
    dispose() {
      for (const grp of [root, surfacePortals]) {
        grp.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.geometry?.dispose();
            if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
            else o.material?.dispose();
          }
        });
      }
    },
  };
}

