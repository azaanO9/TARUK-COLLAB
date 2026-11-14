import test from 'node:test';
import assert from 'node:assert/strict';
import {atlasBounds,atlasPoint} from '../game/marsAtlas.ts';
import {MARS_REGION,marsToWorld} from '../game/marsRegion.ts';
import {MARS_LANDMARKS} from '../content/marsLandmarks.ts';

test('full atlas uses the entire user-supplied NASA extent with correctly registered corners',()=>{
 const b=atlasBounds('region',0,0);
 const nw=marsToWorld(MARS_REGION.west,MARS_REGION.north),se=marsToWorld(MARS_REGION.east,MARS_REGION.south);
 assert.deepEqual(atlasPoint(nw.x,nw.z,b),{left:0,top:0,visible:true});
 assert.deepEqual(atlasPoint(se.x,se.z,b),{left:100,top:100,visible:true});
 assert.deepEqual(atlasBounds('region',10000,-5000),b);
 for(const p of MARS_LANDMARKS)assert.equal(atlasPoint(p.x,p.z,b).visible,true);
 assert.equal(atlasPoint(b.east+1,0,b).visible,false);
});

test('nearby map follows the explorer in the infinite continuation without inventing surveyed pins',()=>{
 const b=atlasBounds('nearby',10000,-5000);
 assert.deepEqual(atlasPoint(10000,-5000,b),{left:50,top:50,visible:true});
 assert.equal(atlasPoint(10000,-5700,b).top,0);
 for(const p of MARS_LANDMARKS)assert.equal(atlasPoint(p.x,p.z,b).visible,false);
});
