import test from 'node:test';
import assert from 'node:assert/strict';
import {scanRoverLidar} from '../game/roverLidar.ts';
import {spawnRoverVehicle} from '../game/roverVehicle.ts';
import {boxObstacle} from '../game/collision.ts';
const rover = spawnRoverVehicle(0,0);
test('lidar ignores rover pad and traversable rocks, and respects range',()=>{
 const scan=scanRoverLidar(rover,[{id:'rover',x:0,z:0,radius:2},{x:0,z:-5,radius:1,traversable:true},{x:0,z:-32,radius:1}]);
 assert.equal(scan.contacts.length,0); assert.equal(scan.threatDistance,null);
});
test('nearest solid returns occlude rocks hidden behind a wall',()=>{
 const wall=boxObstacle(0,-5,5,.3);
 const scan=scanRoverLidar(rover,[wall,{x:0,z:-10,radius:.5}]);
 assert.equal(scan.contacts.length,1); assert.equal(scan.contacts[0].kind,'structure');
 assert.ok(scan.threatDistance>0 && scan.threatDistance<5);
});
test('forward hazards use the whole rover footprint, not only its center ray',()=>{
 const scan=scanRoverLidar(rover,[{x:1.5,z:-8,radius:.5},{x:-6,z:-8,radius:.5}]);
 assert.equal(scan.contacts.length,2);
 assert.equal(scan.contacts.find(c=>c.x===1.5).inPath,true);
 assert.equal(scan.contacts.find(c=>c.x===-6).inPath,false);
 assert.ok(scan.threatDistance>4 && scan.threatDistance<8);
});
test('reverse travel checks behind the rover and heading rotates the route',()=>{
 const rock={x:0,z:8,radius:.7};
 assert.equal(scanRoverLidar(rover,[rock]).threatDistance,null);
 assert.notEqual(scanRoverLidar({...rover,speed:-.5},[rock]).threatDistance,null);
 assert.notEqual(scanRoverLidar({...rover,yaw:Math.PI},[rock]).threatDistance,null);
});
test('rotated structures and world translation preserve detection',()=>{
 const obstacle=boxObstacle(0,-9,2,1,Math.PI/4);
 const a=scanRoverLidar(rover,[obstacle]);
 const b=scanRoverLidar({...rover,x:17,z:10},[{...obstacle,x:17,z:1}]);
 assert.equal(a.contacts.length,1); assert.equal(b.threatDistance,a.threatDistance);
 assert.ok(a.threatDistance>0);
});
test('steering prediction follows the turn instead of warning for a straight path',()=>{
 const leftRock={x:-4,z:-4,radius:.8};
 assert.equal(scanRoverLidar(rover,[leftRock]).threatDistance,null);
 assert.notEqual(scanRoverLidar({...rover,steerAngle:.52},[leftRock]).threatDistance,null);
});


