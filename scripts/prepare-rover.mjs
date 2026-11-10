// Offline only. npm install --prefix <tools> @gltf-transform/core@4.2.1
// @gltf-transform/extensions@4.2.1 @gltf-transform/functions@4.2.1 draco3dgltf@1.5.7
// node scripts/prepare-rover.mjs <tools>
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs/promises";
import * as T from "three";
import { partitionRoverMesh } from "../ui/world/roverWheelAssembly.ts";
const requireTools = createRequire(path.resolve(process.argv[2], "package.json"));
const { NodeIO } = requireTools("@gltf-transform/core");
const { ALL_EXTENSIONS } = requireTools("@gltf-transform/extensions");
const { prune, draco } = requireTools("@gltf-transform/functions");
const dracoModule = requireTools("draco3dgltf");
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "draco3d.decoder": await dracoModule.createDecoderModule(),
  "draco3d.encoder": await dracoModule.createEncoderModule(),
});
const source = "public/models/space-exploration-vehicle.glb";
const output = "public/models/space-exploration-vehicle-ready.glb";
const doc = await io.read(source);
const primitive = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const material = primitive.getMaterial();
const geometry = new T.BufferGeometry();
for (const [semantic, name] of [["POSITION", "position"], ["NORMAL", "normal"], ["TEXCOORD_0", "uv"]]) {
  const accessor = primitive.getAttribute(semantic);
  geometry.setAttribute(name, new T.BufferAttribute(accessor.getArray().slice(), accessor.getElementSize()));
}
geometry.setIndex(new T.BufferAttribute(primitive.getIndices().getArray().slice(), 1));
const scale = 4.95 / 5.91002;
geometry.applyMatrix4(new T.Matrix4().set(scale,0,0,0, 0,0,-scale,2.24213*scale, 0,-scale,0,-.39988*scale, 0,0,0,1));
for (let i = 0; i < geometry.index.count; i += 3) {
  const b = geometry.index.getX(i+1);
  geometry.index.setX(i+1,geometry.index.getX(i+2)); geometry.index.setX(i+2,b);
}
geometry.computeVertexNormals();
const rig = partitionRoverMesh(new T.Mesh(geometry));
if (!rig) throw new Error("NASA rover partition failed; source not modified.");
rig.chassisMesh.name = "MMSEV_Chassis";
const root = new T.Group(); root.name = "MMSEV_Preassembled";
root.add(rig.chassisMesh, ...rig.wheels.map(w => w.pivot));
const sourceTriangles = geometry.index.count / 3;
const buffer = doc.getRoot().listBuffers()[0];
const oldNodes = doc.getRoot().listNodes();
const oldMeshes = doc.getRoot().listMeshes();
const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
function exportNode(object) {
  const node = doc.createNode(object.name).setTranslation(object.position.toArray());
  if (object.isMesh) {
    const p = doc.createPrimitive().setMaterial(material);
    for (const [semantic, name] of [["POSITION","position"],["NORMAL","normal"],["TEXCOORD_0","uv"]]) {
      const attribute = object.geometry.attributes[name];
      p.setAttribute(semantic, doc.createAccessor().setType(attribute.itemSize === 2 ? "VEC2" : "VEC3").setArray(attribute.array).setBuffer(buffer));
    }
    p.setIndices(doc.createAccessor().setType("SCALAR").setArray(object.geometry.index.array).setBuffer(buffer));
    node.setMesh(doc.createMesh(object.name).addPrimitive(p));
  }
  object.children.forEach(child => node.addChild(exportNode(child)));
  return node;
}
scene.addChild(exportNode(root));
oldNodes.forEach(node => node.dispose()); oldMeshes.forEach(mesh => mesh.dispose());
await doc.transform(prune(), draco({ method: "sequential", quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14 }));
await io.write(output,doc);
// Read the written asset back to validate topology and independent wheel rig.
const check = await io.read(output);
const triangles = check.getRoot().listMeshes().reduce((sum, mesh) => sum+mesh.listPrimitives()[0].getIndices().getCount()/3,0);
if (triangles !== sourceTriangles || check.getRoot().listMeshes().length !== 13) throw new Error("Prepared rover lost geometry");
console.log(JSON.stringify({sourceBytes:(await fs.stat(source)).size,outputBytes:(await fs.stat(output)).size,triangles,meshes:13}));

