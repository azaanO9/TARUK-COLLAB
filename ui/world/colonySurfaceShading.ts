import * as T from "three";
import type { ColonyMaterials } from "./colonyMaterials";

/** Shared, filtered microfinish. Generated once; no network asset or extra render pass. */
function createFinishTexture() {
  const size = 128, data = new Uint8Array(size * size * 4);
  const hash = (x: number, y: number) => {
    let n = Math.imul(x + 117, 374761393) ^ Math.imul(y + 73, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  function periodicNoise(x: number, y: number, cells: number) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const at = (a: number, b: number) => hash((a + cells) % cells, (b + cells) % cells);
    return T.MathUtils.lerp(T.MathUtils.lerp(at(ix, iy), at(ix + 1, iy), u), T.MathUtils.lerp(at(ix, iy + 1), at(ix + 1, iy + 1), u), v);
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const grain = hash(x, y), mottling = periodicNoise(x / 16, y / 16, 8);
    data[i] = Math.round(128 + (grain - .5) * 92);
    data[i + 1] = Math.round(128 + (mottling - .5) * 95 + (grain - .5) * 30);
    data[i + 2] = Math.round(periodicNoise(x / 32, y / 32, 4) * 255);
    data[i + 3] = 255;
  }
  const texture = new T.DataTexture(data, size, size);
  texture.name = "colony-coating-microfinish";
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.magFilter = T.LinearFilter; texture.minFilter = T.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.anisotropy = 4; texture.needsUpdate = true;
  return texture;
}

const coatingGLSL = /* glsl */`
  varying vec3 vCoatingPosition;
  varying vec3 vCoatingNormal;
  uniform sampler2D uCoatingFinish;
  uniform float uCoatingRelief;
  float coatingHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float coatingNoise(vec2 p) {
    vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
    return mix(mix(coatingHash(i),coatingHash(i+vec2(1,0)),f.x),mix(coatingHash(i+vec2(0,1)),coatingHash(i+vec2(1,1)),f.x),f.y);
  }
`;

/** Attach only to colony-owned materials: actors use a separate material library instance. */
export function createColonySurfaceShading(materials: ColonyMaterials) {
  const finish = createFinishTexture();
  function coat(material: T.MeshStandardMaterial, relief: number) {
    // Standard slots make the existing warmup/disposal discover this shared texture.
    material.bumpMap = finish; material.bumpScale = relief;
    material.roughnessMap = finish;
    material.onBeforeCompile = shader => {
      shader.uniforms.uCoatingFinish = { value: finish };
      shader.uniforms.uCoatingRelief = { value: relief };
      shader.vertexShader = "varying vec3 vCoatingPosition; varying vec3 vCoatingNormal;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <defaultnormal_vertex>", `#include <defaultnormal_vertex>
        vCoatingNormal=inverseTransformDirection(transformedNormal,viewMatrix);`);
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
        vCoatingPosition=(modelMatrix*vec4(transformed,1.0)).xyz;`);
      shader.fragmentShader = coatingGLSL + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
        vec3 coatingNormal=normalize(vCoatingNormal);
        vec3 coatingWeights=pow(abs(coatingNormal),vec3(6.0));
        coatingWeights/=max(.001,coatingWeights.x+coatingWeights.y+coatingWeights.z);
        vec3 coatingP=vCoatingPosition*1.7;
        vec3 coatingFinish=texture2D(uCoatingFinish,coatingP.yz).rgb*coatingWeights.x
          +texture2D(uCoatingFinish,coatingP.xz).rgb*coatingWeights.y
          +texture2D(uCoatingFinish,coatingP.xy).rgb*coatingWeights.z;
        float coatingPatch=coatingNoise(vCoatingPosition.xz*1.1+vec2(vCoatingPosition.y*.16,0.0));
        // Dust settles on upward faces and collects low on hardware in irregular drifts.
        float coatingUp=pow(max(coatingNormal.y,0.0),3.0);
        float coatingBase=1.0-smoothstep(.14,.78+coatingPatch*.5,vCoatingPosition.y);
        float coatingDust=clamp(coatingUp*(.10+coatingFinish.b*.16)+coatingBase*(.20+coatingPatch*.32),0.0,.55);
        diffuseColor.rgb*=.98+(coatingFinish.g-.5)*.045;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.34,.19,.105),coatingDust);
        float coatingHeight=(coatingFinish.r-.5)*uCoatingRelief;
      `);
      shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", `
        float roughnessFactor=clamp(roughness+(coatingFinish.g-.5)*.12,.18,.96);
        roughnessFactor=mix(roughnessFactor,.93,coatingDust);
      `);
      shader.fragmentShader = shader.fragmentShader.replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>
        metalnessFactor*=1.0-coatingDust;
      `);
      shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", `
        normal=perturbNormalArb(-vViewPosition,normal,vec2(dFdx(coatingHeight),dFdy(coatingHeight)),faceDirection);
      `);
    };
    material.customProgramCacheKey = () => "tarukh-colony-coatings-v1";
    return material;
  }
  // Coated metal and ceramics are dielectrics; only exposed alloy is metallic.
  materials.ceramic.color.setHex(0xe4e3d9); materials.ceramic.metalness = 0; materials.ceramic.roughness = .48;
  materials.teal.metalness = 0; materials.teal.roughness = .38;
  materials.orange.metalness = 0; materials.orange.roughness = .43;
  materials.graphite.metalness = .04; materials.graphite.roughness = .48;
  materials.alloy.metalness = .9; materials.alloy.roughness = .32;
  coat(materials.ceramic, .00016);
  coat(materials.teal, .00010); coat(materials.orange, .00010);
  coat(materials.graphite, .00012); coat(materials.alloy, .00006);
  // Three.js material.clone() does not copy onBeforeCompile; tanks need explicit binding.
  return { ceramic: (material: T.MeshStandardMaterial) => coat(material, .00016) };
}
