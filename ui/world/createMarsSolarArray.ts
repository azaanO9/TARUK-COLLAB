import * as T from "three";
import { colonyBuilder, type ColonyMaterials } from "./colonyMaterials";

/** Long photovoltaic tables inspired by the supplied Mars One reference. */
export function createMarsSolarArray(parent: T.Group, materials: ColonyMaterials): T.Mesh[] {
  const b = colonyBuilder(materials);
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#59656b"; ctx.fillRect(0, 0, 512, 1024);
  // Fine conductors belong to the surface texture, not hundreds of draw calls.
  for (let row = 0; row < 16; row++) for (let col = 0; col < 6; col++) {
    const x = 5 + col * 84, y = 5 + row * 64;
    const shade = (row * 7 + col * 3) % 5;
    ctx.fillStyle = `rgb(${17 + shade},${25 + shade},${34 + shade * 2})`;
    ctx.fillRect(x, y, 80, 60);
    ctx.fillStyle = "rgba(157,174,181,.25)";
    for (let line = 5; line < 60; line += 6) ctx.fillRect(x, y + line, 80, 1);
    ctx.fillStyle = "#64737b";
    for (const bus of [25, 54]) ctx.fillRect(x + bus, y, 1.4, 60);
  }
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  const cells = new T.MeshStandardMaterial({ map, color: 0xffffff, roughness: .38, metalness: .32 });
  const panels: T.Mesh[] = [];
  const tilt = T.MathUtils.degToRad(32), height = 1.65;
  const supportY = (z: number) => height - Math.sin(tilt) * z;
  const supportZ = (z: number) => Math.cos(tilt) * z;
  for (const x of [-2.05, 0, 2.05]) {
    const table = new T.Group(); table.name = "tilted-solar-table";
    table.position.set(x, height, 0); table.rotation.x = tilt; parent.add(table);
    b.box(table, 1.78, .1, 4.3, 0, 0, 0, materials.graphite, false);
    for (const z of [-1.075, 1.075]) {
      const face = b.add(table, new T.PlaneGeometry(1.65, 2.04), cells, 0, .057, z);
      face.rotation.x = -Math.PI / 2; face.name = "photovoltaic-cells"; panels.push(face);
    }
    for (const edge of [-.89, .89]) b.box(table, .045, .12, 4.35, edge, .015, 0, materials.alloy, false);
    for (const z of [-2.15, 0, 2.15]) b.box(table, 1.8, .12, .045, 0, .015, z, materials.alloy, false);
    // Four legs meet the inclined underside exactly; diagonal struts resist side loads.
    for (const side of [-.63, .63]) {
      for (const z of [-1.55, 1.55]) {
        const y = supportY(z) - .08, groundZ = supportZ(z);
        b.box(parent, .11, y, .11, x + side, y / 2, groundZ, materials.alloy, false);
        b.box(parent, .42, .1, .46, x + side, .05, groundZ, materials.graphite, false);
        b.pipe(parent, [[x + side, .16, groundZ], [x + side, supportY(-z) - .11, -groundZ]], .033, materials.alloy);
        for (const bolt of [-.13, .13]) b.cylinder(parent, .035, .05, x + side + bolt, .12, groundZ, materials.alloy);
      }
    }
    b.box(table, .38, .14, .3, 0, -.14, -.5, materials.graphite);
    b.pipe(parent, [[x, height - .1, 0], [x, .5, -.5], [x, .1, -1.95], [0, .1, -2.25]], .025, materials.graphite);
  }
  return panels;
}
