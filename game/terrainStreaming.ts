export const CHUNK_SIZE = 70;
export const CHUNK_RADIUS = 3;
export const STREAM_LIMIT = 32000;
/** Conservative local-only hints; no device fingerprint is saved or sent. */
export function streamingCandidate(gpu:string, cores:number, memory:number|undefined, mobile:boolean, quality:string) {
 return !mobile && quality !== "performance" && cores >= 8 && (memory === undefined || memory >= 8)
   && /geforce (?:rtx|gtx 16)|radeon rx [67][6789]00|apple m[234]/i.test(gpu)
   && !/software|swiftshader|intel|uhd|iris/i.test(gpu);
}
export function streamingBenchmarkPass(samples:readonly number[]) {
 if(samples.length<12 || samples.some(v=>!Number.isFinite(v)||v<=0))return false;
 const sorted=[...samples].sort((a,b)=>a-b);
 return sorted[Math.floor(sorted.length*.9)]<=22 && samples.reduce((a,b)=>a+b,0)/samples.length<=19;
}
export function chunkKey(x:number,z:number){return `${x},${z}`;}
export function isBaseChunk(x:number,z:number){return x>=-3&&x<3&&z>=-3&&z<3;}
export function streamedHeight(x:number,z:number,height:(x:number,z:number)=>number){
 const ix=Math.floor(x), iz=Math.floor(z), u=x-ix,v=z-iz;
 const a=height(ix,iz),b=height(ix+1,iz),c=height(ix,iz+1),d=height(ix+1,iz+1);
 return u+v<=1?a+u*(b-a)+v*(c-a):d+(1-v)*(b-d)+(1-u)*(c-d);
}
