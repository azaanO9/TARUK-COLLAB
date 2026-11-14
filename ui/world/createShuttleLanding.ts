import * as T from "three";
import type {DropPodIntroHandle} from "./createDropPodIntro";
import {landingPose,landingExitPose,LANDING_DURATION,ARRIVAL_YAW} from "../../game/shuttleLanding.ts";
import {batchStaticMeshes} from "./batchStaticMeshes.ts";

/** Original reusable meshes. The four footpads sample the actual rendered terrain. */
export function createShuttleLanding(heightAt:(x:number,z:number)=>number,reduced:boolean,previewTime?:number):DropPodIntroHandle {
 const root=new T.Group();root.name="Mars arrival shuttle";
 const craft=new T.Group(),body=new T.Group();root.add(craft);craft.add(body);
 const ivory=new T.MeshStandardMaterial({color:0xd8d8cf,metalness:.48,roughness:.38});
 const dark=new T.MeshStandardMaterial({color:0x273039,metalness:.65,roughness:.52});
 const orange=new T.MeshStandardMaterial({color:0xc77636,metalness:.35,roughness:.5});
 const glass=new T.MeshStandardMaterial({color:0x163846,metalness:.9,roughness:.12,emissive:0x18343c,emissiveIntensity:.2});
 function mesh(g:T.BufferGeometry,m:T.Material,p:T.Group,x:number,y:number,z:number){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
 // Open-ended fuselage and a bulkhead with a real hole. The astronaut never crosses a solid hull.
 const profile=[new T.Vector2(0,-3.8),new T.Vector2(.7,-3.4),new T.Vector2(1.25,-2.5),new T.Vector2(1.48,-1.3),new T.Vector2(1.48,1.3),new T.Vector2(1.28,2.7)];
 const hull=new T.LatheGeometry(profile,32);hull.rotateX(Math.PI/2);mesh(hull,ivory,body,0,2.3,0);
 mesh(new T.SphereGeometry(1,24,16),dark,body,0,1.4,-.3).scale.set(1.34,.35,2.5);
 const bulkhead=new T.Shape();bulkhead.absarc(0,2.3,1.28,0,Math.PI*2,false);
 const opening=new T.Path();opening.moveTo(-.59,1.2);opening.lineTo(-.59,3.19);opening.lineTo(.59,3.19);opening.lineTo(.59,1.2);opening.closePath();bulkhead.holes.push(opening);
 mesh(new T.ExtrudeGeometry(bulkhead,{depth:.09,bevelEnabled:false,curveSegments:24}),ivory,body,0,0,2.7);
 mesh(new T.BoxGeometry(1.3,2.1,.06),dark,body,0,2.2,1.8);
 mesh(new T.BoxGeometry(1.2,.1,1),dark,body,0,1.15,2.3);
 const cabinLight=new T.MeshStandardMaterial({color:0xe0ebdb,emissive:0xe8d4a7,emissiveIntensity:1.1});
 mesh(new T.BoxGeometry(.85,.055,.055),cabinLight,body,0,3.21,2.79);
 for(const side of [-1,1]){
  mesh(new T.BoxGeometry(.09,2.06,.12),orange,body,side*.65,2.2,2.78);
  mesh(new T.BoxGeometry(.045,1.7,.06),cabinLight,body,side*.55,2.15,2.74);
 }
 for(let i=0;i<4;i++){
  const step=mesh(new T.BoxGeometry(1.18,.11,.34),dark,body,0,1.05-i*.24,3+i*.32);step.name='airlock-step';
  mesh(new T.BoxGeometry(1.18,.025,.035),orange,body,0,1.12-i*.24,3.16+i*.32);
 }
 // Door hinge is separate from the batched body so only this small part animates.
 const hatchPivot=new T.Group();hatchPivot.position.set(0,3.23,2.84);craft.add(hatchPivot);
 mesh(new T.BoxGeometry(1.23,2.07,.13),ivory,hatchPivot,0,-1.035,0);
 mesh(new T.BoxGeometry(.8,.05,.03),orange,hatchPivot,0,-1.66,.08);
 mesh(new T.BoxGeometry(.32,.3,.04),glass,hatchPivot,0,-.65,.08);
 mesh(new T.SphereGeometry(1,24,16),glass,body,0,2.75,-2.25).scale.set(1.1,.51,.9);
 const nameCanvas=document.createElement('canvas');nameCanvas.width=256;nameCanvas.height=96;
 const lettering=nameCanvas.getContext('2d')!;
 lettering.fillStyle='#243e48';lettering.font='600 40px sans-serif';lettering.fillText('TARUKH',17,43);
 lettering.font='16px sans-serif';lettering.fillText('ELYSIUM EXPLORER',18,69);
 lettering.fillStyle='#cc783c';lettering.fillRect(18,82,218,5);
 const nameTexture=new T.CanvasTexture(nameCanvas);nameTexture.colorSpace=T.SRGBColorSpace;
 const nameMat=new T.MeshStandardMaterial({map:nameTexture,transparent:true,depthWrite:false,roughness:.6});
 for(const side of [-1,1]){
  const label=mesh(new T.PlaneGeometry(2.5,.94),nameMat,body,side*1.49,2.34,0);label.rotation.y=side*Math.PI/2;label.castShadow=false;
 }
 for(const seamZ of [-1.3,1.3])mesh(new T.TorusGeometry(1.49,.012,4,48),dark,body,0,2.3,seamZ);
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
 const pose=landingPose(0),exit=landingExitPose(0);
 const actor={visible:false,x:0,y:0,z:0,yaw:0,speed:0,hopHeight:0,verticalVelocity:0};
 const telemetry={active:false,progress:0,altitudeMeters:0,speedMs:0,phase:'',astronaut:actor};
 let elapsed=0,active=false;
 function settle(){craft.position.y=0;body.position.y=-.07;hatchPivot.position.y=3.16;hatchPivot.rotation.x=-Math.PI*.56;flameMat.opacity=0;dustMat.opacity=0;}
 return {root,isActive:()=>active,start(){elapsed=0;active=true;craft.position.y=28;hatchPivot.rotation.x=0;root.visible=true;},skip(){active=false;settle();},
 update(dt,camera,spawn){
  if(!active){telemetry.active=false;return telemetry;}
  elapsed+=Math.min(dt,.05);const time=reduced?LANDING_DURATION:previewTime??elapsed;landingPose(time,pose);
  craft.position.y=pose.altitude;body.position.y=-pose.compression;
  hatchPivot.position.y=3.23-pose.compression;hatchPivot.rotation.x=-Math.PI*.56*pose.hatch;
  flameMat.opacity=pose.plume;for(const flame of flames)flame.scale.y=1+pose.plume;
  dustMat.opacity=reduced?0:pose.dust*.38;
  for(let i=0;i<32;i++){
   const a=i*2.399963,r=1.5+(i%8)*.55+Math.max(0,time-5)*.22;
   const dx=Math.cos(a)*r,dz=Math.sin(a)*r;
   dummy.position.set(dx,heightAt(x+dx,z+dz)-base+.3+(i%3)*.16,dz);
   dummy.quaternion.copy(camera.quaternion);dummy.scale.setScalar(1.4+(i%4)*.3);dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix);
  }
  dust.instanceMatrix.needsUpdate=true;
  landingExitPose(time,exit);const actorZ=z+exit.localZ,actorGround=heightAt(x,actorZ);
  const actorY=(exit.grounded?actorGround:base+exit.deckHeight)+exit.hopHeight;
  const egressView=T.MathUtils.smoothstep(time,10.5,13);
  cam.set(x+11-egressView*6,base+7+pose.altitude*.9-egressView*3.8,z+13-egressView*4);
  end.set(spawn.x+Math.sin(ARRIVAL_YAW)*5.2+Math.cos(ARRIVAL_YAW)*.28,spawn.y+1.45+Math.sin(.04)*5.2,spawn.z+Math.cos(ARRIVAL_YAW)*5.2-Math.sin(ARRIVAL_YAW)*.28);
  cam.lerp(end,pose.handoff);cam.y=Math.max(cam.y,heightAt(cam.x,cam.z)+.8);camera.position.copy(cam);
  look.set(x,base+pose.altitude+1.8,z);look.lerp(endLook.set(x,actorY+1.05,actorZ),egressView);endLook.set(spawn.x+Math.cos(ARRIVAL_YAW)*.28,spawn.y+1.45,spawn.z-Math.sin(ARRIVAL_YAW)*.28);look.lerp(endLook,pose.handoff);camera.lookAt(look);
  if(pose.complete){active=false;settle();}
  telemetry.active=active;telemetry.progress=Math.min(1,time/LANDING_DURATION);telemetry.altitudeMeters=pose.altitude;telemetry.speedMs=pose.speed;telemetry.phase=pose.phase;
  actor.visible=exit.visible;actor.x=x;actor.y=actorY;actor.z=actorZ;actor.yaw=exit.yaw;actor.speed=exit.speed;actor.hopHeight=exit.hopHeight;actor.verticalVelocity=exit.verticalVelocity;
  return telemetry;
 },dispose(){root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});nameTexture.dispose();dustMat.map?.dispose();flameMat.map?.dispose();flameMat.dispose();}};
}
