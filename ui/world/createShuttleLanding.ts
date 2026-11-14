import * as T from "three";
import type {DropPodIntroHandle} from "./createDropPodIntro";
import {landingPose,LANDING_DURATION} from "../../game/shuttleLanding.ts";
import {batchStaticMeshes} from "./batchStaticMeshes.ts";

/** Original reusable meshes. The four footpads sample the actual rendered terrain. */
export function createShuttleLanding(heightAt:(x:number,z:number)=>number,reduced:boolean):DropPodIntroHandle {
 const root=new T.Group();root.name="Mars arrival shuttle";
 const craft=new T.Group(),body=new T.Group();root.add(craft);craft.add(body);
 const ivory=new T.MeshStandardMaterial({color:0xd8d8cf,metalness:.48,roughness:.38});
 const dark=new T.MeshStandardMaterial({color:0x273039,metalness:.65,roughness:.52});
 const orange=new T.MeshStandardMaterial({color:0xc77636,metalness:.35,roughness:.5});
 const glass=new T.MeshStandardMaterial({color:0x163846,metalness:.9,roughness:.12,emissive:0x18343c,emissiveIntensity:.2});
 function mesh(g:T.BufferGeometry,m:T.Material,p:T.Group,x:number,y:number,z:number){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
 mesh(new T.SphereGeometry(1,32,20),ivory,body,0,2.2,0).scale.set(1.45,1.25,3.45);
 mesh(new T.SphereGeometry(1,24,16),dark,body,0,1.55,.1).scale.set(1.36,.45,3.2);
 mesh(new T.SphereGeometry(1,24,16),glass,body,0,2.75,-2.25).scale.set(1.1,.51,.9);
 for(const side of [-1,1]){
  const outline=new T.Shape();outline.moveTo(side*1.1,-.5);outline.lineTo(side*4.7,2.1);outline.lineTo(side*4.5,3);outline.lineTo(side*1.1,2.2);outline.closePath();
  const wingGeo=new T.ExtrudeGeometry(outline,{depth:.14,bevelEnabled:true,bevelSize:.045,bevelThickness:.035,bevelSegments:1,steps:1});wingGeo.rotateX(Math.PI/2);
  mesh(wingGeo,ivory,body,0,1.9,0);
  const stripe=mesh(new T.BoxGeometry(3.1,.025,.2),orange,body,side*2.5,1.91,1.6);stripe.rotation.y=side*.3;
  const tail=mesh(new T.BoxGeometry(.15,1.45,1.5),dark,body,side*.95,3.1,2.4);tail.rotation.z=side*-.25;
  for(const z of [-.9,.3,1.5])mesh(new T.BoxGeometry(.018,.5,.025),dark,body,side*1.42,2.25,z);
  const nozzle=mesh(new T.CylinderGeometry(.42,.52,.55,20),dark,body,side*1.2,1.2,1.9);nozzle.rotation.x=.12;
 }
 mesh(new T.BoxGeometry(1.1,.05,.12),orange,body,0,3.45,.4);
 const x=0,z=12;
 const feet=[[-2.3,-1.5],[2.3,-1.5],[-2.3,2],[2.3,2]];
 const base=Math.max(...feet.map(([fx,fz])=>heightAt(x+fx,z+fz)));
 root.position.set(x,base,z);
 const from=new T.Vector3(),to=new T.Vector3(),axis=new T.Vector3(0,1,0);
 for(const [fx,fz] of feet){
  const y=heightAt(x+fx,z+fz)-base;
  mesh(new T.CylinderGeometry(.43,.5,.12,16),dark,craft,fx,y+.06,fz).name="landing-foot";
  from.set(fx*.55,1.9,fz*.8);to.set(fx,y+.15,fz);
  const leg=mesh(new T.CylinderGeometry(.09,.12,from.distanceTo(to),12),ivory,craft,0,0,0);
  leg.position.copy(from).add(to).multiplyScalar(.5);leg.quaternion.setFromUnitVectors(axis,to.sub(from).normalize());
 }
 const glowCanvas=document.createElement("canvas");glowCanvas.width=glowCanvas.height=32;
 const glowCtx=glowCanvas.getContext("2d")!;const glow=glowCtx.createRadialGradient(16,16,0,16,16,16);
 glow.addColorStop(0,"rgba(255,242,208,.9)");glow.addColorStop(.3,"rgba(155,211,255,.6)");glow.addColorStop(1,"rgba(90,160,255,0)");glowCtx.fillStyle=glow;glowCtx.fillRect(0,0,32,32);
 const flameMat=new T.SpriteMaterial({map:new T.CanvasTexture(glowCanvas),transparent:true,opacity:.5,depthWrite:false,blending:T.AdditiveBlending});
 const flames:T.Sprite[]=[];
 for(const side of [-1,1]){const flame=new T.Sprite(flameMat);flame.position.set(side*1.2,.45,1.9);flame.scale.set(.9,1.6,1);craft.add(flame);flames.push(flame);}
 batchStaticMeshes(body,new Set());
 const canvas=document.createElement("canvas");canvas.width=canvas.height=32;
 const ctx=canvas.getContext("2d")!;const gradient=ctx.createRadialGradient(16,16,0,16,16,16);
 gradient.addColorStop(0,"rgba(255,255,255,.55)");gradient.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
 const dustMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),color:0xb78058,transparent:true,opacity:0,depthWrite:false});
 const dust=new T.InstancedMesh(new T.PlaneGeometry(1,1),dustMat,32);dust.frustumCulled=false;root.add(dust);
 const dummy=new T.Object3D(),cam=new T.Vector3(),end=new T.Vector3(),look=new T.Vector3(),endLook=new T.Vector3();
 let elapsed=0,active=false;
 function settle(){craft.position.y=0;body.position.y=-.07;flameMat.opacity=0;dustMat.opacity=0;}
 return {root,isActive:()=>active,start(){elapsed=0;active=true;craft.position.y=28;root.visible=true;},skip(){active=false;settle();},
 update(dt,camera,spawn){
  if(!active)return {active:false,progress:1,altitudeMeters:0,speedMs:0};
  elapsed+=Math.min(dt,.05);const time=reduced?LANDING_DURATION:elapsed;const pose=landingPose(time);
  craft.position.y=pose.altitude;body.position.y=-pose.compression;
  flameMat.opacity=pose.plume;for(const flame of flames)flame.scale.y=1+pose.plume;
  dustMat.opacity=reduced?0:pose.dust*.38;
  for(let i=0;i<32;i++){
   const a=i*2.399963,r=1.5+(i%8)*.55+Math.max(0,time-5)*.22;
   const dx=Math.cos(a)*r,dz=Math.sin(a)*r;
   dummy.position.set(dx,heightAt(x+dx,z+dz)-base+.3+(i%3)*.16,dz);
   dummy.quaternion.copy(camera.quaternion);dummy.scale.setScalar(1.4+(i%4)*.3);dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix);
  }
  dust.instanceMatrix.needsUpdate=true;
  cam.set(x+11,base+7+pose.altitude*.9,z+13);
  end.set(spawn.x+.28,spawn.y+1.45+Math.sin(.04)*5.2,spawn.z+Math.cos(.04)*5.2);
  cam.lerp(end,pose.handoff);cam.y=Math.max(cam.y,heightAt(cam.x,cam.z)+.8);camera.position.copy(cam);
  look.set(x,base+pose.altitude+1.8,z);endLook.set(spawn.x+.28,spawn.y+1.45,spawn.z);look.lerp(endLook,pose.handoff);camera.lookAt(look);
  if(pose.complete){active=false;settle();}
  return {active,progress:Math.min(1,time/LANDING_DURATION),altitudeMeters:pose.altitude,speedMs:pose.speed};
 },dispose(){root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});dustMat.map?.dispose();flameMat.map?.dispose();flameMat.dispose();}};
}
