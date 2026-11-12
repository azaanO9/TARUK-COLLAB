import * as T from "three";

export type ContactShadowOptions = {
  width: number;
  depth: number;
  y?: number;
  opacity?: number;
  bodyHalfWidth?: number;
  bodyHalfLength?: number;
  wheels?: readonly (readonly [number, number])[];
  wheelRadiusX?: number;
  wheelRadiusZ?: number;
};

/** Soft, zero-shadow-pass radial/chassis contact shadow decal for grounded Martian hardware. */
export function createSoftContactShadow(options: ContactShadowOptions) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  const half = size * 0.5;
  const drawPool = (cx: number, cy: number, rx: number, ry: number, coreAlpha: number, midAlpha: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx / half, ry / half);
    const grad = ctx.createRadialGradient(0, 0, half * 0.14, 0, 0, half);
    grad.addColorStop(0, `rgba(22, 12, 8, ${coreAlpha})`);
    grad.addColorStop(0.58, `rgba(22, 12, 8, ${midAlpha})`);
    grad.addColorStop(1, "rgba(22, 12, 8, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  if (options.bodyHalfWidth && options.bodyHalfLength) {
    const rx = (options.bodyHalfWidth / (options.width * 0.5)) * half;
    const ry = (options.bodyHalfLength / (options.depth * 0.5)) * half;
    drawPool(half, half, rx, ry, 0.72, 0.34);
  } else {
    drawPool(half, half, half * 0.94, half * 0.94, 0.72, 0.32);
  }

  if (options.wheels?.length) {
    const wrx = ((options.wheelRadiusX ?? 0.42) / (options.width * 0.5)) * half;
    const wry = ((options.wheelRadiusZ ?? 0.55) / (options.depth * 0.5)) * half;
    for (const [wx, wz] of options.wheels) {
      const cx = half + (wx / (options.width * 0.5)) * half;
      const cy = half + (wz / (options.depth * 0.5)) * half;
      drawPool(cx, cy, wrx, wry, 0.62, 0.22);
    }
  }

  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  const material = new T.MeshBasicMaterial({
    map,
    transparent: true,
    opacity: options.opacity ?? 0.52,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const geometry = new T.PlaneGeometry(options.width, options.depth);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new T.Mesh(geometry, material);
  mesh.position.y = options.y ?? 0.025;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 1;
  return { mesh, material };
}

