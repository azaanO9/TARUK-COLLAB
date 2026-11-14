import type {LidarScan} from "./roverLidar.ts";

export const MAP_RANGE=80;
export const MAP_LIDAR_CONTACT_LIMIT=48;
export function mapPoint(x:number,z:number,centerX:number,centerZ:number,range=MAP_RANGE){
 const dx=(x-centerX)*88/range,dz=(z-centerZ)*88/range;
 const distance=Math.hypot(dx,dz),scale=distance>88?88/distance:1;
 return {x:100+dx*scale,y:100+dz*scale,edge:distance>88};
}
export function mapHeading(yaw:number){return -yaw*180/Math.PI;}

/** Share the rover's existing scan; bound SVG work and retain path hazards first. */
export function mapLidarContacts(scan:LidarScan,centerX:number,centerZ:number){
 return scan.contacts.slice().sort((a,b)=>Number(b.inPath)-Number(a.inPath)
  || Math.hypot(a.x-centerX,a.z-centerZ)-Math.hypot(b.x-centerX,b.z-centerZ))
  .slice(0,MAP_LIDAR_CONTACT_LIMIT).map(contact=>({
   ...mapPoint(contact.x,contact.z,centerX,centerZ,scan.range),
   radius:Math.max(2,Math.min(7,contact.radius*88/scan.range)),
   inPath:contact.inPath,
  }));
}
