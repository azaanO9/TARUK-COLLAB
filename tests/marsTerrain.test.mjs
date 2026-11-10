import test from "node:test";
import assert from "node:assert/strict";
import { marsHeight, colonySurfaceElevation } from "../ui/world/marsTerrain.ts";
import { STATIONS } from "../content/survival.ts";

test("Mars equipment pads and spawn remain level on the explorable terrain", () => {
  assert.equal(marsHeight(0, 12), 0);
  assert.equal(marsHeight(-2, -30), 0);
  for (const station of STATIONS) {
    assert.equal(marsHeight(station.x, station.z), 0, station.id);
    assert.equal(marsHeight(station.x + 2, station.z), 0, `${station.id} approach`);
  }
});

test("Mars craters have a recessed floor and the walking surface stays finite and continuous", () => {
  assert.ok(marsHeight(-48, 24) < marsHeight(-33, 24) - 2);
  for (let x = -88; x <= 88; x += 2) for (let z = -88; z <= 88; z += 2) {
    const h = marsHeight(x, z);
    assert.ok(Number.isFinite(h));
    assert.ok(Math.abs(marsHeight(x + .01, z) - h) < .1);
    assert.ok(Math.abs(marsHeight(x, z + .01) - h) < .1);
  }
});

test("open colony ground has varied low relief instead of one large flattened disk",()=>{
 const heights=[];
 for(let x=-8;x<=8;x+=1)for(let z=3;z<=9;z+=1)heights.push(marsHeight(x,z));
 assert.ok(Math.max(...heights)-Math.min(...heights)>.15);
 assert.ok(heights.filter(h=>Math.abs(h)>.035).length>heights.length*.3);
 for(const [x,z] of [[28,8],[-34,9],[8,30]])assert.notEqual(marsHeight(x,z),marsHeight(x+420/38,z));
});

test("walkable hardware supports feet on the rover pad, shelter floor and habitat stairs",()=>{
 assert.equal(colonySurfaceElevation(17,10),.215);
 assert.equal(colonySurfaceElevation(-21,-9.8),.12);
 for(let i=0;i<4;i++)assert.ok(Math.abs(colonySurfaceElevation(-2,-26+(5.9-i*.4)*1.27)-(.23+i*.14)*1.27)<1e-6);
 assert.equal(colonySurfaceElevation(30,30),0);
});
