import * as T from "three";
import type { StalkerEntity } from "../../game/marsStalkers.ts";

export type StalkerRendererHandle = {
  root: T.Group;
  update: (
    stalkers: readonly StalkerEntity[],
    activeBiome: "surface" | "cave",
    heightAt: (x: number, z: number) => number,
    timeSec: number,
  ) => void;
  dispose: () => void;
};

type StalkerRig = {
  group: T.Group;
  head: T.Group;
  leftArm: T.Mesh;
  rightArm: T.Mesh;
  aura: T.Mesh;
  eyeMat: T.MeshBasicMaterial;
};

/** Procedural sci-fi horror Martian Stalker shadow entities with glowing optical slits. */
export function createStalkerRenderer(): StalkerRendererHandle {
  const root = new T.Group();
  root.name = "MartianStalkers";

  const bodyMat = new T.MeshStandardMaterial({
    color: 0x090b10,
    roughness: 0.42,
    metalness: 0.45,
    emissive: 0x1a0408,
    emissiveIntensity: 0.45,
  });
  const limbGeo = new T.CapsuleGeometry(0.11, 0.95, 5, 10);
  const torsoGeo = new T.CapsuleGeometry(0.32, 0.9, 6, 12);
  const headGeo = new T.OctahedronGeometry(0.28, 1);
  const eyeGeo = new T.BoxGeometry(0.24, 0.055, 0.08);
  const auraGeo = new T.RingGeometry(0.45, 1.15, 24);
  auraGeo.rotateX(-Math.PI / 2);

  const rigs = new Map<string, StalkerRig>();

  function getOrCreateRig(id: string): StalkerRig {
    const existing = rigs.get(id);
    if (existing) return existing;

    const group = new T.Group();
    const eyeMat = new T.MeshBasicMaterial({ color: 0xff2e43 });

    const torso = new T.Mesh(torsoGeo, bodyMat);
    torso.position.y = 1.45;
    torso.scale.set(0.85, 1.15, 0.65);
    torso.castShadow = true;
    group.add(torso);

    // Hunched legs
    for (const side of [-1, 1]) {
      const leg = new T.Mesh(limbGeo, bodyMat);
      leg.position.set(side * 0.22, 0.58, 0);
      leg.castShadow = true;
      group.add(leg);
    }

    const leftArm = new T.Mesh(limbGeo, bodyMat);
    leftArm.position.set(-0.42, 1.55, -0.18);
    leftArm.rotation.x = -0.55;
    leftArm.scale.set(0.85, 1.25, 0.85);
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new T.Mesh(limbGeo, bodyMat);
    rightArm.position.set(0.42, 1.55, -0.18);
    rightArm.rotation.x = -0.55;
    rightArm.scale.set(0.85, 1.25, 0.85);
    rightArm.castShadow = true;
    group.add(rightArm);

    const head = new T.Group();
    head.position.set(0, 2.28, -0.1);
    const skull = new T.Mesh(headGeo, bodyMat);
    skull.scale.set(0.82, 1.25, 1.05);
    const eyes = new T.Mesh(eyeGeo, eyeMat);
    eyes.position.set(0, 0.04, -0.24);
    head.add(skull, eyes);
    group.add(head);

    const auraMat = new T.MeshBasicMaterial({
      color: 0xff1e38,
      transparent: true,
      opacity: 0.25,
      side: T.DoubleSide,
      depthWrite: false,
    });
    const aura = new T.Mesh(auraGeo, auraMat);
    aura.position.y = 0.04;
    group.add(aura);

    root.add(group);
    const rig: StalkerRig = { group, head, leftArm, rightArm, aura, eyeMat };
    rigs.set(id, rig);
    return rig;
  }

  return {
    root,
    update(stalkers, activeBiome, heightAt, timeSec) {
      const seen = new Set<string>();
      for (const s of stalkers) {
        seen.add(s.id);
        const rig = getOrCreateRig(s.id);
        const visible = s.biome === activeBiome && s.state !== "dormant";
        rig.group.visible = visible;
        if (!visible) continue;

        const gy = heightAt(s.x, s.z);
        const hoverBob = Math.sin(timeSec * 4.5 + s.phaseOffset) * 0.08;
        rig.group.position.set(s.x, gy + hoverBob, s.z);
        rig.group.rotation.y = s.yaw;

        // Twitchy sci-fi horror head & claw articulation
        rig.head.rotation.z = Math.sin(timeSec * 9.0 + s.phaseOffset) * (s.state === "approaching" ? 0.26 : 0.11);
        rig.leftArm.rotation.x = -0.55 + Math.sin(timeSec * 5.2 + s.phaseOffset) * 0.25;
        rig.rightArm.rotation.x = -0.55 - Math.sin(timeSec * 5.2 + s.phaseOffset) * 0.25;

        if (s.state === "repelled") {
          rig.eyeMat.color.setHex(0x38bdf8);
          (rig.aura.material as T.MeshBasicMaterial).color.setHex(0x38bdf8);
        } else if (s.state === "approaching") {
          rig.eyeMat.color.setHex(0xff1e38);
          (rig.aura.material as T.MeshBasicMaterial).color.setHex(0xff1e38);
        } else {
          rig.eyeMat.color.setHex(0xf97316);
          (rig.aura.material as T.MeshBasicMaterial).color.setHex(0xf97316);
        }
        rig.aura.rotation.z = timeSec * 1.4;
      }

      for (const [id, rig] of rigs) {
        if (!seen.has(id)) {
          rig.group.visible = false;
        }
      }
    },
    dispose() {
      bodyMat.dispose();
      limbGeo.dispose();
      torsoGeo.dispose();
      headGeo.dispose();
      eyeGeo.dispose();
      auraGeo.dispose();
      for (const rig of rigs.values()) {
        rig.eyeMat.dispose();
        (rig.aura.material as T.Material).dispose();
      }
      rigs.clear();
    },
  };
}

