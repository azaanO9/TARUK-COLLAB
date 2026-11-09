import * as T from "three";

/** Original, replaceable companion model. It has no gameplay or collision logic. */
export function createSageCompanion() {
  const sage = new T.Group();
  const shell = new T.MeshStandardMaterial({ color: 0xe3ded1, roughness: 0.6, metalness: 0.2 });
  const joints = new T.MeshStandardMaterial({ color: 0x333e43, roughness: 0.55, metalness: 0.4 });
  const copper = new T.MeshStandardMaterial({ color: 0xd28146, roughness: 0.55, metalness: 0.3 });
  const screen = new T.MeshStandardMaterial({ color: 0x173e47, emissive: 0x1c6871, emissiveIntensity: 0.6, metalness: 0.45, roughness: 0.25 });
  const eye = new T.MeshBasicMaterial({ color: 0xbaf6ef });
  const add = (geo: T.BufferGeometry, mat: T.Material, x: number, y: number, z: number) => {
    const mesh = new T.Mesh(geo, mat); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; sage.add(mesh); return mesh;
  };
  add(new T.CapsuleGeometry(0.38, 0.32, 6, 16), shell, 0, 0.72, 0).scale.z = 0.8;
  add(new T.BoxGeometry(0.55, 0.18, 0.53), copper, 0, 0.58, 0);
  add(new T.CylinderGeometry(0.1, 0.1, 0.28, 12), joints, 0, 1.13, 0);
  // A separate, unmistakable head with a framed, illuminated face.
  add(new T.SphereGeometry(0.34, 24, 16), shell, 0, 1.43, 0).scale.set(1.08, 0.92, 0.85);
  add(new T.SphereGeometry(0.285, 24, 16), screen, 0, 1.43, -0.18).scale.set(1, 0.68, 0.42);
  add(new T.SphereGeometry(0.04, 12, 8), eye, -0.11, 1.45, -0.294);
  add(new T.SphereGeometry(0.04, 12, 8), eye, 0.11, 1.45, -0.294);
  const antenna = add(new T.CylinderGeometry(0.025, 0.025, 0.28, 8), joints, 0.21, 1.79, 0); antenna.rotation.z = -0.25;
  add(new T.SphereGeometry(0.065, 12, 8), copper, 0.245, 1.94, 0);
  for (const x of [-0.39, 0.39]) { const wheel = add(new T.CylinderGeometry(0.19, 0.19, 0.12, 18), joints, x, 0.26, 0); wheel.rotation.z = Math.PI / 2; }
  return sage;
}
