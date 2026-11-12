export const graphicsTiers = {
  performance: {resolutionCap:1, shadows:false, shadowSize:1024, bloom:false, ssao:false, particles:120, smallRocks:3000, terrainTexture:768, hardwareTexture:512},
  auto: {resolutionCap:1.25, shadows:true, shadowSize:1536, bloom:false, ssao:true, particles:260, smallRocks:6500, terrainTexture:768, hardwareTexture:512},
  high: {resolutionCap:1.5, shadows:true, shadowSize:2048, bloom:true, ssao:true, particles:260, smallRocks:6500, terrainTexture:768, hardwareTexture:512},
  ultra: {resolutionCap:2, shadows:true, shadowSize:2048, bloom:true, ssao:true, particles:260, smallRocks:6500, terrainTexture:768, hardwareTexture:512},
} as const;
export type GraphicsTier = keyof typeof graphicsTiers;
export function graphicsTier(name:string) { return graphicsTiers[name as GraphicsTier] ?? graphicsTiers.auto; }

export type AutoProfile = "performance" | "auto" | "high";

/** Renderer strings are optional. Unknown hardware starts balanced and is measured in play. */
export function startingProfile(renderer:string, cores:number, memoryGB?:number):AutoProfile {
  if (/swiftshader|llvmpipe|software rasterizer|intel.*(?:hd graphics|uhd|iris)|radeon.*(?:vega [1-9]|610m)|adreno [345]|mali-[tg][47]/i.test(renderer)) return "performance";
  if ((cores > 0 && cores <= 4) || (memoryGB !== undefined && memoryGB <= 4)) return "performance";
  if (/geforce rtx|radeon rx [67][789]00/i.test(renderer)) return "high";
  return "auto";
}
