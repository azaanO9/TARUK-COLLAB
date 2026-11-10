import * as T from "three";
import { createColonyMaterials, colonyBuilder } from "./colonyMaterials";
import { batchStaticMeshes } from "./batchStaticMeshes";

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
  const root=new T.Group(),m=createColonyMaterials(),b=colonyBuilder(m);
  const fabric=m.ceramic.clone();fabric.roughness=.95;fabric.metalness=0;fabric.bumpScale=.024;
  const visor=new T.MeshStandardMaterial({color:0x1b292d,metalness:.92,roughness:.13,envMapIntensity:1.7});
  const torso=b.add(root,new T.CapsuleGeometry(.285,.36,8,24),fabric,0,1.23,0);torso.scale.set(1.18,1,.84);
  b.box(root,.56,.1,.39,0,.96,0,m.graphite);
  b.box(root,.47,.19,.09,0,1.39,-.22,m.orange);
  b.box(root,.3,.25,.07,0,1.24,-.26,m.alloy);
  for(const x of [-.205,.205])b.box(root,.052,.48,.04,x,1.25,.23,m.graphite);
  // Life-support pack, shaped corner guards, fasteners and a legible status screen.
  b.box(root,.49,.6,.27,0,1.26,.31,m.alloy);
  b.box(root,.39,.48,.055,0,1.26,.47,m.ceramic);
  b.box(root,.24,.27,.035,0,1.3,.51,m.graphite);
  for(let i=0;i<4;i++)b.box(root,.13,.018,.015,0,1.23+i*.045,.535,m.light,false);
  for(const x of [-.22,.22]){b.box(root,.075,.48,.1,x,1.28,.43,m.orange);b.bolts(root,.05,.43,x,1.28,.491);}
  b.pipe(root,[[-.25,1.35,.33],[-.36,1.23,.31],[-.35,1.05,.05],[-.26,1.1,-.16]],.028,m.orange);
  for(const x of [-.12,.12])b.cylinder(root,.024,.11,x,1.65,.35,m.alloy);
  b.add(root,new T.TorusGeometry(.193,.034,8,24).rotateX(Math.PI/2),m.orange,0,1.62,0);
  const helmet=b.add(root,new T.SphereGeometry(.295,32,22),fabric,0,1.88,0);helmet.scale.set(1.04,1,.98);
  const face=b.add(root,new T.SphereGeometry(.268,32,20),visor,0,1.88,-.083);face.scale.set(.95,.77,.87);
  for(const x of [-.3,.3]){
    const ear=b.cylinder(root,.092,.075,x,1.87,.015,m.graphite);ear.rotation.z=Math.PI/2;
    const cover=b.cylinder(root,.072,.085,x,1.87,.015,m.alloy);cover.rotation.z=Math.PI/2;
  }
  b.box(root,.13,.055,.07,0,2.13,-.04,m.alloy);
  b.add(root,new T.TorusGeometry(.257,.012,6,28).rotateX(Math.PI/2),m.alloy,0,1.72,0);
  b.box(root,.17,.055,.025,0,1.9,.286,m.alloy);
  for(const x of [-.09,-.03,.03,.09])b.box(root,.015,.06,.018,x,1.82,.284,m.graphite,false);
  // Wrinkled fabric profiles give arms and legs natural volume rather than straight rods.
  const sleeve=(length:number,radius:number)=>{
    const profile:T.Vector2[]=[];
    for(let i=0;i<=18;i++){
      const t=i/18;const taper=.78+.22*Math.sin(t*Math.PI);
      const crease=1+Math.sin(t*Math.PI*12)*.043*Math.sin(t*Math.PI);
      profile.push(new T.Vector2(radius*taper*crease,-t*length));
    }
    return new T.LatheGeometry(profile,18);
  };
  const limbs:T.Group[]=[];
  for(const side of [-1,1]){
    const leg=new T.Group();leg.position.set(side*.19,.96,0);root.add(leg);limbs.push(leg);
    b.add(leg,sleeve(.73,.145),fabric,0,0,0);
    b.box(leg,.2,.17,.07,0,-.42,-.13,fabric);
    for(const y of [-.36,-.53])b.add(leg,new T.TorusGeometry(.146,.012,6,18).rotateX(Math.PI/2),fabric,0,y,0);
    b.box(leg,.30,.2,.43,0,-.81,-.065,m.graphite);
    b.box(leg,.305,.05,.44,0,-.9,-.065,m.alloy);
    b.box(leg,.2,.13,.13,0,-.74,.06,fabric);
    const arm=new T.Group();arm.position.set(side*.37,1.5,0);arm.rotation.z=side*.065;root.add(arm);limbs.push(arm);
    b.add(arm,sleeve(.47,.11),fabric,side*.04,-.025,0);
    b.box(arm,.205,.12,.21,side*.04,-.075,0,m.orange);
    b.add(arm,new T.TorusGeometry(.11,.012,6,18).rotateX(Math.PI/2),m.graphite,side*.04,-.3,0);
    b.cylinder(arm,.1,.1,side*.04,-.48,0,m.alloy);
    const glove=b.add(arm,new T.SphereGeometry(.104,16,10),m.graphite,side*.04,-.58,-.01);glove.scale.set(.8,1.14,.9);
    batchStaticMeshes(leg,new Set());batchStaticMeshes(arm,new Set());
  }
  batchStaticMeshes(root,new Set(limbs));
  return {root,animate(stride:number,airborne:boolean){
    limbs[0].rotation.x=stride;limbs[2].rotation.x=-stride;
    limbs[1].rotation.x=airborne?-.4:-stride*.65;limbs[3].rotation.x=airborne?-.4:stride*.65;
  }};
}
