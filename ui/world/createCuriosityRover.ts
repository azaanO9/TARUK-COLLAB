import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { assetUrl } from "../../lib/assetUrl";
import { CURIOSITY_WHEEL_OFFSETS, type CuriosityRoverState } from "../../game/curiosityRover";
import { createSoftContactShadow } from "./contactShadow";

export type CuriosityRoverHandle = {
  ready: Promise<void>;
  root: T.Group;
  hitTarget: T.Object3D;
  spotlight: T.SpotLight;
  update: (
    state: CuriosityRoverState,
    dt: number,
    isNight: boolean,
    reducedMotion: boolean,
    shadowsEnabled: boolean,
  ) => void;
  dispose: () => void;
};

type CuriosityRig = {
  alignGroup: T.Group;
  chassisNode: T.Object3D | null;
  bodyNode: T.Object3D | null;
  chassisBaseZ: number;
  bodyBaseZ: number;
  rockerLBaseZ: number;
  rockerRBaseZ: number;
  wheels: T.Object3D[];
  steerFront: T.Object3D[];
  steerRear: T.Object3D[];
  rockerL: T.Object3D | null;
  rockerR: T.Object3D | null;
  rockerLBaseQuat: T.Quaternion;
  rockerRBaseQuat: T.Quaternion;
  bogieL: T.Object3D | null;
  bogieR: T.Object3D | null;
  bogieLBaseQuat: T.Quaternion;
  bogieRBaseQuat: T.Quaternion;
  xmemberNode: T.Object3D | null;
  xmemberBaseQuat: T.Quaternion;
  mastYawNode: T.Object3D | null;
  mastPitchNode: T.Object3D | null;
  mastYawBaseQuat: T.Quaternion;
  mastPitchBaseQuat: T.Quaternion;
  armNodes: (T.Object3D | null)[];
  laserOrigin: T.Object3D;
};

const RAD = Math.PI / 180;
const AXIS_X = new T.Vector3(1, 0, 0);
const AXIS_Z = new T.Vector3(0, 0, 1);

/** Compact stowed pose across the front chassis while driving (from GLB t=0 keys). */
const ARM_STOW_QUATS: readonly T.Quaternion[] = [
  new T.Quaternion().setFromEuler(new T.Euler(0, 0, -90 * RAD, "XYZ")),
  new T.Quaternion().setFromEuler(new T.Euler(-15 * RAD, 0, 0, "XYZ")),
  new T.Quaternion().setFromEuler(new T.Euler(-70 * RAD, 0, 0, "XYZ")),
  new T.Quaternion().setFromEuler(new T.Euler(85 * RAD, 0, 0, "XYZ")),
  new T.Quaternion().setFromEuler(new T.Euler(0, 0, -32 * RAD, "XYZ")),
];

/** Deployed science-scan reach hovering the turret (APXS/MAHLI) cleanly ahead over regolith. */
const ARM_SCAN_QUATS: readonly T.Quaternion[] = [
  new T.Quaternion().setFromEuler(new T.Euler(0, 0, -6 * RAD, "XYZ")),
  new T.Quaternion().setFromEuler(new T.Euler(6 * RAD, 0, 0, "XYZ")),
  new T.Quaternion().setFromEuler(new T.Euler(102 * RAD, 0, 0, "XYZ")),
  new T.Quaternion().setFromEuler(new T.Euler(-44 * RAD, 0, 0, "XYZ")),
  new T.Quaternion().setFromEuler(new T.Euler(0, 0, 12 * RAD, "XYZ")),
];

/** Deployed surface driving pose sampled from 'Take 01' end frame (20.67s). */
const DEPLOYED_NODE_QUATS: Record<string, readonly [number, number, number, number]> = {
  _root_p: [0, 0, 0, 1],
  Chassis: [0, 0, 0, 1],
  body: [0, 0, 0, 1],
  cover_01: [0, 0.7071, 0, 0.7071],
  cover_02: [0, -0.7071, 0, 0.7071],
  cover_03: [-0.7071, 0, 0, 0.7071],
  MAHLI_lens_cover_p: [0.7132, -0.0192, 0.5975, 0.3661],
  antenna_HG_01: [0, 0, 0.2164, 0.9763],
  antenna_HG_02_p: [0.0828, 0.3736, -0.2, 0.902],
  lens_covers_front: [-0.3782, 0, 0, 0.9257],
  lens_covers_rear: [0, 0, 0, 1],
  mast_p: [0, 0, 0.284, 0.9588],
  "mast_02.001": [0, 0, 0, 1],
  "mast_03.001": [0, 0, 0, 1],
  suspension_xmember: [0.0004, -0.0008, 0.0047, 1],
  suspension_axel_L: [0, 0, 0, 1],
  suspension_rod_L: [0, -0.0048, 1, 0],
  suspension_arm_B_L_p: [0, -0.098, 0, 0.9952],
  Cube_03_p: [0, 0, 0, 1],
  suspension_arm_B2_L: [0, 0, 0, 1],
  suspension_arm_F_L_p: [0, -0.098, 0, 0.9952],
  Cube_01_p: [0, 0, 0, 1],
  suspension_axel_R: [0, 0, 0, 1],
  suspension_rod_R: [0.0068, -0.0006, 0.0014, 1],
  suspension_arm_B_R_p: [0, 0.098, 0, 0.9952],
  Cube_04_p: [0, 0, 0, 1],
  suspension_arm_B2_R: [0, 0, 0, 1],
  suspension_arm_F_R_p: [0, 0.098, 0, 0.9952],
  Cube_02_p: [0, 0, 0, 1],
};

function tagCuriosityTargets(obj: T.Object3D) {
  obj.traverse((child) => {
    child.userData.station = "curiosity";
    if ((child as T.Mesh).isMesh) {
      const mesh = child as T.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (m instanceof T.MeshStandardMaterial) {
          if (m.map) m.map.colorSpace = T.SRGBColorSpace;
          if (m.emissiveMap) m.emissiveMap.colorSpace = T.SRGBColorSpace;
          m.roughness = Math.max(0.24, m.roughness);
          m.needsUpdate = true;
        }
      }
    }
  });
}

function buildFallbackCuriosity(root: T.Group) {
  const group = new T.Group();
  const bodyMat = new T.MeshStandardMaterial({ color: 0xded9cf, roughness: 0.45, metalness: 0.35 });
  const goldMat = new T.MeshStandardMaterial({ color: 0xd49a35, roughness: 0.3, metalness: 0.78 });
  const darkMat = new T.MeshStandardMaterial({ color: 0x262a30, roughness: 0.75, metalness: 0.25 });

  const chassis = new T.Mesh(new T.BoxGeometry(1.5, 0.52, 2.2), bodyMat);
  chassis.position.set(0, 0.85, 0);
  chassis.castShadow = true;
  group.add(chassis);

  const mast = new T.Mesh(new T.CylinderGeometry(0.06, 0.08, 0.95, 10), goldMat);
  mast.position.set(0.45, 1.55, -0.7);
  group.add(mast);

  const head = new T.Mesh(new T.BoxGeometry(0.46, 0.24, 0.26), bodyMat);
  head.position.set(0.45, 2.02, -0.7);
  group.add(head);

  const wheelGeo = new T.CylinderGeometry(0.243, 0.243, 0.36, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [
    [-1.06, -1.09],
    [1.06, -1.09],
    [-1.19, 0.09],
    [1.19, 0.09],
    [-1.06, 1.16],
    [1.06, 1.16],
  ]) {
    const wheel = new T.Mesh(wheelGeo, darkMat);
    wheel.position.set(wx, 0.243, wz);
    wheel.castShadow = true;
    group.add(wheel);
  }

  tagCuriosityTargets(group);
  root.add(group);
  return { group, mats: [bodyMat, goldMat, darkMat] };
}

export function createCuriosityRover(
  modelUrl = assetUrl("/models/nasa-curiosity-clean.glb"),
): CuriosityRoverHandle {
  const root = new T.Group();
  root.name = "nasa-curiosity-rover";
  root.userData.station = "curiosity";

  // Invisible generous raycast proxy box so aiming anywhere near Curiosity highlights cleanly
  const hitGeo = new T.BoxGeometry(2.6, 2.2, 3.1);
  const hitMat = new T.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false,
  });
  const hitTarget = new T.Mesh(hitGeo, hitMat);
  hitTarget.position.set(0, 1.1, 0);
  hitTarget.userData.station = "curiosity";
  root.add(hitTarget);

  const fallback = buildFallbackCuriosity(root);

  // Forward HazCam / navigation light
  const spotlight = new T.SpotLight(0xfff1d6, 2.2, 26, Math.PI / 4.2, 0.55, 1.4);
  spotlight.position.set(0.45, 1.95, -0.75);
  spotlight.castShadow = false;
  spotlight.shadow.mapSize.set(512, 512);
  spotlight.shadow.bias = -0.0008;
  const spotTarget = new T.Object3D();
  spotTarget.position.set(0.15, 0, -9.5);
  root.add(spotlight, spotTarget);
  spotlight.target = spotTarget;

  // Subtle ChemCam LIBS beam + realistic pinpoint plasma dot & soft regolith bounce
  const laserGeo = new T.CylinderGeometry(0.0035, 0.0055, 1, 8, 1, true);
  laserGeo.translate(0, 0.5, 0);
  laserGeo.rotateX(Math.PI / 2); // +Z axis = length 1 beam ready for lookAt()
  const laserMat = new T.MeshBasicMaterial({
    color: 0xa2ecff,
    transparent: true,
    opacity: 0.28,
    side: T.DoubleSide,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });
  const laserBeam = new T.Mesh(laserGeo, laserMat);
  laserBeam.visible = false;
  laserBeam.castShadow = false;
  root.add(laserBeam);

  let glowTex: T.CanvasTexture | null = null;
  if (typeof document !== "undefined") {
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const gCtx = glowCanvas.getContext("2d");
    if (gCtx) {
      const grad = gCtx.createRadialGradient(32, 32, 1, 32, 32, 30);
      grad.addColorStop(0, "rgba(180, 240, 255, 0.52)");
      grad.addColorStop(0.35, "rgba(125, 218, 250, 0.18)");
      grad.addColorStop(1, "rgba(125, 218, 250, 0)");
      gCtx.fillStyle = grad;
      gCtx.fillRect(0, 0, 64, 64);
    }
    glowTex = new T.CanvasTexture(glowCanvas);
  }
  const scanGlowGeo = new T.PlaneGeometry(0.28, 0.28);
  scanGlowGeo.rotateX(-Math.PI / 2);
  const scanGlowMat = new T.MeshBasicMaterial({
    color: 0xa8ecff,
    map: glowTex,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });
  const scanGlow = new T.Mesh(scanGlowGeo, scanGlowMat);
  scanGlow.visible = false;
  root.add(scanGlow);

  const scanDotGeo = new T.SphereGeometry(0.015, 10, 8);
  const scanDotMat = new T.MeshBasicMaterial({
    color: 0xeafaff,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });
  const scanDot = new T.Mesh(scanDotGeo, scanDotMat);
  scanDot.visible = false;
  root.add(scanDot);

  const scanSpotLight = new T.PointLight(0x8de6ff, 0, 1.85, 2);
  root.add(scanSpotLight);

  // Subtle rear-wheel Mars dust emitter when cruising (soft radial particle sprite)
  const dustCount = 24;
  const dustPos = new Float32Array(dustCount * 3);
  const dustVel = new Float32Array(dustCount * 3);
  const dustLife = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) dustPos[i * 3 + 1] = -100;
  const dustGeo = new T.BufferGeometry();
  dustGeo.setAttribute("position", new T.BufferAttribute(dustPos, 3));
  let dustSprite: T.CanvasTexture | null = null;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
      grad.addColorStop(0, "rgba(218, 148, 98, 0.95)");
      grad.addColorStop(0.55, "rgba(201, 130, 86, 0.45)");
      grad.addColorStop(1, "rgba(201, 130, 86, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    }
    dustSprite = new T.CanvasTexture(canvas);
  }
  const dustMat = new T.PointsMaterial({
    color: 0xc98256,
    map: dustSprite,
    size: 0.28,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const dustPoints = new T.Points(dustGeo, dustMat);
  dustPoints.frustumCulled = false;
  root.add(dustPoints);
  let dustCursor = 0;
  let dustDirty = false;

  const contactShadow = typeof document !== "undefined"
    ? createSoftContactShadow({
        width: 2.85,
        depth: 3.35,
        y: 0.024,
        bodyHalfWidth: 0.9,
        bodyHalfLength: 1.15,
        wheels: CURIOSITY_WHEEL_OFFSETS,
        wheelRadiusX: 0.34,
        wheelRadiusZ: 0.42,
        opacity: 0.54,
      })
    : null;
  if (contactShadow) root.add(contactShadow.mesh);

  let rig: CuriosityRig | null = null;
  let disposed = false;

  const qTemp = new T.Quaternion();
  const qRot = new T.Quaternion();
  const vWorldA = new T.Vector3();
  const vWorldB = new T.Vector3();
  const vLocalA = new T.Vector3();
  const vLocalB = new T.Vector3();

  let resolveReady!: () => void;
  const ready = new Promise<void>((res) => {
    resolveReady = res;
  });

  const loader = new GLTFLoader();
  loader.loadAsync(modelUrl).then((gltf) => {
    const model = gltf.scene;
    if (disposed) {
      model.traverse((o) => {
        if ((o as T.Mesh).isMesh) {
          const m = o as T.Mesh;
          m.geometry?.dispose();
          for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
            for (const val of Object.values(mat)) if (val instanceof T.Texture) val.dispose();
            mat.dispose();
          }
        }
      });
      return;
    }

    // Resolve GLTF node names cleanly even after Three.js PropertyBinding sanitizes "." characters
    const byName = (name: string) =>
      model.getObjectByName(name) ?? model.getObjectByName(name.replace(/\./g, "")) ?? null;

    // Lock deployed Mars surface configuration (tall mast, antennas, dust covers, wide rocker-bogie stance)
    for (const [nodeName, q] of Object.entries(DEPLOYED_NODE_QUATS)) {
      const node = byName(nodeName);
      if (node) node.quaternion.set(q[0], q[1], q[2], q[3]).normalize();
    }

    // Align model +Z forward into engine -Z forward
    const alignGroup = new T.Group();
    alignGroup.name = "curiosity-aligned-model";
    alignGroup.rotation.y = Math.PI;
    alignGroup.add(model);

    tagCuriosityTargets(alignGroup);
    const wheels = [
      "wheel_01_L",
      "wheel_01_R",
      "wheel_02_L",
      "wheel_02_R",
      "wheel_03_L",
      "wheel_03_R",
    ]
      .map((n) => byName(n))
      .filter((n): n is T.Object3D => Boolean(n));

    for (const w of wheels) w.quaternion.identity();

    const steerFront = ["suspension_steer_F_L", "suspension_steer_F_R"]
      .map((n) => byName(n))
      .filter((n): n is T.Object3D => Boolean(n));
    const steerRear = ["suspension_steer_B_L", "suspension_steer_B_R"]
      .map((n) => byName(n))
      .filter((n): n is T.Object3D => Boolean(n));
    for (const s of [...steerFront, ...steerRear]) s.quaternion.identity();

    const chassisNode = byName("Chassis");
    const bodyNode = byName("body");
    const chassisBaseZ = chassisNode ? chassisNode.position.z : 0.8864;
    const bodyBaseZ = bodyNode ? bodyNode.position.z : 0.8864;

    const rockerL = byName("suspension_axel_L");
    const rockerR = byName("suspension_axel_R");
    const rockerLBaseZ = rockerL ? rockerL.position.z : -0.011;
    const rockerRBaseZ = rockerR ? rockerR.position.z : -0.011;
    const rockerLBaseQuat = rockerL ? rockerL.quaternion.clone() : new T.Quaternion();
    const rockerRBaseQuat = rockerR ? rockerR.quaternion.clone() : new T.Quaternion();

    const bogieL = byName("suspension_arm_B2_L");
    const bogieR = byName("suspension_arm_B2_R");
    const bogieLBaseQuat = bogieL ? bogieL.quaternion.clone() : new T.Quaternion();
    const bogieRBaseQuat = bogieR ? bogieR.quaternion.clone() : new T.Quaternion();

    const xmemberNode = byName("suspension_xmember");
    const xmemberBaseQuat = xmemberNode ? xmemberNode.quaternion.clone() : new T.Quaternion();

    const mastYawNode = byName("mast_02.001");
    const mastPitchNode = byName("mast_03.001");
    if (mastYawNode) mastYawNode.quaternion.identity();
    if (mastPitchNode) mastPitchNode.quaternion.identity();
    const mastYawBaseQuat = mastYawNode ? mastYawNode.quaternion.clone() : new T.Quaternion();
    const mastPitchBaseQuat = mastPitchNode ? mastPitchNode.quaternion.clone() : new T.Quaternion();

    // ChemCam aperture sits on front face (-Y in local Z-up space) at lens height Z~0.21
    const laserOrigin = new T.Object3D();
    laserOrigin.position.set(0.02, -0.14, 0.21);
    (mastPitchNode ?? model).add(laserOrigin);

    const armNames = ["arm_01.001", "arm_02.001", "arm_03.001", "arm_04.001", "arm_05_head.001"];
    const armNodes = armNames.map((n) => byName(n));
    for (let i = 0; i < armNodes.length; i++) {
      const node = armNodes[i];
      if (node) node.quaternion.copy(ARM_STOW_QUATS[i]);
    }

    // Measure lowest wheel Y in aligned coordinates and flush wheels cleanly to y = 0
    alignGroup.updateMatrixWorld(true);
    let minWheelY = Infinity;
    const wheelBox = new T.Box3();
    for (const w of wheels) {
      wheelBox.setFromObject(w);
      if (Number.isFinite(wheelBox.min.y) && wheelBox.min.y < minWheelY) {
        minWheelY = wheelBox.min.y;
      }
    }
    if (Number.isFinite(minWheelY)) {
      alignGroup.position.y -= minWheelY;
    }
    alignGroup.updateMatrixWorld(true);
    const totalBox = new T.Box3().setFromObject(alignGroup);

    root.remove(fallback.group);
    fallback.group.traverse((o) => {
      if ((o as T.Mesh).isMesh) (o as T.Mesh).geometry.dispose();
    });
    for (const m of fallback.mats) m.dispose();
    root.add(alignGroup);

    rig = {
      alignGroup,
      chassisNode,
      bodyNode,
      chassisBaseZ,
      bodyBaseZ,
      rockerLBaseZ,
      rockerRBaseZ,
      wheels,
      steerFront,
      steerRear,
      rockerL,
      rockerR,
      rockerLBaseQuat,
      rockerRBaseQuat,
      bogieL,
      bogieR,
      bogieLBaseQuat,
      bogieRBaseQuat,
      xmemberNode,
      xmemberBaseQuat,
      mastYawNode,
      mastPitchNode,
      mastYawBaseQuat,
      mastPitchBaseQuat,
      armNodes,
      laserOrigin,
    };

    console.info(
      `[CuriosityRover] Loaded NASA Curiosity rover cleanly (height=${totalBox.max.y.toFixed(2)}m, width=${(totalBox.max.x - totalBox.min.x).toFixed(2)}m, length=${(totalBox.max.z - totalBox.min.z).toFixed(2)}m, minY=${totalBox.min.y.toFixed(3)}m).`,
    );
  }).catch((err) => {
    console.warn(`[CuriosityRover] Could not load "${modelUrl}" (${(err as Error)?.message || "error"}); keeping fallback.`);
  }).finally(() => resolveReady());

  function update(
    state: CuriosityRoverState,
    dt: number,
    isNight: boolean,
    reducedMotion: boolean,
    shadowsEnabled: boolean,
  ) {
    root.position.set(state.x, state.chassisY, state.z);
    root.rotation.set(state.pitch, state.yaw, state.roll, "YXZ");

    const crouchDrop = state.scanCrouch * 0.13;
    spotlight.position.y = 1.95 - crouchDrop;
    spotlight.intensity = isNight ? 6.5 : 0;
    spotlight.castShadow = shadowsEnabled && isNight;
    if (contactShadow) {
      contactShadow.material.opacity = ((shadowsEnabled ? 0.22 : 0.54) + state.scanCrouch * 0.06) * (isNight ? 0.5 : 1);
    }

    if (rig) {
      // Lower chassis/body smoothly during surface scanning while keeping all 6 wheels grounded on y = 0
      if (rig.chassisNode) rig.chassisNode.position.z = rig.chassisBaseZ - crouchDrop;
      if (rig.bodyNode) rig.bodyNode.position.z = rig.bodyBaseZ - crouchDrop;
      if (rig.rockerL) rig.rockerL.position.z = rig.rockerLBaseZ + crouchDrop;
      if (rig.rockerR) rig.rockerR.position.z = rig.rockerRBaseZ + crouchDrop;

      // Wheel X local points toward -X world (left), so +rotation.x rolls forward (-Z).
      for (let i = 0; i < rig.wheels.length; i++) {
        rig.wheels[i].rotation.x = state.wheelRoll;
      }
      // Corner steering knuckles steer around local Z (+Y world UP):
      // Front steers +steerAngle, rear counter-steers -steerAngle * 0.85.
      qRot.setFromAxisAngle(AXIS_Z, state.steerAngle);
      for (const node of rig.steerFront) node.quaternion.copy(qRot);
      qRot.setFromAxisAngle(AXIS_Z, -state.steerAngle * 0.85);
      for (const node of rig.steerRear) node.quaternion.copy(qRot);

      if (rig.rockerL) {
        qRot.setFromAxisAngle(AXIS_X, state.leftRockerAngle);
        rig.rockerL.quaternion.copy(rig.rockerLBaseQuat).multiply(qRot);
      }
      if (rig.rockerR) {
        qRot.setFromAxisAngle(AXIS_X, state.rightRockerAngle);
        rig.rockerR.quaternion.copy(rig.rockerRBaseQuat).multiply(qRot);
      }
      if (rig.bogieL) {
        qRot.setFromAxisAngle(AXIS_X, state.leftBogieAngle);
        rig.bogieL.quaternion.copy(rig.bogieLBaseQuat).multiply(qRot);
      }
      if (rig.bogieR) {
        qRot.setFromAxisAngle(AXIS_X, state.rightBogieAngle);
        rig.bogieR.quaternion.copy(rig.bogieRBaseQuat).multiply(qRot);
      }
      if (rig.xmemberNode) {
        qRot.setFromAxisAngle(AXIS_Z, (state.rightRockerAngle - state.leftRockerAngle) * 0.55);
        rig.xmemberNode.quaternion.copy(rig.xmemberBaseQuat).multiply(qRot);
      }

      if (rig.mastYawNode) {
        qRot.setFromAxisAngle(AXIS_Z, state.mastYaw);
        rig.mastYawNode.quaternion.copy(rig.mastYawBaseQuat).multiply(qRot);
      }
      if (rig.mastPitchNode) {
        // Local X points -X_world; positive angle tilts nose down, so invert negative mastPitch
        qRot.setFromAxisAngle(AXIS_X, -state.mastPitch);
        rig.mastPitchNode.quaternion.copy(rig.mastPitchBaseQuat).multiply(qRot);
      }

      // Robotic arm stowed-to-extended interpolation + delicate wrist micro-scan during laser phase
      const deployT = state.armDeploy;
      const microSweep =
        state.phase === "scanning" && state.scanStage === "laser" && !reducedMotion
          ? Math.sin(state.scanTimer * 2.2) * 0.08
          : 0;
      for (let i = 0; i < rig.armNodes.length; i++) {
        const node = rig.armNodes[i];
        if (!node) continue;
        node.quaternion.copy(ARM_STOW_QUATS[i]).slerp(ARM_SCAN_QUATS[i], deployT);
        if (i === 4 && microSweep !== 0) {
          qTemp.setFromAxisAngle(AXIS_Z, microSweep);
          node.quaternion.multiply(qTemp);
        }
      }
    }

    // Update subtle ChemCam LIBS pinpoint plasma glint & dim regolith bounce glow
    if (state.laserActive) {
      root.updateMatrixWorld(true);
      if (rig?.laserOrigin) {
        rig.laserOrigin.getWorldPosition(vWorldA);
        vLocalA.copy(vWorldA);
        root.worldToLocal(vLocalA);
      } else {
        vLocalA.set(0.48, 2.02 - crouchDrop, -0.84);
      }
      vWorldB.set(state.scanTargetX, state.scanTargetY + 0.015, state.scanTargetZ);
      vLocalB.copy(vWorldB);
      root.worldToLocal(vLocalB);

      const dist = vLocalA.distanceTo(vLocalB);
      if (dist > 0.15 && dist < 8) {
        const pulseScale = reducedMotion ? 0.85 : 0.72 + state.laserPulse * 0.28;
        laserBeam.visible = true;
        laserBeam.position.copy(vLocalA);
        laserBeam.lookAt(vWorldB);
        laserBeam.scale.set(pulseScale, pulseScale, dist);
        laserMat.opacity = reducedMotion ? 0.24 : 0.14 + state.laserPulse * 0.18;

        scanGlow.visible = true;
        scanGlow.position.copy(vLocalB);
        scanGlow.scale.setScalar(reducedMotion ? 0.85 : 0.78 + state.laserPulse * 0.22);
        scanGlowMat.opacity = reducedMotion ? 0.28 : 0.18 + state.laserPulse * 0.2;

        scanDot.visible = true;
        scanDot.position.copy(vLocalB);
        scanDot.scale.setScalar(reducedMotion ? 0.85 : 0.65 + state.laserPulse * 0.4);
        scanDotMat.opacity = reducedMotion ? 0.65 : 0.48 + state.laserPulse * 0.4;

        scanSpotLight.position.set(vLocalB.x, vLocalB.y + 0.18, vLocalB.z);
        scanSpotLight.intensity = reducedMotion ? 0.3 : 0.18 + state.laserPulse * 0.3;
      }
    } else {
      laserBeam.visible = false;
      scanGlow.visible = false;
      scanDot.visible = false;
      scanSpotLight.intensity = 0;
    }

    // Gentle rear-wheel regolith dust puffs while driving
    if (!reducedMotion && Math.abs(state.speed) > 0.35 && dt > 0) {
      for (const side of [-1.06, 1.06]) {
        const idx = dustCursor;
        dustCursor = (dustCursor + 1) % dustCount;
        dustPos[idx * 3] = side + (Math.random() - 0.5) * 0.14;
        dustPos[idx * 3 + 1] = 0.08;
        dustPos[idx * 3 + 2] = 1.28 + Math.random() * 0.18;
        dustVel[idx * 3] = (Math.random() - 0.5) * 0.28;
        dustVel[idx * 3 + 1] = 0.18 + Math.random() * 0.22;
        dustVel[idx * 3 + 2] = 0.45 + Math.random() * 0.5;
        dustLife[idx] = 1.0;
      }
      dustDirty = true;
    }
    let anyAlive = false;
    for (let i = 0; i < dustCount; i++) {
      if (dustLife[i] > 0) {
        anyAlive = true;
        dustLife[i] -= dt * 2.2;
        dustPos[i * 3] += dustVel[i * 3] * dt;
        dustPos[i * 3 + 1] += dustVel[i * 3 + 1] * dt;
        dustPos[i * 3 + 2] += dustVel[i * 3 + 2] * dt;
        if (dustLife[i] <= 0) dustPos[i * 3 + 1] = -100;
        dustDirty = true;
      }
    }
    if (dustDirty) {
      dustGeo.attributes.position.needsUpdate = true;
      dustDirty = anyAlive;
    }
  }

  function dispose() {
    disposed = true;
    root.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.Points) {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const mat of mats) {
          for (const val of Object.values(mat)) if (val instanceof T.Texture) val.dispose();
          mat.dispose();
        }
      }
    });
    root.clear();
  }

  return {
    ready,
    root,
    hitTarget,
    spotlight,
    update,
    dispose,
  };
}
