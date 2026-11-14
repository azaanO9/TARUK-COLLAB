/** Continuous horizontal collision for a walking capsule or a compound rover footprint. */
export type CollisionObstacle = {
  x: number; z: number; radius: number; id?: string; traversable?: boolean;
  /** World-space top of a jumpable rock; omitted obstacles stay solid at all heights. */
  topY?: number;
  /** Convex horizontal rock outline, world-oriented offsets from x/z. */
  hull?: readonly {x:number;z:number}[];
  rockSupport?: {yaw:number;halfX:number;halfZ:number;height:number};
  halfX?: number; halfZ?: number; yaw?: number;
};
export type CollisionDisc = { x: number; z: number; radius: number; halfX?: number; halfZ?: number; yaw?: number };
type Contact = { nx: number; nz: number; depth: number };
const SKIN = .0001;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

function localPoint(x: number, z: number, o: CollisionObstacle) {
  const c = Math.cos(o.yaw ?? 0), s = Math.sin(o.yaw ?? 0);
  return { x: (x - o.x) * c - (z - o.z) * s, z: (x - o.x) * s + (z - o.z) * c, c, s };
}

export function overlapDisc(x: number, z: number, radius: number, o: CollisionObstacle): Contact | null {
  if (Math.abs(x-o.x)>radius+o.radius || Math.abs(z-o.z)>radius+o.radius) return null;
  const p = localPoint(x, z, o);
  let nx: number, nz: number, depth: number;
  if (o.halfX !== undefined && o.halfZ !== undefined) {
    const dx = p.x - clamp(p.x, -o.halfX, o.halfX), dz = p.z - clamp(p.z, -o.halfZ, o.halfZ);
    const d = Math.hypot(dx, dz);
    if (d >= radius) return null;
    if (d > 1e-9) { nx = dx / d; nz = dz / d; depth = radius - d; }
    else {
      const gapX = o.halfX - Math.abs(p.x), gapZ = o.halfZ - Math.abs(p.z);
      if (gapX < gapZ) { nx = p.x < 0 ? -1 : 1; nz = 0; depth = gapX + radius; }
      else { nx = 0; nz = p.z < 0 ? -1 : 1; depth = gapZ + radius; }
    }
  } else {
    const d = Math.hypot(p.x, p.z);
    depth = radius + o.radius - d;
    if (depth <= 0) return null;
    nx = d > 1e-9 ? p.x / d : 1; nz = d > 1e-9 ? p.z / d : 0;
  }
  return { nx: nx * p.c + nz * p.s, nz: -nx * p.s + nz * p.c, depth };
}

function sweepDisc(x: number, z: number, dx: number, dz: number, radius: number, o: CollisionObstacle) {
  if (Math.abs(x-o.x)>radius+o.radius+Math.abs(dx) || Math.abs(z-o.z)>radius+o.radius+Math.abs(dz)) return null;
  const p = localPoint(x, z, o), vx = dx * p.c - dz * p.s, vz = dx * p.s + dz * p.c;
  let best = 2, nx = 0, nz = 0;
  const accept = (t: number, ax: number, az: number) => {
    if (t >= -1e-8 && t <= 1 && t < best && vx * ax + vz * az < -1e-9) { best = Math.max(0, t); nx = ax; nz = az; }
  };
  const circle = (cx: number, cz: number, r: number) => {
    const ox = p.x - cx, oz = p.z - cz, a = vx * vx + vz * vz;
    if (a < 1e-16) return;
    const b = ox * vx + oz * vz, disc = b * b - a * (ox * ox + oz * oz - r * r);
    if (disc < 0) return;
    const t = (-b - Math.sqrt(disc)) / a;
    accept(t, (ox + vx * t) / r, (oz + vz * t) / r);
  };
  if (o.halfX !== undefined && o.halfZ !== undefined) {
    // The Minkowski sum is a rectangle with rounded corners, not an oversized box.
    for (const side of [-1, 1]) {
      if (Math.abs(vx) > 1e-12) {
        const t = (side * (o.halfX + radius) - p.x) / vx;
        if (Math.abs(p.z + vz * t) <= o.halfZ) accept(t, side, 0);
      }
      if (Math.abs(vz) > 1e-12) {
        const t = (side * (o.halfZ + radius) - p.z) / vz;
        if (Math.abs(p.x + vx * t) <= o.halfX) accept(t, 0, side);
      }
      for (const end of [-1, 1]) circle(side * o.halfX, end * o.halfZ, radius);
    }
  } else circle(0, 0, radius + o.radius);
  return best <= 1 ? { t: best, nx: nx * p.c + nz * p.s, nz: -nx * p.s + nz * p.c } : null;
}

// Swept separating-axis test for two oriented rectangular footprints.
function boxContact(a: CollisionObstacle, b: CollisionObstacle, dx: number, dz: number) {
  let enter = -Infinity, leave = Infinity, hitX = 0, hitZ = 0, depth = Infinity, depX = 0, depZ = 0;
  const ac=Math.cos(a.yaw??0), as=Math.sin(a.yaw??0), bc=Math.cos(b.yaw??0), bs=Math.sin(b.yaw??0);
  for (const [nx,nz] of [[ac,-as],[as,ac],[bc,-bs],[bs,bc]]) {
    const span = Math.abs(nx*ac-nz*as)*a.halfX! + Math.abs(nx*as+nz*ac)*a.halfZ!
      + Math.abs(nx*bc-nz*bs)*b.halfX! + Math.abs(nx*bs+nz*bc)*b.halfZ!;
    const distance=(a.x-b.x)*nx+(a.z-b.z)*nz, v=dx*nx+dz*nz, overlap=span-Math.abs(distance);
    if(overlap<depth){depth=overlap;depX=nx*(distance<0?-1:1);depZ=nz*(distance<0?-1:1);}
    if(Math.abs(v)<1e-12){if(overlap<0)return null;continue;}
    let lo=(-span-distance)/v, hi=(span-distance)/v;
    if(lo>hi)[lo,hi]=[hi,lo];
    if(lo>enter){enter=lo;hitX=nx*(v>0?-1:1);hitZ=nz*(v>0?-1:1);}
    leave=Math.min(leave,hi);
    if(enter>leave)return null;
  }
  return {depth,nx:depX,nz:depZ,t:enter,hitX,hitZ,leave};
}

/** Swept SAT between the vehicle rectangle and a geometry-derived rock outline. */
function rockBoxContact(x:number,z:number,body:CollisionDisc,o:CollisionObstacle,dx:number,dz:number){
 const hull=o.hull!,c=Math.cos(body.yaw??0),s=Math.sin(body.yaw??0);
 let enter=-Infinity,leave=Infinity,depth=Infinity,nx=0,nz=0,hitX=0,hitZ=0;
 for(let i=-2;i<hull.length;i++){
  let ax:number,az:number;
  if(i===-2){ax=c;az=-s;}else if(i===-1){ax=s;az=c;}
  else{const a=hull[i],b=hull[(i+1)%hull.length],length=Math.hypot(b.x-a.x,b.z-a.z);if(length<1e-9)continue;ax=-(b.z-a.z)/length;az=(b.x-a.x)/length;}
  let low=Infinity,high=-Infinity;
  for(const p of hull){const v=p.x*ax+p.z*az;low=Math.min(low,v);high=Math.max(high,v);}
  const center=(x-o.x)*ax+(z-o.z)*az;
  const extent=Math.abs(ax*c-az*s)*body.halfX!+Math.abs(ax*s+az*c)*body.halfZ!;
  const left=center+extent-low,right=high-center+extent;
  const penetration=Math.min(left,right);
  if(penetration<depth){depth=penetration;const sign=left<right?-1:1;nx=ax*sign;nz=az*sign;}
  const v=dx*ax+dz*az;
  if(Math.abs(v)<1e-12){if(penetration<0)return null;continue;}
  let lo=(low-extent-center)/v,hi=(high+extent-center)/v;
  if(lo>hi)[lo,hi]=[hi,lo];
  if(lo>enter){enter=lo;hitX=ax*(v>0?-1:1);hitZ=az*(v>0?-1:1);}
  leave=Math.min(leave,hi);if(enter>leave)return null;
 }
 return {depth,nx,nz,t:enter,hitX,hitZ,leave};
}

export function overlapBody(x:number,z:number,body:CollisionDisc,o:CollisionObstacle):Contact|null {
  if(body.halfX===undefined || body.halfZ===undefined)return overlapDisc(x,z,body.radius,o);
  if(Math.abs(x-o.x)>body.radius+o.radius || Math.abs(z-o.z)>body.radius+o.radius)return null;
  if(o.hull){const contact=rockBoxContact(x,z,body,o,0,0);return contact&&contact.depth>1e-9?contact:null;}
  const a={...body,x,z};
  if(o.halfX!==undefined && o.halfZ!==undefined){const c=boxContact(a,o,0,0);return c&&c.depth>0?c:null;}
  const c=overlapDisc(o.x,o.z,o.radius,a);
  return c?{depth:c.depth,nx:-c.nx,nz:-c.nz}:null;
}

function sweepBody(x:number,z:number,dx:number,dz:number,body:CollisionDisc,o:CollisionObstacle){
  if(body.halfX===undefined || body.halfZ===undefined)return sweepDisc(x,z,dx,dz,body.radius,o);
  if(Math.abs(x-o.x)>body.radius+o.radius+Math.abs(dx) || Math.abs(z-o.z)>body.radius+o.radius+Math.abs(dz))return null;
  if(o.hull){const contact=rockBoxContact(x,z,body,o,dx,dz);return contact&&contact.t>=-1e-8&&contact.t<=1&&contact.leave>=0?{t:Math.max(0,contact.t),nx:contact.hitX,nz:contact.hitZ}:null;}
  const a={...body,x,z};
  if(o.halfX!==undefined && o.halfZ!==undefined){
    const c=boxContact(a,o,dx,dz);
    return c&&c.t>=-1e-8&&c.t<=1&&c.leave>=0?{t:Math.max(0,c.t),nx:c.hitX,nz:c.hitZ}:null;
  }
  const c=sweepDisc(o.x,o.z,-dx,-dz,o.radius,a);
  return c?{t:c.t,nx:-c.nx,nz:-c.nz}:null;
}

export function moveAndSlide(
  x: number, z: number, dx: number, dz: number,
  discs: readonly CollisionDisc[], obstacles: readonly CollisionObstacle[], limit: number,
) {
  const normals: { nx: number; nz: number }[] = [];
  // Recover safely from a spawn/save overlap, including exact coincident centres.
  for (let pass = 0; pass < 8; pass++) {
    let deepest: Contact | null = null;
    for (const disc of discs) for (const o of obstacles) {
      const contact = overlapBody(x + disc.x, z + disc.z, disc, o);
      if (contact && (!deepest || contact.depth > deepest.depth)) deepest = contact;
    }
    if (!deepest || deepest.depth < SKIN) break;
    x += deepest.nx * (deepest.depth + SKIN); z += deepest.nz * (deepest.depth + SKIN); normals.push(deepest);
  }
  let rx = dx, rz = dz;
  for (let pass = 0; pass < 6 && Math.hypot(rx, rz) > 1e-8; pass++) {
    let first: { t: number; nx: number; nz: number } | null = null;
    for (const disc of discs) for (const o of obstacles) {
      const hit = sweepBody(x + disc.x, z + disc.z, rx, rz, disc, o);
      if (hit && (!first || hit.t < first.t)) first = hit;
    }
    if (!first) { x += rx; z += rz; break; }
    const t = Math.max(0, first.t - SKIN / Math.max(SKIN, Math.hypot(rx, rz)));
    x += rx * t; z += rz * t;
    rx *= 1 - t; rz *= 1 - t;
    const into = Math.min(0, rx * first.nx + rz * first.nz);
    rx -= into * first.nx; rz -= into * first.nz; normals.push(first);
  }
  if (Math.abs(x) > limit) { normals.push({ nx: -Math.sign(x), nz: 0 }); x = clamp(x, -limit, limit); }
  if (Math.abs(z) > limit) { normals.push({ nx: 0, nz: -Math.sign(z) }); z = clamp(z, -limit, limit); }
  return { x, z, normals };
}

export function boxObstacle(x: number, z: number, halfX: number, halfZ: number, id?: string, yaw = 0): CollisionObstacle {
  return { x, z, halfX, halfZ, radius: Math.hypot(halfX, halfZ), id, yaw };
}
