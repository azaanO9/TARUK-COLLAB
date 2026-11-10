// Offline: node scripts/measure-rover-windows.mjs <rover-optimizer tools directory>
// Uses the same pinned glTF tools documented in prepare-rover.mjs.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
const requireTools = createRequire(path.resolve(process.argv[2], 'package.json'));
const { NodeIO } = requireTools('@gltf-transform/core');
const { ALL_EXTENSIONS } = requireTools('@gltf-transform/extensions');
const draco = requireTools('draco3dgltf');
const source = 'public/models/space-exploration-vehicle-ready.glb';
// Component IDs below belong to this asset. Fail explicitly if it is replaced.
const hash = createHash('sha256').update(await fs.readFile(source)).digest('hex');
if (hash !== 'c264d65b7b0f789d07de24d2903150e487ce81a1053b1177b7065c9f5660b62d') throw new Error('Remeasure glazing components for the changed rover asset.');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder': await draco.createDecoderModule()});
const doc = await io.read(source);
const primitive = doc.getRoot().listMeshes().find(m => m.getName() === 'MMSEV_Chassis').listPrimitives()[0];
const a = primitive.getAttribute('POSITION').getArray(), indices = primitive.getIndices().getArray();
const parents = Array.from({length:a.length / 3}, (_, i) => i);
function find(i) { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; } return i; }
function join(a,b) { parents[find(b)] = find(a); }
const welded = new Map();
for (let i = 0; i < parents.length; i++) {
  const key = Array.from(a.slice(i * 3, i * 3 + 3)).map(v => Math.round(v * 10000)).join(',');
  if (welded.has(key)) join(i, welded.get(key)); else welded.set(key,i);
}
for (let i = 0; i < indices.length; i += 3) { join(indices[i],indices[i+1]); join(indices[i],indices[i+2]); }
const components = new Map();
for (let i = 0; i < parents.length; i++) {
  const id = find(i); if (!components.has(id)) components.set(id,[]);
  components.get(id).push(Array.from(a.slice(i * 3,i * 3 + 3)));
}
// Upper left/right, outboard left/right, lower left/right, lower centre glazing.
const ids = [14912,15626,15119,15824,15320,16030,16240];
const cross = (o,a,b) => (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
const panes = ids.map(id => {
  const points = components.get(id).sort((a,b) => a[0]-b[0] || a[1]-b[1]);
  const lower = [], upper = [];
  for (const p of points) { while (lower.length >= 2 && cross(lower.at(-2),lower.at(-1),p) <= 0) lower.pop(); lower.push(p); }
  for (const p of [...points].reverse()) { while (upper.length >= 2 && cross(upper.at(-2),upper.at(-1),p) <= 0) upper.pop(); upper.push(p); }
  lower.pop(); upper.pop();
  // XY convex hull preserves the rounded outline. A least-squares glazing plane
  // removes alternating front/back bevel depths from the cosmetic interior seal.
  const rows = points.map(p => [p[0],p[1],1]);
  const m = Array.from({length:3}, (_,i) => [...Array.from({length:3}, (_,j) => rows.reduce((s,r) => s+r[i]*r[j],0)),rows.reduce((s,r,k) => s+r[i]*points[k][2],0)]);
  for (let i = 0; i < 3; i++) {
    const d = m[i][i]; for (let j = i; j < 4; j++) m[i][j] /= d;
    for (let k = 0; k < 3; k++) if (k !== i) { const f = m[k][i]; for (let j = i; j < 4; j++) m[k][j] -= f*m[i][j]; }
  }
  return lower.concat(upper).map(p => [p[0],p[1],m[0][3]*p[0]+m[1][3]*p[1]+m[2][3]].map(v => +v.toFixed(5)));
});
const text = '// Front glazing contours measured from the prepared NASA MMSEV asset.\n// Rover-local metres. XY hulls retain curved corners; Z fits each glazing plane.\n// Generated offline; see scripts/measure-rover-windows.mjs.\nexport const ROVER_WINDOW_CONTOURS: number[][][] = [\n'+panes.map(p => '  [\n'+p.map(row => '    '+JSON.stringify(row)).join(',\n')+'\n  ]').join(',\n')+'\n];\n';
await fs.writeFile('ui/world/roverWindowContours.ts',text);
console.log('Measured seven glazing contours:', panes.map(p => p.length));
