import * as T from "three";

/** Original mission hardware, built locally without external model requests. */
export function dressMarsOutpost(root: T.Group, targets: T.Group[]) {
  const alloy = new T.MeshStandardMaterial({ color: 0xa7a59a, metalness: .65, roughness: .38 });
  const graphite = new T.MeshStandardMaterial({ color: 0x252a2c, metalness: .35, roughness: .7 });
  const amber = new T.MeshStandardMaterial({ color: 0xd37a3c, roughness: .65 });
  const glow = new T.MeshStandardMaterial({ color: 0xc9f3e6, emissive: 0x83d8b8, emissiveIntensity: 2 });
  function box(parent: T.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, mat: T.Material) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  function tube(parent: T.Object3D, points: T.Vector3[], radius: number, mat: T.Material) {
    const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 28, radius, 6, false), mat); m.castShadow = true; parent.add(m);
  }
  function label(parent: T.Object3D, text: string, x: number, y: number, z: number, width = 2) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 128; const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#202a2b"; ctx.fillRect(0, 0, 512, 128); ctx.fillStyle = "#e9ded0";
    ctx.font = "bold 46px monospace"; ctx.textAlign = "center"; ctx.fillText(text, 256, 78);
    const texture = new T.CanvasTexture(c); texture.colorSpace = T.SRGBColorSpace;
    const m = new T.Mesh(new T.PlaneGeometry(width, width / 4), new T.MeshStandardMaterial({ map: texture, roughness: .8 })); m.position.set(x, y, z); parent.add(m);
  }
  label(root, "TARUKH / 01", -2, 4.05, -25.7, 3.4);
  // Habitat pressure ribs, insulated wall panels and servicing connections.
  for (let i = 0; i < 9; i++) {
    box(root, -2, 4.85, -33.8 + i * .95, 9.2, .1, .09, alloy);
    box(root, -6.55, 2.5, -33.8 + i * .95, .12, 4.25, .09, alloy);
    box(root, 2.55, 2.5, -33.8 + i * .95, .12, 4.25, .09, alloy);
  }
  for (const x of [-5.3, 1.3]) {
    box(root, x, .8, -24.3, .12, 1.5, 2.5, alloy);
    const light = new T.PointLight(0xa7e8df, 6, 8, 2); light.position.set(x, 3.6, -24.8); root.add(light);
  }
  for (let i = 0; i < 4; i++) box(root, -2, .12 + i * .12, -23.2 - i * .55, 2.4, .24, .6, graphite);
  for (const x of [-7, 3]) {
    box(root, x, 1.2, -30, .8, 2.4, 4, graphite);
    for (let i = 0; i < 13; i++) box(root, x, .3 + i * .14, -27.96, .72, .035, .08, alloy);
  }
  for (const [x, z] of [[-9, 3], [8, 7], [-15, -6], [12, -22], [-6, -22]]) {
    box(root, x, .6, z, .08, 1.2, .08, graphite); box(root, x, 1.2, z, .32, .1, .16, glow);
    box(root, x, .06, z, .5, .12, .5, alloy);
  }
  for (const g of targets) {
    const id = g.userData.station as string;
    if (id === "rover") {
      label(g, "ROVER BAY · R-01", 0, 0.25, 2.7, 1.2);
      box(g, 2.1, 2.1, -1.5, 0.35, 0.08, 0.35, alloy);
      tube(g, [new T.Vector3(2.1, 1.2, -1.5), new T.Vector3(1.6, 0.35, -1.0)], 0.045, graphite);
      box(g, 2.1, 1.35, -1.33, 0.22, 0.16, 0.04, glow);
    } else if (id === "oxygen" || id === "water") {
      for (const x of [-.62, .62]) {
        tube(g, [new T.Vector3(x, 2.95, 0), new T.Vector3(x, 3.3, .3), new T.Vector3(0, 2.7, .65), new T.Vector3(0, .25, 1)], .045, graphite);
        label(g, id === "oxygen" ? "O2" : "H2O", x, 1.7, .505, .53);
        for (const y of [.6, 2.3]) box(g, x, y, 0, 1.05, .08, 1.04, alloy);
        const gauge = new T.Mesh(new T.CylinderGeometry(.17, .17, .07, 24), alloy);
        gauge.rotation.x = Math.PI / 2; gauge.position.set(x, 2.35, .55); g.add(gauge);
        const face = new T.Mesh(new T.CircleGeometry(.13, 24), glow); face.position.set(x, 2.35, .59); g.add(face);
        box(g, x, 3.12, 0, .32, .06, .1, amber);
      }
    } else if (id === "relay") {
      for (const x of [-.9, .9]) {
        tube(g, [new T.Vector3(x * 2, .1, x), new T.Vector3(x * .2, 5.8, 0)], .055, alloy);
        box(g, x, .2, .7, .8, .35, .5, graphite);
      }
      for (let i = 0; i < 7; i++) box(g, 0, .6 + i * .7, 0, 1.5 - i * .15, .045, .045, alloy);
      label(g, "COMMS / 01", 0, 1.1, .57, 1.3);
    } else if (id === "food" || id === "cache") {
      for (const x of [-1.25, 1.25]) box(g, x, 1.2, .82, .09, 2.2, .12, alloy);
      for (const y of [.4, 1.25, 2.1]) box(g, 0, y, .83, 2.5, .07, .12, alloy);
      label(g, "SUPPLIES", 0, 2.22, .91, 1.5);
      box(g, 1.05, 1.4, .93, .12, .45, .12, amber);
    } else if (id === "battery" || id === "research") {
      for (let i = 0; i < 9; i++) box(g, 0, .4 + i * .16, id === "research" ? 2.06 : -.58, 1.7, .04, .06, alloy);
    }
    // Riveted foundation feet and an identification plate on every station.
    for (const x of [-1.25, 1.25]) for (const z of [-.8, .8]) box(g, x, .04, z, .28, .08, .28, alloy);
  }
  tube(root, [new T.Vector3(-12, .08, -12), new T.Vector3(-16, .08, -17), new T.Vector3(-12, .08, -24), new T.Vector3(-6, .1, -27)], .065, graphite);
  tube(root, [new T.Vector3(11, .08, -8), new T.Vector3(14, .08, -18), new T.Vector3(5, .08, -25), new T.Vector3(2, .15, -27)], .08, amber);
}

export function createMarsAstronaut() {
  const root = new T.Group();
  const suit = new T.MeshStandardMaterial({ color: 0xdad3c0, roughness: .8 });
  const dark = new T.MeshStandardMaterial({ color: 0x303534, roughness: .75 });
  const orange = new T.MeshStandardMaterial({ color: 0xbe6036, roughness: .6 });
  const metal = new T.MeshStandardMaterial({ color: 0x9ca49e, metalness: .7, roughness: .35 });
  const visor = new T.MeshPhysicalMaterial({ color: 0x73502a, metalness: .85, roughness: .13, clearcoat: 1 });
  function part(parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material, x: number, y: number, z: number) {
    const m = new T.Mesh(geometry, material); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  const box = (p: T.Object3D, w: number, h: number, d: number, m: T.Material, x: number, y: number, z: number) => part(p, new T.BoxGeometry(w, h, d), m, x, y, z);
  part(root, new T.CapsuleGeometry(.29, .35, 8, 20), suit, 0, 1.15, 0).scale.z = .76;
  box(root, .6, .1, .43, dark, 0, .92, 0);
  box(root, .52, .58, .28, metal, 0, 1.24, .3);
  box(root, .48, .1, .3, orange, 0, 1.5, .3);
  // Backpack silhouette and illuminated life-support display, visible in third person.
  const status = new T.MeshStandardMaterial({color:0xbef9e4,emissive:0x54d4ba,emissiveIntensity:1.2});
  box(root, .34, .38, .035, dark, 0, 1.23, .46);
  box(root, .23, .22, .02, metal, 0, 1.25, .49);
  for(let i=0;i<3;i++) box(root, .14, .018, .012, status, 0, 1.19 + i*.05, .505);
  for(const x of [-.25,.25]) box(root, .06, .45, .08, orange, x, 1.23, .46);
  for (const x of [-.18, .18]) box(root, .055, .53, .03, dark, x, 1.2, -.23);
  box(root, .29, .22, .09, dark, 0, 1.24, -.27);
  for (let i = 0; i < 3; i++) box(root, .045, .025, .01, orange, -.08 + i * .08, 1.27, -.32);
  part(root, new T.CylinderGeometry(.17, .17, .1, 24), metal, 0, 1.57, 0);
  part(root, new T.SphereGeometry(.29, 32, 24), suit, 0, 1.82, 0);
  part(root, new T.SphereGeometry(.265, 32, 24), visor, 0, 1.83, -.07).scale.set(.96, .72, .94);
  for (const x of [-.29, .29]) part(root, new T.CylinderGeometry(.09, .09, .07, 16).rotateZ(Math.PI / 2), metal, x, 1.81, 0);
  const limbs: T.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group(); leg.position.set(side * .18, .88, 0); root.add(leg); limbs.push(leg);
    part(leg, new T.CapsuleGeometry(.135, .48, 6, 16), suit, 0, -.34, 0);
    part(leg, new T.SphereGeometry(.14, 16, 12), dark, 0, -.42, -.02).scale.y = .65;
    box(leg, .21, .16, .07, metal, 0, -.43, -.12);
    box(leg, .29, .18, .41, dark, 0, -.76, -.08);
    box(leg, .3, .045, .43, metal, 0, -.84, -.08);
    const arm = new T.Group(); arm.position.set(side * .37, 1.42, 0); root.add(arm); limbs.push(arm);
    part(arm, new T.CapsuleGeometry(.105, .36, 6, 16), suit, side * .03, -.25, -.025);
    box(arm, .22, .11, .22, orange, side * .03, -.08, -.025);
    part(arm, new T.SphereGeometry(.105, 12, 10), dark, side * .03, -.54, -.03);
  }
  return { root, animate(stride: number, airborne: boolean) {
    limbs[0].rotation.x = stride; limbs[2].rotation.x = -stride;
    limbs[1].rotation.x = airborne ? -.4 : -stride * .65;
    limbs[3].rotation.x = airborne ? -.4 : stride * .65;
  } };
}
