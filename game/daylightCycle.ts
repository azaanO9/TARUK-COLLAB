export const DAYLIGHT_CYCLE_SECONDS=300;
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
export function daylightPhase(seconds:number){const t=Math.max(0,seconds)%DAYLIGHT_CYCLE_SECONDS;return t<90?"Day":t<150?"Sunset":t<240?"Night":"Sunrise";}
/** Continuous light fraction, with a full minute each for sunset and sunrise. */
export function nightAmount(seconds:number){
 const t=Math.max(0,seconds)%DAYLIGHT_CYCLE_SECONDS;
 return t<90?0:t<150?smooth((t-90)/60):t<240?1:1-smooth((t-240)/60);
}
