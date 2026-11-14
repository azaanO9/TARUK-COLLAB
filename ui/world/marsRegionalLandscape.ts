import * as T from 'three';
import {REGION_WORLD_BOUNDS as B} from '../../game/marsRegion.ts';
import {marsExpeditionHeight} from '../../game/marsExpeditionTerrain.ts';

/** One cheap, reachable far LOD of the SAME surface. Never a fictional collision wall. */
export function createMarsRegionalLandscape(root:T.Group){
 const geometry=new T.PlaneGeometry(B.east-B.west,B.south-B.north,256,192);
 geometry.rotateX(-Math.PI/2);geometry.translate((B.east+B.west)/2,0,(B.north+B.south)/2);
 const p=geometry.attributes.position;
 for(let i=0;i<p.count;i++)p.setY(i,marsExpeditionHeight(p.getX(i),p.getZ(i))-.35);
 geometry.computeVertexNormals();
 const colors=new Float32Array(p.count*3),color=new T.Color(),dust=new T.Color(0xb58865),rock=new T.Color(0x795b49);
 for(let i=0;i<p.count;i++){
  const slope=1-geometry.attributes.normal.getY(i),band=.08*Math.sin(p.getY(i)*.5);
  color.copy(dust).lerp(rock,Math.min(.75,slope*1.8+.12+band));color.toArray(colors,i*3);
 }
 geometry.setAttribute('color',new T.BufferAttribute(colors,3));
 const coverage={value:new T.Vector4(-210,-210,210,210)};
 const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
 material.onBeforeCompile=shader=>{
  shader.uniforms.localCoverage=coverage;
  shader.vertexShader='varying vec2 regionalXZ;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nregionalXZ=position.xz;');
  shader.fragmentShader='varying vec2 regionalXZ; uniform vec4 localCoverage;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
   if(abs(regionalXZ.x)<210.0 && abs(regionalXZ.y)<210.0) discard;
   if(regionalXZ.x>localCoverage.x && regionalXZ.y>localCoverage.y && regionalXZ.x<localCoverage.z && regionalXZ.y<localCoverage.w) discard;`);
 };
 material.customProgramCacheKey=()=> 'mola-far-lod-v1';
 const mesh=new T.Mesh(geometry,material);mesh.name='MOLA regional relief';root.add(mesh);
 return {setCoverage:(west:number,north:number,east:number,south:number)=>coverage.value.set(west,north,east,south)};
}
