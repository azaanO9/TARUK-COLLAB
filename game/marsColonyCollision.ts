export const MARS_HABITAT = {x:-2,z:-26,scale:1.27,radius:6.75} as const;
/** Circular navigation boundaries for the new visual footprints, including the open bunker doorway. */
export function colonyCollision(stations:readonly {id:string;x:number;z:number}[]) {
 const obstacles: { x: number; z: number; radius: number; id?: string }[] = stations
   .filter(s=>s.id!=="shelter"&&s.id!=="lookout"&&s.id!=="solar")
   .map(s=>({id:s.id,x:s.x,z:s.z,radius:s.id==="solar"?2.2:s.id==="rover"?2:s.id==="research"?3:s.id==="food"?1.8:1.4}));
 obstacles.push({x:MARS_HABITAT.x,z:MARS_HABITAT.z,radius:MARS_HABITAT.radius});
 // Cover each long solar table, including its outer corners and braced stands.
 const solar=stations.find(s=>s.id==="solar");
 if(solar) for(const x of [-2.05,0,2.05]) for(const z of [-1.05,0,1.05])
   obstacles.push({id:"solar",x:solar.x+x,z:solar.z+z,radius:1.15});
 const shelter=stations.find(s=>s.id==="shelter");
 if(shelter){
  for(const side of [-1,1])for(const z of [-3.4,-2.65,-1.9,-1.15,-.4,.35,1.1,1.85])obstacles.push({x:shelter.x+side*2.75,z:shelter.z+z,radius:.58});
  for(const x of [-2.4,-1.6,-.8,0,.8,1.6,2.4])obstacles.push({x:shelter.x+x,z:shelter.z-3.45,radius:.58});
  for(const x of [-2.4,-1.65,1.65,2.4])obstacles.push({x:shelter.x+x,z:shelter.z+2.08,radius:.6});
 }
 return obstacles;
}
