/** Artistic time compression: a full noon-to-noon cycle takes two active minutes. */
export const DAYLIGHT_CYCLE_SECONDS=120;
export function daylightPhase(seconds:number){
 const t=Math.max(0,seconds)%DAYLIGHT_CYCLE_SECONDS;
 return t<20||t>=110?"Day":t<50?"Sunset":t<80?"Night":"Sunrise";
}
export function daylightAngle(seconds:number){return (Math.max(0,seconds)%DAYLIGHT_CYCLE_SECONDS)/DAYLIGHT_CYCLE_SECONDS*Math.PI*2;}
/** No frozen daylight segments: smooth brightness and zero slope at noon/midnight. */
export function nightAmount(seconds:number){
 return (1-Math.cos(daylightAngle(seconds)))/2;
}
