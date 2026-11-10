import * as T from "three";
import { MARS_HABITAT, colonyCollision } from "../../game/marsColonyCollision";
import { STATIONS } from "../../content/survival";
import { createMarsTerrain } from "./marsTerrain";
import { createColonyMaterials, colonyBuilder } from "./colonyMaterials";
import { batchStaticMeshes } from "./batchStaticMeshes";
import { createMarsSolarArray } from "./createMarsSolarArray";

/** Detailed original Mars colony. It shares station IDs and navigation with the existing game. */
export function createMarsColony(scene:T.Scene, surface?:T.Texture, panelSurface?:T.Texture) {
  const root=new T.Group();scene.add(root);
  const terrain=createMarsTerrain(root, surface), m=createColonyMaterials(panelSurface), b=colonyBuilder(m);
  const targets:T.Group[]=[], indicators:Record<string,T.MeshStandardMaterial>={}, panels:T.Mesh[]=[], tanks:T.Mesh[]=[], foods:T.Mesh[]=[], wheelMeshes:T.Mesh[]=[];
  let dish:T.Object3D|null=null;
  const habitatWindow=new T.MeshStandardMaterial({color:0x74b5ad,metalness:.35,roughness:.22,emissive:0x65a89b,emissiveIntensity:.65});

  // Dark, feathered ground contact costs one merged draw for the whole settlement.
  const c=document.createElement("canvas");c.width=c.height=64;const ctx=c.getContext("2d")!;
  const gradient=ctx.createRadialGradient(32,32,5,32,32,31);gradient.addColorStop(0,"rgba(28,17,12,.44)");gradient.addColorStop(.7,"rgba(28,17,12,.26)");gradient.addColorStop(1,"rgba(28,17,12,0)");ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const shadowMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  const contact=(parent:T.Object3D,w:number,d:number,x=0,z=0)=>{const mesh=b.add(parent,new T.PlaneGeometry(w,d),shadowMat,x,.018,z);mesh.rotation.x=-Math.PI/2;mesh.castShadow=false;};

  const displayCanvas=document.createElement("canvas");displayCanvas.width=256;displayCanvas.height=192;
  const displayCtx=displayCanvas.getContext("2d")!;displayCtx.fillStyle="#0a262a";displayCtx.fillRect(0,0,256,192);
  displayCtx.strokeStyle="#4f9691";displayCtx.lineWidth=1;
  for(let x=15;x<250;x+=25){displayCtx.beginPath();displayCtx.moveTo(x,30);displayCtx.lineTo(x,177);displayCtx.stroke();}
  for(let y=32;y<190;y+=24){displayCtx.beginPath();displayCtx.moveTo(12,y);displayCtx.lineTo(244,y);displayCtx.stroke();}
  displayCtx.strokeStyle="#a4e8cf";displayCtx.strokeRect(89,64,75,85);displayCtx.strokeRect(99,77,55,57);displayCtx.beginPath();displayCtx.moveTo(20,145);displayCtx.lineTo(47,140);displayCtx.lineTo(62,119);displayCtx.lineTo(75,146);displayCtx.lineTo(87,133);displayCtx.stroke();displayCtx.fillStyle="#a4e8cf";displayCtx.font="13px monospace";displayCtx.fillText("TARUKH / SYSTEMS",12,20);displayCtx.font="10px monospace";displayCtx.fillText("SIGNAL OK   LINK 01",13,180);
  const displayMap=new T.CanvasTexture(displayCanvas);displayMap.colorSpace=T.SRGBColorSpace;
  const display=new T.MeshStandardMaterial({map:displayMap,emissiveMap:displayMap,emissive:0x7eb8a2,emissiveIntensity:.7,roughness:.4});
  // Cylindrical pressure habitat, with a segmented dome and a strongly framed entrance.
  const habitat=new T.Group();habitat.position.set(MARS_HABITAT.x,0,MARS_HABITAT.z);habitat.scale.setScalar(MARS_HABITAT.scale);root.add(habitat);
  const radius=4.65;
  b.add(habitat,new T.CylinderGeometry(radius,radius,4.5,40),m.ceramic,0,2.6,0);
  for(const y of [.5,4.58])b.add(habitat,new T.TorusGeometry(radius+.03,.075,6,40).rotateX(Math.PI/2),m.graphite,0,y,0);
  const dome=b.add(habitat,new T.SphereGeometry(radius,40,16,0,Math.PI*2,0,Math.PI/2),m.ceramic,0,4.8,0);dome.scale.y=.43;
  b.add(habitat,new T.CylinderGeometry(.55,.7,.13,20),m.graphite,0,6.82,0);
  for(let i=0;i<20;i++){
    const a=i*Math.PI/10,x=Math.sin(a)*(radius+.025),z=Math.cos(a)*(radius+.025);
    const rib=b.box(habitat,.045,3.9,.045,x,2.6,z,m.alloy,false);rib.rotation.y=a;
    for(const y of [1,4.15]){const bolt=b.cylinder(habitat,.045,.04,x,y,z,m.graphite);bolt.rotation.x=Math.PI/2;bolt.rotation.z=-a;}
    const seam=b.add(habitat,new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(Math.sin(a)*radius,4.8,Math.cos(a)*radius),new T.Vector3(Math.sin(a)*radius*.78,6.02,Math.cos(a)*radius*.78),new T.Vector3(Math.sin(a)*.65,6.78,Math.cos(a)*.65)]),10,.018,4),m.alloy,0,0,0);seam.castShadow=false;
  }
  for(const x of [-3.4,-2.65,2.65,3.4]){
    const z=Math.sqrt(radius*radius-x*x)+.025;
    const slit=b.box(habitat,.22,1.25,.09,x,2.8,z,habitatWindow);slit.rotation.y=Math.atan2(x,z);
  }
  b.box(habitat,2.15,3.2,.24,0,1.86,4.6,m.graphite);
  b.box(habitat,1.85,2.95,.16,0,1.82,4.75,m.orange);
  b.box(habitat,1.52,2.65,.18,0,1.75,4.86,m.teal);
  b.box(habitat,1.23,2.35,.05,0,1.73,4.97,m.graphite);
  for(const x of [-.65,.65])b.box(habitat,.035,2.3,.035,x,1.75,5.01,m.light,false);
  b.box(habitat,1.3,.035,.035,0,2.9,5.01,m.light,false);
  b.label(habitat,"HABITAT / H1",2.6,0,4.04,4.75);
  for(let i=0;i<4;i++)b.box(habitat,2.5,.16,.48,0,.15+i*.14,5.9-i*.4,m.alloy);
  for(const x of [-2.4,2.4]){b.vent(habitat,.8,.65,x,1.2,4.05);b.pipe(habitat,[[x,3.8,3.95],[x,4.2,4.15],[x,1,4.3],[x+.45,.3,4.8]],.065,m.graphite);}
  contact(habitat,13,13);
  for(let i=0;i<13;i++)b.box(root,.14,.012,1.4,-1,.03,9-i*2.3,m.ceramic,false);

  const labelNames:Record<string,string>={solar:"SOLAR / 01",oxygen:"MOXIE / O2",water:"ICE / H2O",food:"GROW LAB",battery:"ENERGY / P1",shelter:"SHIELD / S1",rover:"ROVER BAY",monitor:"MISSION COMMS"};
  for(const station of STATIONS){
    const g=new T.Group();g.position.set(station.x,0,station.z);g.userData.station=station.id;root.add(g);targets.push(g);
    const lamp=m.light.clone();indicators[station.id]=lamp;
    const ring=b.add(g,new T.RingGeometry(2.3,2.34,48),m.alloy,0,.026,0);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
    contact(g,7,6);
    if(station.id==="solar"){
      panels.push(...createMarsSolarArray(g,m));
    }else if(station.id==="oxygen"||station.id==="water"){
      b.cylinder(g,1.8,.22,0,.14,0,m.alloy);
      for(const x of [-.65,.65]){
        const tank=b.add(g,new T.CapsuleGeometry(.49,2.15,6,20),m.ceramic.clone(),x,1.65,0);tank.userData.system=station.id;tanks.push(tank);
        for(const y of [.7,2.55])b.add(g,new T.TorusGeometry(.51,.037,6,20).rotateX(Math.PI/2),m.alloy,x,y,0);
        b.cylinder(g,.50,.14,x,1.25,0,m.orange);
        b.cylinder(g,.1,.3,x,3.12,0,m.graphite);
        b.cylinder(g,.18,.045,x,3.3,0,m.orange);
        b.pipe(g,[[x,3.15,0],[x,3.43,-.35],[x+.35,3.43,-.5],[x+.35,.45,-.6]],.055,m.graphite);
        b.label(g,station.id==="oxygen"?"O2":"H2O",.52,x,1.9,.5);
        b.box(g,.16,.07,.035,x,2.37,.5,lamp);
      }
      for(const x of [-1.43,1.43]){b.cylinder(g,.032,.85,x,.6,.8,m.orange);b.pipe(g,[[x,.95,-.5],[x,.95,1.1],[x*.5,.95,1.4]],.026,m.orange);}
      b.box(g,.65,.62,.34,0,.6,1.15,m.graphite);b.box(g,.45,.31,.025,0,.7,1.33,lamp);
    }else if(station.id==="shelter"||station.id==="research"){
      if(station.id==="shelter"){
        for(const x of [-2.75,2.75])b.box(g,.5,3.6,5.8,x,1.9,-.8,m.ceramic);
        b.box(g,6,3.6,.5,0,1.9,-3.45,m.ceramic);
        for(const x of [-2,2])b.box(g,2,3.6,.18,x,1.9,2.08,m.ceramic);
        b.box(g,2,.6,.2,0,3.4,2.08,m.ceramic);
        for(const x of [-1.05,1.05]){b.box(g,.14,2.9,.2,x,1.6,2.15,m.graphite);b.box(g,.025,2.6,.025,x,1.6,2.27,m.light,false);}
        b.box(g,5.2,.08,5,0,.08,-.8,m.graphite);
      }else{
        b.box(g,4.8,3.6,4,0,1.9,-.8,m.ceramic);
        b.box(g,2,2.9,.15,0,1.6,1.24,m.graphite);
      }
      b.box(g,station.id==="shelter"?6.1:5,.18,station.id==="shelter"?5.9:4.1,0,3.65,-.8,m.orange);
      b.label(g,station.id==="shelter"?"SHIELD / S1":"SCIENCE / R1",2.5,0,3.12,station.id==="shelter"?2.2:1.3);
      b.vent(g,.9,.7,station.id==="shelter"?2.25:1.7,2.5,station.id==="shelter"?2.17:1.27);
      for(const x of [-2.5,2.5])b.box(g,.06,2.9,.05,x,1.9,2.13,m.alloy,false);
      b.box(g,.64,.09,.08,-1.75,3.18,2.25,lamp);
      // Faceted radome and rooftop service equipment.
      b.add(g,new T.IcosahedronGeometry(.87,1),m.ceramic,.7,4.5,-.7);
      b.cylinder(g,.52,.12,.7,3.88,-.7,m.graphite);
      b.cylinder(g,.035,1.6,-1.65,4.4,-.5,m.alloy);
      b.box(g,.8,.45,.7,-1.6,3.95,-1.3,m.graphite);
    }else if(station.id==="battery"||station.id==="cache"){
      b.box(g,3.15,.14,1.7,0,.13,0,m.alloy);
      for(let i=-1;i<=1;i++){
        b.box(g,.88,1.8,1.1,i,1.06,0,m.graphite);
        b.box(g,.73,1.65,.045,i,1.07,.58,m.ceramic);
        b.box(g,.76,.1,.08,i,1.87,.57,m.teal);
        b.vent(g,.54,.85,i,1.03,.63);
        b.box(g,.1,.11,.04,i+.26,1.68,.65,lamp);
        b.bolts(g,.7,1.55,i,1.07,.62);
      }
    }else if(station.id==="food"){
      b.box(g,3.1,2.8,2.25,0,1.5,0,m.graphite);
      b.box(g,3.2,.16,2.35,0,2.88,0,m.ceramic);
      b.box(g,3.2,.16,2.35,0,.17,0,m.ceramic);
      for(const x of [-1.48,1.48])b.box(g,.15,2.65,2.3,x,1.53,0,m.ceramic);
      b.label(g,"HYDROPONICS",2.3,0,2.58,1.19);
      const leaf=new T.MeshStandardMaterial({color:0x5b8c53,roughness:.9});
      for(let j=0;j<2;j++){
        b.box(g,2.75,.08,1.9,0,.66+j*.9,0,m.alloy);
        b.box(g,2.5,.035,.08,0,1.3+j*.9,.15,m.warm);
        for(let i=0;i<5;i++){
          const plant=b.add(g,new T.SphereGeometry(.16,8,6),leaf,-1+i*.5,.86+j*.9,.45);plant.scale.set(1,.65,1.2);foods.push(plant);
          b.cylinder(g,.19,.12,-1+i*.5,.72+j*.9,.45,m.graphite);
        }
      }
    }else if(station.id==="rover"){
      b.box(g,4.1,.15,6.2,0,.13,0,m.graphite);
      for(const x of [-1.7,1.7])b.box(g,.12,.02,5.5,x,.22,0,m.orange,false);
      b.cylinder(g,.06,2.4,2.05,1.3,-1.5,m.alloy);b.box(g,.75,.5,.35,2.05,1.5,-1.5,m.graphite);b.box(g,.55,.3,.025,2.05,1.55,-1.31,display);
    }else if(station.id==="relay"||station.id==="lookout"){
      b.cylinder(g,.12,station.id==="relay"?7:3.5,0,station.id==="relay"?3.5:1.75,0,m.alloy);
      for(const x of [-.9,.9])b.pipe(g,[[x,.05,.6],[0,4,0]],.035,m.orange);
      if(station.id==="relay"){
        dish=new T.Group();dish.position.y=6;g.add(dish);
        const bowl=b.add(dish,new T.SphereGeometry(1.2,24,10,0,Math.PI*2,0,Math.PI/2),m.ceramic,0,0,0);bowl.rotation.x=Math.PI/2;
      }
      b.box(g,.7,.4,.2,0,1.3,.18,m.graphite);b.box(g,.42,.2,.02,0,1.3,.3,lamp);
    }else{
      b.box(g,1.9,.12,1,0,1.15,0,m.alloy);
      for(const x of [-.7,.7])b.box(g,.09,1.1,.09,x,.6,0,m.graphite);
      b.box(g,1.55,1.05,.18,0,1.8,-.25,m.graphite);
      b.box(g,1.33,.8,.03,0,1.82,-.145,display);
      b.box(g,1.5,.05,.35,0,1.25,.15,m.graphite);
    }
    // A small physical identity plate and illuminated service bollard.
    if(labelNames[station.id]&&station.id!=="shelter")b.label(g,labelNames[station.id],1.1,0,.38,1.73);
    b.cylinder(g,.035,.65,1.9,.35,1.45,m.graphite);b.box(g,.09,.14,.09,1.9,.74,1.45,lamp);
  }
  // Accessory conduits and marked approach lights lead the eye toward the habitat.
  b.pipe(root,[[-12,.07,-12],[-16,.07,-18],[-11,.07,-24],[-6,.12,-27]],.065,m.graphite);
  b.pipe(root,[[11,.07,-8],[14,.07,-18],[6,.07,-25],[2,.12,-27]],.065,m.orange);
  for(const x of [-3,1])for(const z of [-3,-10,-17,-23]){b.cylinder(root,.03,.65,x,.34,z,m.alloy);b.box(root,.085,.12,.085,x,.7,z,m.light);}
  const animated=new Set<T.Object3D>([...panels,...tanks,...foods]);if(dish)animated.add(dish);
  // Shared lamp/window materials still animate after merging; only moving objects need exclusion.
  const luminous=new Set<T.Material>([habitatWindow,m.light,m.warm,display,...Object.values(indicators)]);
  root.traverse(o=>{if(o instanceof T.Mesh&&luminous.has(o.material as T.Material))o.castShadow=false;});
  let saved=0;for(const station of targets)saved+=batchStaticMeshes(station,animated);
  saved+=batchStaticMeshes(root,new Set([...targets,...animated]));root.userData.staticDrawCallsSaved=saved;
  const obstacles=colonyCollision(STATIONS);obstacles.push(...terrain.obstacles);
  return {
    root,
    targets,
    indicators,
    panels,
    tanks,
    foods,
    wheelMeshes,
    dish,
    obstacles,
    habitatWindow,
    heightAt:terrain.heightAt,
    roverHeightAt:terrain.roverHeightAt,
    mudAt:terrain.mudAt,
    stampRoverTracks:terrain.stampRoverTracks,
    disposeTracks:terrain.disposeTracks,
  };
}
