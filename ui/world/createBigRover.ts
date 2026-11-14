import { createRoverDust } from "./roverDust";
import * as T from "three";
import type { LidarScan } from "../../game/roverLidar";
import { assetUrl } from "../../lib/assetUrl";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { ROVER_WHEEL_OFFSETS, ROVER_WHEEL_OUTER_RADIUS, type RoverVehicle } from "../../game/roverVehicle";
import { bindPreparedRover, type RoverWheelAssembly } from "./roverWheelAssembly";
import { createSoftContactShadow } from "./contactShadow";

import { createRoverCockpit, positionRoverCockpitCamera } from "./roverCockpit";

export type BigRoverHandle = {
  ready: Promise<void>;
  setCockpitView: (enabled: boolean) => void;
  positionCockpitCamera: (camera: T.Camera, yaw: number, pitch: number) => void;
  root: T.Group;
  dust: T.Mesh;
  headlightL: T.SpotLight;
  headlightR: T.SpotLight;
  isModelLoaded: boolean;
  update: (
    rover: RoverVehicle,
    groundY: number,
    dt: number,
    isNight: boolean,
    heightAt?: (x: number, z: number) => number,
    lidar?: LidarScan,
    shadowsEnabled?: boolean,
    curiosity?: { x: number; z: number; yaw?: number } | null,
  ) => void;
  dispose: () => void;
};

/**
 * Creates the authentic NASA Multi-Mission Space Exploration Vehicle (MMSEV)
 * with working forward headlights, regolith tire dust spray, real independent
 * surface suspension, and rolling tires synchronized with vehicle speed.
 * Loads the offline-prepared NASA derivative with DRACOLoader.
 */
export function createBigRover(
  modelUrl = assetUrl("/models/space-exploration-vehicle-ready.glb"),
): BigRoverHandle {
  const root = new T.Group();
  root.name = "BigRover";

  let cockpitView = false;
  let exteriorBody: T.Object3D | null = null;
  const cockpit = createRoverCockpit();
  root.add(cockpit.root, cockpit.cabinLight);
  let disposed = false;
  let resolveReady!: () => void;
  const ready = new Promise<void>(resolve => { resolveReady = resolve; });
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

  headlightL.position.set(-0.75, .96, -2.15);
  headlightR.position.set(0.75, .96, -2.15);

  const targetL = new T.Object3D();
  targetL.position.set(-0.85, 0.4, -30);
  const targetR = new T.Object3D();
  targetR.position.set(0.75, 0.4, -30);

  root.add(targetL);
  root.add(targetR);
  headlightL.target = targetL;
  headlightR.target = targetR;

  headlightL.castShadow = false;
  headlightR.castShadow = false;

  root.add(headlightL);
  root.add(headlightR);

  // Solid housings and brackets are attached to the measured body surface.
  const fixtures = new T.Group(); fixtures.name = "mounted-lamps-and-lidar"; root.add(fixtures);
  const fixtureMaterial = new T.MeshStandardMaterial({color:0x343b40,metalness:.6,roughness:.45});
  const lensMat = new T.MeshStandardMaterial({color:0xe5e8df,emissive:0xffe3b5,emissiveIntensity:.15,roughness:.28});
  const lenses: T.Mesh[] = [];
  function boxPart(name: string, size: [number,number,number], position: [number,number,number], material = fixtureMaterial) {
    const part = new T.Mesh(new T.BoxGeometry(...size), material);
    part.name = name; part.position.set(...position); part.castShadow = true; fixtures.add(part); return part;
  }
  for (const side of [-1,1]) {
    const x = side * .75;
    boxPart("headlamp-bracket", [.11,.13,.25], [x,.92,-1.88]);
    boxPart("headlamp-housing", [.28,.23,.20], [x,.96,-2.03]);
    lenses.push(boxPart("recessed-headlamp-lens", [.21,.15,.012], [x,.96,-2.135], lensMat));
  }
  const lidarMount = boxPart("lidar-roof-mount", [.30,.08,.30], [0,2.62,-.35]);
  const lidarHousing = new T.Mesh(new T.CylinderGeometry(.14,.16,.20,20),fixtureMaterial);
  lidarHousing.name = "lidar-sensor"; lidarHousing.position.set(0,2.76,-.35); fixtures.add(lidarHousing);
  const sensorBand = new T.Mesh(new T.CylinderGeometry(.145,.145,.055,20),new T.MeshStandardMaterial({color:0x145654,metalness:.4,roughness:.25}));
  sensorBand.position.set(0,2.78,-.35); fixtures.add(sensorBand);

  // ==========================================
  // 3. TIRE REGOLITH DUST EMITTER
  // ==========================================
  const tireDust = createRoverDust();

  const contactShadow = createSoftContactShadow({
    width: 4.1,
    depth: 5.9,
    y: 0.028,
    bodyHalfWidth: 1.32,
    bodyHalfLength: 2.15,
    wheels: ROVER_WHEEL_OFFSETS,
    wheelRadiusX: 0.44,
    wheelRadiusZ: 0.56,
    opacity: 0.56,
  });
  root.add(contactShadow.mesh);

  // ==========================================
  // 4. LOAD NASA SPACE EXPLORATION VEHICLE (SEV)
  // ==========================================
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(assetUrl("/draco/"));
  loader.setDRACOLoader(dracoLoader);

  loader.loadAsync(modelUrl).then(
    (gltf) => {
      const model = gltf.scene;
      if (disposed) { model.traverse(o => { if (o instanceof T.Mesh) { o.geometry.dispose(); for (const m of Array.isArray(o.material) ? o.material : [o.material]) { for (const value of Object.values(m)) if (value instanceof T.Texture) value.dispose(); m.dispose(); } } }); return; }

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
              // The exported MMSEV binds a grayscale bump heightmap to normalMap with scale 0;
              // because mapN.z = 2*B - 1 goes negative in dark regions, leaving it in normalMap
              // flips normals 180 deg toward/away from the sun. Move it to bumpMap and tune sheen.
              if (mat.normalMap && !mat.bumpMap && mat.normalScale.x === 0 && mat.normalScale.y === 0) {
                mat.bumpMap = mat.normalMap;
                mat.bumpScale = 0.009;
                mat.normalMap = null;
                mat.normalScale.set(1, 1);
              }
              mat.roughness = Math.max(0.54, mat.roughness);
              mat.envMapIntensity = Math.min(mat.envMapIntensity, 0.95);
              if (mat instanceof T.MeshPhysicalMaterial) {
                mat.specularIntensity = Math.min(mat.specularIntensity, 0.72);
              }
              mat.side = T.DoubleSide;
              mat.needsUpdate = true;
            }
          }
        }
      });

      // Geometry and wheel/upright separation are baked offline, never during play.
      const partitioned = bindPreparedRover(model);
      if (!partitioned) {
        console.warn('[BigRover] Invalid prepared rig; retaining fallback.');
        return;
      }
      const assembledGroup = model;
      exteriorBody = partitioned.chassisMesh;
      exteriorBody.visible = !cockpitView;
      activeWheels = partitioned.wheels;
      // Raycast the imported chassis once to attach fittings to its actual skin.
      assembledGroup.updateMatrixWorld(true);
      const mountRay = new T.Raycaster();
      for (let i = 0; i < 2; i++) {
        const x = (i === 0 ? -1 : 1) * .75;
        mountRay.set(new T.Vector3(x,.92,-5),new T.Vector3(0,0,1));
        const hit = mountRay.intersectObject(partitioned.chassisMesh,true)[0];
        const surfaceZ = hit?.point.z ?? -1.78;
        const bracket = fixtures.children[i*3];
        bracket.position.z = surfaceZ - .10;
        fixtures.children[i*3+1].position.z = surfaceZ - .26;
        lenses[i].position.z = surfaceZ - .365;
        const light = i === 0 ? headlightL : headlightR;
        light.position.set(x,.96,surfaceZ - .38);
      }
      mountRay.set(new T.Vector3(0,5,-.35),new T.Vector3(0,-1,0));
      const roof = mountRay.intersectObject(partitioned.chassisMesh,true)[0]?.point.y ?? 2.58;
      lidarMount.position.y = roof + .04;
      lidarHousing.position.y = roof + .18;
      sensorBand.position.y = roof + .20;

      // Swap out procedural fallback with the authentic NASA SEV assembly
      root.remove(fallback);
      fallback.traverse(o => { if (o instanceof T.Mesh) o.geometry.dispose(); });
      chassisMat.dispose(); tireMat.dispose();
      root.add(assembledGroup);

      isModelLoaded = true;

      console.info(
        `[BigRover] Loaded NASA Space Exploration Vehicle successfully (3.38m wide x 4.95m long x 3.32m high). Forward heading aligned (-Z), tires placed at ground level (Y = 0), and 6 independent rotating wheels with active surface suspension initialized.`,
      );
    }).catch((err) => {
      console.warn(
        `[BigRover] Could not load "${modelUrl}" (${(err as Error)?.message || "File not found"}). Using procedural rover fallback.`,
      );
    }).finally(() => { dracoLoader.dispose(); resolveReady(); });

  // ==========================================
  // 5. UPDATE FUNCTION
  // ==========================================
  function update(
    rover: RoverVehicle,
    groundY: number,
    dt: number,
    isNight: boolean,
    heightAt?: (x: number, z: number) => number,
    lidar?: LidarScan,
    shadowsEnabled = true,
    curiosity?: { x: number; z: number; yaw?: number } | null,
  ) {
    // 1. Position & orientation of chassis in world coordinates
    root.position.set(rover.x, groundY, rover.z);
    root.rotation.set(rover.pitch, rover.yaw, rover.roll, "YXZ");

    if (cockpitView) cockpit.update(rover, lidar, curiosity);

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

    // 3. Headlight intensity & grounded contact shadow based on planetary solar lighting
    const lightLevel = isNight ? 8.5 : rover.driving ? 1.4 : 0;
    headlightL.intensity = lightLevel;
    headlightR.intensity = lightLevel;
    lensMat.emissiveIntensity = isNight ? 2 : rover.driving ? .6 : .15;
    contactShadow.material.opacity = (shadowsEnabled ? 0.24 : 0.56) * (isNight ? 0.45 : 1);

    tireDust.update(rover, dt);
  }

  // ==========================================
  // 6. DISPOSE FUNCTION
  // ==========================================
  function dispose() {
    disposed = true;
    tireDust.dispose();
    cockpit.texture.dispose();
    contactShadow.material.map?.dispose();
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
    ready,
    setCockpitView(enabled) {
      if (cockpitView === enabled) return;
      cockpitView = enabled;
      cockpit.root.visible = enabled;
      fixtures.visible = !enabled;
      contactShadow.mesh.visible = !enabled;
      cockpit.cabinLight.intensity = enabled ? 2.4 : 0;
      if (exteriorBody) exteriorBody.visible = !enabled;
    },
    positionCockpitCamera(camera, yaw, pitch) {
      positionRoverCockpitCamera(camera, root, yaw, pitch);
    },
    root,
    dust: tireDust.mesh,
    headlightL,
    headlightR,
    get isModelLoaded() {
      return isModelLoaded;
    },
    update,
    dispose,
  };
}
