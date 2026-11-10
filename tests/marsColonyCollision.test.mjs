import test from 'node:test';import assert from 'node:assert/strict';
import {colonyCollision,MARS_HABITAT} from '../game/marsColonyCollision.ts';
import {stepWalker} from '../game/navigation.ts';
const obstacles=colonyCollision([{id:'shelter',x:-21,z:-9},{id:'research',x:46,z:-37},{id:'food',x:4,z:-17}]);
test('the shelter doorway is open but its side and back walls block walking',()=>{
 let w={x:-21,z:-5,vx:0,vz:0,yaw:0};for(let i=0;i<30;i++)w=stepWalker(w,new Set(['w']),1/60,obstacles);assert.ok(w.z<-7,'can enter through doorway');
 w={x:-21,z:-10,vx:0,vz:0,yaw:0};for(let i=0;i<100;i++)w=stepWalker(w,new Set(['d']),1/60,obstacles);assert.ok(w.x<-18.5,'right wall stays solid');
 w={x:-21,z:-10,vx:0,vz:0,yaw:0};for(let i=0;i<100;i++)w=stepWalker(w,new Set(['w']),1/60,obstacles);assert.ok(w.z>-12.1,'back wall stays solid');
});
test('the habitat collision follows its displayed position and expanded footprint',()=>{assert.ok(obstacles.some(o=>o.x===MARS_HABITAT.x&&o.z===MARS_HABITAT.z&&o.radius===MARS_HABITAT.radius));let w={x:-2,z:-15,vx:0,vz:0,yaw:0};for(let i=0;i<150;i++)w=stepWalker(w,new Set(['w']),1/60,obstacles);assert.ok(w.z>=MARS_HABITAT.z+MARS_HABITAT.radius-.001)});

test('long solar tables block their outer stands while leaving a reachable inspection approach',()=>{
 const solar=colonyCollision([{id:'solar',x:0,z:0}]);
 for(const x of [-2.05,0,2.05]){
  let w={x,z:5,vx:0,vz:0,yaw:0};
  for(let i=0;i<180;i++)w=stepWalker(w,new Set(['w']),1/60,solar);
  assert.ok(w.z>2.15,'cannot walk through the tilted table or its feet');
  assert.ok(Math.hypot(w.x,w.z)<4.5,'solar inspection remains reachable');
 }
});

