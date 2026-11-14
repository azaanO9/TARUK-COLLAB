export const LANDING_DURATION = 24;
export const ARRIVAL_SPAWN = {x:0,z:21};
export const ARRIVAL_YAW = -.6;
const smooth=(t:number)=>{const u=Math.max(0,Math.min(1,t));return u*u*(3-2*u);};
/** Artistic powered Mars landing, not a validated spacecraft trajectory. */
type LandingPose={altitude:number;speed:number;compression:number;handoff:number;hatch:number;phase:string;plume:number;dust:number;complete:boolean};
export function landingPose(seconds:number,target?:LandingPose){
 const t=Math.max(0,seconds);
 const altitude=t<4?4+24*(1-t/4)**2:t<10?4*(1-smooth((t-4)/6)):0;
 const speed=t<4?12*(1-t/4):t<10?4*((t-4)/6)*(1-(t-4)/6):0;
 const out=target??{altitude:0,speed:0,compression:0,handoff:0,hatch:0,phase:'',plume:0,dust:0,complete:false};
 out.altitude=altitude;out.speed=speed;out.compression=.07*smooth((t-10)/1.2);out.handoff=smooth((t-21)/3);out.hatch=smooth((t-11.2)/1.8);
 out.phase=t<10?'Powered descent':t<11.2?'Touchdown · suspension settling':t<13?'Opening the airlock':t<16.6?'Stepping out onto Mars':t<17.8?'One small hop':t<21?'First steps on Mars':'Ready to explore';
 out.plume=(1-smooth((t-9)/1.3))*.65;out.dust=smooth((7-altitude)/7)*(1-smooth((t-10)/2.5));out.complete=t>=LANDING_DURATION;
 return out;
}

/** Original cinematic choreography. Feet follow the sill, steps, a gentle hop, then ground. */
type ExitPose={visible:boolean;localZ:number;deckHeight:number;hopHeight:number;verticalVelocity:number;yaw:number;speed:number;grounded:boolean};
export function landingExitPose(seconds:number,target?:ExitPose){
 const t=Math.max(0,seconds),emerge=smooth((t-13)/2),steps=smooth((t-15)/1.6),hop=Math.max(0,Math.min(1,(t-16.6)/1.2)),walk=smooth((t-17.8)/3.2);
 const localZ=t<15?2.1+emerge*.9:t<16.6?3+steps:t<17.8?4+hop*1.5:5.5+walk*3.5;
 const out=target??{visible:false,localZ:0,deckHeight:0,hopHeight:0,verticalVelocity:0,yaw:0,speed:0,grounded:false};
 out.visible=t>=13;out.localZ=localZ;
 out.deckHeight=t<15?1.13:t<16.6?1.13-steps*.88:t<17.8?.25*(1-hop):0;
 out.hopHeight=t>=16.6&&t<17.8?4*.5*hop*(1-hop):0;
 out.verticalVelocity=t>=16.6&&t<17.8?(2-4*hop)/1.2:0;
 out.yaw=Math.PI+(Math.PI+ARRIVAL_YAW)*smooth((t-20.4)/.6);
 out.speed=t>=13&&t<20.8?.9:0;out.grounded=t>=17.8;
 return out;
}
