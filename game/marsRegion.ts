import {MOLA_REGION as R, MOLA_DELTA_BASE64} from '../content/marsMolaData.ts';

export const MARS_REGION = {
 ...R, centerLongitude:134.97323611266458, centerLatitude:14.089500110766512,
 gameMetresPerDegree:24, elevationDivisor:240,
 scaleLabel:'Distances ≈1:2,470 · relief ×10',
} as const;
const eastScale=MARS_REGION.gameMetresPerDegree*Math.cos(MARS_REGION.centerLatitude*Math.PI/180);
const bytes=atob(MOLA_DELTA_BASE64),heights=new Int16Array(R.width*R.height);
for(let row=0;row<R.height;row++){
 let previous=0;
 for(let col=0;col<R.width;col++){
  const i=row*R.width+col,word=bytes.charCodeAt(i*2)|(bytes.charCodeAt(i*2+1)<<8);
  previous+=(word<<16)>>16;heights[i]=previous;
 }
}
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
export function marsToWorld(longitude:number,latitude:number){
 return {x:(longitude-MARS_REGION.centerLongitude)*eastScale,z:(MARS_REGION.centerLatitude-latitude)*MARS_REGION.gameMetresPerDegree};
}
export function worldToMars(x:number,z:number){
 return {longitude:MARS_REGION.centerLongitude+x/eastScale,latitude:MARS_REGION.centerLatitude-z/MARS_REGION.gameMetresPerDegree};
}
/** Bilinear metres above the Mars areoid. Outside the crop, clamp to its edge. */
export function sampleMarsElevation(longitude:number,latitude:number){
 const x=clamp((longitude-R.west)/(R.east-R.west)*(R.width-1),0,R.width-1);
 const y=clamp((R.north-latitude)/(R.north-R.south)*(R.height-1),0,R.height-1);
 const ix=Math.min(R.width-2,Math.floor(x)),iy=Math.min(R.height-2,Math.floor(y));
 const u=x-ix,v=y-iy,i=iy*R.width+ix;
 return ((heights[i]*(1-u)+heights[i+1]*u)*(1-v)+(heights[i+R.width]*(1-u)+heights[i+R.width+1]*u)*v)*R.quantum;
}
const datum=sampleMarsElevation(MARS_REGION.centerLongitude,MARS_REGION.centerLatitude);
/** No allocations: shared by streamed vertices, physics and the far landscape. */
export function marsRegionalHeight(x:number,z:number){
 return (sampleMarsElevation(MARS_REGION.centerLongitude+x/eastScale,MARS_REGION.centerLatitude-z/24)-datum)/MARS_REGION.elevationDivisor;
}
export function isSurveyedRegion(x:number,z:number){
 const lon=MARS_REGION.centerLongitude+x/eastScale,lat=MARS_REGION.centerLatitude-z/24;
 return lon>=R.west&&lon<=R.east&&lat>=R.south&&lat<=R.north;
}
export const REGION_WORLD_BOUNDS={
 west:marsToWorld(R.west,0).x,east:marsToWorld(R.east,0).x,
 north:marsToWorld(0,R.north).z,south:marsToWorld(0,R.south).z,
};
