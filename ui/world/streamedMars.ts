import {convexRockOutline,rockContact,rockLiftAt} from "../../game/rockContact.ts";
import * as T from "three";
import {marsHeight,marsGroundTint} from "./marsTerrain.ts";
import {CHUNK_SIZE as S, CHUNK_RADIUS as R, chunkKey, isBaseChunk, streamedHeight, streamedRock} from "../../game/terrainStreaming.ts";

import type {CollisionObstacle} from "../../game/collision.ts";

/** A fixed pool, filled a few rows at a time. Shared materials/textures never recompile. */
export function createStreamedMars(root:T.Group, ground:T.Mesh, baseHeight:(x:number,z:number)=>number, options:{radius?:number;rocks?:number;pebbles?:number;obstacles?:CollisionObstacle[];sampleHeight?:(x:number,z:number)=>number}={}) {
 const sampleHeight=options.sampleHeight??marsHeight;
 const radius=options.radius ?? R, rockCount=options.rocks ?? 18;
 const pebbleCount=options.pebbles??(radius<=2?12:32);
 const obstacles=options.obstacles ?? [], baseObstacleCount=obstacles.length;
 const rockGeometry=new T.DodecahedronGeometry(1,0);
 rockGeometry.computeBoundingBox();
 const rockVertices=rockGeometry.attributes.position;
 const rockOutline=convexRockOutline(Array.from({length:rockVertices.count},(_,i)=>({x:rockVertices.getX(i),z:rockVertices.getZ(i)})));
 const rockTemplate=root.getObjectByName("mars-small-rocks") as T.InstancedMesh|undefined;
 const fallbackMaterial=rockTemplate?null:new T.MeshStandardMaterial({color:0x80604a,roughness:.94,flatShading:true});
 const rockMaterial=rockTemplate?.material??fallbackMaterial!;
 const dummy=new T.Object3D(),tint=new T.Color(),groundTint=new T.Color(),paleRock=new T.Color(1,.90,.77);
 const pool=Array.from({length:(radius*2+1)**2},()=>{
  const geometry=new T.PlaneGeometry(S,S,S,S);geometry.rotateX(-Math.PI/2);
  const colors=new Float32Array(geometry.attributes.position.count*3);colors.fill(1);
  geometry.setAttribute("color",new T.BufferAttribute(colors,3));
  const mesh=new T.Mesh(geometry,ground.material);mesh.receiveShadow=true;mesh.visible=false;root.add(mesh);
  mesh.name="streamed-ground";
  const rocks=new T.InstancedMesh(rockGeometry,rockMaterial,rockCount+pebbleCount);rocks.visible=false;rocks.name="streamed-rocks";rocks.receiveShadow=true;rocks.castShadow=radius>2;root.add(rocks);
  const contacts:CollisionObstacle[]=[];
  return {mesh,rocks,contacts,key:"",x:0,z:0,row:0,ready:false};
 });
 let cx=Infinity,cz=Infinity;
 const desired=new Set<string>();
 const queue:typeof pool=[];
 function syncContacts(){obstacles.length=baseObstacleCount;for(const slot of pool)if(slot.ready)for(const contact of slot.contacts)obstacles.push(contact);}
 function finishRocks(slot:typeof pool[number]){
  slot.contacts.length=0;
  for(let i=0;i<rockCount+pebbleCount;i++){
   const r=streamedRock(slot.x,slot.z,i),height=heightAt(r.x,r.z);
   if(i>=rockCount){r.sx*=.1;r.sy*=.1;r.sz*=.1;}
   dummy.position.set(r.x-slot.x*S,height+r.sy*.55,r.z-slot.z*S);dummy.rotation.set(0,r.yaw,0);dummy.scale.set(r.sx,r.sy,r.sz);dummy.updateMatrix();slot.rocks.setMatrixAt(i,dummy.matrix);
   tint.setRGB(.72+r.tint*.25,.75+r.tint*.18,.77+r.tint*.15).lerp(paleRock,r.tint*.35);slot.rocks.setColorAt(i,tint);
   if(i<rockCount)slot.contacts.push(rockContact(r.x,r.z,rockOutline,r.sx,r.sz,r.yaw,height,r.sy*(.55+rockGeometry.boundingBox!.max.y)));
  }
  slot.rocks.position.set(slot.x*S,0,slot.z*S);slot.rocks.instanceMatrix.needsUpdate=true;if(slot.rocks.instanceColor)slot.rocks.instanceColor.needsUpdate=true;slot.rocks.computeBoundingSphere();slot.rocks.visible=true;
 }
 function request(x:number,z:number){
  const nx=Math.floor(x/S),nz=Math.floor(z/S);
  if(nx===cx&&nz===cz)return;
  cx=nx;cz=nz;desired.clear();
  for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++)if(!isBaseChunk(cx+dx,cz+dz))desired.add(chunkKey(cx+dx,cz+dz));
  queue.length=0;
  for(const slot of pool)if(!desired.has(slot.key)){slot.key="";slot.ready=false;slot.mesh.visible=false;slot.rocks.visible=false;slot.contacts.length=0;}
  // Nearest missing patches first. Changed coordinates only allocate here.
  const missing=[...desired].filter(key=>!pool.some(s=>s.key===key)).map(key=>key.split(",").map(Number));
  missing.sort((a,b)=>(a[0]-cx)**2+(a[1]-cz)**2-(b[0]-cx)**2-(b[1]-cz)**2);
  for(const [x,z] of missing){const slot=pool.find(s=>!s.key)!;slot.key=chunkKey(x,z);slot.x=x;slot.z=z;slot.row=0;slot.ready=false;}
  for(const slot of pool)if(slot.key&&!slot.ready)queue.push(slot);
  syncContacts();
 }
 function update(x:number,z:number,budget=2){
  request(x,z);const end=performance.now()+budget;
  while(queue.length&&performance.now()<end){
   const slot=queue[0],geometry=slot.mesh.geometry,position=geometry.attributes.position;
   const row=slot.row++;
   const colors=geometry.attributes.color;
   for(let col=0;col<=S;col++){
    const wx=slot.x*S+col,wz=slot.z*S+row,h=sampleHeight(wx,wz),i=row*(S+1)+col;
    position.setXYZ(i,col,h,row);
    const dx=h-(col?position.getY(i-1):sampleHeight(wx-1,wz)),dz=h-(row?position.getY(i-S-1):sampleHeight(wx,wz-1));
    marsGroundTint(groundTint,wx,wz,1-1/Math.sqrt(1+dx*dx+dz*dz));colors.setXYZ(i,groundTint.r,groundTint.g,groundTint.b);
   }
   if(slot.row>S){position.needsUpdate=true;colors.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();slot.mesh.position.set(slot.x*S,0,slot.z*S);slot.ready=true;slot.mesh.visible=true;finishRocks(slot);syncContacts();queue.shift();}
  }
  for(const slot of pool){slot.mesh.material=ground.material;slot.rocks.material=rockTemplate?.material??rockMaterial;}
 }
 function heightAt(x:number,z:number){return Math.abs(x)<=210&&Math.abs(z)<=210?baseHeight(x,z):streamedHeight(x,z,sampleHeight);}
 function roverHeightAt(x:number,z:number){
  let lift=0;const tileX=Math.floor(x/S),tileZ=Math.floor(z/S);
  for(const slot of pool)if(slot.ready&&Math.abs(slot.x-tileX)<=1&&Math.abs(slot.z-tileZ)<=1){
   for(const contact of slot.contacts)if(Math.abs(x-contact.x)<contact.radius+.2&&Math.abs(z-contact.z)<contact.radius+.2)lift=Math.max(lift,rockLiftAt(x,z,contact));
  }
  return heightAt(x,z)+lift;
 }
 const coverage=new T.Vector4();
 return {update,heightAt,roverHeightAt,pending:()=>queue.length, count:()=>pool.reduce((n,s)=>n+Number(s.ready&&!!s.key),0),
  coverage:()=>{const r=queue.length?radius-1:radius;return coverage.set((cx-r)*S,(cz-r)*S,(cx+r+1)*S,(cz+r+1)*S);},
  dispose:()=>{obstacles.length=baseObstacleCount;for(const s of pool){root.remove(s.mesh,s.rocks);s.mesh.geometry.dispose();s.rocks.dispose();}rockGeometry.dispose();fallbackMaterial?.dispose();}};
}
