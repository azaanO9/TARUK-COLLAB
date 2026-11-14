export const LANDING_DURATION = 14;
const smooth=(t:number)=>{const u=Math.max(0,Math.min(1,t));return u*u*(3-2*u);};
/** Artistic powered Mars landing, not a validated spacecraft trajectory. */
export function landingPose(seconds:number){
 const t=Math.max(0,seconds);
 const altitude=t<4?4+24*(1-t/4)**2:t<10?4*(1-smooth((t-4)/6)):0;
 const speed=t<4?12*(1-t/4):t<10?4*((t-4)/6)*(1-(t-4)/6):0;
 return {altitude,speed,compression:.07*smooth((t-10)/1.2),handoff:smooth((t-11)/3),
  plume:(1-smooth((t-9)/1.3))*.65,dust:smooth((7-altitude)/7)*(1-smooth((t-10)/2.5)),complete:t>=LANDING_DURATION};
}
