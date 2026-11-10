import * as T from "three";
import { STATIONS } from "../../content/survival.ts";

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

export function createMarsTerrain(root: T.Group) {
  const obstacles: { x: number; z: number; radius: number }[] = [];
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const pixels = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const n = random(x + y * 512), ripple = Math.sin(x * .075 + Math.sin(y * .012) * 5) * 4;
    const v = n * 28 + Math.sin(x * .013) * Math.cos(y * .019) * 12 + ripple;
    const i = (x + y * 512) * 4;
    pixels.data[i] = 132 + v; pixels.data[i + 1] = 86 + v * .72; pixels.data[i + 2] = 61 + v * .5; pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const map = new T.CanvasTexture(canvas); map.wrapS = map.wrapT = T.RepeatWrapping;
  map.repeat.set(46, 46); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  const bump = map.clone(); bump.colorSpace = T.NoColorSpace;
  const geometry = new T.PlaneGeometry(420, 420, 320, 320); geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position, colors = new Float32Array(pos.count * 3), c = new T.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = marsHeight(x, z); pos.setY(i, h);
    const variation = Math.sin(x * .021 + z * .037) * .06 + Math.sin(z * .13) * .025;
    const basalt = Math.max(0, Math.sin(x * .036 + Math.sin(z * .021) * 2) * Math.cos(z * .041) - .35);
    c.setHSL(.052 + variation * .13 + basalt * .025, .27 + variation - basalt * .1, .63 + variation + h * .012 - basalt * .16);
    c.toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new T.BufferAttribute(colors, 3)); geometry.computeVertexNormals();
  const ground = new T.Mesh(geometry, new T.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: .18, vertexColors: true, roughness: .98 }));
  ground.receiveShadow = true; root.add(ground);

  // Thousands of stones use two draw calls; individual rocks have original eroded geometry.
  const rockGeometry = new T.IcosahedronGeometry(1, 1), rp = rockGeometry.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i);
    const n = 1 + Math.sin(x * 13 + y * 17 + z * 7) * .17;
    rp.setXYZ(i, x * n, y * n * .7, z * n);
  }
  rockGeometry.computeVertexNormals();
  const rockMat = new T.MeshStandardMaterial({ color: 0xb78a69, roughness: .95, map, bumpMap: bump, bumpScale: .12 });
  for (const [count, large] of [[6500, false], [450, true]] as const) {
    const rocks = new T.InstancedMesh(rockGeometry, rockMat, count), dummy = new T.Object3D();
    rocks.name = large ? "mars-large-rocks" : "mars-small-rocks";
    for (let i = 0; i < count; i++) {
      const seed = i + (large ? 9000 : 0), x = (random(seed * 7) - .5) * 240, z = (random(seed * 7 + 1) - .5) * 240;
      const nearStation = STATIONS.some(s => Math.hypot(x - s.x, z - s.z) < 4.5) || Math.hypot(x, z - 12) < 5;
      const size = nearStation && large ? .07 : large ? .35 + random(seed + 3) * 1.15 : .035 + random(seed + 4) ** 3 * .24;
      if (large && size > .25 && Math.abs(x) < 87 && Math.abs(z) < 87) obstacles.push({ x, z, radius: size * 1.15 + .3 });
      dummy.position.set(x, marsHeight(x, z) + size * .21, z);
      dummy.scale.set(size * (1 + random(seed + 14) * .65), size * (.48 + random(seed + 15) * .5), size * (.7 + random(seed + 16) * .6)); dummy.rotation.set(seed, seed * .6, seed * .13); dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
      rocks.setColorAt(i, c.setHSL(.05 + random(seed) * .035, .18 + random(seed + 5) * .2, .3 + random(seed + 6) * .24));
    }
    rocks.receiveShadow = true; rocks.castShadow = large; root.add(rocks);
  }
  // Stratified escarpments break up the skyline without a cylindrical image seam.
  const cliffMat = new T.MeshStandardMaterial({ color: 0x865d4a, roughness: 1, flatShading: false });
  for (let i = 0; i < 70; i++) {
    const a = i * Math.PI * 2 / 70, r = 145 + random(i + 54) * 40, height = 9 + random(i + 22) ** 2 * 34;
    const geo = new T.CylinderGeometry(2 + random(i) * 6, 18 + random(i + 4) * 18, height, 24, 24);
    const p = geo.attributes.position;
    for (let j = 0; j < p.count; j++) {
      const x = p.getX(j), y = p.getY(j), z = p.getZ(j);
      const taper = 1 + Math.sin(y * 1.7) * .045 + Math.sin(x * .7 + z * .4) * .12 + Math.sin(x * 1.3 + z * 1.1 + y * .4) * .07;
      p.setXYZ(j, x * taper, y + Math.sin(x * .5 + z * .3) * 1.5, z * taper);
    }
    geo.computeVertexNormals();
    const cliff = new T.Mesh(geo, cliffMat); cliff.position.set(Math.sin(a) * r, height * .36 - 3, Math.cos(a) * r);
    cliff.rotation.y = i * 2.3; root.add(cliff);
  }
  return { heightAt: marsHeight, obstacles };
}

export function createMarsSky(scene: T.Scene) {
  const material = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms: { night: { value: 0 } },
    vertexShader: `varying vec3 direction; void main(){ direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 direction; uniform float night;
      void main(){ vec3 d=normalize(direction); float h=max(d.y,0.);
        vec3 day=mix(vec3(.79,.48,.32),vec3(.53,.39,.30),pow(h,.48));
        float sunAngle=max(dot(d,normalize(vec3(-.55,.28,-.8))),0.);
        float blueHalo=pow(sunAngle,32.) * .28;
        float sun=pow(sunAngle,140.);
        day=mix(day,vec3(.49,.56,.64),blueHalo);
        day+=vec3(.65,.48,.32)*sun;
        vec3 dark=mix(vec3(.12,.10,.14),vec3(.012,.024,.054),pow(h,.45));
        gl_FragColor=vec4(mix(day,dark,night),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new T.Mesh(new T.SphereGeometry(390, 40, 24), material); scene.add(sky);
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
