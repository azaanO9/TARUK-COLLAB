import {marsRegionalHeight} from './marsRegion.ts';
import {terrainFbm,terrainNoise} from '../ui/world/terrainNoise.ts';
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

/** MOLA macro relief + clearly artistic sub-grid regolith. No invented named mountains. */
export function marsExpeditionHeight(x:number,z:number){
 const regional=marsRegionalHeight(x,z);
 const grain=(terrainFbm(x*.055,z*.055)-.5)*1.3;
 const ripples=Math.sin(x*.31+z*.1+terrainNoise(x*.06,z*.06)*3)*.12;
 // Only the actual arrival and parked rover areas are gently graded.
 const landing=smooth(8,18,Math.hypot(x,z-14));
 const rover=smooth(4,8,Math.hypot(x-17,z-10));
 return (regional+grain+ripples)*Math.min(landing,rover);
}
