import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import type { RoverVehicle } from "../../game/roverVehicle";

export type BigRoverHandle = {
  root: T.Group;
  headlightL: T.SpotLight;
  headlightR: T.SpotLight;
  isModelLoaded: boolean;
  update: (
    rover: RoverVehicle,
    groundY: number,
    dt: number,
    isNight: boolean,
    heightAt?: (x: number, z: number) => number,
  ) => void;
  dispose: () => void;
};

type RoverWheelAssembly = {
  pivot: T.Group;
  wheelMesh: T.Object3D;
  baseX: number;
  baseY: number;
  baseZ: number;
  suspensionOffset: number;
  isFront: boolean;
  isLeft: boolean;
};

/**
 * Builds a sub-geometry from selected triangle index lists, remapping vertices
 * to maintain clean buffers and proper UV/normal attributes.
 */
function buildSubGeometry(
  origGeom: T.BufferGeometry,
  triIndices: number[],
  centerOffset?: T.Vector3,
): T.BufferGeometry {
  const origPos = origGeom.attributes.position;
  const origNorm = origGeom.attributes.normal;
  const origUv = origGeom.attributes.uv;

  const vertexMap = new Map<number, number>();
  const newPos: number[] = [];
  const newNorm: number[] = [];
  const newUv: number[] = [];
  const newIdx: number[] = [];

  const ox = centerOffset?.x ?? 0;
  const oy = centerOffset?.y ?? 0;
  const oz = centerOffset?.z ?? 0;

  for (let i = 0; i < triIndices.length; i++) {
    const oldIdx = triIndices[i];
    let mapped = vertexMap.get(oldIdx);
    if (mapped === undefined) {
      mapped = newPos.length / 3;
      vertexMap.set(oldIdx, mapped);

      newPos.push(
        origPos.getX(oldIdx) - ox,
        origPos.getY(oldIdx) - oy,
        origPos.getZ(oldIdx) - oz,
      );
      if (origNorm) {
        newNorm.push(
          origNorm.getX(oldIdx),
          origNorm.getY(oldIdx),
          origNorm.getZ(oldIdx),
        );
      }
      if (origUv) {
        newUv.push(origUv.getX(oldIdx), origUv.getY(oldIdx));
      }
    }
    newIdx.push(mapped);
  }

  const sub = new T.BufferGeometry();
  sub.setAttribute("position", new T.Float32BufferAttribute(newPos, 3));
  if (origNorm) {
    sub.setAttribute("normal", new T.Float32BufferAttribute(newNorm, 3));
  }
  if (origUv) {
    sub.setAttribute("uv", new T.Float32BufferAttribute(newUv, 2));
  }
  sub.setIndex(newIdx);
  return sub;
}

/**
 * Automatically segments the unified NASA SEV mesh into a chassis body
 * and 6 individual rotating wheel assemblies with realistic suspension pivots.
 */
function partitionRoverMesh(
  mesh: T.Mesh,
): {
  chassisMesh: T.Mesh;
  wheels: RoverWheelAssembly[];
} | null {
  const geom = mesh.geometry;
  const pos = geom.attributes.position;
  const idx = geom.index;
  if (!pos || !idx || idx.count < 9) return null;

  // 1. Gather vertex clusters for each of the 6 wheel regions (FL, FR, ML, MR, RL, RR)
  const binSums = Array.from({ length: 6 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    count: 0,
  }));

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // Wheels are strictly in the lower region below the main cabin belly
    if (y < 0.78 && Math.abs(x) > 0.65) {
      const isLeft = x < 0;
      const row = z < -0.42 ? 0 : z > 0.42 ? 2 : 1;
      const binIdx = row * 2 + (isLeft ? 0 : 1);
      binSums[binIdx].x += x;
      binSums[binIdx].y += y;
      binSums[binIdx].z += z;
      binSums[binIdx].count++;
    }
  }

  // Calculate the 6 wheel hub centers
  const wheelCenters: T.Vector3[] = binSums.map((b, i) => {
    if (b.count > 20) {
      return new T.Vector3(b.x / b.count, b.y / b.count, b.z / b.count);
    }
    const isLeft = i % 2 === 0;
    const row = Math.floor(i / 2);
    const z = row === 0 ? -1.15 : row === 1 ? 0.05 : 1.25;
    return new T.Vector3(isLeft ? -1.1 : 1.1, 0.38, z);
  });

  // 2. Segment triangles: if centroid is within wheel sphere, allocate to that wheel
  const wheelTriangles: number[][] = Array.from({ length: 6 }, () => []);
  const chassisTriangles: number[] = [];
  const captureRadiusSq = 0.50 * 0.50; // Capture wheel rim + spokes + tire

  for (let i = 0; i < idx.count; i += 3) {
    const i0 = idx.getX(i);
    const i1 = idx.getX(i + 1);
    const i2 = idx.getX(i + 2);

    const cx = (pos.getX(i0) + pos.getX(i1) + pos.getX(i2)) / 3;
    const cy = (pos.getY(i0) + pos.getY(i1) + pos.getY(i2)) / 3;
    const cz = (pos.getZ(i0) + pos.getZ(i1) + pos.getZ(i2)) / 3;

    let assigned = -1;
    if (cy < 0.82) {
      let minDistSq = captureRadiusSq;
      for (let k = 0; k < 6; k++) {
        const dx = cx - wheelCenters[k].x;
        const dy = cy - wheelCenters[k].y;
        const dz = cz - wheelCenters[k].z;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          assigned = k;
        }
      }
    }

    if (assigned >= 0) {
      wheelTriangles[assigned].push(i0, i1, i2);
    } else {
      chassisTriangles.push(i0, i1, i2);
    }
  }

  // Ensure every wheel received triangles
  const allWheelsHaveTris = wheelTriangles.every((t) => t.length > 0);
  if (!allWheelsHaveTris || chassisTriangles.length === 0) {
    return null;
  }

  // 3. Build sub-geometries and assemble meshes
  const chassisGeom = buildSubGeometry(geom, chassisTriangles);
  const chassisMesh = new T.Mesh(chassisGeom, mesh.material);
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;

  const wheels: RoverWheelAssembly[] = [];
  for (let k = 0; k < 6; k++) {
    const center = wheelCenters[k];
    const wheelGeom = buildSubGeometry(geom, wheelTriangles[k], center);
    const wheelMesh = new T.Mesh(wheelGeom, mesh.material);
    wheelMesh.castShadow = true;
    wheelMesh.receiveShadow = true;

    const pivot = new T.Group();
    pivot.position.copy(center);
    pivot.add(wheelMesh);

    wheels.push({
      pivot,
      wheelMesh,
      baseX: center.x,
      baseY: center.y,
      baseZ: center.z,
      suspensionOffset: 0,
      isFront: k < 2,
      isLeft: k % 2 === 0,
    });
  }

  return { chassisMesh, wheels };
}

/**
 * Creates the authentic NASA Multi-Mission Space Exploration Vehicle (MMSEV)
 * with working forward headlights, regolith tire dust spray, real independent
 * surface suspension, and rolling tires synchronized with vehicle speed.
 * Automatically loads /models/space-exploration-vehicle.glb with DRACOLoader.
 */
export function createBigRover(
  modelUrl = "/models/space-exploration-vehicle.glb",
): BigRoverHandle {
  const root = new T.Group();
  root.name = "BigRover";

  let loadedModel: T.Object3D | null = null;
  let isModelLoaded = false;
  let activeWheels: RoverWheelAssembly[] = [];

  // ==========================================
  // 1. PROCEDURAL FALLBACK CHASSIS (Zero Pop)
  // ==========================================
  const fallback = new T.Group();
  fallback.name = "RoverFallback";
  const chassisMat = new T.MeshStandardMaterial({
    color: 0xe8e6df,
    roughness: 0.45,
    metalness: 0.15,
  });
  const tireMat = new T.MeshStandardMaterial({
    color: 0x23272d,
    roughness: 0.85,
  });

  const bodyMesh = new T.Mesh(new T.BoxGeometry(2.1, 1.25, 3.9), chassisMat);
  bodyMesh.position.set(0, 1.35, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  fallback.add(bodyMesh);

  // 6 wheels on fallback chassis with working suspension pivots
  const fallbackWheels: RoverWheelAssembly[] = [];
  const fallbackPositions = [
    [-1.25, 0.45, -1.25],
    [1.25, 0.45, -1.25],
    [-1.25, 0.45, 0.05],
    [1.25, 0.45, 0.05],
    [-1.25, 0.45, 1.25],
    [1.25, 0.45, 1.25],
  ];

  for (let i = 0; i < fallbackPositions.length; i++) {
    const [wx, wy, wz] = fallbackPositions[i];
    const pivot = new T.Group();
    pivot.position.set(wx, wy, wz);

    const wheelMesh = new T.Mesh(
      new T.CylinderGeometry(0.42, 0.42, 0.34, 16),
      tireMat,
    );
    wheelMesh.rotation.z = Math.PI / 2;
    wheelMesh.castShadow = true;
    wheelMesh.receiveShadow = true;
    pivot.add(wheelMesh);
    fallback.add(pivot);

    fallbackWheels.push({
      pivot,
      wheelMesh,
      baseX: wx,
      baseY: wy,
      baseZ: wz,
      suspensionOffset: 0,
      isFront: i < 2,
      isLeft: i % 2 === 0,
    });
  }
  root.add(fallback);
  activeWheels = fallbackWheels;

  // ==========================================
  // 2. HIGH-POWER FORWARD HEADLIGHTS
  // ==========================================
  const headlightL = new T.SpotLight(0xfffae6, 3.5, 45, 0.55, 0.65, 1.2);
  const headlightR = new T.SpotLight(0xfffae6, 3.5, 45, 0.55, 0.65, 1.2);

  headlightL.position.set(-0.75, 1.35, -2.15);
  headlightR.position.set(0.75, 1.35, -2.15);

  const targetL = new T.Object3D();
  targetL.position.set(-0.75, 0.4, -28);
  const targetR = new T.Object3D();
  targetR.position.set(0.75, 0.4, -28);

  root.add(targetL);
  root.add(targetR);
  headlightL.target = targetL;
  headlightR.target = targetR;

  headlightL.castShadow = true;
  headlightL.shadow.bias = -0.001;
  headlightL.shadow.mapSize.width = 512;
  headlightL.shadow.mapSize.height = 512;

  root.add(headlightL);
  root.add(headlightR);

  // Headlight physical glow fixtures
  const lensMat = new T.MeshBasicMaterial({ color: 0xfffae6 });
  const lensGeo = new T.CircleGeometry(0.1, 12);
  const lensL = new T.Mesh(lensGeo, lensMat);
  lensL.position.set(-0.75, 1.35, -2.18);
  lensL.rotation.y = Math.PI;
  const lensR = new T.Mesh(lensGeo, lensMat);
  lensR.position.set(0.75, 1.35, -2.18);
  lensR.rotation.y = Math.PI;
  root.add(lensL);
  root.add(lensR);

  // ==========================================
  // 3. TIRE REGOLITH DUST EMITTER
  // ==========================================
  const dustCount = 48;
  const dustPos = new Float32Array(dustCount * 3);
  const dustVel = new Float32Array(dustCount * 3);
  const dustLife = new Float32Array(dustCount);

  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3 + 1] = -100;
    dustLife[i] = 0;
  }

  const dustGeo = new T.BufferGeometry();
  dustGeo.setAttribute("position", new T.BufferAttribute(dustPos, 3));
  const dustMat = new T.PointsMaterial({
    color: 0xc87d4f,
    size: 0.32,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const dustSystem = new T.Points(dustGeo, dustMat);
  dustSystem.frustumCulled = false;
  root.add(dustSystem);

  let dustIndex = 0;

  // ==========================================
  // 4. LOAD NASA SPACE EXPLORATION VEHICLE (SEV)
  // ==========================================
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  loader.setDRACOLoader(dracoLoader);

  loader.load(
    modelUrl,
    (gltf) => {
      const model = gltf.scene;

      // Configure materials and shadows
      model.traverse((o) => {
        if ((o as T.Mesh).isMesh) {
          const mesh = o as T.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          for (const mat of materials) {
            if (mat instanceof T.MeshStandardMaterial) {
              if (mat.map) mat.map.colorSpace = T.SRGBColorSpace;
              if (mat.emissiveMap) mat.emissiveMap.colorSpace = T.SRGBColorSpace;
              mat.roughness = Math.max(0.28, mat.roughness);
              mat.needsUpdate = true;
            }
          }
        }
      });

      // Align model:
      // The authentic NASA MMSEV model was authored in CAD orientation where:
      // Roof = -X, Wheels = +X, Front Canopy = +Z, Rear Suitports = -Z, Sides = +/-Y.
      // Rotating by Euler(0, Math.PI / 2, -Math.PI / 2, "YXZ") sets:
      // - Roof pointing UP (+Y)
      // - Wheels pointing DOWN onto ground (-Y)
      // - Front Canopy pointing FORWARD (-Z)
      // - Rear Suitports pointing REARWARD (+Z)
      model.rotation.set(0, Math.PI / 2, -Math.PI / 2, "YXZ");
      model.updateMatrixWorld(true);

      // Measure unscaled dimensions in vehicle coordinates:
      const rawBox = new T.Box3().setFromObject(model);
      const rawSize = rawBox.getSize(new T.Vector3());

      // Target vehicle length ~4.35m (scaled proportionally to the 1.92m astronaut:
      // height ~2.94m, width ~2.86m, with ample interior cockpit headroom)
      const targetLength = 4.35;
      const scale = rawSize.z > 0.1 ? targetLength / rawSize.z : 0.72;
      model.scale.multiplyScalar(scale);
      model.updateMatrixWorld(true);

      const scaledBox = new T.Box3().setFromObject(model);
      const center = scaledBox.getCenter(new T.Vector3());

      // Center horizontally on origin (0, 0) and place bottom of wheels at ground level (Y = 0)
      model.position.x = -center.x;
      model.position.z = -center.z;
      model.position.y = -scaledBox.min.y;
      model.updateMatrixWorld(true);

      // Bake this transform into the primary mesh so that vertices are directly in vehicle coordinates
      let primaryMesh: T.Mesh | null = null;
      model.traverse((o) => {
        if (!primaryMesh && (o as T.Mesh).isMesh) {
          primaryMesh = o as T.Mesh;
        }
      });

      const assembledGroup = new T.Group();
      assembledGroup.name = "MMSEV_Assembled";

      if (primaryMesh) {
        // Bake model transform into geometry
        (primaryMesh as T.Mesh).geometry.applyMatrix4(model.matrixWorld);
        (primaryMesh as T.Mesh).position.set(0, 0, 0);
        (primaryMesh as T.Mesh).rotation.set(0, 0, 0);
        (primaryMesh as T.Mesh).scale.set(1, 1, 1);

        // Segment geometry into chassis and 6 independent rotating wheels
        const partitioned = partitionRoverMesh(primaryMesh as T.Mesh);
        if (partitioned) {
          assembledGroup.add(partitioned.chassisMesh);
          for (const w of partitioned.wheels) {
            assembledGroup.add(w.pivot);
          }
          activeWheels = partitioned.wheels;
        } else {
          assembledGroup.add(model);
        }
      } else {
        assembledGroup.add(model);
      }

      // Re-anchor high-power headlights to the scaled front bumper
      const frontZ = scaledBox.min.z + 0.12;
      const headlightY = 1.35;
      headlightL.position.set(-0.75, headlightY, frontZ);
      headlightR.position.set(0.75, headlightY, frontZ);
      lensL.position.set(-0.75, headlightY, frontZ - 0.04);
      lensR.position.set(0.75, headlightY, frontZ - 0.04);
      targetL.position.set(-0.75, 0.4, frontZ - 25);
      targetR.position.set(0.75, 0.4, frontZ - 25);

      // Swap out procedural fallback with the authentic NASA SEV assembly
      root.remove(fallback);
      root.add(assembledGroup);
      loadedModel = assembledGroup;
      isModelLoaded = true;

      console.info(
        `[BigRover] Loaded NASA Space Exploration Vehicle successfully (${(rawSize.x * scale).toFixed(2)}m wide x ${(rawSize.z * scale).toFixed(2)}m long x ${(rawSize.y * scale).toFixed(2)}m high). 6 independent rotating wheels and surface suspension initialized.`,
      );
    },
    undefined,
    (err) => {
      console.warn(
        `[BigRover] Could not load "${modelUrl}" (${(err as Error)?.message || "File not found"}). Using procedural rover fallback.`,
      );
    },
  );

  // ==========================================
  // 5. UPDATE FUNCTION
  // ==========================================
  function update(
    rover: RoverVehicle,
    groundY: number,
    dt: number,
    isNight: boolean,
    heightAt?: (x: number, z: number) => number,
  ) {
    // 1. Position & orientation of chassis in world coordinates
    root.position.set(rover.x, groundY, rover.z);
    root.rotation.set(rover.pitch, rover.yaw, rover.roll, "YXZ");

    // 2. Rotate tires with vehicle roll, steer front wheels, and calculate independent suspension travel
    const sinYaw = Math.sin(rover.yaw);
    const cosYaw = Math.cos(rover.yaw);

    for (const w of activeWheels) {
      // Rotate tire around axle with wheelRoll
      w.wheelMesh.rotation.x = rover.wheelRoll;

      // Front wheels steer into turns
      if (w.isFront) {
        w.pivot.rotation.y = rover.steerAngle;
      }

      // Real suspension reacting to Mars terrain profile
      if (heightAt) {
        const worldWheelX = rover.x + cosYaw * w.baseX + sinYaw * w.baseZ;
        const worldWheelZ = rover.z - sinYaw * w.baseX + cosYaw * w.baseZ;
        const terrainH = heightAt(worldWheelX, worldWheelZ);
        const targetOffset = terrainH - groundY;

        // Smooth spring damping (stiff suspension for heavy rover)
        w.suspensionOffset +=
          (targetOffset - w.suspensionOffset) * (1 - Math.exp(-22 * dt));
        const travel = Math.max(-0.16, Math.min(0.16, w.suspensionOffset));
        w.pivot.position.y = w.baseY + travel;
      }
    }

    // 3. Headlight intensity based on planetary solar lighting
    const lightLevel = isNight ? 8.5 : 2.8;
    headlightL.intensity = lightLevel;
    headlightR.intensity = lightLevel;
    lensL.visible = isNight || rover.driving;
    lensR.visible = isNight || rover.driving;

    // 4. Regolith tire dust plume behind rear wheels
    const moving = Math.abs(rover.speed) > 0.8;
    if (moving && dt > 0) {
      for (let k = 0; k < 2; k++) {
        const i = dustIndex;
        dustIndex = (dustIndex + 1) % dustCount;
        const side = k === 0 ? -1.15 : 1.15;
        dustPos[i * 3] = side + (Math.random() - 0.5) * 0.3;
        dustPos[i * 3 + 1] = 0.12;
        dustPos[i * 3 + 2] = 1.7 + Math.random() * 0.35;
        dustVel[i * 3] = (Math.random() - 0.5) * 0.7;
        dustVel[i * 3 + 1] = 0.45 + Math.random() * 0.6;
        dustVel[i * 3 + 2] = 1.1 + Math.random() * 1.5;
        dustLife[i] = 1.0;
      }
    }

    for (let i = 0; i < dustCount; i++) {
      if (dustLife[i] > 0) {
        dustLife[i] -= dt * 1.8;
        dustPos[i * 3] += dustVel[i * 3] * dt;
        dustPos[i * 3 + 1] += dustVel[i * 3 + 1] * dt;
        dustPos[i * 3 + 2] += dustVel[i * 3 + 2] * dt;
        if (dustLife[i] <= 0) {
          dustPos[i * 3 + 1] = -100;
        }
      }
    }
    dustGeo.attributes.position.needsUpdate = true;
  }

  // ==========================================
  // 6. DISPOSE FUNCTION
  // ==========================================
  function dispose() {
    dracoLoader.dispose();
    root.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.Points) {
        o.geometry?.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) {
            o.material.forEach((m) => m.dispose());
          } else {
            o.material.dispose();
          }
        }
      }
    });
    root.clear();
  }

  return {
    root,
    headlightL,
    headlightR,
    get isModelLoaded() {
      return isModelLoaded;
    },
    update,
    dispose,
  };
}
