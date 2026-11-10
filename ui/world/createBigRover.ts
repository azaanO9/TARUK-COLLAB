import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { ROVER_WHEEL_OFFSETS, ROVER_WHEEL_OUTER_RADIUS, type RoverVehicle } from "../../game/roverVehicle";
import { partitionRoverMesh, type RoverWheelAssembly } from "./roverWheelAssembly";

import { createRoverCockpit, positionRoverCockpitCamera } from "./roverCockpit";

export type BigRoverHandle = {
  setCockpitView: (enabled: boolean) => void;
  positionCockpitCamera: (camera: T.Camera, yaw: number, pitch: number) => void;
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

  let cockpitView = false;
  let exteriorBody: T.Object3D | null = null;
  const cockpit = createRoverCockpit();
  root.add(cockpit.root);
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

  const bodyMesh = new T.Mesh(new T.BoxGeometry(2.3, 1.4, 4.4), chassisMat);
  bodyMesh.position.set(0, 1.5, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  fallback.add(bodyMesh);
  exteriorBody = bodyMesh;

  // 6 wheels on fallback chassis with working suspension pivots
  const fallbackWheels: RoverWheelAssembly[] = [];
  const fallbackPositions = ROVER_WHEEL_OFFSETS.map(([x, z]) => [x, ROVER_WHEEL_OUTER_RADIUS, z]);

  for (let i = 0; i < fallbackPositions.length; i++) {
    const [wx, wy, wz] = fallbackPositions[i];
    const pivot = new T.Group();
    pivot.position.set(wx, wy, wz);

    const wheelMesh = new T.Mesh(
      new T.CylinderGeometry(ROVER_WHEEL_OUTER_RADIUS, ROVER_WHEEL_OUTER_RADIUS, 0.38, 24).rotateZ(Math.PI / 2),
      tireMat,
    );
    const steering = new T.Group();
    wheelMesh.castShadow = true;
    wheelMesh.receiveShadow = true;
    steering.add(wheelMesh);
    pivot.add(steering);
    fallback.add(pivot);

    fallbackWheels.push({
      pivot,
      steering,
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
  const headlightL = new T.SpotLight(0xfffae6, 3.5, 50, 0.55, 0.65, 1.2);
  const headlightR = new T.SpotLight(0xfffae6, 3.5, 50, 0.55, 0.65, 1.2);

  headlightL.position.set(-0.85, 1.55, -2.45);
  headlightR.position.set(0.85, 1.55, -2.45);

  const targetL = new T.Object3D();
  targetL.position.set(-0.85, 0.4, -30);
  const targetR = new T.Object3D();
  targetR.position.set(0.75, 0.4, -30);

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
  const lensGeo = new T.CircleGeometry(0.12, 12);
  const lensL = new T.Mesh(lensGeo, lensMat);
  lensL.position.set(-0.85, 1.55, -2.48);
  lensL.rotation.y = Math.PI;
  const lensR = new T.Mesh(lensGeo, lensMat);
  lensR.position.set(0.85, 1.55, -2.48);
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
    size: 0.35,
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

      // Configure double-sided materials and shadows
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
              mat.side = T.DoubleSide;
              mat.needsUpdate = true;
            }
          }
        }
      });

      // Find the primary MMSEV mesh
      let primaryMesh: T.Mesh | null = null;
      model.traverse((o) => {
        if (!primaryMesh && (o as T.Mesh).isMesh) {
          primaryMesh = o as T.Mesh;
        }
      });

      if (!primaryMesh) {
        console.warn("[BigRover] No mesh found in GLTF model.");
        return;
      }
      const targetMesh = primaryMesh as T.Mesh;

      // Ground-truth Basis Mapping for NASA MMSEV:
      // The authentic CAD mesh has:
      // - Raw X: Left (-2.02) to Right (+2.02) -> Three.js X
      // - Raw Y: Rear (-3.35) to Front (+2.56) -> Three.js -Z
      // - Raw Z: Roof (-1.73) to Wheels (+2.24) -> Three.js -Y
      //
      // Scale proportionally: target length 4.95m (width 3.38m, height 3.32m)
      const scale = 4.95 / 5.91002; // ~0.83756
      const bottomY = -2.24213 * scale; // lowest point of wheels in -Z * scale
      const centerZ = 0.39988 * scale;  // vehicle midpoint in -Y * scale

      // Transformation matrix directly into vehicle world space:
      // x' = x * scale
      // y' = -z * scale - bottomY   (places soles of tires exactly on ground y = 0)
      // z' = -y * scale - centerZ   (front canopy at -Z, rear suitports at +Z)
      const M = new T.Matrix4().set(
        scale,     0,      0,        0,
            0,     0, -scale, -bottomY,
            0, -scale,     0, -centerZ,
            0,     0,      0,        1,
      );

      // Apply matrix directly to the geometry vertices
      targetMesh.geometry.applyMatrix4(M);

      // Invert triangle index winding because det(M) < 0 (left-to-right hand conversion)
      const idx = targetMesh.geometry.index;
      if (idx) {
        for (let i = 0; i < idx.count; i += 3) {
          const tmp = idx.getX(i + 1);
          idx.setX(i + 1, idx.getX(i + 2));
          idx.setX(i + 2, tmp);
        }
        idx.needsUpdate = true;
      }
      targetMesh.geometry.computeVertexNormals();

      const assembledGroup = new T.Group();
      assembledGroup.name = "MMSEV_Assembled";

      // Segment geometry into chassis and 6 independent rotating wheels
      const partitioned = partitionRoverMesh(targetMesh);
      if (partitioned) {
        assembledGroup.add(partitioned.chassisMesh);
        exteriorBody = partitioned.chassisMesh;
        exteriorBody.visible = !cockpitView;
        for (const w of partitioned.wheels) {
          assembledGroup.add(w.pivot);
        }
        activeWheels = partitioned.wheels;
      } else {
        console.warn("[BigRover] Wheel partition failed; retaining the animated fallback.");
        return;
      }

      // Re-anchor high-power headlights to the scaled front bumper
      const frontZ = -2.48;
      const headlightY = 1.55;
      headlightL.position.set(-0.85, headlightY, frontZ);
      headlightR.position.set(0.85, headlightY, frontZ);
      lensL.position.set(-0.85, headlightY, frontZ - 0.04);
      lensR.position.set(0.85, headlightY, frontZ - 0.04);
      targetL.position.set(-0.85, 0.4, -30);
      targetR.position.set(0.85, 0.4, -30);

      // Swap out procedural fallback with the authentic NASA SEV assembly
      root.remove(fallback);
      root.add(assembledGroup);

      isModelLoaded = true;

      console.info(
        `[BigRover] Loaded NASA Space Exploration Vehicle successfully (3.38m wide x 4.95m long x 3.32m high). Forward heading aligned (-Z), tires placed at ground level (Y = 0), and 6 independent rotating wheels with active surface suspension initialized.`,
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

    if (cockpitView) cockpit.update(rover);

    // 2. Rotate tires with vehicle roll, steer front wheels, and calculate independent suspension travel
    const sinYaw = Math.sin(rover.yaw);
    const cosYaw = Math.cos(rover.yaw);

    for (let i = 0; i < activeWheels.length; i++) {
      const w = activeWheels[i];
      // Rotate tire around axle with wheelRoll (spins forward when driving forward)
      w.wheelMesh.rotation.x = -rover.wheelRoll;

      // Front wheels steer into turns
      if (w.isFront) {
        w.steering.rotation.y = rover.steerAngle;
      }

      // Real 6-wheel suspension reacting to Mars surface profile & rocker-bogie compression
      if (rover.wheelCompression && rover.wheelCompression[i] !== undefined) {
        // Physics already damps each spring. A second filter caused visible ground penetration.
        w.suspensionOffset = rover.wheelCompression[i];
        w.pivot.position.y = w.baseY + w.suspensionOffset;
      } else if (heightAt) {
        const worldWheelX = rover.x + cosYaw * w.baseX + sinYaw * w.baseZ;
        const worldWheelZ = rover.z - sinYaw * w.baseX + cosYaw * w.baseZ;
        const terrainH = heightAt(worldWheelX, worldWheelZ);
        const targetOffset = terrainH - groundY;

        // Smooth spring damping (stiff suspension for heavy rover)
        w.suspensionOffset +=
          (targetOffset - w.suspensionOffset) * (1 - Math.exp(-22 * dt));
        const travel = Math.max(-0.26, Math.min(0.32, w.suspensionOffset));
        w.pivot.position.y = w.baseY + travel;
      }
    }

    // 3. Headlight intensity based on planetary solar lighting
    const lightLevel = isNight ? 8.5 : 2.8;
    headlightL.intensity = lightLevel;
    headlightR.intensity = lightLevel;
    lensL.visible = isNight || rover.driving;
    lensR.visible = isNight || rover.driving;

    // 4. Regolith & mud tire dust plume behind rear wheels
    const moving = Math.abs(rover.speed) > 0.8;
    const mud = rover.mudDepth ?? 0;
    dustMat.color.setHex(mud > 0.3 ? 0x6e4731 : 0xc87d4f);
    dustMat.size = 0.35 + mud * 0.15;

    if (moving && dt > 0) {
      for (let k = 0; k < 2; k++) {
        const i = dustIndex;
        dustIndex = (dustIndex + 1) % dustCount;
        const side = k === 0 ? -1.42 : 1.42;
        dustPos[i * 3] = side + (Math.random() - 0.5) * 0.3;
        dustPos[i * 3 + 1] = 0.12;
        dustPos[i * 3 + 2] = 1.82 + Math.random() * 0.35;
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
    cockpit.texture.dispose();
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
    setCockpitView(enabled) {
      cockpitView = enabled;
      cockpit.root.visible = enabled;
      if (exteriorBody) exteriorBody.visible = !enabled;
    },
    positionCockpitCamera(camera, yaw, pitch) {
      positionRoverCockpitCamera(camera, root, yaw, pitch);
    },
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
