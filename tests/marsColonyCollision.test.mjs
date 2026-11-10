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

