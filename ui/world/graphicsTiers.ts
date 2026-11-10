export const graphicsTiers = {
  performance: {resolutionCap:.75, shadows:false, bloom:false, ssao:false, particles:60, smallRocks:1800, terrainTexture:768, hardwareTexture:512},
  auto: {resolutionCap:1.25, shadows:true, bloom:false, ssao:false, particles:260, smallRocks:6500, terrainTexture:768, hardwareTexture:512},
  high: {resolutionCap:1.5, shadows:true, bloom:true, ssao:false, particles:260, smallRocks:6500, terrainTexture:768, hardwareTexture:512},
  ultra: {resolutionCap:2, shadows:true, bloom:true, ssao:true, particles:260, smallRocks:6500, terrainTexture:768, hardwareTexture:512},
} as const;
export type GraphicsTier = keyof typeof graphicsTiers;
export function graphicsTier(name:string) { return graphicsTiers[name as GraphicsTier] ?? graphicsTiers.auto; }
