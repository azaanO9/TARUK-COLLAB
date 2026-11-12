import {dailyUse, flightPlan, type Meter} from "../content/marsFlightPlan.ts";
export type Resource = Meter;
type Stores = Record<Resource,number>;
export type Mission = { sol:number; xp:number; resources:Stores; found:string[]; patches:string[]; log:string[]; ended:boolean; activityDone:boolean; serviced?:string[]; failure?:string; incoming?:Partial<Stores>; dispatch?:string };
export const discoveryIds = ["solar", "oxygen", "water", "food", "shelter", "rover"] as const;
export const ranks = [[0,"Space Cadet"],[100,"Rover Pilot"],[250,"Habitat Botanist"],[500,"Mission Scientist"],[1000,"Outpost Commander"]] as const;
export const rank = (xp: number, discoveries = 0) => [...ranks].reverse().find(([n], index) => xp >= n && discoveries >= [6,4,3,1,0][index])![1];
export const isNight = (sol:number) => sol % 2 === 0;
export const createMission = (cargo:"standard"|"air"|"food"="standard"): Mission => ({sol:1,xp:0,resources:{power:75,water:75,food:cargo==="food"?18:75,oxygen:cargo==="air"?12:75,risk:20},found:[],patches:[],log:["Sol 1: Keep the crew supplied and send the sample report on sol 10."],ended:false,activityDone:false});
export type Action = {type:"TASK";id:string} | {type:"QUIZ";id:string;correct:boolean} | {type:"SHIFT";choice:"careful"|"quick"} | {type:"SHIFT_QUIZ";sol:number;correct:boolean} | {type:"RETRY"};
const stationResource:Record<string,Resource>={solar:"power",oxygen:"oxygen",water:"water",food:"food",shelter:"risk",rover:"power"};
function adjust(stores:Stores,...changes:Partial<Stores>[]):Stores {
 const result={...stores};
 for(const key of Object.keys(result) as Resource[]) {
   result[key]=Math.max(0,Math.min(100,stores[key]+changes.reduce((total,change)=>total+(change[key]??0),0)));
 }
 return result;
}
export function forecast(s:Mission,index:0|1) {
 return adjust(s.resources,dailyUse,flightPlan[s.sol-1].plans[index].effect);
}
export function missionReducer(s:Mission,a:Action):Mission {
 if(s.failure) return a.type==="RETRY"?{...s,failure:undefined}:s;
 if(a.type==="RETRY") return s;
 if(a.type==="SHIFT_QUIZ") {
   const id="sol-"+a.sol;
   if(!a.correct||a.sol<1||a.sol>10||s.patches.includes(id)||(a.sol>=s.sol&&!s.ended)) return s;
   return {...s,xp:s.xp+50,patches:[...s.patches,id],resources:adjust(s.resources,{power:3}),log:[...s.log,"Earned the sol patch and 3 power points."]};
 }
 if(s.ended) return s;
 const event=flightPlan[s.sol-1];
 if(a.type==="TASK") {
   const required=a.id===event.station;
   const key=stationResource[a.id];
   if((!required&&!key)||s.serviced?.includes(a.id)) return s;
   const first=Boolean(key)&&!s.found.includes(a.id);
   const arrival=required?s.incoming:undefined;
   const message=required?s.dispatch:undefined;
   return {...s,activityDone:s.activityDone||required,serviced:[...(s.serviced??[]),a.id],
     xp:s.xp+(first?75:0),found:first?[...s.found,a.id]:s.found,
     resources:adjust(s.resources,key?{[key]:key==="risk"?-8:18}:{},arrival??{}),
     ...(s.incoming||s.dispatch?{incoming:required?undefined:s.incoming,dispatch:required?undefined:s.dispatch}:{}),
     log:[...s.log,"Sol "+s.sol+": inspected "+a.id+".",...(message?[message]:[])]};
 }
 if(a.type==="QUIZ") {
   if(!a.correct||!s.found.includes(a.id)||s.patches.includes(a.id)) return s;
   return {...s,xp:s.xp+50,patches:[...s.patches,a.id],resources:adjust(s.resources,{power:3})};
 }
 if(!s.activityDone) return s;
 const index=a.choice==="careful"?0:1;
 const plan=event.plans[index], resources=forecast(s,index);
 const empty=Object.entries(resources).find(([key,value])=>key!=="risk"&&value===0);
 const failure=empty?"This plan would empty the "+empty[0]+" reserve. Visit its supply station or choose another plan.":resources.risk>=100?"The crew needs more cover. Visit the storm refuge.":plan.incomplete?plan.result:undefined;
 // Keep the pre-decision checkpoint intact until the player accepts a viable plan.
 if(failure) return {...s,failure};
 const dispatch=s.sol===5?(index===0?"Earth reply: the graded route is clear. The crew recovered 6 charge points from the shorter survey.":"Earth reply: position confirmed. Local survey used 4 water points."):plan.next?"Harvest delivered to the food store.":undefined;
 return {...s,resources,sol:Math.min(10,s.sol+1),ended:s.sol===10,activityDone:false,serviced:[],xp:s.xp+60,
   incoming:plan.next,dispatch,log:[...s.log,"Sol "+s.sol+": "+plan.result]};
}
