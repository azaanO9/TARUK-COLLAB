import * as T from "three";
import { ROVER_WHEEL_OFFSETS, type RoverVehicle } from "../../game/roverVehicle.ts";

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
  dispose: () => void;
};

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
  let lastStampX = Infinity;
  let lastStampZ = Infinity;
  let lastStampYaw = 0;

  function stampWheel(wx: number, wz: number, wheelYaw: number, mud: number) {
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
    const depthGain = 0.52 + 0.48 * mud;
    const bermGain = 0.42 + 0.58 * mud;

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
        if (lon > 0.44) continue;
        const lonFade = 1 - Math.max(0, (lon - 0.2) / 0.24);

        const lat = Math.abs(dx * rightX + dz * rightZ);
        const idx = (ty * TRACK_TEX_SIZE + tx) * 4;

        if (lat <= 0.29) {
          // Tire center trough: press sand/mud downward
          const cross = 1 - Math.pow(lat / 0.29, 2);
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
        } else if (lat <= 0.66) {
          // Raised displaced mud/regolith berms flanking both sides of the tire
          const dEdge = (lat - 0.43) / 0.16;
          const ridge = Math.exp(-dEdge * dEdge);
          const bermVal = Math.min(255, Math.round(ridge * lonFade * bermGain * 255));
          if (bermVal > data[idx + 1]) {
            data[idx + 1] = bermVal;
          }
        }
      }
    }
  }

  function stampRover(
    renderer: T.WebGLRenderer,
    rover: RoverVehicle,
    mudAt: (x: number, z: number) => number,
  ) {
    const moved = Math.hypot(rover.x - lastStampX, rover.z - lastStampZ);
    const turned = Math.abs(rover.yaw - lastStampYaw);
    if (moved < TEXEL_SIZE * 0.8 && turned < 0.08) return;

    lastStampX = rover.x;
    lastStampZ = rover.z;
    lastStampYaw = rover.yaw;

    const cosY = Math.cos(rover.yaw);
    const sinY = Math.sin(rover.yaw);

    for (let i = 0; i < 6; i++) {
      const [lx, lz] = ROVER_WHEEL_OFFSETS[i];
      const wx = rover.x + lx * cosY + lz * sinY;
      const wz = rover.z - lx * sinY + lz * cosY;
      const wheelYaw = i < 2 ? rover.yaw + rover.steerAngle : rover.yaw;
      const mud = mudAt(wx, wz);
      stampWheel(wx, wz, wheelYaw, mud);
    }

    // Copy 48x48 sub-patch centered on rover to GPU (only ~9 KB transfer)
    const centerTx = Math.floor(((rover.x + TRACK_WORLD_HALF) / TRACK_WORLD_SPAN) * TRACK_TEX_SIZE);
    const centerTy = Math.floor(((rover.z + TRACK_WORLD_HALF) / TRACK_WORLD_SPAN) * TRACK_TEX_SIZE);
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

  function dispose() {
    texture.dispose();
    patchTexture.dispose();
  }

  return { texture, stampRover, dispose };
}
