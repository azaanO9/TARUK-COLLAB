import test from 'node:test';import assert from 'node:assert/strict';
import {terrainNoise,terrainFbm} from '../ui/world/terrainNoise.ts';
test('landscape noise is deterministic, bounded and continuous across cell edges',()=>{
 for(const [x,y] of [[0,0],[1,-4],[-123.5,52.1],[99.9999,-30]]){const n=terrainFbm(x,y);assert.equal(n,terrainFbm(x,y));assert.ok(n>=0&&n<=1);assert.ok(Math.abs(terrainNoise(x,y)-terrainNoise(x+.00001,y))<.0001);}
});
