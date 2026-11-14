import * as T from "three";
import {marsHeight} from "./marsTerrain.ts";
import {CHUNK_SIZE as S, CHUNK_RADIUS as R, chunkKey, isBaseChunk, streamedHeight} from "../../game/terrainStreaming.ts";

/** A fixed pool, filled a few rows at a time. Shared materials/textures never recompile. */
export function createStreamedMars(root:T.Group, ground:T.Mesh, baseHeight:(x:number,z:number)=>number) {
 const pool=Array.from({length:(R*2+1)**2},()=>{
  const geometry=new T.PlaneGeometry(S,S,S,S);geometry.rotateX(-Math.PI/2);
  const colors=new Float32Array(geometry.attributes.position.count*3);colors.fill(1);
  geometry.setAttribute("color",new T.BufferAttribute(colors,3));
  const mesh=new T.Mesh(geometry,ground.material);mesh.receiveShadow=true;mesh.visible=false;root.add(mesh);
  return {mesh,key:"",x:0,z:0,row:0,ready:false};
 });
 let cx=Infinity,cz=Infinity;
 const desired=new Set<string>();
 const queue:typeof pool=[];
 function request(x:number,z:number){
  const nx=Math.floor(x/S),nz=Math.floor(z/S);
  if(nx===cx&&nz===cz)return;
  cx=nx;cz=nz;desired.clear();
  for(let dz=-R;dz<=R;dz++)for(let dx=-R;dx<=R;dx++)if(!isBaseChunk(cx+dx,cz+dz))desired.add(chunkKey(cx+dx,cz+dz));
  queue.length=0;
  for(const slot of pool)if(!desired.has(slot.key)){slot.key="";slot.ready=false;slot.mesh.visible=false;}
  // Nearest missing patches first. Changed coordinates only allocate here.
  const missing=[...desired].filter(key=>!pool.some(s=>s.key===key)).map(key=>key.split(",").map(Number));
  missing.sort((a,b)=>(a[0]-cx)**2+(a[1]-cz)**2-(b[0]-cx)**2-(b[1]-cz)**2);
  for(const [x,z] of missing){const slot=pool.find(s=>!s.key)!;slot.key=chunkKey(x,z);slot.x=x;slot.z=z;slot.row=0;slot.ready=false;}
  for(const slot of pool)if(slot.key&&!slot.ready)queue.push(slot);
 }
 function update(x:number,z:number,budget=2){
  request(x,z);const end=performance.now()+budget;
  while(queue.length&&performance.now()<end){
   const slot=queue[0],geometry=slot.mesh.geometry,position=geometry.attributes.position;
   const row=slot.row++;
   for(let col=0;col<=S;col++){const wx=slot.x*S+col,wz=slot.z*S+row;position.setXYZ(row*(S+1)+col,wx,marsHeight(wx,wz),wz);}
   if(slot.row>S){position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();slot.ready=true;slot.mesh.visible=true;queue.shift();}
  }
  for(const slot of pool)slot.mesh.material=ground.material;
 }
 function heightAt(x:number,z:number){return Math.abs(x)<=210&&Math.abs(z)<=210?baseHeight(x,z):streamedHeight(x,z,marsHeight);}
 return {update,heightAt,pending:()=>queue.length, count:()=>pool.reduce((n,s)=>n+Number(s.ready&&!!s.key),0),
  dispose:()=>{for(const s of pool){root.remove(s.mesh);s.mesh.geometry.dispose();}}};
}
