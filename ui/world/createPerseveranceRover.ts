import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {batchStaticMeshes} from './batchStaticMeshes.ts';
import {createSoftContactShadow} from './contactShadow.ts';
import {PERSEVERANCE_LANDING as P} from '../../content/marsLandingSites.ts';
import {boxObstacle} from '../../game/collision.ts';

export const PERSEVERANCE_CLEARING={x:P.x,z:P.z,radius:3.8} as const;
export const perseveranceFootprint=()=>boxObstacle(P.x,P.z,1.4,1.85,'perseverance');

/** Original, lightweight historical-site model. No imported art or live positioning. */
export function createPerseveranceRover(heightAt:(x:number,z:number)=>number) {
  const root=new T.Group(); root.name='PerseveranceAtJezero'; root.userData.station='perseverance';
  const ground=heightAt(P.x,P.z); root.position.set(P.x,ground,P.z);
  const ivory=new T.MeshStandardMaterial({color:0xe4ddd0,metalness:.32,roughness:.43});
  const alloy=new T.MeshStandardMaterial({color:0xa8b0b5,metalness:.75,roughness:.35});
  const dark=new T.MeshStandardMaterial({color:0x323638,metalness:.62,roughness:.62});
  const foil=new T.MeshStandardMaterial({color:0xd6a656,metalness:.78,roughness:.44});
  const lens=new T.MeshStandardMaterial({color:0x142c39,metalness:.72,roughness:.13});
  const white=new T.MeshStandardMaterial({color:0xf3eee3,metalness:.12,roughness:.7});
  const body=new T.Group();root.add(body);
  function mesh(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number,parent:T.Group=root){
    const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
  }
  function box(w:number,h:number,d:number,m:T.Material,x:number,y:number,z:number,parent:T.Group=body){
    return mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(.025,w/6,h/6,d/6)),m,x,y,z,parent);
  }
  function strut(a:T.Vector3,b:T.Vector3,r=.035,m:T.Material=alloy,parent:T.Group=root){
    const delta=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r,r,delta.length(),8),m,0,0,0,parent);
    o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
  }
  const wheelContacts:number[]=[];
  for(const x of [-1.2,1.2])for(const z of [-1.1,0,1.1])wheelContacts.push(heightAt(P.x+x,P.z+z)-ground);
  const average=wheelContacts.reduce((a,b)=>a+b,0)/6;
  body.position.y=.8+average;
  body.rotation.x=Math.atan2((wheelContacts[0]+wheelContacts[3]-wheelContacts[2]-wheelContacts[5])*.5,2.2);
  body.rotation.z=Math.atan2((wheelContacts[3]+wheelContacts[4]+wheelContacts[5]-wheelContacts[0]-wheelContacts[1]-wheelContacts[2])/3,2.4);
  box(1.65,.38,2.05,foil,0,0,0);
  box(1.8,.09,2.22,ivory,0,.24,-.03);
  box(1.66,.045,1.98,alloy,0,.31,-.03);
  // Riveted white equipment cases and layered thermal deck.
  for(const x of [-.58,0,.58])box(.48,.18,.58,white,x,.42,.18);
  for(const x of [-.81,.81])for(const z of [-.88,-.44,0,.44,.88]){
    mesh(new T.CylinderGeometry(.017,.017,.025,6),dark,x,.308,z,body);
  }
  for(let i=0;i<6;i++){
    const x=i<3?-1.2:1.2,z=[-1.1,0,1.1][i%3],y=wheelContacts[i]+.263;
    const wheel=mesh(new T.CylinderGeometry(.263,.263,.22,24),dark,x,y,z);wheel.rotation.z=Math.PI/2;
    wheel.name=`perseverance-wheel-${i}`;
    // Perforated metallic hubs, raised tread ribs, and visible rocker/bogie links.
    for(const side of [-1,1]){
      const hub=mesh(new T.CylinderGeometry(.16,.16,.016,16),alloy,x+side*.116,y,z);hub.rotation.z=Math.PI/2;
      for(let hole=0;hole<6;hole++){
        const a=hole*Math.PI/3,o=mesh(new T.CylinderGeometry(.027,.027,.018,6),dark,x+side*.128,y+Math.cos(a)*.105,z+Math.sin(a)*.105);o.rotation.z=Math.PI/2;
      }
    }
    for(let rib=0;rib<24;rib++){
      const a=rib*Math.PI/12,o=mesh(new T.BoxGeometry(.23,.014,.022),alloy,x,y+Math.cos(a)*.266,z+Math.sin(a)*.266);o.rotation.x=a;
    }
    strut(new T.Vector3(Math.sign(x)*.7,.57+average,z*.6),new T.Vector3(x,y,z));
    strut(new T.Vector3(Math.sign(x)*.78,.61+average,0),new T.Vector3(Math.sign(x)*.98,y+.12,z));
  }
  // Camera mast: twin Mastcam-style lenses plus an upper instrument housing.
  box(.17,.95,.17,ivory,-.28,.86,-.56);
  box(.64,.23,.24,white,-.28,1.4,-.56);
  box(.21,.16,.19,ivory,-.28,1.59,-.52);
  for(const x of [-.48,-.08]){
    const rim=mesh(new T.CylinderGeometry(.09,.09,.07,16),dark,x,1.41,-.72,body);rim.rotation.x=Math.PI/2;
    const glass=mesh(new T.CircleGeometry(.064,16),lens,x,1.41,-.76,body);glass.rotation.y=Math.PI;
  }
  box(.1,.13,.1,dark,.61,.43,-.94);
  const antenna=mesh(new T.CylinderGeometry(.24,.21,.045,20),white,.52,.63,.56,body);antenna.rotation.z=.25;
  strut(new T.Vector3(.52,.3,.56),new T.Vector3(.52,.61,.56),.03,alloy,body);
  strut(new T.Vector3(-.65,.31,.76),new T.Vector3(-.65,.94,.76),.018,alloy,body);
  // Rear radioisotope generator, radiator fins and protective support frame.
  const generator=mesh(new T.CylinderGeometry(.28,.28,.7,12),alloy,0,.29,1.29,body);generator.rotation.x=Math.PI/2;
  for(let i=0;i<9;i++)box(.7,.56,.025,dark,0,.29,1.02+i*.065);
  for(const x of [-.42,.42])strut(new T.Vector3(x,-.12,.8),new T.Vector3(x,.45,1.58),.03,alloy,body);
  // Stowed sample arm and its turret, never extending into a passing explorer.
  strut(new T.Vector3(-.66,-.1,-1.02),new T.Vector3(.16,-.14,-1.35),.065,ivory,body);
  strut(new T.Vector3(.16,-.14,-1.35),new T.Vector3(.66,-.03,-1.3),.06,ivory,body);
  const turret=mesh(new T.CylinderGeometry(.23,.23,.18,12),alloy,.65,-.08,-1.34,body);turret.rotation.x=Math.PI/2;
  for(const x of [-.62,-.48,-.34,-.2])box(.08,.08,.16,foil,x,.33,-.89);
  let label:T.CanvasTexture|undefined;
  if(typeof document!=='undefined'){
    // A terrain-conforming contact decal keeps wheels grounded even with shadows off.
    const contact=createSoftContactShadow({width:3.8,depth:4.4,y:0,opacity:.42,bodyHalfWidth:.85,bodyHalfLength:1.1,wheels:[[-1.2,-1.1],[-1.2,0],[-1.2,1.1],[1.2,-1.1],[1.2,0],[1.2,1.1]],wheelRadiusX:.28,wheelRadiusZ:.35});
    contact.mesh.geometry.dispose();contact.mesh.geometry=new T.PlaneGeometry(3.8,4.4,8,10);contact.mesh.geometry.rotateX(-Math.PI/2);
    const vertices=contact.mesh.geometry.attributes.position;
    for(let i=0;i<vertices.count;i++)vertices.setY(i,heightAt(P.x+vertices.getX(i),P.z+vertices.getZ(i))-ground+.022);
    contact.mesh.geometry.computeBoundingSphere();contact.mesh.name='perseverance-contact-shadow';root.add(contact.mesh);
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
    const ctx=canvas.getContext('2d');
    if(ctx){ctx.fillStyle='#26343b';ctx.fillRect(0,0,256,64);ctx.fillStyle='#faf1d6';ctx.font='bold 24px sans-serif';ctx.textAlign='center';ctx.fillText('PERSEVERANCE',128,29);ctx.font='14px sans-serif';ctx.fillText('MARS 2020 · JEZERO',128,50);label=new T.CanvasTexture(canvas);label.colorSpace=T.SRGBColorSpace;
      const plate=mesh(new T.PlaneGeometry(.86,.215),new T.MeshBasicMaterial({map:label}),0,.02,-1.035,body);plate.rotation.y=Math.PI;plate.castShadow=false;
    }
  }
  batchStaticMeshes(root,new Set());
  let disposed=false;
  return {root,label,
    updateVisibility(x:number,z:number,performance:boolean){const reach=performance?140:240;root.visible=(x-P.x)**2+(z-P.z)**2<reach*reach;},
    dispose(){if(disposed)return;disposed=true;root.removeFromParent();const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();root.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);const map=(m as T.MeshBasicMaterial).map;if(map)textures.add(map);}}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();},
  };
}
