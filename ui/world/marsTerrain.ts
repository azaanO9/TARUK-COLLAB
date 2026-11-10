import * as T from "three";
import { STATIONS } from "../../content/survival.ts";
import { terrainFbm, terrainNoise } from "./terrainNoise.ts";

// One continuous surface is sampled by geometry, stones, boots and camera.
const craters = [[24, -29, 7, 2.1], [38, -48, 12, 3.5], [62, -22, 9, 2.8], [-48, 24, 15, 4], [-55, -52, 20, 5.5], [51, 57, 22, 6]];
const smooth = (a: number, b: number, x: number) => { const t = T.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const random = (n: number) => T.MathUtils.euclideanModulo(Math.sin(n * 127.1 + 311.7) * 43758.5453, 1);
function rawHeight(x: number, z: number) {
  let h = Math.sin(x * .055 + z * .024) * Math.cos(z * .065) * 1.7
    + Math.sin(x * .17 + Math.sin(z * .1)) * .4 + Math.sin(z * .38 + x * .22) * .13;
  for (const [cx, cz, radius, depth] of craters) {
    const d = Math.hypot(x - cx, z - cz) / radius;
    h += -depth * Math.exp(-Math.pow(d * 1.6, 4)) + depth * .36 * Math.exp(-Math.pow((d - .94) / .16, 2));
  }
  return h;
}
export function marsHeight(x: number, z: number) {
  // Graded engineering pads keep all existing equipment and approach routes usable.
  let blend = smooth(19, 30, Math.hypot(x, z + 6));
  blend = Math.min(blend, smooth(7, 13, Math.hypot(x + 2, z + 30)));
  for (const s of STATIONS) blend = Math.min(blend, smooth(4.5, 8.5, Math.hypot(x - s.x, z - s.z)));
  return blend === 0 ? 0 : rawHeight(x, z) * blend;
}

export function createMarsTerrain(root: T.Group, surface?:T.Texture) {
  const obstacles: { x: number; z: number; radius: number }[] = [];
  const canvas=document.createElement("canvas");canvas.width=canvas.height=512;
  const ctx=canvas.getContext("2d")!,pixels=ctx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const i=(y*512+x)*4;
    const grain=random(x+y*512)*22-11;
    const dune=Math.sin(x*.22+Math.sin(y*.018)*3+Math.sin(y*.071)) * 4;
    const mottling=terrainFbm(x*.024,y*.024)*23;
    pixels.data[i]=165+grain+dune+mottling;
    pixels.data[i+1]=108+grain*.7+dune*.7+mottling*.8;
    pixels.data[i+2]=72+grain*.45+dune*.45+mottling*.6;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const map=surface ?? new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(46,46);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  const bump=map.clone();bump.colorSpace=T.NoColorSpace;
  const geometry=new T.PlaneGeometry(420,420,256,256);geometry.rotateX(-Math.PI/2);
  const pos=geometry.attributes.position;
  for(let i=0;i<pos.count;i++)pos.setY(i,marsHeight(pos.getX(i),pos.getZ(i)));
  geometry.computeVertexNormals();
  const colors=new Float32Array(pos.count*3),color=new T.Color();
  const rust=new T.Color(0xe0c7aa),ochre=new T.Color(0xf3dfc3),basalt=new T.Color(0x85796e);
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i),slope=1-geometry.attributes.normal.getY(i);
    const patch=terrainFbm(x*.037,z*.037);
    color.copy(rust).lerp(ochre,Math.max(0,patch-.4)*1.25);
    color.lerp(basalt,Math.min(.65,slope*2+Math.max(0,terrainNoise(x*.08,z*.08)-.73)));
    color.toArray(colors,i*3);
  }
  geometry.setAttribute("color",new T.BufferAttribute(colors,3));
  const groundMat=new T.MeshStandardMaterial({map,bumpMap:bump,bumpScale:.13,vertexColors:true,roughness:.98});
  // A second rotated texture scale breaks up the periodic base map without a new asset.
  groundMat.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      #ifdef USE_MAP
      vec3 broadDust=texture2D(map,mat2(.79,-.61,.61,.79)*vMapUv*.173+vec2(.21,.73)).rgb;
      diffuseColor.rgb*=mix(vec3(.81),vec3(1.24),broadDust.r);
      #endif`);
  };
  groundMat.customProgramCacheKey=()=>"tarukh-regolith-dual-scale-v1";
  const ground=new T.Mesh(geometry,groundMat);ground.receiveShadow=true;root.add(ground);

  const rockMat=new T.MeshStandardMaterial({color:0xad8a70,map,bumpMap:bump,bumpScale:.15,roughness:1});
  const makeRock=(detail:number,variant:number)=>{
    const geo=new T.IcosahedronGeometry(1,detail),p=geo.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const n=1+Math.sin(x*8.4+y*7.1+z*11+variant*2)*.14+Math.sin(x*17-z*13+variant)*.07;
      p.setXYZ(i,x*n,y*n*(.68+variant*.07),z*n);
    }geo.computeVertexNormals();return geo;
  };
  const small=new T.InstancedMesh(makeRock(0,0),rockMat,6500);small.name="mars-small-rocks";
  const large=Array.from({length:4},(_,i)=>new T.InstancedMesh(makeRock(2,i),rockMat,Math.ceil((450-i)/4)));
  const dummy=new T.Object3D();
  for(const [count,big] of [[6500,false],[450,true]] as const){
    for(let i=0;i<count;i++){
      const seed=i+(big?9000:0),x=(random(seed*7)-.5)*240,z=(random(seed*7+1)-.5)*240;
      const near=STATIONS.some(s=>Math.hypot(x-s.x,z-s.z)<4.5)||Math.hypot(x,z-12)<5;
      const size=near&&big?.07:big?.35+random(seed+3)*1.15:.035+random(seed+4)**3*.24;
      if(big&&size>.25&&Math.abs(x)<87&&Math.abs(z)<87)obstacles.push({x,z,radius:size*1.15+.3});
      dummy.position.set(x,marsHeight(x,z)+size*.16,z);
      dummy.scale.set(size*(1+random(seed+14)*.6),size*(.55+random(seed+15)*.3),size*(.7+random(seed+16)*.6));
      dummy.rotation.set(seed,seed*.6,seed*.13);dummy.updateMatrix();
      const mesh=big?large[i%4]:small,index=big?Math.floor(i/4):i;
      mesh.setMatrixAt(index,dummy.matrix);
      color.setHSL(.054+random(seed)*.018,.13+random(seed+5)*.13,.25+random(seed+6)*.25);
      mesh.setColorAt(index,color);
    }
  }
  small.receiveShadow=true;root.add(small);
  for(const rocks of large){rocks.castShadow=rocks.receiveShadow=true;root.add(rocks);}

  // Two depth layers of deeply eroded mesas. Vertex colours survive static batching.
  const cliffCanvas=document.createElement("canvas");cliffCanvas.width=cliffCanvas.height=512;
  const cliffCtx=cliffCanvas.getContext("2d")!,cliffPixels=cliffCtx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const i=(y*512+x)*4;
    const bands=Math.sin(y*.16+terrainNoise(x*.02,y*.009)*2)*12+Math.sin(y*.65)*4;
    const fissure=Math.max(0,Math.sin(x*.17+Math.sin(y*.015))-.7)*40;
    const grit=random(x+y*512)*24;
    const value=210+bands-fissure+grit;
    cliffPixels.data[i]=value;cliffPixels.data[i+1]=value;cliffPixels.data[i+2]=value;cliffPixels.data[i+3]=255;
  }cliffCtx.putImageData(cliffPixels,0,0);
  const cliffMap=new T.CanvasTexture(cliffCanvas);cliffMap.wrapS=cliffMap.wrapT=T.RepeatWrapping;cliffMap.repeat.set(4,2);cliffMap.colorSpace=T.SRGBColorSpace;
  
  const cliffMat=new T.MeshLambertMaterial({color:0xffffff,vertexColors:true,map:cliffMap});
  const close=new T.Color(0xac6f49),lightStrata=new T.Color(0xca9566),dustHaze=new T.Color(0xba8c73);
  // A continuous eroded canyon surface, rather than a circular fence of identical towers.
  const landscape=new T.PlaneGeometry(720,720,240,240);landscape.rotateX(-Math.PI/2);
  const lp=landscape.attributes.position,landColors=new Float32Array(lp.count*3);
  for(let i=0;i<lp.count;i++){
    const x=lp.getX(i),z=lp.getZ(i),r=Math.hypot(x,z);
    const broad=terrainFbm(x*.009,z*.009);
    const warped=terrainFbm(x*.017+broad*2.7,z*.016-broad*1.8);
    const plateau=smooth(.43,.62,warped);
    const ridge=1-Math.abs(terrainFbm(x*.031,z*.031)*2-1);
    const apron=smooth(110,240,r);
    const rightWall=.72+smooth(-20,150,x)*.6;
    let height=(plateau*57+ridge*14+terrainNoise(x*.07,z*.07)*3)*rightWall;
    // Thin ledges and vertical erosion retain an angular, stratified rock face.
    const ledge=Math.floor(height/2.4)*2.4;
    height=height*.72+ledge*.28;
    lp.setY(i,-9+(height+9)*apron);
  }
  landscape.computeVertexNormals();
  for(let i=0;i<lp.count;i++){
    const x=lp.getX(i),y=lp.getY(i),z=lp.getZ(i),r=Math.hypot(x,z);
    const slope=1-landscape.attributes.normal.getY(i);
    const band=.26+.1*Math.sin(y*.6+terrainNoise(x*.035,z*.035)*2);
    color.copy(close).lerp(lightStrata,band+Math.max(0,1-slope)*.12);
    color.lerp(dustHaze,smooth(140,370,r)*.45);color.toArray(landColors,i*3);
  }
  landscape.setAttribute("color",new T.BufferAttribute(landColors,3));
  cliffMap.repeat.set(1,1);
  // Rock grain is projected in world space to avoid stretched cliff-wall UVs.
  cliffMat.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vCanyonPosition; varying vec3 vCanyonNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vCanyonPosition=(modelMatrix*vec4(position,1.)).xyz;
      vCanyonNormal=normalize(mat3(modelMatrix)*normal);`);
    shader.fragmentShader='varying vec3 vCanyonPosition; varying vec3 vCanyonNormal;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
      vec3 blend=abs(normalize(vCanyonNormal));blend/=max(.001,blend.x+blend.y+blend.z);
      vec3 cliffGrain=texture2D(map,vCanyonPosition.yz*.065).rgb*blend.x;
      cliffGrain+=texture2D(map,vCanyonPosition.xz*.065).rgb*blend.y;
      cliffGrain+=texture2D(map,vCanyonPosition.xy*.065).rgb*blend.z;
      diffuseColor.rgb*=mix(vec3(.83),vec3(1.12),cliffGrain);
      #endif`);
  };
  cliffMat.customProgramCacheKey=()=>"tarukh-canyon-world-grain-v1";
  const canyon=new T.Mesh(landscape,cliffMat);root.add(canyon);
  return {heightAt:marsHeight,obstacles};
}

export function createMarsSky(scene: T.Scene) {
  const material = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms: { night: { value: 0 } },
    vertexShader: `varying vec3 direction; void main(){ direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 direction; uniform float night;
      void main(){ vec3 d=normalize(direction); float h=max(d.y,0.);
        vec3 day=mix(vec3(.61,.30,.16),vec3(.29,.20,.18),pow(h,.54));
        float sunAngle=max(dot(d,normalize(vec3(-.4,.23,-.8))),0.);
        float blueHalo=pow(sunAngle,32.) * .07;
        float sun=pow(sunAngle,140.);
        day=mix(day,vec3(.49,.56,.64),blueHalo);
        day+=vec3(1.3,.63,.19)*sun + vec3(.26,.09,.025)*pow(sunAngle,18.);
        vec3 dark=mix(vec3(.12,.10,.14),vec3(.012,.024,.054),pow(h,.45));
        gl_FragColor=vec4(mix(day,dark,night),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new T.Mesh(new T.SphereGeometry(850, 40, 24), material); scene.add(sky);
  return material;
}

export function createMarsFootprints(scene: T.Scene) {
  const c = document.createElement("canvas"); c.width = 64; c.height = 128; const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgba(32,18,12,.23)"; ctx.fillRect(12, 9, 40, 105);
  ctx.fillStyle = "rgba(25,13,9,.28)";
  for (let i = 0; i < 8; i++) ctx.fillRect(15, 15 + i * 12, 34, 5);
  const texture = new T.CanvasTexture(c);
  const stamps = new T.InstancedMesh(new T.PlaneGeometry(.23, .43).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), 160);
  stamps.count = 0; stamps.frustumCulled = false; stamps.renderOrder = 1; scene.add(stamps);
  const dummy = new T.Object3D(); let index = 0, lastX = 0, lastZ = 12;
  return (x: number, z: number, yaw: number, grounded: boolean) => {
    if (!grounded || Math.hypot(x - lastX, z - lastZ) < .65) return;
    const side = index % 2 ? -.17 : .17, sx = x + Math.cos(yaw) * side, sz = z - Math.sin(yaw) * side;
    dummy.position.set(sx, marsHeight(sx, sz) + .025, sz); dummy.rotation.set(0, yaw, 0); dummy.updateMatrix();
    stamps.setMatrixAt(index % 160, dummy.matrix); stamps.count = Math.min(160, ++index); stamps.instanceMatrix.needsUpdate = true;
    lastX = x; lastZ = z;
  };
}
