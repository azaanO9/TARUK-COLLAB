import * as T from "three";

export type DropPodIntroHandle = {
  root: T.Group;
  isActive: () => boolean;
  skip: () => void;
  start: () => void;
  /** Returns progress 0..1 and updates drop-pod & cinematic camera. */
  update: (
    dt: number,
    camera: T.PerspectiveCamera,
    targetSpawn: { x: number; y: number; z: number },
  ) => { active: boolean; progress: number; altitudeMeters: number; speedMs: number };
  dispose: () => void;
};

/**
 * Cinematic Martian atmospheric entry drop-pod sequence (~6.0s), descending onto Outpost Alpha
 * landing zone with braking thruster plumes, dust ring, hatch opening, and seamless camera blend.
 */
export function createDropPodIntro(): DropPodIntroHandle {
  const root = new T.Group();
  root.name = "DropPodCinematic";
  root.visible = false;

  const hullMat = new T.MeshStandardMaterial({
    color: 0xd8d3c8,
    roughness: 0.45,
    metalness: 0.35,
  });
  const heatShieldMat = new T.MeshStandardMaterial({
    color: 0x2f2521,
    roughness: 0.88,
    metalness: 0.15,
  });
  const accentMat = new T.MeshStandardMaterial({
    color: 0xe6843c,
    roughness: 0.45,
  });
  const thrusterMat = new T.MeshBasicMaterial({
    color: 0xffaa44,
    transparent: true,
    opacity: 0.85,
  });

  // Capsule shell
  const capsule = new T.Group();
  const cone = new T.Mesh(new T.CylinderGeometry(0.85, 1.45, 2.2, 16), hullMat);
  cone.position.y = 1.4;
  cone.castShadow = true;
  capsule.add(cone);

  const shield = new T.Mesh(new T.CylinderGeometry(1.48, 1.25, 0.38, 16), heatShieldMat);
  shield.position.y = 0.25;
  capsule.add(shield);

  const stripe = new T.Mesh(new T.CylinderGeometry(1.12, 1.24, 0.28, 16), accentMat);
  stripe.position.y = 1.65;
  capsule.add(stripe);

  // Retro-thruster plumes
  const plumes: T.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const plume = new T.Mesh(new T.ConeGeometry(0.24, 2.2, 10), thrusterMat);
    plume.rotation.x = Math.PI;
    plume.position.set(Math.cos(a) * 1.15, -0.8, Math.sin(a) * 1.15);
    capsule.add(plume);
    plumes.push(plume);
  }

  // Landing shockwave dust ring
  const dustRingMat = new T.MeshBasicMaterial({
    color: 0xc97b4c,
    transparent: true,
    opacity: 0,
    side: T.DoubleSide,
    depthWrite: false,
  });
  const dustRing = new T.Mesh(new T.RingGeometry(1.1, 2.2, 32), dustRingMat);
  dustRing.rotation.x = -Math.PI / 2;
  dustRing.position.y = 0.08;

  root.add(capsule, dustRing);

  let elapsed = 0;
  let active = false;
  const DURATION = 5.6;

  return {
    root,
    isActive: () => active,
    start() {
      elapsed = 0;
      active = true;
      root.visible = true;
    },
    skip() {
      active = false;
      root.visible = false;
    },
    update(dt, camera, targetSpawn) {
      if (!active) return { active: false, progress: 1, altitudeMeters: 0, speedMs: 0 };
      elapsed += Math.min(dt, 0.05);
      const t = Math.min(1, elapsed / DURATION);

      // Phase 1 (0..0.72): atmospheric descent from 52m -> 0m with retro deceleration
      const descentT = Math.min(1, t / 0.72);
      const easeOut = 1 - Math.pow(1 - descentT, 3);
      const altitude = (1 - easeOut) * 52;
      const speedMs = Math.round((1 - descentT) * 48);

      root.position.set(targetSpawn.x - 3.8, targetSpawn.y, targetSpawn.z - 2.5);
      capsule.position.set(0, altitude, 0);
      capsule.rotation.z = Math.sin(elapsed * 4.5) * 0.04 * (1 - descentT);
      capsule.rotation.x = (1 - descentT) * 0.14;

      const thrusterActive = descentT > 0.15 && descentT < 0.99;
      for (const p of plumes) {
        p.visible = thrusterActive;
        if (thrusterActive) {
          p.scale.set(1, 0.7 + Math.sin(elapsed * 32) * 0.35, 1);
        }
      }

      if (descentT > 0.85) {
        const ringT = Math.min(1, (t - 0.61) / 0.32);
        const sc = 1 + ringT * 5.2;
        dustRing.scale.set(sc, sc, 1);
        dustRingMat.opacity = (1 - ringT) * 0.65;
      } else {
        dustRingMat.opacity = 0;
      }

      // Camera sweeps from orbital high descent track smoothly down behind astronaut shoulder
      const desiredEndPos = new T.Vector3(targetSpawn.x, targetSpawn.y + 3.0, targetSpawn.z + 5.2);
      const camOffset = new T.Vector3(
        -9.5 * (1 - t) + 0,
        altitude + 6.5 * (1 - t) + 2.8,
        12 * (1 - t) + 5.5,
      );
      const introCamPos = new T.Vector3(
        root.position.x + camOffset.x,
        root.position.y + camOffset.y,
        root.position.z + camOffset.z,
      );

      const handoff = t > 0.76 ? (t - 0.76) / 0.24 : 0;
      camera.position.lerpVectors(introCamPos, desiredEndPos, handoff * handoff * (3 - 2 * handoff));

      const lookPod = new T.Vector3(root.position.x, root.position.y + altitude + 1.2, root.position.z);
      const lookPlayer = new T.Vector3(targetSpawn.x, targetSpawn.y + 1.45, targetSpawn.z);
      camera.lookAt(lookPod.lerp(lookPlayer, handoff));

      if (t >= 1) {
        active = false;
        // Keep stationary landed drop pod visible on the crater pad
        capsule.position.set(0, 0, 0);
        for (const p of plumes) p.visible = false;
        dustRingMat.opacity = 0;
      }

      return { active, progress: t, altitudeMeters: Math.round(altitude), speedMs };
    },
    dispose() {
      root.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry?.dispose();
          if (!Array.isArray(o.material)) o.material?.dispose();
        }
      });
    },
  };
}

