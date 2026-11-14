import test from 'node:test';
import assert from 'node:assert/strict';
import {performanceReadout} from '../game/performanceMeter.ts';
const sample={fps:59.94,calls:64,triangles:1058668,textures:41,scale:.85,tier:'performance'};

test('FPS-only and detailed modes report the same measured frame rate and resource counts',()=>{
 assert.equal(performanceReadout('off',sample),'');
 assert.equal(performanceReadout('fps',sample),'60 FPS');
 assert.equal(performanceReadout('detailed',sample),'60 FPS · 16.7 ms\nDraw calls: 64\nTriangles: 1,058,668\nTextures: 41\nRender scale: 0.85\nTier: performance');
});
test('a missing or invalid sample never reports Infinity or NaN',()=>{
 for(const fps of [0,-1,NaN,Infinity])assert.equal(performanceReadout('detailed',{...sample,fps}),'Measuring FPS…');
});
