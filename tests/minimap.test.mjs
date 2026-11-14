import test from "node:test";
import assert from "node:assert/strict";
import {mapPoint,mapHeading,mapLidarContacts,MAP_RANGE,MAP_LIDAR_CONTACT_LIMIT} from "../game/minimap.ts";
test("minimap tracks world coordinates without an infinite-map origin limit",()=>{
 assert.deepEqual(mapPoint(10000,-9000,10000,-9000),{x:100,y:100,edge:false});
 assert.equal(mapPoint(10000+MAP_RANGE,-9000,10000,-9000).x,188);
 assert.equal(mapPoint(10000,-9000-MAP_RANGE,10000,-9000).y,12);
 const far=mapPoint(0,0,10000,-9000);assert.equal(far.edge,true);assert.ok(Math.abs(Math.hypot(far.x-100,far.y-100)-88)<1e-8);
 assert.equal(mapHeading(Math.PI/2),-90);
});
test("rover LiDAR zoom preserves north and world translation at 30 metres",()=>{
 const contacts=[{x:500,z:-515,radius:1,inPath:false,kind:"rock"}];
 const scan={range:30,threatDistance:null,contacts};
 const [point]=mapLidarContacts(scan,500,-500);
 assert.equal(point.x,100); assert.equal(point.y,56);
 assert.deepEqual(point,mapLidarContacts({...scan,contacts:[{...contacts[0],x:0,z:-15}]},0,0)[0]);
 assert.equal(mapPoint(530,-500,500,-500,30).x,188);
 assert.equal(mapPoint(600,-500,500,-500,30).edge,true);
});
test("bounded LiDAR markers keep hazards and closest returns without mutating the scan",()=>{
 const contacts=Array.from({length:70},(_,i)=>({x:0,z:-(i+1)*.4,radius:.5,inPath:i===69,kind:"rock"}));
 const before=structuredClone(contacts);
 const points=mapLidarContacts({range:30,threatDistance:8,contacts},0,0);
 assert.equal(points.length,MAP_LIDAR_CONTACT_LIMIT);
 assert.equal(points[0].inPath,true);
 assert.equal(points[1].y,mapPoint(0,-.4,0,0,30).y);
 assert.deepEqual(contacts,before);
 assert.deepEqual(mapLidarContacts({range:30,threatDistance:null,contacts:[]},0,0),[]);
});
