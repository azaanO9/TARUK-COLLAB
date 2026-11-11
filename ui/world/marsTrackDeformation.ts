import * as T from "three";
import { ROVER_WHEEL_OFFSETS, type RoverVehicle } from "../../game/roverVehicle.ts";
import { CURIOSITY_WHEEL_OFFSETS, type CuriosityRoverState } from "../../game/curiosityRover.ts";

export const TRACK_TEX_SIZE = 1024;
export const TRACK_WORLD_HALF = 96; // covers [-96, +96] meters
const TRACK_WORLD_SPAN = TRACK_WORLD_HALF * 2;
const TEXEL_SIZE = TRACK_WORLD_SPAN / TRACK_TEX_SIZE; // 0.1875m per texel
const PATCH_SIZE = 48; // 48x48 texels = 9m x 9m box enclosing all 6 wheels

export type MarsTrackSystem = {
  texture: T.DataTexture;
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

type StampRecord = { x: number; z: number; yaw: number };

export function createMarsTrackSystem(): MarsTrackSystem {
  const data = new Uint8Array(TRACK_TEX_SIZE * TRACK_TEX_SIZE * 4);
  const texture = new T.DataTexture(
    data,
    TRACK_TEX_SIZE,
    TRACK_TEX_SIZE,
    T.RGBAFormat,
    T.UnsignedByteType,
  );
  texture.minFilter = T.LinearFilter;
  texture.magFilter = T.LinearFilter;
  texture.wrapS = T.ClampToEdgeWrapping;
  texture.wrapT = T.ClampToEdgeWrapping;
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

  function stampWheel(wx: number, wz: number, wheelYaw: number, mud: number, treadScale: number) {
    if (Math.abs(wx) > TRACK_WORLD_HALF - 1.5 || Math.abs(wz) > TRACK_WORLD_HALF - 1.5) return;

    const fwdX = -Math.sin(wheelYaw);
    const fwdZ = -Math.cos(wheelYaw);
    const rightX = Math.cos(wheelYaw);
    const rightZ = -Math.sin(wheelYaw);

    const encB = Math.max(0, Math.min(255, Math.round((0.5 + 0.5 * fwdX) * 255)));
    const encA = Math.max(0, Math.min(255, Math.round((0.5 + 0.5 * fwdZ) * 255)));

    const cx = Math.floor(((wx + TRACK_WORLD_HALF) / TRACK_WORLD_SPAN) * TRACK_TEX_SIZE);
    const cy = Math.floor(((wz + TRACK_WORLD_HALF) / TRACK_WORLD_SPAN) * TRACK_TEX_SIZE);
    const kernel = 4; // +/- 4 texels = +/- 0.75m around wheel center
    const depthGain = (0.52 + 0.48 * mud) * (treadScale < 1 ? 0.85 : 1);
    const bermGain = (0.42 + 0.58 * mud) * (treadScale < 1 ? 0.82 : 1);
    const lonMax = 0.44 * treadScale;
    const lonCore = 0.2 * treadScale;
    const treadHalf = Math.max(0.21, 0.29 * treadScale);
    const bermMax = Math.max(0.48, 0.66 * treadScale);
    const bermPeak = Math.max(0.32, 0.43 * treadScale);
    const bermSigma = Math.max(0.12, 0.16 * treadScale);

    const minX = Math.max(0, cx - kernel);
    const maxX = Math.min(TRACK_TEX_SIZE - 1, cx + kernel);
    const minY = Math.max(0, cy - kernel);
    const maxY = Math.min(TRACK_TEX_SIZE - 1, cy + kernel);

    for (let ty = minY; ty <= maxY; ty++) {
      const tz = ((ty + 0.5) / TRACK_TEX_SIZE) * TRACK_WORLD_SPAN - TRACK_WORLD_HALF;
      const dz = tz - wz;
      for (let tx = minX; tx <= maxX; tx++) {
        const rx = ((tx + 0.5) / TRACK_TEX_SIZE) * TRACK_WORLD_SPAN - TRACK_WORLD_HALF;
        const dx = rx - wx;

        const lon = Math.abs(dx * fwdX + dz * fwdZ);
        if (lon > lonMax) continue;
        const lonFade = 1 - Math.max(0, (lon - lonCore) / (lonMax - lonCore));

        const lat = Math.abs(dx * rightX + dz * rightZ);
        const idx = (ty * TRACK_TEX_SIZE + tx) * 4;

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
    const prev = lastStamps.get(id);
    if (prev) {
      const moved = Math.hypot(x - prev.x, z - prev.z);
      const turned = Math.abs(yaw - prev.yaw);
      if (moved < TEXEL_SIZE * 0.8 && turned < 0.08) return;
    }

    lastStamps.set(id, { x, z, yaw });

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

    // Copy 48x48 sub-patch centered on vehicle to GPU (only ~9 KB transfer)
    const centerTx = Math.floor(((x + TRACK_WORLD_HALF) / TRACK_WORLD_SPAN) * TRACK_TEX_SIZE);
    const centerTy = Math.floor(((z + TRACK_WORLD_HALF) / TRACK_WORLD_SPAN) * TRACK_TEX_SIZE);
    const baseX = Math.max(0, Math.min(TRACK_TEX_SIZE - PATCH_SIZE, centerTx - (PATCH_SIZE >> 1)));
    const baseY = Math.max(0, Math.min(TRACK_TEX_SIZE - PATCH_SIZE, centerTy - (PATCH_SIZE >> 1)));

    const rowBytes = PATCH_SIZE * 4;
    for (let row = 0; row < PATCH_SIZE; row++) {
      const srcStart = ((baseY + row) * TRACK_TEX_SIZE + baseX) * 4;
      patchData.set(data.subarray(srcStart, srcStart + rowBytes), row * rowBytes);
    }

    patchTexture.needsUpdate = true;
    dstOrigin.set(baseX, baseY, 0);
    renderer.copyTextureToTexture(patchTexture, texture, null, dstOrigin);
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
    patchTexture.dispose();
    lastStamps.clear();
  }

  return { texture, stampRover, stampCuriosity, dispose };
}

