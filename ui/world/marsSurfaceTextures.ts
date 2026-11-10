import * as T from "three";
import { assetUrl } from "../../lib/assetUrl.ts";

type Surface = { color: T.Texture; relief: T.Texture };
export type MarsSurfaceTextures = { sand: Surface; gravel: Surface; rock: Surface };

function fallback(color: number, data = false) {
  const c = new T.Color(color);
  const bytes = data ? [128, 245, 255, 255] : [c.r * 255, c.g * 255, c.b * 255, 255];
  const texture = new T.DataTexture(new Uint8Array(bytes), 1, 1);
  texture.needsUpdate = true;
  return texture;
}

/** Local CC0 scan derivatives: relief R = height, G = roughness. */
export async function loadMarsSurfaceTextures(): Promise<MarsSurfaceTextures> {
  const loader = new T.TextureLoader();
  const surfaces = await Promise.all([
    ["sandy-gravel", 0xa77a59], ["dry-rocky-soil", 0x997453], ["fractured-rock", 0x4e4943],
  ].map(async ([name, tint]) => {
    const [color, relief] = await Promise.all([
      loader.loadAsync(assetUrl(`/art/mars-surface/${name}-color.webp`)).catch(() => fallback(tint as number)),
      loader.loadAsync(assetUrl(`/art/mars-surface/${name}-relief.png`)).catch(() => fallback(0, true)),
    ]);
    // DataTexture fallback already contains linear values.
    color.colorSpace = color instanceof T.DataTexture ? T.NoColorSpace : T.SRGBColorSpace;
    relief.colorSpace = T.NoColorSpace;
    for (const texture of [color, relief]) {
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      texture.anisotropy = 8;
    }
    return { color, relief };
  }));
  return { sand: surfaces[0], gravel: surfaces[1], rock: surfaces[2] };
}

export function fallbackMarsSurfaceTextures(): MarsSurfaceTextures {
  const surface = (color: number) => ({ color: fallback(color), relief: fallback(0, true) });
  return { sand: surface(0xa77a59), gravel: surface(0x997453), rock: surface(0x4e4943) };
}

export function disposeMarsSurfaceTextures(textures?: MarsSurfaceTextures) {
  if (textures) for (const surface of Object.values(textures)) {
    surface.color.dispose(); surface.relief.dispose();
  }
}

// Three overlapping samples on a triangular lattice. Each vertex owns a stable
// rotation, scale and offset shared by neighbouring triangles. Smooth weights
// remove borders; explicit gradients keep mip levels stable across the lattice.
export const stochasticSurfaceGLSL = `
  float soilHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float soilNoise(vec2 p) {
    vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(soilHash(i),soilHash(i+vec2(1,0)),f.x),mix(soilHash(i+vec2(0,1)),soilHash(i+vec2(1,1)),f.x),f.y);
  }
  struct SoilSample { vec3 color; vec2 relief; };
  SoilSample soilVertex(sampler2D albedo, sampler2D relief, vec2 p, vec2 id, vec2 dx, vec2 dy) {
    float angle=soilHash(id+13.4)*6.2831853;
    float s=.85+soilHash(id+37.1)*.3;
    mat2 rotation=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*s;
    vec2 uv=rotation*p+vec2(soilHash(id+6.2),soilHash(id+9.8))*17.0;
    SoilSample result;
    result.color=textureGrad(albedo,uv,rotation*dx,rotation*dy).rgb;
    result.relief=textureGrad(relief,uv,rotation*dx,rotation*dy).rg;
    return result;
  }
  SoilSample soilSample(sampler2D albedo, sampler2D relief, vec2 p) {
    vec2 skew=mat2(1.0,0.0,-.57735027,1.15470054)*p;
    vec2 id=floor(skew), f=fract(skew);
    vec2 a=id, b=id+vec2(1,0), c=id+vec2(0,1);
    vec3 w=vec3(1.0-f.x-f.y,f.x,f.y);
    if(f.x+f.y>1.0) { a=id+vec2(1,1); w=vec3(f.x+f.y-1.0,1.0-f.y,1.0-f.x); }
    w=pow(max(w,vec3(0)),vec3(4)); w/=max(dot(w,vec3(1)),.0001);
    vec2 dx=dFdx(p),dy=dFdy(p);
    SoilSample sa=soilVertex(albedo,relief,p,a,dx,dy);
    SoilSample sb=soilVertex(albedo,relief,p,b,dx,dy);
    SoilSample sc=soilVertex(albedo,relief,p,c,dx,dy);
    SoilSample result;
    result.color=sa.color*w.x+sb.color*w.y+sc.color*w.z;
    result.relief=sa.relief*w.x+sb.relief*w.y+sc.relief*w.z;
    return result;
  }
`;
