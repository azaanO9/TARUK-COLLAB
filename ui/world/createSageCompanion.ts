import * as T from "three";
import { batchStaticMeshes } from "./batchStaticMeshes";
import { SAGE_DOCK } from "../../game/sageCompanion";

/** An open-front home for Sage, with a landing pad and a lit nameplate. */
export function createSageDock() {
  const dock = new T.Group();
  dock.position.set(SAGE_DOCK.x, 0, SAGE_DOCK.z);
  const frame = new T.MeshStandardMaterial({ color: 0x47525a, metalness: .55, roughness: .5 });
  const shell = new T.MeshStandardMaterial({ color: 0xc9c9bc, metalness: .25, roughness: .65 });
  const copper = new T.MeshStandardMaterial({ color: 0xc8763e, roughness: .7 });
  const light = new T.MeshStandardMaterial({ color: 0xa8fff0, emissive: 0x55bfa8, emissiveIntensity: 1.5 });
  const box = (w:number,h:number,d:number,x:number,y:number,z:number, material:T.Material) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w,h,d), material);
    mesh.position.set(x,y,z); mesh.castShadow = mesh.receiveShadow = true; dock.add(mesh); return mesh;
  };
  box(3.6,.16,3.2,0,.08,0,frame);
  box(.22,2.25,3, -1.65,1.2,0,shell); box(.22,2.25,3,1.65,1.2,0,shell);
  box(3.3,2.25,.2,0,1.2,-1.4,shell);
  box(3.8,.25,3.3,0,2.38,0,frame);
  box(3.7,.1,.18,0,2.45,1.62,copper);
  for (const x of [-1.35,1.35]) { box(.12,2.1,.12,x,1.15,1.5,frame); box(.08,.8,.08,x,1.6,1.58,light); }
  for (const x of [-1.2,0,1.2]) box(.65,.035,.06,x,.18,-1.27,light);
  // Insulated panels, seams, utility cabinets and warm overhead lighting.
  const seam = new T.MeshStandardMaterial({color:0x66757a,metalness:.45,roughness:.65});
  const warm = new T.MeshStandardMaterial({color:0xffe2b0,emissive:0xf8b56c,emissiveIntensity:1.4});
  box(2.1,.05,.13,0,2.22,1.42,warm);
  for(const y of [.55,1.15,1.75]) box(3.05,.025,.025,0,y,-1.28,seam);
  for(const x of [-1,-.5,0,.5,1]) box(.025,1.8,.025,x,1.13,-1.28,seam);
  for(const x of [-1.48,1.48]) for(const y of [.55,1.15,1.75]) box(.025,.025,2.65,x,y,0,seam);
  for(const x of [-1.12,1.12]) { box(.58,.48,.55,x,.38,-.84,frame); box(.48,.35,.04,x,.4,-.54,shell); box(.17,.035,.02,x,.47,-.51,copper); }
  for(const x of [-1.4,1.4]) box(.055,2.05,.08,x,1.2,1.58,frame);
  const pad = new T.Mesh(new T.RingGeometry(.55,.7,32), new T.MeshBasicMaterial({color:0x77dece,side:T.DoubleSide}));
  pad.rotation.x=-Math.PI/2; pad.position.y=.17; dock.add(pad);
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext("2d"); if(ctx){ctx.fillStyle="#23343a";ctx.fillRect(0,0,512,128);ctx.fillStyle="#c6f9ec";ctx.font="bold 54px sans-serif";ctx.textAlign="center";ctx.fillText("SAGE / HOME",256,82);}
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const sign=new T.Mesh(new T.PlaneGeometry(2.1,.52),new T.MeshStandardMaterial({map:texture,emissive:0x22584f,emissiveIntensity:.5})); sign.position.set(0,2.02,1.67);dock.add(sign);
  batchStaticMeshes(dock, new Set());
  return dock;
}

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
