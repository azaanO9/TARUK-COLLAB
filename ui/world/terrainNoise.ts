/** Deterministic smooth noise for original Mars terrain; no random state or assets. */
export function noiseHash(x:number,y:number) { const n=Math.sin(x*127.1+y*311.7)*43758.5453123;return n-Math.floor(n); }
export function terrainNoise(x:number,y:number) {
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=noiseHash(ix,iy),b=noiseHash(ix+1,iy),c=noiseHash(ix,iy+1),d=noiseHash(ix+1,iy+1);
  return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}
export function terrainFbm(x:number,y:number) {
  return terrainNoise(x,y)*.57+terrainNoise(x*2.03+17,y*2.03-9)*.28+terrainNoise(x*4.13-8,y*4.13+21)*.15;
}
