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
  ) => void;
  dispose: () => void;
};

/**
 * Creates the authentic NASA Multi-Mission Space Exploration Vehicle (MMSEV)
 * with working forward headlights, regolith tire dust spray, and full physics.
 * Automatically loads /models/space-exploration-vehicle.glb with DRACOLoader.
 */
export function createBigRover(
  modelUrl = "/models/space-exploration-vehicle.glb",
): BigRoverHandle {
  const root = new T.Group();
  root.name = "BigRover";

  let loadedModel: T.Object3D | null = null;
  let isModelLoaded = false;

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

  const bodyMesh = new T.Mesh(new T.BoxGeometry(2.4, 1.4, 4.6), chassisMat);
  bodyMesh.position.set(0, 1.4, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  fallback.add(bodyMesh);

  // 6 wheels on fallback
  const wheelPositions = [
    [-1.4, 0.55, -1.5],
    [1.4, 0.55, -1.5],
    [-1.4, 0.55, 0.0],
    [1.4, 0.55, 0.0],
    [-1.4, 0.55, 1.5],
    [1.4, 0.55, 1.5],
  ];
  for (const [wx, wy, wz] of wheelPositions) {
    const wheel = new T.Mesh(
      new T.CylinderGeometry(0.55, 0.55, 0.42, 16),
      tireMat,
    );
    wheel.position.set(wx, wy, wz);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    fallback.add(wheel);
  }
  root.add(fallback);

  // ==========================================
  // 2. HIGH-POWER FORWARD HEADLIGHTS
  // ==========================================
  const headlightL = new T.SpotLight(0xfffae6, 3.5, 45, 0.55, 0.65, 1.2);
  const headlightR = new T.SpotLight(0xfffae6, 3.5, 45, 0.55, 0.65, 1.2);

  headlightL.position.set(-0.95, 1.85, -2.4);
  headlightR.position.set(0.95, 1.85, -2.4);

  const targetL = new T.Object3D();
  targetL.position.set(-0.95, 0.4, -28);
  const targetR = new T.Object3D();
  targetR.position.set(0.95, 0.4, -28);

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
  lensL.position.set(-0.95, 1.85, -2.42);
  lensL.rotation.y = Math.PI;
  const lensR = new T.Mesh(lensGeo, lensMat);
  lensR.position.set(0.95, 1.85, -2.42);
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

      // Align model: in Blender Z is up and Y is forward.
      // Rotating around X by -Math.PI / 2 sets Up to +Y and Forward to -Z.
      model.rotation.x = -Math.PI / 2;
      model.updateMatrixWorld(true);

      // Measure unscaled bounds
      const rawBox = new T.Box3().setFromObject(model);
      const rawSize = rawBox.getSize(new T.Vector3());

      // Target vehicle length ~5.5m (fits 1:1 NASA SEV scale and 2.2m collision radius)
      if (rawSize.z > 0.1) {
        const scale = 5.5 / rawSize.z;
        model.scale.multiplyScalar(scale);
      }
      model.updateMatrixWorld(true);

      const scaledBox = new T.Box3().setFromObject(model);
      const center = scaledBox.getCenter(new T.Vector3());

      // Center horizontally on origin (0, 0) and place bottom of wheels on ground (Y = 0)
      model.position.x = -center.x;
      model.position.z = -center.z;
      model.position.y = -scaledBox.min.y;

      // Adjust headlight positions to match the scaled model's front bumper
      const frontZ = scaledBox.min.z + 0.15;
      const headlightY = -scaledBox.min.y + rawSize.y * (model.scale.y) * 0.42;
      headlightL.position.set(-1.0, headlightY, frontZ);
      headlightR.position.set(1.0, headlightY, frontZ);
      lensL.position.set(-1.0, headlightY, frontZ - 0.05);
      lensR.position.set(1.0, headlightY, frontZ - 0.05);
      targetL.position.set(-1.0, 0.4, frontZ - 30);
      targetR.position.set(1.0, 0.4, frontZ - 30);

      // Swap out procedural fallback with authentic NASA SEV model
      root.remove(fallback);
      root.add(model);
      loadedModel = model;
      isModelLoaded = true;

      console.info(
        `[BigRover] Loaded NASA Space Exploration Vehicle successfully from "${modelUrl}" (${(rawSize.x * model.scale.x).toFixed(2)}m wide x ${(rawSize.z * model.scale.z).toFixed(2)}m long x ${(rawSize.y * model.scale.y).toFixed(2)}m high).`,
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
  ) {
    // 1. Position & orientation of chassis in world coordinates
    root.position.set(rover.x, groundY, rover.z);
    root.rotation.set(rover.pitch, rover.yaw, rover.roll, "YXZ");

    // 2. Headlight intensity based on planetary solar lighting
    const lightLevel = isNight ? 8.5 : 2.8;
    headlightL.intensity = lightLevel;
    headlightR.intensity = lightLevel;
    lensL.visible = isNight || rover.driving;
    lensR.visible = isNight || rover.driving;

    // 3. Regolith tire dust plume behind rear wheels
    const moving = Math.abs(rover.speed) > 0.8;
    if (moving && dt > 0) {
      for (let k = 0; k < 2; k++) {
        const i = dustIndex;
        dustIndex = (dustIndex + 1) % dustCount;
        const side = k === 0 ? -1.4 : 1.4;
        dustPos[i * 3] = side + (Math.random() - 0.5) * 0.35;
        dustPos[i * 3 + 1] = 0.15;
        dustPos[i * 3 + 2] = 2.4 + Math.random() * 0.4;
        dustVel[i * 3] = (Math.random() - 0.5) * 0.8;
        dustVel[i * 3 + 1] = 0.5 + Math.random() * 0.7;
        dustVel[i * 3 + 2] = 1.2 + Math.random() * 1.8;
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
