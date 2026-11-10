import { boxObstacle, type CollisionObstacle } from "./collision.ts";
export const MARS_HABITAT = {x:-2,z:-26,scale:1.27,radius:5.95} as const;
/** Solid hardware footprints; low drive-on pads are not invisible walls. */
export function colonyCollision(stations:readonly {id:string;x:number;z:number}[]): CollisionObstacle[] {
 const obstacles:CollisionObstacle[]=[];
 for(const s of stations){
  const box=(x:number,z:number,hx:number,hz:number)=>obstacles.push(boxObstacle(s.x+x,s.z+z,hx,hz,s.id));
  if(s.id==="solar")for(const x of [-2.05,0,2.05])box(x,0,.91,1.86);
  else if(s.id==="shelter"){
   for(const x of [-2.75,2.75])box(x,-.8,.25,2.9);
   box(0,-3.45,3,.25);
   for(const x of [-2,2])box(x,2.08,1,.1);
  }else if(s.id==="research")box(0,-.8,2.4,2);
  else if(s.id==="food")box(0,0,1.6,1.18);
  else if(s.id==="battery"||s.id==="cache")box(0,0,1.45,.65);
  else if(s.id==="oxygen"||s.id==="water"){
   for(const x of [-.65,.65])obstacles.push({id:s.id,x:s.x+x,z:s.z,radius:.54});
   box(0,1.15,.33,.18);
  }else if(s.id==="rover")obstacles.push(boxObstacle(s.x+2.05,s.z-1.5,.4,.2,"rover-service-post"));
  else if(s.id==="relay"||s.id==="lookout")obstacles.push({id:s.id,x:s.x,z:s.z,radius:.18});
  else box(0,-.1,.98,.6);
 }
 obstacles.push({id:"habitat",x:MARS_HABITAT.x,z:MARS_HABITAT.z,radius:MARS_HABITAT.radius});
 return obstacles;
}
