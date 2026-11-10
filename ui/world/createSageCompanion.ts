import * as T from "three";
import { SAGE_DOCK } from "../../game/sageCompanion";
import { createColonyMaterials, colonyBuilder } from "./colonyMaterials";
import { batchStaticMeshes } from "./batchStaticMeshes";

/** Original pressure-rated robot service bay; dimensions retain the existing collisions. */
export function createSageDock(panelSurface?:T.Texture) {
  const dock=new T.Group();dock.position.set(SAGE_DOCK.x,0,SAGE_DOCK.z);
  const m=createColonyMaterials(panelSurface),b=colonyBuilder(m);
  b.box(dock,3.6,.18,3.2,0,.09,0,m.graphite);
  b.box(dock,3.26,.07,2.9,0,.2,0,m.alloy);
  b.box(dock,3.35,.09,.42,0,.055,1.74,m.alloy);
  for(const x of [-1.65,1.65]){
    b.box(dock,.22,2.25,3,x,1.3,0,m.ceramic);
    b.box(dock,.29,2.1,.25,x,1.28,1.42,m.graphite);
    b.box(dock,.13,1.8,.11,x,1.35,1.57,m.alloy);
    b.box(dock,.045,1.12,.035,x,1.35,1.64,m.light);
    b.box(dock,.075,.5,.07,x,2.1,1.57,m.orange);
  }
  b.box(dock,3.3,2.25,.2,0,1.3,-1.4,m.ceramic);
  b.box(dock,3.85,.25,3.4,0,2.5,0,m.graphite);
  b.box(dock,3.7,.13,3.26,0,2.63,0,m.ceramic);
  b.box(dock,3.72,.09,.2,0,2.55,1.7,m.orange);
  b.box(dock,3.27,.49,.19,0,2.18,1.54,m.teal);
  b.label(dock,"SAGE / HOME",2.65,0,2.2,1.65);
  b.box(dock,2.2,.07,.22,0,2.17,.89,m.graphite);
  b.box(dock,1.86,.025,.12,0,2.12,.9,m.warm);
  const serviceLight=new T.PointLight(0xffd6a1,1.7,4.2,2);serviceLight.position.set(0,2.05,.45);dock.add(serviceLight);
  // Sealed interior wall panels and floor joints.
  for(const x of [-1.05,-.35,.35,1.05]){
    b.box(dock,.012,1.55,.025,x,1.19,-1.275,m.graphite,false);
    b.bolts(dock,.57,1.4,x,1.2,-1.255);
  }
  for(const y of [.49,1.2,1.9])b.box(dock,3.05,.012,.025,0,y,-1.273,m.graphite,false);
  for(const x of [-.85,.85])b.box(dock,.015,.014,2.66,x,.244,0,m.graphite,false);
  for(const z of [-.8,0,.8])b.box(dock,3.05,.014,.015,0,.244,z,m.graphite,false);
  for(const x of [-1.18,1.18]){
    b.box(dock,.65,.44,.56,x,.48,-.82,m.graphite);
    b.box(dock,.54,.32,.045,x,.5,-.51,m.ceramic);
    b.box(dock,.19,.04,.03,x,.56,-.48,m.orange);
    b.bolts(dock,.5,.3,x,.5,-.46);
  }
  b.box(dock,.51,.5,.06,1.22,1.45,-1.24,m.graphite);
  b.box(dock,.4,.3,.03,1.22,1.47,-1.19,m.teal);
  for(let i=0;i<3;i++)b.box(dock,.22,.018,.014,1.22,1.4+i*.06,-1.17,m.light,false);
  for(const x of [-1.76,1.76]){
    b.pipe(dock,[[x,1.7,-.8],[x,1.7,1.2],[x,.3,1.3],[x,.3,.8]],.04,m.alloy);
    b.box(dock,.06,.18,.15,x,1.1,1.6,m.orange);
  }
  for(const side of [-1,1]){
    const exterior=new T.Group();exterior.position.x=side*1.78;exterior.rotation.y=side*Math.PI/2;dock.add(exterior);
    b.box(exterior,2.7,.17,.045,0,.55,0,m.orange);
    for(const x of [-.9,0,.9]){
      b.box(exterior,.84,1.28,.055,x,1.35,.015,m.ceramic);
      b.bolts(exterior,.76,1.18,x,1.35,.056);
    }
    b.vent(exterior,.65,.5,.75,1.85,.09);
    b.box(exterior,.44,.7,.1,-.9,1.05,.1,m.graphite);
    b.box(exterior,.34,.58,.035,-.9,1.05,.17,m.alloy);
    b.pipe(exterior,[[-1.25,.3,.12],[-1.25,1.7,.12],[-.8,1.7,.12]],.035,m.graphite);
    for(const x of [-1.3,1.3])for(const y of [.5,1.9])b.box(exterior,.15,.25,.14,x,y,.12,m.alloy);
  }
  const ring=b.add(dock,new T.RingGeometry(.58,.65,48),m.light,0,.25,0);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
  batchStaticMeshes(dock,new Set());return dock;
}

/** Original friendly service robot; all following and home behavior stays in the game. */
export function createSageCompanion() {
  const sage=new T.Group(),m=createColonyMaterials(),b=colonyBuilder(m);
  const profile=[new T.Vector2(0,0),new T.Vector2(.26,.05),new T.Vector2(.39,.15),new T.Vector2(.4,.45),new T.Vector2(.33,.66),new T.Vector2(.2,.76),new T.Vector2(0,.78)];
  b.add(sage,new T.LatheGeometry(profile,24),m.ceramic,0,.36,0);
  b.box(sage,.5,.14,.5,0,.42,0,m.orange);
  b.cylinder(sage,.1,.16,0,1.2,0,m.graphite);
  const head=b.add(sage,new T.SphereGeometry(.37,28,18),m.ceramic,0,1.48,0);head.scale.set(1.16,.83,.94);
  const face=b.add(sage,new T.SphereGeometry(.31,24,14),m.graphite,0,1.48,-.2);face.scale.set(1.1,.67,.51);
  const glass=b.add(sage,new T.SphereGeometry(.292,24,14),m.teal,0,1.48,-.242);glass.scale.set(1.08,.61,.41);
  for(const x of [-.12,.12]){
    const eye=b.add(sage,new T.TorusGeometry(.043,.012,6,14,Math.PI),m.light,x,1.48,-.363);eye.rotation.z=0;
  }
  b.box(sage,.19,.08,.025,0,.93,-.31,m.alloy);
  b.box(sage,.1,.035,.015,0,.93,-.33,m.light);
  for(const x of [-.23,.23]){
    b.box(sage,.07,.17,.03,x,.67,-.32,m.orange);
    b.box(sage,.025,.12,.018,x,.67,-.345,m.graphite);
  }
  for(const x of [-.38,.38]){
    const wheel=b.cylinder(sage,.2,.13,x,.29,0,m.graphite);wheel.rotation.z=Math.PI/2;
    const hub=b.cylinder(sage,.11,.145,x,.29,0,m.alloy);hub.rotation.z=Math.PI/2;
  }
  b.cylinder(sage,.018,.25,.23,1.86,.02,m.graphite);
  b.add(sage,new T.SphereGeometry(.035,10,6),m.light,.23,2,.02);
  batchStaticMeshes(sage,new Set());return sage;
}
