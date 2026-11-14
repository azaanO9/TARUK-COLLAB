/** Fixed toroidal storage. Moving the window reuses pages instead of growing a trail history. */
export const TRACK_PAGES=8;
export const TRACK_METRES_PER_PIXEL=.1875;
export const wrapTrack=(n:number,size:number)=>((n%size)+size)%size;
export function createTrackWindow(size=1024){
 const pageSize=size/TRACK_PAGES,pageMetres=pageSize*TRACK_METRES_PER_PIXEL;
 const span=size*TRACK_METRES_PER_PIXEL,half=span/2;
 const data=new Uint8Array(size*size*4),mask=new Uint8Array(TRACK_PAGES*TRACK_PAGES*4).fill(255);
 const ownerX=new Float64Array(64),ownerZ=new Float64Array(64),pending:number[]=[];
 const center={x:0,z:0};let pageX=0,pageZ=0;
 const slot=(x:number,z:number)=>wrapTrack(z+4,8)*8+wrapTrack(x+4,8);
 for(let z=-4;z<4;z++)for(let x=-4;x<4;x++){const i=slot(x,z);ownerX[i]=x;ownerZ[i]=z;}
 function moveTo(x:number,z:number){
  const cx=Math.floor(x/pageMetres),cz=Math.floor(z/pageMetres);if(cx===pageX&&cz===pageZ)return false;
  pageX=cx;pageZ=cz;center.x=cx*pageMetres;center.z=cz*pageMetres;
  for(let dz=-4;dz<4;dz++)for(let dx=-4;dx<4;dx++){
   const wx=cx+dx,wz=cz+dz,i=slot(wx,wz);
   if(ownerX[i]===wx&&ownerZ[i]===wz)continue;
   ownerX[i]=wx;ownerZ[i]=wz;mask.fill(0,i*4,i*4+4);
   const px=i%8*pageSize,pz=Math.floor(i/8)*pageSize;
   for(let row=0;row<pageSize;row++)data.fill(0,((pz+row)*size+px)*4,((pz+row)*size+px+pageSize)*4);
  }
  pending.length=0;
  for(let i=0;i<64;i++)if(!mask[i*4])pending.push(i);
  // Pop nearest pages first after a teleport; ordinary scrolling changes only the far edge.
  pending.sort((a,b)=>(ownerX[b]-cx)**2+(ownerZ[b]-cz)**2-(ownerX[a]-cx)**2-(ownerZ[a]-cz)**2);
  return true;
 }
 function contains(x:number,z:number,margin=0){return Math.abs(x-center.x)<half-margin&&Math.abs(z-center.z)<half-margin;}
 function ready(x:number,z:number){return contains(x,z)&&mask[slot(Math.floor(x/pageMetres),Math.floor(z/pageMetres))*4]>0;}
 return {size,pageSize,span,half,center,data,mask,moveTo,contains,ready,
  pixel:(world:number)=>wrapTrack(Math.floor(world/TRACK_METRES_PER_PIXEL)+size/2,size),
  nextPage:()=>pending.pop(),pending:()=>pending.length,
  markReady:(i:number)=>mask.fill(255,i*4,i*4+4)};
}
/** Up to four bounded copies when a stamp straddles the toroidal texture seam. */
export function forTrackPatch(size:number,patchSize:number,x:number,y:number,copy:(sx:number,sy:number,w:number,h:number,dx:number,dy:number)=>void){
 const dx=wrapTrack(x,size),dy=wrapTrack(y,size),w=Math.min(patchSize,size-dx),h=Math.min(patchSize,size-dy);
 copy(0,0,w,h,dx,dy);
 if(w<patchSize)copy(w,0,patchSize-w,h,0,dy);
 if(h<patchSize)copy(0,h,w,patchSize-h,dx,0);
 if(w<patchSize&&h<patchSize)copy(w,h,patchSize-w,patchSize-h,0,0);
}
