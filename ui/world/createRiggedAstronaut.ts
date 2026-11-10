import * as T from "three";
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
  ) => void;
  dispose: () => void;
};

/**
 * Multi-rig fuzzy bone search patterns.
 * Supports Mixamo rigs, glTF humanoid convention, Blender Rigify, and 3ds Max Biped.
 */
const BONE_PATTERNS: Record<keyof AstronautBones, RegExp[]> = {
  hips: [
    /master/i,
    /hip_joint/i,
    /mixamorig:?hips/i,
    /hips/i,
    /pelvis/i,
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
    /leg_1\.l/i,
    /mixamorig:?leftupleg/i,
    /left.*(up.*leg|thigh)/i,
    /thigh[._]l/i,
    /l.*thigh/i,
    /bip00?1_l_thigh/i,
  ],
  rightUpLeg: [
    /leg_1\.r/i,
    /mixamorig:?rightupleg/i,
    /right.*(up.*leg|thigh)/i,
    /thigh[._]r/i,
    /r.*thigh/i,
    /bip00?1_r_thigh/i,
  ],
  leftLeg: [
    /leg_2\.l/i,
    /mixamorig:?leftleg/i,
    /left.*(leg|calf|knee|shin)/i,
    /shin[._]l/i,
    /l.*calf/i,
    /bip00?1_l_calf/i,
  ],
  rightLeg: [
    /leg_2\.r/i,
    /mixamorig:?rightleg/i,
    /right.*(leg|calf|knee|shin)/i,
    /shin[._]r/i,
    /r.*calf/i,
    /bip00?1_r_calf/i,
  ],
  leftFoot: [
    /foot\.l/i,
    /mixamorig:?leftfoot/i,
    /left.*(foot|ankle)/i,
    /foot[._]l/i,
    /l.*foot/i,
    /bip00?1_l_foot/i,
  ],
  rightFoot: [
    /foot\.r/i,
    /mixamorig:?rightfoot/i,
    /right.*(foot|ankle)/i,
    /foot[._]r/i,
    /r.*foot/i,
    /bip00?1_r_foot/i,
  ],
  leftArm: [
    /arm_1\.l/i,
    /mixamorig:?leftarm/i,
    /left.*(upper.*arm|arm|shoulder)/i,
    /upper_arm[._]l/i,
    /l.*upperarm/i,
    /bip00?1_l_upperarm/i,
  ],
  rightArm: [
    /arm_1\.r/i,
    /mixamorig:?rightarm/i,
    /right.*(upper.*arm|arm|shoulder)/i,
    /upper_arm[._]r/i,
    /r.*upperarm/i,
    /bip00?1_r_upperarm/i,
  ],
  leftForeArm: [
    /arm_2\.l/i,
    /mixamorig:?leftforearm/i,
    /left.*(forearm|elbow)/i,
    /forearm[._]l/i,
    /l.*forearm/i,
    /bip00?1_l_forearm/i,
  ],
  rightForeArm: [
    /arm_2\.r/i,
    /mixamorig:?rightforearm/i,
    /right.*(forearm|elbow)/i,
    /forearm[._]r/i,
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
 * Normalize model height and ground position so that:
 * 1. Model stands at realistic human EVA space suit height (~1.9m).
 * 2. Soles of the boots rest exactly at y = 0.
 * 3. Model is centered horizontally on the origin.
 */
function normalizeModelTransform(model: T.Object3D, targetHeight = 1.9): void {
  model.updateMatrixWorld(true);
  const bbox = new T.Box3().setFromObject(model);
  const size = bbox.getSize(new T.Vector3());
  const center = bbox.getCenter(new T.Vector3());

  if (size.y > 0.01) {
    const scale = targetHeight / size.y;
    model.scale.multiplyScalar(scale);
  }

  model.updateMatrixWorld(true);
  const scaledBox = new T.Box3().setFromObject(model);
  const scaledCenter = scaledBox.getCenter(new T.Vector3());

  // Center on X and Z, align boot soles to y = 0
  model.position.x -= scaledCenter.x;
  model.position.z -= scaledCenter.z;
  model.position.y -= scaledBox.min.y;
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

/**
 * Apply procedural Mars gait rotations to resolved bones safely,
 * compounding onto each bone's original rest-pose rotation.
 */
const _euler = new T.Euler();
const _deltaQuat = new T.Quaternion();
const _targetQuat = new T.Quaternion();

function applyBoneRotation(
  boneRec: BoneRecord | undefined,
  pitch: number,
  yaw: number,
  roll: number,
  dt: number,
  order: "YXZ" | "XYZ" = "YXZ",
): void {
  if (!boneRec) return;
  _euler.set(pitch, yaw, roll, order);
  _deltaQuat.setFromEuler(_euler);
  _targetQuat.copy(boneRec.restRotation).multiply(_deltaQuat);
  boneRec.bone.quaternion.slerp(_targetQuat, 1 - Math.exp(-22 * dt));
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
  modelUrl = "/models/astronaut.glb",
  onLoaded?: () => void,
): RiggedAstronautHandle {
  const root = new T.Group();
  let bones: AstronautBones = {};
  const gaitState: MarsGaitState = createMarsGaitState();

  // Initialize with procedural astronaut fallback immediately so the scene is never empty
  const fallback = createMarsAstronaut();
  root.add(fallback.root);

  const handle: RiggedAstronautHandle = {
    root,
    isModelLoaded: false,
    modelType: "procedural-fallback",
    update(dt: number, speed: number, isAirborne: boolean, jumpHeight: number) {
      const pose: MarsGaitPose = stepMarsGait(gaitState, speed, isAirborne, dt);

      if (handle.isModelLoaded && bones.hips) {
        // Procedural Mars Walking Engine targeting internal bone structures:
        // 1. Hips: vertical sinusoidal bounce + pelvic roll & yaw
        if (bones.hips) {
          bones.hips.bone.position.y =
            bones.hips.restPosition.y + pose.hipOffsetY;
          applyBoneRotation(
            bones.hips,
            pose.hipPitch,
            pose.hipYaw,
            pose.hipRoll,
            dt,
          );
        }

        // 2. Spine: counter-balance twist + idle breathing
        if (bones.spine) {
          applyBoneRotation(
            bones.spine,
            pose.spinePitch,
            pose.spineYaw,
            pose.spineRoll,
            dt,
          );
        }

        // 3. Legs: forward momentum reach, knee flexion, ankle dorsiflexion & plant
        applyBoneRotation(
          bones.leftUpLeg,
          pose.leftThighPitch,
          0,
          pose.leftThighRoll,
          dt,
        );
        applyBoneRotation(
          bones.rightUpLeg,
          pose.rightThighPitch,
          0,
          pose.rightThighRoll,
          dt,
        );

        applyBoneRotation(bones.leftLeg, pose.leftKneePitch, 0, 0, dt);
        applyBoneRotation(bones.rightLeg, pose.rightKneePitch, 0, 0, dt);

        applyBoneRotation(bones.leftFoot, pose.leftAnklePitch, 0, 0, dt);
        applyBoneRotation(bones.rightFoot, pose.rightAnklePitch, 0, 0, dt);

        // 4. Arms: space-suit lateral abduction & counter-balance swing
        applyBoneRotation(
          bones.leftArm,
          pose.leftArmPitch,
          pose.leftArmYaw,
          pose.leftArmRoll,
          dt,
        );
        applyBoneRotation(
          bones.rightArm,
          pose.rightArmPitch,
          pose.rightArmYaw,
          pose.rightArmRoll,
          dt,
        );

        applyBoneRotation(bones.leftForeArm, pose.leftForearmPitch, 0, 0, dt);
        applyBoneRotation(bones.rightForeArm, pose.rightForearmPitch, 0, 0, dt);
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
  dracoLoader.setDecoderPath("/draco/");
  loader.setDRACOLoader(dracoLoader);

  // Attempt to load the model
  loader.load(
    modelUrl,
    (gltf) => {
      const model = gltf.scene;

      // Enable shadows and configure sRGB color space
      configureMeshes(model);

      // Scale to human height and ground soles at y = 0
      normalizeModelTransform(model, 1.92);

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
        `[RiggedAstronaut] Loaded "${modelUrl}" successfully with ${boneCount} matched bones.`,
      );
      onLoaded?.();
    },
    undefined,
    (err) => {
      // If /models/astronaut.glb does not exist yet, log clear instructions and continue using fallback
      console.warn(
        `[RiggedAstronaut] Model "${modelUrl}" not found or failed to load (${(err as Error)?.message || "File not found"}). Using procedural Mars astronaut. To use the Sketchfab model, download the GLB from https://sketchfab.com/3d-models/astronaut-rigged-and-animated-f45039084a674080b42f5e171fd4f04c and save it to public/models/astronaut.glb`,
      );
    },
  );

  return handle;
}

