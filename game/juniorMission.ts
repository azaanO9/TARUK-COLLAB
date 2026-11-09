export type Resource = "power" | "water" | "food" | "oxygen" | "risk";
export type Mission = { sol: number; xp: number; resources: Record<Resource, number>; found: string[]; patches: string[]; log: string[]; ended: boolean };
export const discoveryIds = ["solar", "oxygen", "water", "food", "shelter", "rover"] as const;
export const ranks = [[0,"Space Cadet"],[100,"Rover Pilot"],[250,"Habitat Botanist"],[500,"Mission Scientist"],[1000,"Outpost Commander"]] as const;
export const rank = (xp: number) => [...ranks].reverse().find(([n]) => xp >= n)![1];
export const solEvents = [
 {title:"Dust devil near the array", careful:"Clean and secure the panels",quick:"Keep running and save power", resource:"power"},
 {title:"Rover signal lost",careful:"Check the antenna and relay",quick:"Send a high-power signal",resource:"power"},
 {title:"Meteorite sample found",careful:"Seal and label the sample",quick:"Return directly to base",resource:"food"},
 {title:"Dusty solar panel",careful:"Brush the cells before sunset",quick:"Wait for the next shift",resource:"power"},
 {title:"Air seal needs attention",careful:"Isolate and check the seal",quick:"Use the reserve air supply",resource:"oxygen"},
 {title:"Power reserve check",careful:"Shut down unused equipment",quick:"Keep all systems running",resource:"power"},
 {title:"A long rover route",careful:"Choose the gentler marked route",quick:"Take the steep shortcut",resource:"water"},
 {title:"Water recycling check",careful:"Inspect and clean the filter",quick:"Use stored water",resource:"water"},
 {title:"Solar particle alert",careful:"Move the crew into shelter",quick:"Finish outdoor work first",resource:"oxygen"},
 {title:"Final mission report",careful:"Check evidence before sending",quick:"Send the draft immediately",resource:"food"},
] as const;
export const createMission = (): Mission => ({sol:1,xp:0,resources:{power:75,water:75,food:75,oxygen:75,risk:20},found:[],patches:[],log:["Sol 1: Welcome to Mars."],ended:false});
export type Action = {type:"TASK";id:string} | {type:"QUIZ";id:string;correct:boolean} | {type:"SHIFT";choice:"careful"|"quick"} | {type:"SHIFT_QUIZ";sol:number;correct:boolean};
export function missionReducer(s:Mission,a:Action):Mission {
 if(a.type==="SHIFT_QUIZ") { const id=`sol-${a.sol}`; if(!a.correct||a.sol<1||a.sol>10||s.patches.includes(id)||(a.sol>=s.sol&&!s.ended)) return s; return {...s,xp:s.xp+50,patches:[...s.patches,id],resources:{...s.resources,power:Math.min(100,s.resources.power+3)},log:[...s.log,`Sol ${a.sol}: Earned a sol patch and 3 power points.`]}; }
 if (s.ended) return s;
 if(a.type==="TASK") { if(!discoveryIds.includes(a.id as typeof discoveryIds[number])||s.found.includes(a.id)) return s; const resource:Record<string,Resource>={solar:"power",oxygen:"oxygen",water:"water",food:"food",shelter:"risk",rover:"power"}; const key=resource[a.id]; return {...s,xp:s.xp+75,found:[...s.found,a.id],resources:{...s.resources,[key]:Math.max(0,Math.min(100,s.resources[key]+(key==="risk"?-8:8)))},log:[...s.log,`Sol ${s.sol}: Completed ${a.id} activity.`]}; }
 if(a.type==="QUIZ") { if(!s.found.includes(a.id)||s.patches.includes(a.id)||!a.correct)return s; return {...s,xp:s.xp+50,patches:[...s.patches,a.id],resources:{...s.resources,power:Math.min(100,s.resources.power+3)},log:[...s.log,`Sol ${s.sol}: Earned ${a.id} patch and 3 power points.`]}; }
 const resources={power:Math.max(0,s.resources.power-(a.choice==="careful"?4:1)),water:Math.max(0,s.resources.water-3),food:Math.max(0,s.resources.food-3),oxygen:Math.max(0,s.resources.oxygen-3),risk:Math.min(100,s.resources.risk+(a.choice==="careful"?0:8))};
 if(a.choice==="quick"){const affected=solEvents[s.sol-1].resource;resources[affected]=Math.max(0,resources[affected]-4);}
 const ended=s.sol>=10; return {...s,sol:ended?10:s.sol+1,xp:s.xp+60,resources,ended,log:[...s.log,`Sol ${s.sol}: ${a.choice} response; supplies used.`,...(Object.entries(resources).some(([k,v])=>k!=="risk"&&v===0)?["Mission Control: a supply is empty. Inspect equipment for help."]:[])]};
}
