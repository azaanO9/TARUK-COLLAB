import {createTrackWindow,forTrackPatch,wrapTrack,TRACK_METRES_PER_PIXEL} from "../../game/trackWindow.ts";
import * as T from "three";
import { ROVER_WHEEL_OFFSETS, type RoverVehicle } from "../../game/roverVehicle.ts";
import { CURIOSITY_WHEEL_OFFSETS, type CuriosityRoverState } from "../../game/curiosityRover.ts";

export const TRACK_TEX_SIZE = 1024;
export const TRACK_WORLD_HALF = TRACK_TEX_SIZE * TRACK_METRES_PER_PIXEL / 2;
const TEXEL_SIZE = TRACK_METRES_PER_PIXEL;
const PATCH_SIZE = 48; // 48x48 texels = 9m x 9m box enclosing all 6 wheels

export type MarsTrackSystem = {
  texture: T.DataTexture;
  maskTexture:T.DataTexture;
  origin:T.Vector2;
  scroll:T.Vector2;
  worldHalf:number;
  texel:number;
  update:(renderer:T.WebGLRenderer,x:number,z:number,light:boolean)=>void;
  stampRover: (
    renderer: T.WebGLRenderer,
    rover: RoverVehicle,
    mudAt: (x: number, z: number) => number,
  ) => void;
  stampCuriosity: (
    renderer: T.WebGLRenderer,
    curiosity: CuriosityRoverState,
    mudAt: (x: number, z: number) => number,
  ) => void;
  dispose: () => void;
};

type StampRecord = { x: number; z: number; yaw: number; time:number };

export function createMarsTrackSystem(light=false): MarsTrackSystem {
  const size=light?512:TRACK_TEX_SIZE;
  const field=createTrackWindow(size),data=field.data;
  const origin=new T.Vector2(),scroll=new T.Vector2();
  const maskTexture=new T.DataTexture(field.mask,8,8,T.RGBAFormat);
  maskTexture.minFilter=maskTexture.magFilter=T.NearestFilter;maskTexture.generateMipmaps=false;maskTexture.needsUpdate=true;
  const clearTexture=new T.DataTexture(new Uint8Array(field.pageSize*field.pageSize*4),field.pageSize,field.pageSize,T.RGBAFormat);
  clearTexture.generateMipmaps=false;clearTexture.needsUpdate=true;
  let lightBudget=light;
  const texture = new T.DataTexture(
    data,
    size,
    size,
    T.RGBAFormat,
    T.UnsignedByteType,
  );
  texture.minFilter = T.LinearFilter;
  texture.magFilter = T.LinearFilter;
  texture.wrapS = T.RepeatWrapping;
  texture.wrapT = T.RepeatWrapping;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.needsUpdate = true;

  const patchData = new Uint8Array(PATCH_SIZE * PATCH_SIZE * 4);
  const patchTexture = new T.DataTexture(
    patchData,
    PATCH_SIZE,
    PATCH_SIZE,
    T.RGBAFormat,
    T.UnsignedByteType,
  );
  patchTexture.minFilter = T.LinearFilter;
  patchTexture.magFilter = T.LinearFilter;
  patchTexture.generateMipmaps = false;
  patchTexture.flipY = false;

  const dstOrigin = new T.Vector3(0, 0, 0);
  const lastStamps = new Map<string, StampRecord>();
  const copyRegion=new T.Box2();
  let activeRenderer:T.WebGLRenderer;
  const copyPatch=(sx:number,sy:number,w:number,h:number,dx:number,dy:number)=>{
    copyRegion.min.set(sx,sy);copyRegion.max.set(sx+w,sy+h);dstOrigin.set(dx,dy,0);
    activeRenderer.copyTextureToTexture(patchTexture,texture,copyRegion,dstOrigin);
  };
  function update(renderer:T.WebGLRenderer,x:number,z:number,low:boolean){
    lightBudget=low;
    if(field.moveTo(x,z)){
      origin.set(field.center.x,field.center.z);
      scroll.set(wrapTrack(field.center.x,field.span)/field.span,wrapTrack(field.center.z,field.span)/field.span);
      maskTexture.needsUpdate=true;
    }
    for(let n=0;n<(lightBudget?1:2);n++){
      const page=field.nextPage();if(page===undefined)break;
      dstOrigin.set(page%8*field.pageSize,Math.floor(page/8)*field.pageSize,0);
      renderer.copyTextureToTexture(clearTexture,texture,null,dstOrigin);
      field.markReady(page);maskTexture.needsUpdate=true;
    }
  }

  function stampWheel(wx: number, wz: number, wheelYaw: number, mud: number, treadScale: number) {
    if (!field.contains(wx,wz,1.5)||!field.ready(wx,wz)) return;

    const fwdX = -Math.sin(wheelYaw);
    const fwdZ = -Math.cos(wheelYaw);
    const rightX = Math.cos(wheelYaw);
    const rightZ = -Math.sin(wheelYaw);

    const encB = Math.max(0, Math.min(255, Math.round((0.5 + 0.5 * fwdX) * 255)));
    const encA = Math.max(0, Math.min(255, Math.round((0.5 + 0.5 * fwdZ) * 255)));

    const cx = Math.floor(wx / TEXEL_SIZE);
    const cy = Math.floor(wz / TEXEL_SIZE);
    const kernel = 4; // +/- 4 texels = +/- 0.75m around wheel center
    const depthGain = (0.52 + 0.48 * mud) * (treadScale < 1 ? 0.85 : 1);
    const bermGain = (0.42 + 0.58 * mud) * (treadScale < 1 ? 0.82 : 1);
    const lonMax = 0.44 * treadScale;
    const lonCore = 0.2 * treadScale;
    const treadHalf = Math.max(0.21, 0.29 * treadScale);
    const bermMax = Math.max(0.48, 0.66 * treadScale);
    const bermPeak = Math.max(0.32, 0.43 * treadScale);
    const bermSigma = Math.max(0.12, 0.16 * treadScale);

    const minX=cx-kernel,maxX=cx+kernel,minY=cy-kernel,maxY=cy+kernel;

    for (let ty = minY; ty <= maxY; ty++) {
      const tz = (ty+.5)*TEXEL_SIZE;
      const dz = tz - wz;
      for (let tx = minX; tx <= maxX; tx++) {
        const rx = (tx+.5)*TEXEL_SIZE;
        const dx = rx - wx;

        const lon = Math.abs(dx * fwdX + dz * fwdZ);
        if (lon > lonMax) continue;
        const lonFade = 1 - Math.max(0, (lon - lonCore) / (lonMax - lonCore));

        const lat = Math.abs(dx * rightX + dz * rightZ);
        if(!field.ready(rx,tz))continue;
        const idx = (wrapTrack(ty+size/2,size)*size+wrapTrack(tx+size/2,size))*4;

        if (lat <= treadHalf) {
          // Tire center trough: press sand/mud downward
          const cross = 1 - Math.pow(lat / treadHalf, 2);
          const rutVal = Math.min(255, Math.round(cross * lonFade * depthGain * 255));
          if (rutVal > data[idx]) {
            data[idx] = rutVal;
            data[idx + 2] = encB;
            data[idx + 3] = encA;
          }
          // Flatten any existing berm directly crushed by the tire
          if (rutVal > 40) {
            data[idx + 1] = Math.round(data[idx + 1] * Math.max(0.25, 1 - (rutVal / 255) * 0.75));
          }
        } else if (lat <= bermMax) {
          // Raised displaced mud/regolith berms flanking both sides of the tire
          const dEdge = (lat - bermPeak) / bermSigma;
          const ridge = Math.exp(-dEdge * dEdge);
          const bermVal = Math.min(255, Math.round(ridge * lonFade * bermGain * 255));
          if (bermVal > data[idx + 1]) {
            data[idx + 1] = bermVal;
          }
        }
      }
    }
  }

  function stampVehicle(
    id: string,
    x: number,
    z: number,
    yaw: number,
    frontSteer: number,
    rearSteer: number,
    wheelOffsets: readonly (readonly [number, number])[],
    treadScale: number,
    renderer: T.WebGLRenderer,
    mudAt: (wx: number, wz: number) => number,
  ) {
    if(!field.contains(x,z,5)||!field.ready(x,z))return;
    const now=performance.now(),prev = lastStamps.get(id);
    if(prev&&now-prev.time<(lightBudget?50:33))return;
    if (prev) {
      const moved = Math.hypot(x - prev.x, z - prev.z);
      const turned = Math.abs(yaw - prev.yaw);
      if (moved < TEXEL_SIZE * 0.8 && turned < 0.08) return;
    }

    if(prev){prev.x=x;prev.z=z;prev.yaw=yaw;prev.time=now;}else lastStamps.set(id,{x,z,yaw,time:now});

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);

    for (let i = 0; i < wheelOffsets.length; i++) {
      const [lx, lz] = wheelOffsets[i];
      const wx = x + lx * cosY + lz * sinY;
      const wz = z - lx * sinY + lz * cosY;
      const wheelYaw = i < 2 ? yaw + frontSteer : i >= 4 ? yaw + rearSteer : yaw;
      const mud = mudAt(wx, wz);
      stampWheel(wx, wz, wheelYaw, mud, treadScale);
    }

    // Reuse the same ~9 KB patch, splitting only when it wraps an atlas edge.
    const baseX=field.pixel(x)-(PATCH_SIZE>>1),baseY=field.pixel(z)-(PATCH_SIZE>>1);
    for(let row=0;row<PATCH_SIZE;row++)for(let col=0;col<PATCH_SIZE;col++){
      const source=(wrapTrack(baseY+row,size)*size+wrapTrack(baseX+col,size))*4,target=(row*PATCH_SIZE+col)*4;
      for(let c=0;c<4;c++)patchData[target+c]=data[source+c];
    }
    patchTexture.needsUpdate=true;activeRenderer=renderer;
    forTrackPatch(size,PATCH_SIZE,baseX,baseY,copyPatch);
  }

  function stampRover(
    renderer: T.WebGLRenderer,
    rover: RoverVehicle,
    mudAt: (x: number, z: number) => number,
  ) {
    stampVehicle("rover", rover.x, rover.z, rover.yaw, rover.steerAngle, 0, ROVER_WHEEL_OFFSETS, 1, renderer, mudAt);
  }

  function stampCuriosity(
    renderer: T.WebGLRenderer,
    curiosity: CuriosityRoverState,
    mudAt: (x: number, z: number) => number,
  ) {
    stampVehicle(
      "curiosity",
      curiosity.x,
      curiosity.z,
      curiosity.yaw,
      curiosity.steerAngle,
      -curiosity.steerAngle * 0.85,
      CURIOSITY_WHEEL_OFFSETS,
      0.8,
      renderer,
      mudAt,
    );
  }

  function dispose() {
    texture.dispose();
    patchTexture.dispose();maskTexture.dispose();clearTexture.dispose();
    lastStamps.clear();
  }

  return { texture, maskTexture, origin, scroll, worldHalf:field.half,texel:1/size, update, stampRover, stampCuriosity, dispose };
}

