import * as T from "three";
import { STATIONS } from "../../content/survival.ts";
import { terrainFbm, terrainNoise } from "./terrainNoise.ts";
import { createMarsTrackSystem, TRACK_WORLD_HALF } from "./marsTrackDeformation.ts";
import type { RoverVehicle } from "../../game/roverVehicle.ts";
import { SAGE_DOCK } from "../../game/sageCompanion.ts";
import { fallbackMarsSurfaceTextures, stochasticSurfaceGLSL, type MarsSurfaceTextures } from "./marsSurfaceTextures.ts";

// One continuous surface is sampled by geometry, stones, boots and camera.
const craters = [[24, -29, 7, 2.1], [38, -48, 12, 3.5], [62, -22, 9, 2.8], [-48, 24, 15, 4], [-55, -52, 20, 5.5], [51, 57, 22, 6]];
const smooth = (a: number, b: number, x: number) => { const t = T.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const random = (n: number) => T.MathUtils.euclideanModulo(Math.sin(n * 127.1 + 311.7) * 43758.5453, 1);

function rawHeight(x: number, z: number) {
  const warp = terrainFbm(x*.041+19,z*.041-8);
  let h = (terrainFbm(x*.035,z*.035)-.5)*3.8
    + Math.sin(x*.21+z*.08+warp*5)*(.16+terrainNoise(x*.08,z*.08)*.32)
    + (terrainFbm(x*.24+warp,z*.24-warp)-.5)*.65;
  for (const [cx, cz, radius, depth] of craters) {
    const d = Math.hypot(x - cx, z - cz) / radius;
    h += -depth * Math.exp(-Math.pow(d * 1.6, 4)) + depth * .36 * Math.exp(-Math.pow((d - .94) / .16, 2));
  }
  return h;
}

export function marsHeight(x: number, z: number) {
  // Only actual equipment pads are graded. Open spaces retain drifts and shallow swales.
  let blend = smooth(1.5, 3.2, Math.hypot(x, z - 12));
  blend = Math.min(blend, smooth(7.2, 10, Math.hypot(x + 2, z + 26)));
  blend = Math.min(blend, smooth(2.8,4.5,Math.hypot(x-SAGE_DOCK.x,z-SAGE_DOCK.z)));
  for (const s of STATIONS) {
    const pad=s.id==="shelter"?4.4:s.id==="solar"||s.id==="rover"?3.6:s.id==="research"?3.5:2.4;
    blend = Math.min(blend, smooth(pad,pad+2.1,Math.hypot(x-s.x,z-s.z)));
  }
  return blend === 0 ? 0 : rawHeight(x, z) * blend;
}

/** Deterministic soft mud / damp regolith factor (0 = firm sand, 1 = deep crater mud). */
export function mudDepthAt(x: number, z: number): number {
  let mud = 0;
  // Soft iron-oxide mud / silt inside craters
  for (const [cx, cz, radius] of craters) {
    const dist = Math.hypot(x - cx, z - cz) / radius;
    if (dist < 0.92) {
      mud = Math.max(mud, 0.95 * (1 - smooth(0.35, 0.92, dist)));
    }
  }
  // Natural low-lying soft regolith basins outside colony concrete pads
  const padFade = smooth(18, 28, Math.hypot(x, z + 6));
  const silt = terrainFbm(x * 0.037, z * 0.037);
  if (silt < 0.42) {
    mud = Math.max(mud, ((0.42 - silt) / 0.42) * 0.78 * padFade);
  }
  // Keep station pads firm
  for (const s of STATIONS) {
    mud *= smooth(3.5, 6.5, Math.hypot(x - s.x, z - s.z));
  }
  return Math.max(0, Math.min(1, mud));
}

export function colonySurfaceElevation(x: number, z: number): number {
  const floor=(cx:number,cz:number,hx:number,hz:number,height:number)=>{
    const edge=Math.min(hx-Math.abs(x-cx),hz-Math.abs(z-cz));
    return height*smooth(-.08,.08,edge);
  };
  let support=floor(SAGE_DOCK.x,SAGE_DOCK.z,1.63,1.45,.235);
  const shelter=STATIONS.find(s=>s.id==="shelter")!;
  support=Math.max(support,floor(shelter.x,shelter.z-.8,2.6,2.5,.12));
  for(let i=0;i<4;i++)support=Math.max(support,floor(-2,-26+(5.9-i*.4)*1.27,1.25*1.27,.24*1.27,(.23+i*.14)*1.27));
  // Rover launch & service pad at (17, 10), dimensions 4.1 x 6.2, top y = 0.215
  const dx = Math.abs(x - 17);
  const dz = Math.abs(z - 10);
  if (dx > 2.45 || dz > 3.5) return support;
  const rx = 1 - smooth(1.95, 2.45, dx);
  const rz = 1 - smooth(3.0, 3.5, dz);
  return Math.max(support,0.215 * Math.min(rx, rz));
}

type TraversableRock = { x: number; z: number; r: number; bump: number };

export function createMarsTerrain(root: T.Group, suppliedSurfaces?: MarsSurfaceTextures) {
  const obstacles: { x: number; z: number; radius: number; traversable?: boolean }[] = [];
  const surfaces = suppliedSurfaces ?? fallbackMarsSurfaceTextures();

  const PLANE_SIZE = 420;
  const PLANE_HALF = PLANE_SIZE * 0.5;
  const SEGMENTS = 420; // one-metre cells resolve low drifts and match physical ground contact
  const GRID_ROW = SEGMENTS + 1;
  const CELL_SIZE = PLANE_SIZE / SEGMENTS;

  const geometry = new T.PlaneGeometry(PLANE_SIZE, PLANE_SIZE, SEGMENTS, SEGMENTS);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  const heightGrid = new Float32Array(GRID_ROW * GRID_ROW);

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    const vy = marsHeight(vx, vz);
    pos.setY(i, vy);
    heightGrid[i] = vy;
  }
  geometry.computeVertexNormals();

  // O(1) exact mesh-triangle barycentric height lookup (matches rendered PlaneGeometry triangles)
  const sampleMeshHeight = (x: number, z: number): number => {
    const gx = (x + PLANE_HALF) / CELL_SIZE;
    const gz = (z + PLANE_HALF) / CELL_SIZE;
    if (gx < 0 || gx >= SEGMENTS || gz < 0 || gz >= SEGMENTS) {
      return marsHeight(x, z);
    }
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const u = gx - ix;
    const v = gz - iz;
    const i00 = iz * GRID_ROW + ix;
    const h00 = heightGrid[i00];
    const h10 = heightGrid[i00 + 1];
    const h01 = heightGrid[i00 + GRID_ROW];
    const h11 = heightGrid[i00 + GRID_ROW + 1];
    if (u + v <= 1) {
      return h00 + u * (h10 - h00) + v * (h01 - h00);
    }
    return h11 + (1 - u) * (h01 - h11) + (1 - v) * (h10 - h11);
  };

  const colors = new Float32Array(pos.count * 3);
  const color = new T.Color();
  const rust = new T.Color(0xffe2cc);
  const ochre = new T.Color(0xfff1dd);
  const basalt = new T.Color(0xc2b4a4);
  const darkMud = new T.Color(0xa99582);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), slope = 1 - geometry.attributes.normal.getY(i);
    const patch = terrainFbm(x * .037, z * .037);
    const mud = mudDepthAt(x, z);
    color.copy(rust).lerp(ochre, Math.max(0, patch - .4) * 1.25);
    color.lerp(basalt, Math.min(.65, slope * 2 + Math.max(0, terrainNoise(x * .08, z * .08) - .73)));
    if (mud > 0.05) {
      color.lerp(darkMud, mud * 0.42);
    }
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new T.BufferAttribute(colors, 3));

  const trackSystem = createMarsTrackSystem();

  const groundMat = new T.MeshStandardMaterial({
    map: surfaces.sand.color,
    bumpMap: surfaces.sand.relief,
    bumpScale: .035,
    vertexColors: true,
    roughness: .96,
  });

  // SnowRunner-style dynamic tire rut depression, displaced berms, normal perturbation & chevron lugs
  groundMat.onBeforeCompile = shader => {
    shader.uniforms.uTrackMap = { value: trackSystem.texture };
    shader.uniforms.uTrackBounds = { value: TRACK_WORLD_HALF };
    shader.uniforms.uGravelColor = { value: surfaces.gravel.color };
    shader.uniforms.uGravelRelief = { value: surfaces.gravel.relief };

    shader.vertexShader = `
      uniform sampler2D uTrackMap;
      uniform float uTrackBounds;
      varying vec3 vTrackWorldPos;
    \n` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vec3 worldInit = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vec2 tUv = (worldInit.xz + uTrackBounds) / (uTrackBounds * 2.0);
      if (tUv.x > 0.002 && tUv.x < 0.998 && tUv.y > 0.002 && tUv.y < 0.998) {
        vec4 trk = texture2D(uTrackMap, tUv);
        transformed.y += trk.g * 0.045 - trk.r * 0.105;
      }
      vTrackWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
    );

    shader.fragmentShader = `
      uniform sampler2D uTrackMap;
      uniform float uTrackBounds;
      uniform sampler2D uGravelColor;
      uniform sampler2D uGravelRelief;
      varying vec3 vTrackWorldPos;
      ${stochasticSurfaceGLSL}
    \n` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `// Scanned soil, randomized in world space with smooth non-repeating transitions.
      vec2 soilP=vTrackWorldPos.xz;
      vec2 warp=vec2(soilNoise(soilP*.045),soilNoise(soilP*.045+27.3))*7.0;
      float dustField=soilNoise((soilP+warp)*.09);
      float gravelField=smoothstep(.34,.70,soilNoise(soilP*.085+warp));
      float grain=soilNoise(soilP*36.0);
      float ripple=sin(dot(soilP,vec2(5.1,2.7))+soilNoise(soilP*.38)*6.0);
      // Source footprints are approximately 2.53m and 4m; preserve believable grain size.
      SoilSample dustScan=soilSample(map,bumpMap,soilP/2.53);
      SoilSample gravelScan=soilSample(uGravelColor,uGravelRelief,soilP/4.0+19.7);
      vec3 scannedColor=mix(dustScan.color,gravelScan.color,gravelField);
      // Desaturate green/yellow Earth-scan traces, then grade into an iron-dust palette.
      float luminance=dot(scannedColor,vec3(.2126,.7152,.0722));
      vec3 soilColor=mix(vec3(luminance),scannedColor,.35)*vec3(1.34,.89,.65);
      // Broad windblown deposits sit over the fine scan without a repeated tile edge.
      float drift=smoothstep(.32,.76,soilNoise((soilP+warp)*.035+11.7));
      soilColor*=mix(.86,1.10,dustField);
      soilColor=mix(soilColor,soilColor*vec3(1.09,1.06,1.01),drift*.52);
      diffuseColor.rgb*=soilColor;
      float soilRoughness=mix(dustScan.relief.g,gravelScan.relief.g,gravelField);
      float soilRelief=mix(dustScan.relief.r*.028,gravelScan.relief.r*.075,gravelField)
        +(grain-.5)*.0015+ripple*.003*(1.0-gravelField);
      vec2 fTrackUv = (vTrackWorldPos.xz + uTrackBounds) / (uTrackBounds * 2.0);
      vec4 fTrack = vec4(0.0);
      float fChevron = 0.0;
      if (fTrackUv.x > 0.002 && fTrackUv.x < 0.998 && fTrackUv.y > 0.002 && fTrackUv.y < 0.998) {
        fTrack = texture2D(uTrackMap, fTrackUv);
        if (fTrack.r > 0.03) {
          vec2 tDir = normalize(vec2(fTrack.b, fTrack.a) * 2.0 - 1.0 + vec2(0.0001));
          float along = dot(vTrackWorldPos.xz, tDir);
          float across = dot(vTrackWorldPos.xz, vec2(-tDir.y, tDir.x));
          fChevron = sin(along * 26.0 + abs(fract(across * 1.45) - 0.5) * 6.0);
          float darkMud = clamp(fTrack.r * (0.68 + 0.14 * (-fChevron)), 0.0, 0.85);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.72, 0.62, 0.52), darkMud);
        }
        if (fTrack.g > 0.04) {
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.12, 1.06, 0.98), fTrack.g * 0.32);
        }
      }`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      `#include <roughnessmap_fragment>
      roughnessFactor=clamp(.82+soilRoughness*.18,.88,1.0);
      if (fTrack.r > 0.03) {
        roughnessFactor = mix(roughnessFactor, 0.89, clamp(fTrack.r * 0.78, 0.0, 0.78));
      }`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_maps>",
      `// Coarse grit and fine dust have different relief; the albedo atlas is never a height map.
      normal=perturbNormalArb(-vViewPosition,normal,vec2(dFdx(soilRelief),dFdy(soilRelief)),faceDirection);
      if (fTrack.r > 0.02 || fTrack.g > 0.02) {
        float eps = 1.0 / 1024.0;
        vec4 sL = texture2D(uTrackMap, fTrackUv - vec2(eps, 0.0));
        vec4 sR = texture2D(uTrackMap, fTrackUv + vec2(eps, 0.0));
        vec4 sU = texture2D(uTrackMap, fTrackUv - vec2(0.0, eps));
        vec4 sD = texture2D(uTrackMap, fTrackUv + vec2(0.0, eps));
        float hL = sL.g * 0.08 - sL.r * 0.16;
        float hR = sR.g * 0.08 - sR.r * 0.16;
        float hU = sU.g * 0.08 - sU.r * 0.16;
        float hD = sD.g * 0.08 - sD.r * 0.16;
        float dHdx = (hR - hL) * 2.8 + fChevron * fTrack.r * 0.045;
        float dHdz = (hD - hU) * 2.8 + fChevron * fTrack.r * 0.045;
        vec3 worldGrad = vec3(-dHdx, 0.0, -dHdz);
        vec3 viewPerturb = (viewMatrix * vec4(worldGrad, 0.0)).xyz;
        normal = normalize(normal + viewPerturb);
      }`,
    );
  };
  groundMat.customProgramCacheKey = () => "tarukh-scanned-stochastic-soil-v2";
  const ground = new T.Mesh(geometry, groundMat);
  ground.receiveShadow = true;
  root.add(ground);

  const rockMat = new T.MeshStandardMaterial({ map: surfaces.rock.color, bumpMap: surfaces.rock.relief, roughnessMap: surfaces.rock.relief, bumpScale: .055, roughness: 1 });
  rockMat.onBeforeCompile = shader => {
    shader.fragmentShader=shader.fragmentShader.replace("#include <map_fragment>", `
      vec3 scan=texture2D(map,vMapUv).rgb;
      float rockDetail=dot(scan,vec3(.2126,.7152,.0722));
      // Exposed dark stone with a warm dust coating, sharing the soil palette.
      diffuseColor.rgb*=mix(vec3(.065,.039,.028),vec3(.34,.205,.125),smoothstep(.008,.085,rockDetail));
    `).replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
      roughnessFactor=max(.88,roughnessFactor);`);
  };
  rockMat.customProgramCacheKey=()=>"tarukh-dust-coated-scan-rock-v2";
  const makeRock = (detail: number, variant: number) => {
    const geo = new T.IcosahedronGeometry(1, detail), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = 1 + Math.sin(x * 8.4 + y * 7.1 + z * 11 + variant * 2) * .14 + Math.sin(x * 17 - z * 13 + variant) * .07;
      p.setXYZ(i, x * n, y * n * (.68 + variant * .07), z * n);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const small = new T.InstancedMesh(makeRock(0, 0), rockMat, 6500);
  small.name = "mars-small-rocks";
  const large = Array.from({ length: 4 }, (_, i) => new T.InstancedMesh(makeRock(2, i), rockMat, Math.ceil((450 - i) / 4)));
  const dummy = new T.Object3D();

  // Spatial hash for O(1) wheel rock-climbing elevation lookup across 6,500+ rocks
  const ROCK_CELL = 4;
  const rockHash = new Map<number, TraversableRock[]>();
  const hashKey = (cx: number, cz: number) => ((cx + 512) << 10) | (cz + 512);

  for (const [count, big] of [[6500, false], [450, true]] as const) {
    for (let i = 0; i < count; i++) {
      const seed = i + (big ? 9000 : 0), x = (random(seed * 7) - .5) * 240, z = (random(seed * 7 + 1) - .5) * 240;
      const near = STATIONS.some(s => Math.hypot(x - s.x, z - s.z) < 4.5) || Math.hypot(x, z - 12) < 5;
      const gravelPatch=smooth(.28,.72,terrainNoise(x*.065,z*.065));
      const size = near && big ? .07 : big ? .35 + random(seed + 3) * 1.15 : .025 + random(seed + 4) ** 3 * .29 * gravelPatch;
      const sx = size * (1 + random(seed + 14) * .6);
      const sy = size * (.55 + random(seed + 15) * .3);
      const sz = size * (.7 + random(seed + 16) * .6);
      const baseH = sampleMeshHeight(x, z);
      const mesh = big ? large[i % 4] : small, index = big ? Math.floor(i / 4) : i;
      if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
      const bounds=mesh.geometry.boundingBox!;
      const burial=-bounds.min.y*sy*.55;
      const rockTop=burial+bounds.max.y*sy;
      const footprint=Math.max(sx,sz)*.94;

      if (Math.abs(x) < 92 && Math.abs(z) < 92) {
        if (big && rockTop > .55) {
          // True large boulders block both walker and rover
          obstacles.push({ x, z, radius: footprint, traversable: false });
        } else if (big && size > .25) {
          // Medium scattered rocks: walker walks around them, rover crawls cleanly over them
          if(rockTop>.22)obstacles.push({ x, z, radius: footprint, traversable: true });
          const r = footprint;
          const bump = rockTop;
          const k = hashKey(Math.floor(x / ROCK_CELL), Math.floor(z / ROCK_CELL));
          let list = rockHash.get(k);
          if (!list) { list = []; rockHash.set(k, list); }
          list.push({ x, z, r, bump });
        } else if (size >= 0.08) {
          // Small scattered rocks: traversable wheel bumps for rocker-bogie articulation
          const r = footprint;
          const bump = rockTop;
          const k = hashKey(Math.floor(x / ROCK_CELL), Math.floor(z / ROCK_CELL));
          let list = rockHash.get(k);
          if (!list) { list = []; rockHash.set(k, list); }
          list.push({ x, z, r, bump });
        }
      }

      dummy.position.set(x, baseH + burial, z);
      dummy.scale.set(sx, sy, sz);
      dummy.rotation.set(0, seed * .6, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      const dustCoat=terrainNoise(x*.065,z*.065);
      color.setRGB(.62+random(seed)*.38,.65+random(seed+5)*.25,.67+random(seed+6)*.22);
      color.lerp(new T.Color(1,.90,.77),dustCoat*.55);
      mesh.setColorAt(index, color);
    }
  }
  small.receiveShadow = true;
  root.add(small);
  for (const rocks of large) { rocks.castShadow = rocks.receiveShadow = true; root.add(rocks); }

  // Scanned fracture detail on all cliff faces; one dust/stone palette throughout.
  const cliffMat = new T.MeshStandardMaterial({ vertexColors: true, map: surfaces.rock.color, bumpMap: surfaces.rock.relief, bumpScale: .1, roughness: .98 });
  const close = new T.Color(0x89634d), lightStrata = new T.Color(0xc39a77), dustHaze = new T.Color(0xc09b80);
  const landscape = new T.PlaneGeometry(720, 720, 240, 240);
  landscape.rotateX(-Math.PI / 2);
  const lp = landscape.attributes.position, landColors = new Float32Array(lp.count * 3);
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i), z = lp.getZ(i), r = Math.hypot(x, z);
    const broad = terrainFbm(x * .009, z * .009);
    const warped = terrainFbm(x * .017 + broad * 2.7, z * .016 - broad * 1.8);
    const plateau = smooth(.43, .62, warped);
    const ridge = 1 - Math.abs(terrainFbm(x * .031, z * .031) * 2 - 1);
    const apron = smooth(110, 240, r);
    const rightWall = .72 + smooth(-20, 150, x) * .6;
    let height = (plateau * 57 + ridge * 14 + terrainNoise(x * .07, z * .07) * 3) * rightWall;
    // Eroded flutes break up the distant escarpment; playable ground is untouched.
    const drainage = Math.pow(.5 + .5 * Math.sin(x * .19 + z * .11 + broad * 9), 6);
    height -= drainage * plateau * 4.8;
    const ledge = Math.floor(height / 2.4) * 2.4;
    height = height * .72 + ledge * .28;
    lp.setY(i, -9 + (height + 9) * apron);
  }
  landscape.computeVertexNormals();
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i), y = lp.getY(i), z = lp.getZ(i), r = Math.hypot(x, z);
    const slope = 1 - landscape.attributes.normal.getY(i);
    const band = .26 + .1 * Math.sin(y * .6 + terrainNoise(x * .035, z * .035) * 2);
    color.copy(close).lerp(lightStrata, band + Math.max(0, 1 - slope) * .12);
    color.lerp(dustHaze, smooth(140, 370, r) * .45);
    color.toArray(landColors, i * 3);
  }
  landscape.setAttribute("color", new T.BufferAttribute(landColors, 3));
  cliffMat.onBeforeCompile = shader => {
    shader.vertexShader = "varying vec3 vCanyonPosition; varying vec3 vCanyonNormal;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      vCanyonPosition=(modelMatrix*vec4(position,1.)).xyz;
      vCanyonNormal=normalize(mat3(modelMatrix)*normal);`);
    shader.fragmentShader = "varying vec3 vCanyonPosition; varying vec3 vCanyonNormal;\n" + stochasticSurfaceGLSL + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#ifdef USE_MAP
      vec3 blend=pow(abs(normalize(vCanyonNormal)),vec3(4));blend/=max(.001,blend.x+blend.y+blend.z);
      vec3 cliffP=vCanyonPosition*.18;
      cliffP+=vec3(soilNoise(vCanyonPosition.xz*.027),soilNoise(vCanyonPosition.xy*.031),soilNoise(vCanyonPosition.yz*.029))*.32;
      vec3 cliffGrain=texture2D(map,cliffP.yz).rgb*blend.x;
      cliffGrain+=texture2D(map,cliffP.xz).rgb*blend.y;
      cliffGrain+=texture2D(map,cliffP.xy).rgb*blend.z;
      float detail=dot(cliffGrain,vec3(.2126,.7152,.0722));
      float bands=sin(vCanyonPosition.y*.48+soilNoise(vCanyonPosition.xz*.05)*3.8);
      float dust=soilNoise(vCanyonPosition.xz*.025);
      float bedding=smoothstep(.65,.95,bands);
      float ledgeDust=pow(max(normalize(vCanyonNormal).y,0.0),2.0);
      diffuseColor.rgb*=clamp(.62+detail*8.0,.62,1.12)*(.97-bedding*.04)*mix(.90,1.10,dust);
      diffuseColor.rgb*=mix(vec3(1.0),vec3(1.12,1.08,1.03),ledgeDust);
      float cliffRelief=texture2D(bumpMap,cliffP.yz).r*blend.x;
      cliffRelief+=texture2D(bumpMap,cliffP.xz).r*blend.y;
      cliffRelief+=texture2D(bumpMap,cliffP.xy).r*blend.z;
      cliffRelief=cliffRelief*.12+bands*.025;
      #endif`);
    shader.fragmentShader=shader.fragmentShader.replace("#include <normal_fragment_maps>",
      "normal=perturbNormalArb(-vViewPosition,normal,vec2(dFdx(cliffRelief),dFdy(cliffRelief)),faceDirection);");
  };
  cliffMat.customProgramCacheKey = () => "tarukh-canyon-scanned-fractures-v2";
  const canyon = new T.Mesh(landscape, cliffMat);
  root.add(canyon);

  const heightAt = (x: number, z: number) => sampleMeshHeight(x, z) + colonySurfaceElevation(x, z);

  // O(1) Wheel Surface Height: exact rendered mesh triangle + rover bay pad + traversable rock bumps
  const roverHeightAt = (x: number, z: number) => {
    const base = sampleMeshHeight(x, z) + colonySurfaceElevation(x, z);
    const cx = Math.floor(x / ROCK_CELL);
    const cz = Math.floor(z / ROCK_CELL);
    let maxRockBump = 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const list = rockHash.get(hashKey(cx + dx, cz + dz));
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          const rock = list[i];
          const reach = rock.r + 0.22; // tire contact half-width
          const dist = Math.hypot(x - rock.x, z - rock.z);
          if (dist < reach) {
            const dome = 1 - Math.pow(dist / reach, 2);
            const h = rock.bump * dome;
            if (h > maxRockBump) maxRockBump = h;
          }
        }
      }
    }
    return base + maxRockBump;
  };

  return {
    heightAt,
    roverHeightAt,
    mudAt: mudDepthAt,
    stampRoverTracks: (renderer: T.WebGLRenderer, rover: RoverVehicle) =>
      trackSystem.stampRover(renderer, rover, mudDepthAt),
    disposeTracks: () => trackSystem.dispose(),
    obstacles,
  };
}

export function createMarsSky(scene: T.Scene) {
  const material = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms: { night: { value: 0 } },
    vertexShader: `varying vec3 direction; void main(){ direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 direction; uniform float night;
      void main(){ vec3 d=normalize(direction); float h=max(d.y,0.);
        vec3 day=mix(vec3(.70,.43,.29),vec3(.34,.25,.22),pow(h,.54));
        float sunAngle=max(dot(d,normalize(vec3(-80.,46.,-160.))),0.);
        float blueHalo=pow(sunAngle,32.) * .07;
        float sun=pow(sunAngle,140.);
        day=mix(day,vec3(.49,.56,.64),blueHalo);
        day+=vec3(.95,.73,.40)*sun + vec3(.20,.14,.075)*pow(sunAngle,18.);
        vec3 dark=mix(vec3(.12,.10,.14),vec3(.012,.024,.054),pow(h,.45));
        gl_FragColor=vec4(mix(day,dark,night),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new T.Mesh(new T.SphereGeometry(850, 40, 24), material);
  scene.add(sky);
  return material;
}

export function createMarsFootprints(scene: T.Scene, heightAt= marsHeight) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgba(32,18,12,.23)";
  ctx.fillRect(12, 9, 40, 105);
  ctx.fillStyle = "rgba(25,13,9,.28)";
  for (let i = 0; i < 8; i++) ctx.fillRect(15, 15 + i * 12, 34, 5);
  const texture = new T.CanvasTexture(c);
  const stamps = new T.InstancedMesh(new T.PlaneGeometry(.23, .43).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), 160);
  stamps.count = 0;
  stamps.frustumCulled = false;
  stamps.renderOrder = 1;
  scene.add(stamps);
  const dummy = new T.Object3D();
  let index = 0, lastX = 0, lastZ = 12;
  return (x: number, z: number, yaw: number, grounded: boolean) => {
    if (!grounded || Math.hypot(x - lastX, z - lastZ) < .65) return;
    const side = index % 2 ? -.17 : .17, sx = x + Math.cos(yaw) * side, sz = z - Math.sin(yaw) * side;
    dummy.position.set(sx, heightAt(sx, sz) + .025, sz);
    dummy.rotation.set(0, yaw, 0);
    dummy.updateMatrix();
    stamps.setMatrixAt(index % 160, dummy.matrix);
    stamps.count = Math.min(160, ++index);
    stamps.instanceMatrix.needsUpdate = true;
    lastX = x;
    lastZ = z;
  };
}
