export type Quiz = { q:string; answers:string[]; correct:number; explain:string; url:string };
export const stationQuestions:Record<string,{q:string;answers:string[];correct:number;explain:string;url:string}>={
 solar:{q:"What can reduce the sunlight reaching a solar panel?",answers:["Dust","A radio signal","A rover wheel"],correct:0,explain:"Dust can cover solar cells and reduce their power output.",url:"https://science.nasa.gov/mission/insight/insight-spacecraft-lands-on-mars/"},
 oxygen:{q:"What gas did MOXIE use to make oxygen on Mars?",answers:["Nitrogen","Carbon dioxide","Water vapor"],correct:1,explain:"MOXIE demonstrated oxygen production from Martian carbon dioxide; carbon monoxide was also produced.",url:"https://science.nasa.gov/resource/this-is-one-mars-rover-with-moxie/"},
 water:{q:"What has NASA found beneath parts of Mars?",answers:["Liquid oceans everywhere","Buried water ice","Forests"],correct:1,explain:"Orbiters and landers have found evidence of water ice on Mars.",url:"https://science.nasa.gov/mars/facts/"},
 food:{q:"What do plants need to grow?",answers:["Only rocks","Light and water","Only darkness"],correct:1,explain:"Plants need light, water, nutrients and suitable growing conditions.",url:"https://www.nasa.gov/mission/vegetable-production-system-veggie/"},
 shelter:{q:"Why might a Mars habitat use shielding?",answers:["To reduce radiation exposure","To make gravity disappear","To create sunlight"],correct:0,explain:"Shielding can reduce exposure to some space radiation; this game uses a fictional risk score.",url:"https://www.nasa.gov/hrp/space-radiation/"},
 rover:{q:"About how long is one Mars sol?",answers:["12 hours","24 hours 39 minutes","48 hours"],correct:1,explain:"A Mars solar day averages about 24 hours and 39 minutes.",url:"https://www.giss.nasa.gov/tools/mars24/help/notes.html"}};
const mars = "https://science.nasa.gov/mars/facts/";
const perseverance = "https://science.nasa.gov/mission/mars-2020-perseverance/science-highlights/";
export const solQuestions:Quiz[] = [
 {q:"About how long is one Martian sol?",answers:["24 hours 39 minutes","12 hours","48 hours"],correct:0,explain:"A sol is a little longer than an Earth day.",url:"https://www.giss.nasa.gov/tools/mars24/help/notes.html"},
 {q:"Which planet is Mars from the Sun?",answers:["Fourth","First","Eighth"],correct:0,explain:"Mars is the fourth planet from the Sun.",url:mars},
 {q:"How many moons does Mars have?",answers:["Two","One","Twelve"],correct:0,explain:"Mars has two small moons, Phobos and Deimos.",url:mars},
 {q:"What is the Mars atmosphere mostly made of?",answers:["Carbon dioxide","Oxygen","Helium"],correct:0,explain:"The thin Martian atmosphere is mostly carbon dioxide.",url:mars},
 {q:"What gives Mars much of its rusty color?",answers:["Iron minerals in the dust","Blue oceans","Green leaves"],correct:0,explain:"Iron minerals in Martian dust oxidize, giving the planet a reddish color.",url:mars},
 {q:"Which NASA rover carried MOXIE?",answers:["Perseverance","Voyager 1","Hubble"],correct:0,explain:"Perseverance carried the MOXIE oxygen experiment.",url:perseverance},
 {q:"What are Martian days called?",answers:["Sols","Years","Orbits"],correct:0,explain:"A Martian solar day is called a sol.",url:mars},
 {q:"Which helicopter flew on Mars?",answers:["Ingenuity","Apollo","Artemis"],correct:0,explain:"Ingenuity demonstrated powered flight on Mars.",url:perseverance},
 {q:"What is the name of the larger Martian moon?",answers:["Phobos","Titan","Europa"],correct:0,explain:"Phobos is the larger of Mars’s two moons.",url:mars},
 {q:"What kind of world is Mars?",answers:["A cold, dusty desert","An ocean planet","A star"],correct:0,explain:"Mars is a cold, dusty desert world with a thin atmosphere.",url:mars}
];
export function shuffledQuiz(quiz:Quiz, random:()=>number=Math.random):Quiz {
 const answers=quiz.answers.map((text,index)=>({text,correct:index===quiz.correct}));
 for(let i=answers.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[answers[i],answers[j]]=[answers[j],answers[i]];}
 return {...quiz,answers:answers.map(a=>a.text),correct:answers.findIndex(a=>a.correct)};
}
