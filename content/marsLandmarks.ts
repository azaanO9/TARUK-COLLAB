import {marsToWorld} from '../game/marsRegion.ts';
import {PERSEVERANCE_LANDING} from './marsLandingSites.ts';
export const MARS_TREK_URL='https://trek.nasa.gov/mars/#v=0.1&x=134.97323611266458&y=14.089500110766512&z=2&p=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A104905&d=&locale=&b=mars&e=54.025971997619806%2C-46.99448312479932%2C215.92050022770937%2C75.17348334633235&sfz=&w=';

// IAU/USGS Gazetteer, planetocentric +East, MOLA control network.
// These are feature centres, not landing sites, routes or mission objectives.
export const MARS_LANDMARKS = [
 {id:'elysium',name:'Elysium Mons',latitude:25.02,longitude:147.21,kind:'volcano',description:'A broad Martian volcano. Follow the rising lava plains toward its summit.',source:'https://planetarynames.wr.usgs.gov/Feature/1783'},
 {id:'albor',name:'Albor Tholus',latitude:18.87,longitude:150.47,kind:'volcano',description:'A smaller volcano south of Elysium Mons, with a summit depression.',source:'https://planetarynames.wr.usgs.gov/Feature/166'},
 {id:'hecates',name:'Hecates Tholus',latitude:32.12,longitude:150.24,kind:'volcano',description:'The northern volcano of the Elysium group.',source:'https://planetarynames.wr.usgs.gov/Feature/2407'},
 {id:'gale',name:'Gale crater',latitude:-5.37,longitude:137.81,kind:'crater',description:'An impact crater containing Aeolis Mons. NASA’s Curiosity explores this region.',source:'https://planetarynames.wr.usgs.gov/Feature/2071'},
 {id:'hebrus',name:'Hebrus Valles',latitude:19.88,longitude:126.74,kind:'valley',description:'A system of channels west of Elysium. Small channels are simplified at this map resolution.',source:'https://planetarynames.wr.usgs.gov/Feature/2404'},
 {id:'plains',name:'Elysium Planitia',latitude:2.98,longitude:154.74,kind:'plain',description:'An extensive plain. This pin marks its named centre, not its full boundary.',source:'https://planetarynames.wr.usgs.gov/Feature/1784'},
 {...PERSEVERANCE_LANDING,kind:'landing site',description:'Perseverance stands at its historical touchdown coordinates: 18.4446° N, 77.4509° E. It landed here in Jezero crater on 18 February 2021. This recreation marks the landing, not its current position.'},
].map((place,index)=>({...place,number:index+1,sourceLabel:place.source.includes('nasa.gov')?'NASA source':'USGS source',...marsToWorld(place.longitude,place.latitude)}));
