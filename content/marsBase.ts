import { STATIONS as equipment } from "./survival.ts";
import { stationNames } from "./marsFlightPlan.ts";

// The western power yard feeds the eastern life-support works. The garage
// opens onto a clear southeast exit for the traverse to the geology annex.
const pads:Record<string,[number,number]> = {
 solar:[-23,6],battery:[-12,12],oxygen:[8,-9],water:[20,-13],food:[16,-25],
 monitor:[-12,-14],shelter:[-21,-22],relay:[-29,-34],research:[46,-37],
 rover:[17,10],science:[29,-25],lookout:[-43,-38],cache:[39,22]
};
export const STATIONS=equipment.map(station=>{
 const [x,z]=pads[station.id];
 return {...station,x,z,name:stationNames[station.id]??station.name};
});
