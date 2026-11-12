export type Meter = "power" | "water" | "food" | "oxygen" | "risk";
type Change = Partial<Record<Meter,number>>;
type Plan = {name:string; effect:Change; result:string; next?:Change; incomplete?:boolean};
type Sol = {station:string; title:string; clue:string; instrument:string; plans:[Plan,Plan]};
export const stationNames:Record<string,string> = {
 solar:"Solar field", oxygen:"Air plant", water:"Ice works", food:"Glasshouse", shelter:"Storm refuge", rover:"Traverse garage",
 battery:"Battery exchange", monitor:"Forecast desk", relay:"Earth relay", research:"Geology annex"
};
export const flightPlan:Sol[] = [
 {station:"solar",title:"One battery, two jobs",instrument:"Array output",clue:"Dust has cut sunlight. One socket can run the air plant or the seedling lamps. Check your oxygen and food stores.",plans:[
 {name:"Power the air plant",effect:{power:-10,oxygen:18},result:"The compressor filled the oxygen tanks. The seedlings missed a light cycle."},
 {name:"Light the seedlings",effect:{power:-8,water:-4},next:{food:20},result:"The seedlings stayed under lights. The next crew shift can collect food."}]},
 {station:"oxygen",title:"Fill the spare tanks",instrument:"Compressor log",clue:"Making oxygen takes electricity. The reserve tank can cover this shift if you need to save charge.",plans:[
 {name:"Start the compressor",effect:{oxygen:20,power:-12},result:"The crew used battery charge to refill its air supply."},
 {name:"Draw stored air",effect:{oxygen:-9,power:6},result:"The compressor stayed off and spare solar power charged the battery."}]},
 {station:"water",title:"Follow the ice seam",instrument:"Drill reading",clue:"The drill found ice. Melting a full batch takes more power than recycling the crew’s used water.",plans:[
 {name:"Melt a full batch",effect:{water:22,power:-12},result:"Heaters melted the ice into a full storage tank."},
 {name:"Run the recycling loop",effect:{water:9,power:-3},result:"The recycler saved charge and returned a smaller batch of water."}]},
 {station:"food",title:"Choose the next harvest",instrument:"Seed tray log",clue:"One tray is ready now. Watering the younger tray gives a bigger harvest after another shift.",plans:[
 {name:"Harvest the ready tray",effect:{food:12,water:-3},result:"The crew packed a small harvest for dinner."},
 {name:"Grow the younger tray",effect:{water:-8,power:-5},next:{food:24},result:"The crew used stored meals while the next crop grew."}]},
 {station:"relay",title:"Ask Earth about the route",instrument:"Radio window",clue:"Earth cannot answer instantly. Send a map now or survey locally. Finish the next station inspection to receive the route note.",plans:[
 {name:"Transmit the terrain map",effect:{power:-8},next:{power:6},result:"Map sent. Earth is checking a shorter driving route."},
 {name:"Send a short position ping",effect:{power:-2},next:{water:-4},result:"Position sent. The crew will use water on its local survey."}]},
 {station:"rover",title:"Deliver the field kit",instrument:"Route note",clue:"The graded track is longer. An indoor packing shift lets you send a lighter rover with less spare oxygen.",plans:[
 {name:"Drive with full spares",effect:{power:-10,oxygen:8},result:"Charged batteries carried spare air to the annex."},
 {name:"Carry a lighter load",effect:{power:-4,oxygen:-5},result:"The rover conserved charge and drew from the annex air tanks."}]},
 {station:"monitor",title:"Read the particle warning",instrument:"Practice forecast",clue:"A simulated energetic particle alert is in effect. Moving supplies indoors takes charge. Delaying the move leaves more work outside.",plans:[
 {name:"Move supplies under cover",effect:{power:-8,risk:-12},result:"Supplies are inside and the next crew needs less outdoor time."},
 {name:"Secure only the air bottles",effect:{power:-3,risk:14},result:"The air bottles are covered. Outdoor work remains on the schedule."}]},
 {station:"shelter",title:"Operate from shelter",instrument:"Shelter inventory",clue:"The crew is under cover. Remote equipment can work on battery power, or the crew can suspend fieldwork and use packed meals.",plans:[
 {name:"Run remote equipment",effect:{power:-10,water:10,risk:-7},result:"The crew collected water remotely from shelter."},
 {name:"Pause fieldwork",effect:{food:-8,risk:-12},result:"Packed meals supported the shelter shift while equipment rested."}]},
 {station:"research",title:"Prepare the sample report",instrument:"Sample notebook",clue:"The report needs a sample location and a measurement. Both are in the field notebook. Choose how to prepare them.",plans:[
 {name:"Process the complete scan",effect:{power:-8},result:"The crew attached a detailed scan and its sampling location."},
 {name:"Transcribe the field notes",effect:{food:-6,oxygen:-3},result:"The crew used an extra work shift to prepare a compact report."}]},
 {station:"battery",title:"Send the crew report",instrument:"Transmitter checklist",clue:"The relay needs power and the report needs its evidence. A status ping alone cannot deliver the science.",plans:[
 {name:"Power the relay and send evidence",effect:{power:-7},result:"Earth received the sample record. The crew supplied its habitat through ten sols."},
 {name:"Send only a status ping",effect:{power:-2},incomplete:true,result:"Earth received your call sign, but the sample record is missing. Retry and attach the evidence."}]}
];
export const dailyUse:Change={power:-2,water:-5,food:-5,oxygen:-5};
export const archives:Record<string,{label:string;text:string;url:string}> = {
 solar:{label:"InSight · May 2022",text:"After landing, InSight collected about 5,000 watt-hours per sol. With dust on its panels in spring 2022 it collected about 500. Which machine needs the battery most?",url:"https://science.nasa.gov/resource/insights-power-generation-after-landing-and-spring-2022/"},
 oxygen:{label:"MOXIE · September 2023",text:"NASA reported 122 grams of oxygen across 16 runs on Mars. Our outpost scales this experiment into a fictional air plant.",url:"https://www.nasa.gov/solar-system/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/"}
};
