export const CHUNK_SIZE = 70;
export const CHUNK_RADIUS = 3;
export const STREAM_LIMIT = Number.POSITIVE_INFINITY;
/** Conservative local-only hints; no device fingerprint is saved or sent. */
function hasStreamingHeadroom(gpu:string, cores:number, memory:number|undefined, mobile:boolean, quality:string) {
 return !mobile && quality !== "performance" && cores >= 8 && (memory === undefined || memory >= 8)
   && /geforce (?:rtx|gtx 16)|radeon rx [67][6789]00|apple m[234]/i.test(gpu)
   && !/software|swiftshader|intel|uhd|iris/i.test(gpu);
}
/** Every device streams; capability only chooses a bounded workload. */
export function streamingBudget(gpu:string,cores:number,memory:number|undefined,mobile:boolean,quality:string){
 const light=!hasStreamingHeadroom(gpu,cores,memory,mobile,quality);
 return {radius:light?2:3,rocks:light?8:18,generationMs:light?.75:2,fog:light?.016:.01};
}
const hash=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export function streamedRock(cx:number,cz:number,index:number){
 const seed=cx*113+cz*7919+index*37;
 const size=.45+hash(seed+2)*1.35;
 return {x:cx*CHUNK_SIZE+6+hash(seed)*58,z:cz*CHUNK_SIZE+6+hash(seed+1)*58,
  sx:size*(.75+hash(seed+3)*.55),sy:size*(.5+hash(seed+4)*.55),sz:size*(.8+hash(seed+5)*.5),yaw:hash(seed+6)*Math.PI*2,tint:hash(seed+7)};
}
export function chunkKey(x:number,z:number){return `${x},${z}`;}
export function isBaseChunk(x:number,z:number){return x>=-3&&x<3&&z>=-3&&z<3;}
export function streamedHeight(x:number,z:number,height:(x:number,z:number)=>number){
 const ix=Math.floor(x), iz=Math.floor(z), u=x-ix,v=z-iz;
 const a=height(ix,iz),b=height(ix+1,iz),c=height(ix,iz+1),d=height(ix+1,iz+1);
 return u+v<=1?a+u*(b-a)+v*(c-a):d+(1-v)*(b-d)+(1-u)*(c-d);
}
