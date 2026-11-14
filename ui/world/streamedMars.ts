import * as T from "three";
import {marsHeight} from "./marsTerrain.ts";
import {CHUNK_SIZE as S, CHUNK_RADIUS as R, chunkKey, isBaseChunk, streamedHeight, streamedRock} from "../../game/terrainStreaming.ts";

import type {CollisionObstacle} from "../../game/collision.ts";

/** A fixed pool, filled a few rows at a time. Shared materials/textures never recompile. */
export function createStreamedMars(root:T.Group, ground:T.Mesh, baseHeight:(x:number,z:number)=>number, options:{radius?:number;rocks?:number;obstacles?:CollisionObstacle[]}={}) {
 const radius=options.radius ?? R, rockCount=options.rocks ?? 18;
 const obstacles=options.obstacles ?? [], baseObstacleCount=obstacles.length;
 const rockGeometry=new T.DodecahedronGeometry(1,0);
 const rockMaterial=new T.MeshStandardMaterial({color:0x80604a,roughness:.94,flatShading:true});
 const dummy=new T.Object3D(),tint=new T.Color(),paleRock=new T.Color(0xa58b70);
 const pool=Array.from({length:(radius*2+1)**2},()=>{
  const geometry=new T.PlaneGeometry(S,S,S,S);geometry.rotateX(-Math.PI/2);
  const colors=new Float32Array(geometry.attributes.position.count*3);colors.fill(1);
  geometry.setAttribute("color",new T.BufferAttribute(colors,3));
  const mesh=new T.Mesh(geometry,ground.material);mesh.receiveShadow=true;mesh.visible=false;root.add(mesh);
  mesh.name="streamed-ground";
  const rocks=new T.InstancedMesh(rockGeometry,rockMaterial,rockCount);rocks.visible=false;rocks.name="streamed-rocks";rocks.receiveShadow=true;rocks.castShadow=radius>2;root.add(rocks);
  const contacts:CollisionObstacle[]=[];
  return {mesh,rocks,contacts,key:"",x:0,z:0,row:0,ready:false};
 });
 let cx=Infinity,cz=Infinity;
 const desired=new Set<string>();
 const queue:typeof pool=[];
 function syncContacts(){obstacles.length=baseObstacleCount;for(const slot of pool)if(slot.ready)for(const contact of slot.contacts)obstacles.push(contact);}
 function finishRocks(slot:typeof pool[number]){
  slot.contacts.length=0;
  for(let i=0;i<rockCount;i++){
   const r=streamedRock(slot.x,slot.z,i),height=heightAt(r.x,r.z);
   dummy.position.set(r.x-slot.x*S,height+r.sy*.55,r.z-slot.z*S);dummy.rotation.set(.1,r.yaw,.08);dummy.scale.set(r.sx,r.sy,r.sz);dummy.updateMatrix();slot.rocks.setMatrixAt(i,dummy.matrix);
   tint.setHex(0x78503a).lerp(paleRock,r.tint);slot.rocks.setColorAt(i,tint);
   slot.contacts.push({x:r.x,z:r.z,radius:Math.max(r.sx,r.sz)*1.05,traversable:false});
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
   for(let col=0;col<=S;col++){const wx=slot.x*S+col,wz=slot.z*S+row;position.setXYZ(row*(S+1)+col,col,marsHeight(wx,wz),row);}
   if(slot.row>S){position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();slot.mesh.position.set(slot.x*S,0,slot.z*S);slot.ready=true;slot.mesh.visible=true;finishRocks(slot);syncContacts();queue.shift();}
  }
  for(const slot of pool)slot.mesh.material=ground.material;
 }
 function heightAt(x:number,z:number){return Math.abs(x)<=210&&Math.abs(z)<=210?baseHeight(x,z):streamedHeight(x,z,marsHeight);}
 return {update,heightAt,pending:()=>queue.length, count:()=>pool.reduce((n,s)=>n+Number(s.ready&&!!s.key),0),
  dispose:()=>{obstacles.length=baseObstacleCount;for(const s of pool){root.remove(s.mesh,s.rocks);s.mesh.geometry.dispose();s.rocks.dispose();}rockGeometry.dispose();rockMaterial.dispose();}};
}
