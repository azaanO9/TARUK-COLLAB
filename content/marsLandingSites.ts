import {marsToWorld,isSurveyedRegion} from '../game/marsRegion.ts';

// Bell et al., Science Advances 8, eabo4856 (2022), NASA NTRS copy, page 1.
// Historical touchdown, not Perseverance's current position or a Jezero centre pin.
export const PERSEVERANCE_LANDING = {
  id:'perseverance', name:'Perseverance · Jezero',
  site:'Octavia E. Butler Landing', date:'18 February 2021',
  latitude:18.4446, longitude:77.4509,
  source:'https://ntrs.nasa.gov/api/citations/20230016428/downloads/Bell%20et%20al%202022sciadv.pdf',
  landingSource:'https://science.nasa.gov/resource/welcome-to-octavia-e-butler-landing/',
  ...marsToWorld(77.4509,18.4446),
} as const;

export function surveyRegionLabel(x:number,z:number) {
  if(!isSurveyedRegion(x,z))return 'PROCEDURAL FRONTIER';
  return Math.hypot(x-PERSEVERANCE_LANDING.x,z-PERSEVERANCE_LANDING.z)<100 ? 'JEZERO · PERSEVERANCE' : 'NASA MOLA REGION';
}
