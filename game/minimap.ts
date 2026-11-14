export const MAP_RANGE=80;
export function mapPoint(x:number,z:number,centerX:number,centerZ:number){
 const dx=(x-centerX)*88/MAP_RANGE,dz=(z-centerZ)*88/MAP_RANGE;
 const distance=Math.hypot(dx,dz),scale=distance>88?88/distance:1;
 return {x:100+dx*scale,y:100+dz*scale,edge:distance>88};
}
export function mapHeading(yaw:number){return -yaw*180/Math.PI;}
