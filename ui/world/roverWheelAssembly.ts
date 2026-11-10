import * as T from "three";
import { ROVER_WHEEL_OFFSETS, ROVER_WHEEL_OUTER_RADIUS } from "../../game/roverVehicle.ts";

export type RoverWheelAssembly = {
  pivot: T.Object3D;
  steering: T.Object3D;
  wheelMesh: T.Object3D;
  baseX: number;
  baseY: number;
  baseZ: number;
  suspensionOffset: number;
  isFront: boolean;
  isLeft: boolean;
};

/** Bind the offline-prepared rig without scanning or copying CAD vertices in play. */
export function bindPreparedRover(root: T.Object3D) {
  const chassisMesh = root.getObjectByName("MMSEV_Chassis");
  if (!(chassisMesh instanceof T.Mesh)) return null;
  const wheels: RoverWheelAssembly[] = [];
  for (let k = 0; k < ROVER_WHEEL_OFFSETS.length; k++) {
    const pivot = root.getObjectByName(`suspension-${k}`);
    const steering = root.getObjectByName(`steering-${k}`);
    const wheelMesh = root.getObjectByName(`tire-${k}`);
    const upright = root.getObjectByName(`upright-${k}`);
    if (!pivot || !steering || !wheelMesh || !upright
      || wheelMesh.parent !== steering || steering.parent !== pivot || upright.parent !== pivot) return null;
    wheels.push({ pivot, steering, wheelMesh, baseX: pivot.position.x, baseY: pivot.position.y,
      baseZ: pivot.position.z, suspensionOffset: 0, isFront: k < 2, isLeft: k % 2 === 0 });
  }
  return { chassisMesh, wheels };
}

/**
 * Builds a sub-geometry from selected triangle index lists, remapping vertices
 * to maintain clean buffers and proper UV/normal attributes.
 */
function buildSubGeometry(
  origGeom: T.BufferGeometry,
  triIndices: number[],
  centerOffset?: { x: number; y: number; z: number },
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

/** Keep connected CAD parts whole, including vertices split at UV/normal seams. */
export function partitionRoverMesh(mesh: T.Mesh) {
  const geometry = mesh.geometry;
  const positions = geometry.attributes.position;
  const indices = geometry.index;
  if (!positions || !indices) return null;
  const parents = Array.from({ length: positions.count }, (_, i) => i);
  function find(i: number): number {
    while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; }
    return i;
  }
  function join(a: number, b: number) { parents[find(b)] = find(a); }
  const welded = new Map<string, number>();
  for (let i = 0; i < positions.count; i++) {
    const key = [positions.getX(i), positions.getY(i), positions.getZ(i)]
      .map(value => Math.round(value * 10000)).join(",");
    const other = welded.get(key);
    if (other === undefined) welded.set(key, i);
    else join(i, other);
  }
  for (let i = 0; i < indices.count; i += 3) {
    join(indices.getX(i), indices.getX(i + 1));
    join(indices.getX(i), indices.getX(i + 2));
  }
  const bounds = new Map<number, T.Box3>();
  const point = new T.Vector3();
  for (let i = 0; i < positions.count; i++) {
    const id = find(i);
    if (!bounds.has(id)) bounds.set(id, new T.Box3());
    bounds.get(id)!.expandByPoint(point.fromBufferAttribute(positions, i));
  }
  const assignments = new Map<number, number>();
  for (const [id, box] of bounds) {
    let part = 0;
    for (let k = 0; k < ROVER_WHEEL_OFFSETS.length; k++) {
      const [x, z] = ROVER_WHEEL_OFFSETS[k];
      const sameSide = x < 0 ? box.max.x < -1.14 : box.min.x > 1.14;
      if (!sameSide || box.min.z < z - .34 || box.max.z > z + .34) continue;
      // Measured tire envelope is Y=0..0.6412. The upper pod starts at 0.6412.
      if (box.min.y >= -.002 && box.max.y < .643) part = k + 1;
      else if (box.min.y >= .24 && box.max.y < 1.19) part = k + 7;
      break;
    }
    assignments.set(id, part);
  }
  const triangles: number[][] = Array.from({ length: 13 }, () => []);
  for (let i = 0; i < indices.count; i += 3) {
    const a = indices.getX(i);
    triangles[assignments.get(find(a)) ?? 0].push(a, indices.getX(i + 1), indices.getX(i + 2));
  }
  if (triangles.some(part => part.length === 0)) return null;
  function partMesh(part: number, center?: T.Vector3) {
    const result = new T.Mesh(buildSubGeometry(geometry, triangles[part], center), mesh.material);
    result.castShadow = result.receiveShadow = true;
    return result;
  }
  const chassisMesh = partMesh(0);
  const wheels = ROVER_WHEEL_OFFSETS.map(([x, z], k): RoverWheelAssembly => {
    const center = new T.Vector3(x, ROVER_WHEEL_OUTER_RADIUS, z);
    const pivot = new T.Group(); pivot.name = `suspension-${k}`; pivot.position.copy(center);
    const steering = new T.Group(); steering.name = `steering-${k}`;
    const wheelMesh = partMesh(k + 1, center); wheelMesh.name = `tire-${k}`;
    const suspension = partMesh(k + 7, center); suspension.name = `upright-${k}`;
    steering.add(wheelMesh); pivot.add(steering, suspension);
    return { pivot, steering, wheelMesh, baseX: x, baseY: center.y, baseZ: z,
      suspensionOffset: 0, isFront: k < 2, isLeft: k % 2 === 0 };
  });
  return { chassisMesh, wheels };
}
