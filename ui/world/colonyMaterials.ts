import * as T from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** Original, locally generated surface library. Shared by all Mars hardware. */
export function createColonyMaterials(panelSurface?:T.Texture) {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const pixels = ctx.createImageData(512, 512);
  let seed = 711;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const i = (y * 512 + x) * 4;
    const grain = random() * 12 - 6, dust = Math.pow(y / 512, 7) * 26;
    const edge = Math.min(x, 511-x, y, 511-y) < 3 ? -25 : 0;
    pixels.data[i] = 219 + grain - dust + edge;
    pixels.data[i+1] = 214 + grain - dust * 1.2 + edge;
    pixels.data[i+2] = 199 + grain - dust * 1.3 + edge;
    pixels.data[i+3] = 255;
  }
  ctx.putImageData(pixels,0,0);
  ctx.strokeStyle = "rgba(61,55,43,.17)"; ctx.lineWidth = 1;
  for(let i=0;i<90;i++){const x=random()*512,y=random()*512;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*10,y+random()*2);ctx.stroke();}
  const panelMap = panelSurface ?? new T.CanvasTexture(canvas); panelMap.colorSpace = T.SRGBColorSpace; panelMap.anisotropy = 4;
  const bumpMap = panelMap.clone(); bumpMap.colorSpace = T.NoColorSpace;
  const ceramic = new T.MeshStandardMaterial({color:0xe9dfca,map:panelMap,bumpMap,bumpScale:.018,roughness:.69,metalness:.14});
  const alloy = new T.MeshStandardMaterial({color:0x9caba9,metalness:.74,roughness:.36});
  const graphite = new T.MeshStandardMaterial({color:0x283335,metalness:.35,roughness:.66});
  const orange = new T.MeshStandardMaterial({color:0xc66c32,metalness:.28,roughness:.57});
  const teal = new T.MeshStandardMaterial({color:0x286064,metalness:.4,roughness:.38});
  const light = new T.MeshStandardMaterial({color:0xc4f6ee,emissive:0x6de6d5,emissiveIntensity:1.25,roughness:.3});
  const warm = new T.MeshStandardMaterial({color:0xffe9bb,emissive:0xffcc86,emissiveIntensity:1.1});
  return {ceramic,alloy,graphite,orange,teal,light,warm};
}
export type ColonyMaterials = ReturnType<typeof createColonyMaterials>;

/** All small static details can be merged by material after assembly. */
export function colonyBuilder(materials:ColonyMaterials) {
  const roundedGeometry = new Map<string,T.BufferGeometry>();
  const hardBoxGeometry = new T.BoxGeometry();
  const cylinderGeometry = new T.CylinderGeometry(1,1,1,16);
  const boltGeometry = new T.CylinderGeometry(.035,.035,.025,6).rotateX(Math.PI/2);
  const add=(parent:T.Object3D,geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number)=>{
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const box=(parent:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,mat:T.Material=materials.ceramic,rounded=true)=>{
    let geometry:T.BufferGeometry=hardBoxGeometry;
    if(rounded){const key=`${w}/${h}/${d}`;geometry=roundedGeometry.get(key) ?? new RoundedBoxGeometry(w,h,d,2,Math.min(.045,w*.12,h*.12,d*.12));roundedGeometry.set(key,geometry);}
    const mesh=add(parent,geometry,mat,x,y,z);if(!rounded)mesh.scale.set(w,h,d);return mesh;
  };
  const cylinder=(parent:T.Object3D,r:number,h:number,x:number,y:number,z:number,mat:T.Material=materials.alloy)=>{
    const mesh=add(parent,cylinderGeometry,mat,x,y,z);mesh.scale.set(r,h,r);return mesh;
  };
  const pipe=(parent:T.Object3D,points:number[][],r=.055,mat:T.Material=materials.graphite)=>{
    const geometry=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number]))),16,r,6,false);
    return add(parent,geometry,mat,0,0,0);
  };
  const label=(parent:T.Object3D,text:string,w:number,x:number,y:number,z:number,accent="#99e6da")=>{
    const c=document.createElement("canvas");c.width=512;c.height=128;const ctx=c.getContext("2d")!;
    ctx.fillStyle="#243437";ctx.fillRect(0,0,512,128);ctx.fillStyle=accent;ctx.fillRect(0,0,7,128);
    ctx.fillStyle="#f5eee0";ctx.font="600 38px Arial";ctx.textAlign="center";ctx.fillText(text,256,75,470);
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
    return add(parent,new T.PlaneGeometry(w,w/4),new T.MeshStandardMaterial({map:texture,roughness:.6,emissive:0x41635e,emissiveIntensity:.16}),x,y,z);
  };
  const bolts=(parent:T.Object3D,w:number,h:number,x:number,y:number,z:number)=>{
    for(const sx of [-1,1])for(const sy of [-1,1])add(parent,boltGeometry,materials.alloy,x+sx*w*.42,y+sy*h*.4,z);
  };
  const vent=(parent:T.Object3D,w:number,h:number,x:number,y:number,z:number)=>{
    box(parent,w,h,.07,x,y,z,materials.graphite);
    for(let i=0;i<7;i++)box(parent,w*.89,.025,.04,x,y-h*.38+i*h*.125,z+.05,materials.alloy,false);
  };
  return {add,box,cylinder,pipe,label,bolts,vent};
}
