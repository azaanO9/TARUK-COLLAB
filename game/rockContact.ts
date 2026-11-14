import type {CollisionObstacle} from "./collision.ts";
export type RockPoint={x:number;z:number};
export const ROVER_ROCK_STEP=.55;
/** Build once per rock shape, not in the frame loop. */
export function convexRockOutline(points:readonly RockPoint[]):RockPoint[]{
 const sorted=[...points].sort((a,b)=>a.x-b.x||a.z-b.z).filter((p,i,a)=>!i||p.x!==a[i-1].x||p.z!==a[i-1].z);
 const cross=(a:RockPoint,b:RockPoint,c:RockPoint)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
 const lower:RockPoint[]=[],upper:RockPoint[]=[];
 for(const p of sorted){while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],p)<=0)lower.pop();lower.push(p);}
 for(let i=sorted.length-1;i>=0;i--){const p=sorted[i];while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],p)<=0)upper.pop();upper.push(p);}
 return lower.slice(0,-1).concat(upper.slice(0,-1));
}
export function rockContact(x:number,z:number,outline:readonly RockPoint[],sx:number,sz:number,yaw:number,baseY:number,height:number):CollisionObstacle{
 const c=Math.cos(yaw),s=Math.sin(yaw);
 const hull=outline.map(p=>({x:p.x*sx*c+p.z*sz*s,z:-p.x*sx*s+p.z*sz*c}));
 return {x,z,hull,radius:Math.max(...hull.map(p=>Math.hypot(p.x,p.z))),topY:baseY+height,
  traversable:height<=ROVER_ROCK_STEP,
  rockSupport:{yaw,halfX:Math.max(...outline.map(p=>Math.abs(p.x)))*sx,halfZ:Math.max(...outline.map(p=>Math.abs(p.z)))*sz,height}};
}
/** Same small-rock wheel support in the original and generated terrain. */
export function rockLiftAt(x:number,z:number,rock:CollisionObstacle){
 const p=rock.rockSupport;if(!rock.traversable||!p)return 0;
 const c=Math.cos(p.yaw),s=Math.sin(p.yaw),dx=x-rock.x,dz=z-rock.z;
 const lx=(dx*c-dz*s)/(p.halfX+.18),lz=(dx*s+dz*c)/(p.halfZ+.18);
 return p.height*Math.max(0,1-lx*lx-lz*lz);
}
