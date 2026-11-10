import * as T from "three";
import { assetUrl } from "../../lib/assetUrl";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import {
  createMarsGaitState,
  stepMarsGait,
  type MarsGaitPose,
  type MarsGaitState,
} from "../../game/marsGait";
import { createMarsAstronaut } from "./marsDetails";

export type BoneRecord = {
  bone: T.Object3D;
  restRotation: T.Quaternion;
  restPosition: T.Vector3;
};

export type AstronautBones = {
  hips?: BoneRecord;
  spine?: BoneRecord;
  leftUpLeg?: BoneRecord;
  rightUpLeg?: BoneRecord;
  leftLeg?: BoneRecord;
  rightLeg?: BoneRecord;
  leftFoot?: BoneRecord;
  rightFoot?: BoneRecord;
  leftArm?: BoneRecord;
  rightArm?: BoneRecord;
  leftForeArm?: BoneRecord;
  rightForeArm?: BoneRecord;
};

export type RiggedAstronautHandle = {
  root: T.Group;
  isModelLoaded: boolean;
  modelType: "rigged-gltf" | "procedural-fallback";
  update: (
    dt: number,
    speed: number,
    isAirborne: boolean,
    jumpHeight: number,
    verticalVelocity?: number,
  ) => void;
  dispose: () => void;
};

/**
 * Multi-rig fuzzy bone search patterns.
 * Supports Three.js sanitized node names (e.g. "leg_1L_050"), Mixamo, glTF humanoid, and Biped.
 */
const BONE_PATTERNS: Record<keyof AstronautBones, RegExp[]> = {
  hips: [
    /hip_joint/i,
    /pelvis/i,
    /mixamorig:?hips/i,
    /hips/i,
    /master/i,
    /bip00?1_pelvis/i,
    /bip00?1_root/i,
    /root/i,
  ],
  spine: [
    /spine1/i,
    /spine/i,
    /mixamorig:?spine/i,
    /chest/i,
    /bip00?1_spine/i,
  ],
  leftUpLeg: [
    /leg_?1.*l/i,
    /mixamorig:?leftupleg/i,
    /left.*(up.*leg|thigh)/i,
    /thigh.*l/i,
    /l.*thigh/i,
    /bip00?1_l_thigh/i,
  ],
  rightUpLeg: [
    /leg_?1.*r/i,
    /mixamorig:?rightupleg/i,
    /right.*(up.*leg|thigh)/i,
    /thigh.*r/i,
    /r.*thigh/i,
    /bip00?1_r_thigh/i,
  ],
  leftLeg: [
    /leg_?2.*l/i,
    /mixamorig:?leftleg/i,
    /left.*(leg|calf|knee|shin)/i,
    /shin.*l/i,
    /calf.*l/i,
    /bip00?1_l_calf/i,
  ],
  rightLeg: [
    /leg_?2.*r/i,
    /mixamorig:?rightleg/i,
    /right.*(leg|calf|knee|shin)/i,
    /shin.*r/i,
    /calf.*r/i,
    /bip00?1_r_calf/i,
  ],
  leftFoot: [
    /foot.*l/i,
    /mixamorig:?leftfoot/i,
    /left.*(foot|ankle)/i,
    /l.*foot/i,
    /bip00?1_l_foot/i,
  ],
  rightFoot: [
    /foot.*r/i,
    /mixamorig:?rightfoot/i,
    /right.*(foot|ankle)/i,
    /r.*foot/i,
    /bip00?1_r_foot/i,
  ],
  leftArm: [
    /arm_?1.*l/i,
    /mixamorig:?leftarm/i,
    /left.*(upper.*arm|arm|shoulder)/i,
    /upper.*arm.*l/i,
    /l.*upperarm/i,
    /bip00?1_l_upperarm/i,
  ],
  rightArm: [
    /arm_?1.*r/i,
    /mixamorig:?rightarm/i,
    /right.*(upper.*arm|arm|shoulder)/i,
    /upper.*arm.*r/i,
    /r.*upperarm/i,
    /bip00?1_r_upperarm/i,
  ],
  leftForeArm: [
    /arm_?2.*l/i,
    /mixamorig:?leftforearm/i,
    /left.*(forearm|elbow)/i,
    /forearm.*l/i,
    /l.*forearm/i,
    /bip00?1_l_forearm/i,
  ],
  rightForeArm: [
    /arm_?2.*r/i,
    /mixamorig:?rightforearm/i,
    /right.*(forearm|elbow)/i,
    /forearm.*r/i,
    /r.*forearm/i,
    /bip00?1_r_forearm/i,
  ],
};

function resolveBones(scene: T.Object3D): AstronautBones {
  const bones: AstronautBones = {};
  const entries = Object.entries(BONE_PATTERNS) as [keyof AstronautBones, RegExp[]][];

  scene.traverse((node) => {
    for (const [key, patterns] of entries) {
      if (bones[key]) continue;
      for (const pattern of patterns) {
        if (pattern.test(node.name)) {
          bones[key] = {
            bone: node,
            restRotation: node.quaternion.clone(),
            restPosition: node.position.clone(),
          };
          break;
        }
      }
    }
  });

  return bones;
}

/**
 * Configure materials and cast/receive shadows on all child meshes.
 */
function configureMeshes(root: T.Object3D): void {
  root.traverse((node) => {
    if ((node as T.Mesh).isMesh) {
      const mesh = node as T.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      for (const mat of materials) {
        if (!mat) continue;
        if ((mat as T.MeshStandardMaterial).isMeshStandardMaterial) {
          const std = mat as T.MeshStandardMaterial;
          if (std.map) std.map.colorSpace = T.SRGBColorSpace;
          if (std.emissiveMap) std.emissiveMap.colorSpace = T.SRGBColorSpace;
        }
      }
    }
  });
}

const AXIS_X = new T.Vector3(1, 0, 0);
const AXIS_Y = new T.Vector3(0, 1, 0);
const AXIS_Z = new T.Vector3(0, 0, 1);

const _deltaQuat = new T.Quaternion();
const _targetQuat = new T.Quaternion();
const _euler = new T.Euler();

function applyAxisRotations(
  boneRec: BoneRecord | undefined,
  rotations: { axis: T.Vector3; angle: number }[],
): void {
  if (!boneRec) return;
  _targetQuat.copy(boneRec.restRotation);
  for (const r of rotations) {
    if (Math.abs(r.angle) > 0.0001) {
      _deltaQuat.setFromAxisAngle(r.axis, r.angle);
      _targetQuat.multiply(_deltaQuat);
    }
  }
  boneRec.bone.quaternion.copy(_targetQuat);
}

function applyGenericRotation(
  boneRec: BoneRecord | undefined,
  pitch: number,
  yaw: number,
  roll: number,
): void {
  if (!boneRec) return;
  _euler.set(pitch, yaw, roll, "YXZ");
  _deltaQuat.setFromEuler(_euler);
  _targetQuat.copy(boneRec.restRotation).multiply(_deltaQuat);
  boneRec.bone.quaternion.copy(_targetQuat);
}

/**
 * Create a rigged astronaut handle with procedural Mars walking engine.
 * Automatically attempts to load the downloaded glb/gltf model from /models/astronaut.glb,
 * falling back seamlessly to the procedural astronaut if not yet downloaded.
 *
 * @param modelUrl Path to the GLB/GLTF model
 * @param onLoaded Optional callback when the rigged model loads
 */
export function createRiggedAstronaut(
  modelUrl = assetUrl("/models/astronaut.glb"),
  onLoaded?: () => void,
): RiggedAstronautHandle {
  const root = new T.Group();
  let bones: AstronautBones = {};
  const gaitState: MarsGaitState = createMarsGaitState();
  let baseModelX = 0;
  let baseModelY = 0;
  let modelRef: T.Object3D | null = null;

  // Initialize with procedural astronaut fallback immediately so the scene is never empty
  const fallback = createMarsAstronaut();
  root.add(fallback.root);

  const handle: RiggedAstronautHandle = {
    root,
    isModelLoaded: false,
    modelType: "procedural-fallback",
    update(
      dt: number,
      speed: number,
      isAirborne: boolean,
      jumpHeight: number,
      verticalVelocity = 0,
    ) {
      const pose: MarsGaitPose = stepMarsGait(
        gaitState,
        speed,
        isAirborne,
        dt,
        undefined,
        verticalVelocity,
      );

      if (handle.isModelLoaded && bones.leftUpLeg && modelRef) {
        // 1. Vertical bounce & lateral weight shift (GTA 5 inspired root motion)
        modelRef.position.y = baseModelY + pose.hipOffsetY;
        modelRef.position.x = baseModelX + pose.hipOffsetX;

        // 2. Detect rig type: FBX-style rig (e.g. Sketchfab astro_bones with leg_1) vs standard Mixamo/humanoid
        const isAstroRig = /leg_?1/i.test(bones.leftUpLeg.bone.name);

        if (isAstroRig) {
          // Precise kinematics for the Sketchfab astronaut rig:
          // Thighs: local X is forward swing (negative tilts towards front visor)
          applyAxisRotations(
            bones.leftUpLeg,
            [
              { axis: AXIS_X, angle: -pose.leftThighPitch },
              { axis: AXIS_Z, angle: pose.leftThighRoll },
            ],
          );
          applyAxisRotations(
            bones.rightUpLeg,
            [
              { axis: AXIS_X, angle: -pose.rightThighPitch },
              { axis: AXIS_Z, angle: pose.rightThighRoll },
            ],
          );

          // Knees: local X is flexion (positive bends foot backward towards backpack)
          applyAxisRotations(
            bones.leftLeg,
            [{ axis: AXIS_X, angle: pose.leftKneePitch }],
          );
          applyAxisRotations(
            bones.rightLeg,
            [{ axis: AXIS_X, angle: pose.rightKneePitch }],
          );

          // Feet: local X is dorsiflexion (negative tilts toes up)
          applyAxisRotations(
            bones.leftFoot,
            [{ axis: AXIS_X, angle: -pose.leftAnklePitch }],
          );
          applyAxisRotations(
            bones.rightFoot,
            [{ axis: AXIS_X, angle: -pose.rightAnklePitch }],
          );

          // Arms: local Z is forward/back swing, local X is lateral abduction
          // Left arm: negative Z swings forward towards visor
          applyAxisRotations(
            bones.leftArm,
            [
              { axis: AXIS_Z, angle: -pose.leftArmPitch },
              { axis: AXIS_X, angle: -pose.leftArmRoll },
            ],
          );
          // Right arm: positive Z swings forward towards visor
          applyAxisRotations(
            bones.rightArm,
            [
              { axis: AXIS_Z, angle: pose.rightArmPitch },
              { axis: AXIS_X, angle: pose.rightArmRoll },
            ],
          );

          // Forearms: local X flexes elbow forward
          applyAxisRotations(
            bones.leftForeArm,
            [{ axis: AXIS_X, angle: pose.leftForearmPitch }],
          );
          applyAxisRotations(
            bones.rightForeArm,
            [{ axis: AXIS_X, angle: pose.rightForearmPitch }],
          );

          // Pelvis / Hips: subtle weight transfer roll & twist over stance leg
          applyAxisRotations(
            bones.hips,
            [
              { axis: AXIS_X, angle: -pose.hipPitch * 0.2 },
              { axis: AXIS_Y, angle: -pose.hipYaw * 0.25 },
              { axis: AXIS_Z, angle: -pose.hipRoll * 0.25 },
            ],
          );

          // Spine: forward drive lean, counter-balance twist & breathing
          applyAxisRotations(
            bones.spine,
            [
              { axis: AXIS_X, angle: pose.spinePitch },
              { axis: AXIS_Y, angle: pose.spineYaw },
              { axis: AXIS_Z, angle: pose.spineRoll },
            ],
          );
        } else {
          // Standard humanoid / Mixamo bone orientation fallback
          applyGenericRotation(
            bones.leftUpLeg,
            pose.leftThighPitch,
            0,
            pose.leftThighRoll,
          );
          applyGenericRotation(
            bones.rightUpLeg,
            pose.rightThighPitch,
            0,
            pose.rightThighRoll,
          );

          applyGenericRotation(bones.leftLeg, pose.leftKneePitch, 0, 0);
          applyGenericRotation(bones.rightLeg, pose.rightKneePitch, 0, 0);

          applyGenericRotation(bones.leftFoot, pose.leftAnklePitch, 0, 0);
          applyGenericRotation(bones.rightFoot, pose.rightAnklePitch, 0, 0);

          applyGenericRotation(
            bones.leftArm,
            pose.leftArmPitch,
            pose.leftArmYaw,
            pose.leftArmRoll,
          );
          applyGenericRotation(
            bones.rightArm,
            pose.rightArmPitch,
            pose.rightArmYaw,
            pose.rightArmRoll,
          );

          applyGenericRotation(bones.leftForeArm, pose.leftForearmPitch, 0, 0);
          applyGenericRotation(bones.rightForeArm, pose.rightForearmPitch, 0, 0);

          applyGenericRotation(
            bones.spine,
            pose.spinePitch,
            pose.spineYaw,
            pose.spineRoll,
          );
        }
      } else {
        // Fallback procedural animation
        const stride = gaitState.blend * Math.sin(gaitState.phase) * 0.45;
        fallback.animate(stride, isAirborne || jumpHeight > 0.08);
      }
    },
    dispose() {
      root.traverse((node) => {
        if ((node as T.Mesh).isMesh) {
          const mesh = node as T.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m?.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
      root.clear();
    },
  };

  // Modern Three.js GLTFLoader boilerplate with DRACOLoader support
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(assetUrl("/draco/"));
  loader.setDRACOLoader(dracoLoader);

  loader.load(
    modelUrl,
    (gltf) => {
      const model = gltf.scene;

      // Enable shadows and configure sRGB color space
      configureMeshes(model);

      // Rotate model 180 degrees so the astronaut faces forward away from the camera
      // (into the scene) rather than facing towards the player's screen
      model.rotation.y = Math.PI;
      model.updateMatrixWorld(true);

      // Scale to human EVA suit height (~1.92m)
      const bbox = new T.Box3().setFromObject(model);
      const size = bbox.getSize(new T.Vector3());
      if (size.y > 0.01) {
        const scale = 1.92 / size.y;
        model.scale.multiplyScalar(scale);
      }

      model.updateMatrixWorld(true);
      const scaledBox = new T.Box3().setFromObject(model);
      const scaledCenter = scaledBox.getCenter(new T.Vector3());

      // Center horizontally on origin and place boot soles at y = 0
      model.position.x -= scaledCenter.x;
      model.position.z -= scaledCenter.z;
      model.position.y -= scaledBox.min.y;
      baseModelX = model.position.x;
      baseModelY = model.position.y;
      modelRef = model;

      // Search and resolve internal bone structures
      const resolved = resolveBones(model);
      const boneCount = Object.keys(resolved).length;

      // Swap out fallback mesh and insert rigged gltf model
      root.remove(fallback.root);
      root.add(model);

      bones = resolved;
      handle.isModelLoaded = true;
      handle.modelType = "rigged-gltf";

      console.info(
        `[RiggedAstronaut] Loaded "${modelUrl}" successfully with ${boneCount} matched bones. Rig: ${/leg_?1/i.test(bones.leftUpLeg?.bone.name || "") ? "astro_bones" : "humanoid"}`,
      );
      onLoaded?.();
    },
    undefined,
    (err) => {
      console.warn(
        `[RiggedAstronaut] Model "${modelUrl}" not found or failed to load (${(err as Error)?.message || "File not found"}). Using procedural Mars astronaut.`,
      );
    },
  );

  return handle;
}
