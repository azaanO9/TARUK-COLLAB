import {REGION_WORLD_BOUNDS} from './marsRegion.ts';

export type AtlasView = 'region' | 'nearby';
export type AtlasBounds = {west:number;east:number;north:number;south:number};

/** Both views use the same projection as the terrain and the shipped MOLA image. */
export function atlasBounds(view:AtlasView,x:number,z:number):AtlasBounds {
  return view==='region' ? REGION_WORLD_BOUNDS : {west:x-350,east:x+350,north:z-350,south:z+350};
}

export function atlasPoint(x:number,z:number,bounds:AtlasBounds) {
  return {
    left:(x-bounds.west)/(bounds.east-bounds.west)*100,
    top:(z-bounds.north)/(bounds.south-bounds.north)*100,
    visible:x>=bounds.west&&x<=bounds.east&&z>=bounds.north&&z<=bounds.south,
  };
}
