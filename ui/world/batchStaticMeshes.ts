import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Combine static hardware by material, keeping each station separately inspectable. */
export function batchStaticMeshes(owner: T.Group, excluded: ReadonlySet<T.Object3D>) {
  owner.updateWorldMatrix(true, true);
  const inverse = owner.matrixWorld.clone().invert();
  const batches = new Map<T.Material, T.Mesh[]>();
  function collect(object: T.Object3D) {
    if (excluded.has(object) || object instanceof T.InstancedMesh) return;
    if (object instanceof T.Mesh && !Array.isArray(object.material)) {
      const meshes = batches.get(object.material) ?? [];
      meshes.push(object); batches.set(object.material, meshes);
    }
    for (const child of object.children) collect(child);
  }
  for (const child of owner.children) collect(child);
  let savedCalls = 0;
  for (const [material, meshes] of batches) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map(mesh => {
      const source = mesh.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
      const geometry = source.index ? source.toNonIndexed() : source;
      if (geometry !== source) source.dispose();
      // Standard attributes make cylinders, tubes and boxes compatible.
      for (const name of Object.keys(geometry.attributes)) if (!["position", "normal", "uv"].includes(name)) geometry.deleteAttribute(name);
      if (!geometry.attributes.uv) geometry.setAttribute("uv", new T.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
      return geometry;
    });
    const geometry = mergeGeometries(geometries);
    for (const g of geometries) g.dispose();
    if (!geometry) continue;
    const combined = new T.Mesh(geometry, material);
    combined.castShadow = meshes.some(m => m.castShadow);
    combined.receiveShadow = meshes.some(m => m.receiveShadow);
    for (const mesh of meshes) { mesh.removeFromParent(); mesh.geometry.dispose(); }
    owner.add(combined); savedCalls += meshes.length - 1;
  }
  return savedCalls;
}
